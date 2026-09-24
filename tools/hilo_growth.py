#!/usr/bin/env python3
"""HILO GrowthOps: 10,000 addressable job slots, bounded read-only workers.

This is a queue and deterministic audit runner, not 10,000 live LLMs.
External posting, model calls and deployment are deliberately not implemented.
"""
from __future__ import annotations
import argparse
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import sqlite3
import time
from typing import Any, Iterator
import urllib.error
import urllib.parse
import urllib.request

LANES = ('site_health', 'repair', 'seo', 'social', 'github', 'stores',
         'skills', 'outreach', 'inreach', 'audit')
GOALS = {
 'site_health': 'Check actual HTTP and rendered-content evidence; distinguish a failed measurement from an outage.',
 'repair': 'Reproduce one site defect, prepare a minimal patch, run tests, and request reviewed release; no autonomous deployment.',
 'seo': 'Check canonical, title, description, crawlability, sitemap, structured data and accessible useful content.',
 'social': 'Prepare evidence-linked platform-specific copy and accessible media; no invented results or engagement.',
 'github': 'Read contribution rules and add a useful integration only where invited; never spray promotional issues or PRs.',
 'stores': 'Check current eligibility, auth, review, privacy and listing requirements; record a submission only from a real receipt.',
 'skills': 'Validate a portable skill/package and reproduce its examples before proposing distribution.',
 'outreach': 'Verify a relevant public business route, check private contact history and opt-outs, then personalize within the shared cap.',
 'inreach': 'Read real inbound messages via an authorized connector, prioritize replies, and keep private correspondence out of this repository.',
 'audit': 'Reconcile execution, tests, costs, publications and attribution; never infer reach from job counts.'
}
ALLOWED_HOSTS = {'getrobotrouter.com', 'www.getrobotrouter.com',
 'shark-app-pqh5h.ondigitalocean.app', 'embodied-arena.chrishongap.chatgpt.site', 'example.com'}
CANONICAL = 'https://getrobotrouter.com'


def stamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def digest(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    temp.replace(path)


def validate_config(config: dict[str, Any]) -> None:
    if config.get('capacity') != 10000 or config.get('lanes') != list(LANES):
        raise ValueError('Exactly ten lanes and 10,000 addressable slots required')
    if config.get('max_model_requests') != 0 or config.get('auto_publish') is not False:
        raise ValueError('This runner has no live-model or publication adapter')
    if not 1 <= config.get('max_concurrency', 0) <= 10:
        raise ValueError('Concurrency must be 1..10')
    slots, ids = set(), set()
    for target in config.get('targets', []):
        slot, ident = target['slot'], target['id']
        if type(slot) is not int or not 1 <= slot <= 1000 or slot in slots or ident in ids:
            raise ValueError('Target slots and IDs must be stable and unique')
        if not set(target['lanes']) <= set(LANES):
            raise ValueError('Unknown lane')
        for key in ('url', 'rules_url'):
            u = urllib.parse.urlsplit(target[key])
            if u.scheme != 'https' or not u.hostname or u.username or u.password:
                raise ValueError('Only credential-free public HTTPS references')
        datetime.fromisoformat(target['retrieved_on'])
        if target['kind'] not in ('site', 'venue'):
            raise ValueError('No personal contact records in public target registry')
        if target['status'] != 'candidate_not_submitted':
            raise ValueError('Publication outcomes belong in a separately verified receipt ledger')
        slots.add(slot); ids.add(ident)


def make_plan(config: dict[str, Any]) -> list[dict[str, Any]]:
    validate_config(config)
    targets = {t['slot']: t for t in config['targets']}
    jobs = []
    for lane in LANES:
        for slot in range(1, 1001):
            target = targets.get(slot)
            assigned = target is not None and lane in target['lanes']
            automated = assigned and (lane == 'audit' or (target['kind'] == 'site' and lane in ('site_health', 'seo')))
            jobs.append({'id': f'HILO-{lane}-{slot:04d}', 'lane': lane, 'slot': slot,
                'target_id': target['id'] if assigned else None,
                'status': 'queued' if automated else 'awaiting_connector_or_review' if assigned else 'waiting_for_target',
                'goal': GOALS[lane], 'execution_kind': 'not_started'})
    return jobs


class Queue:
    """One shared SQLite database per cycle; atomic claims; never replay ambiguous work."""
    def __init__(self, path: Path, config: dict[str, Any], cycle: str):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path, self.cycle = path, cycle
        with self.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS cycles (id TEXT PRIMARY KEY, manifest TEXT NOT NULL)')
            db.execute('CREATE TABLE IF NOT EXISTS jobs (cycle TEXT, id TEXT, status TEXT, token TEXT, result TEXT, PRIMARY KEY(cycle,id))')
            db.execute('BEGIN IMMEDIATE')
            old = db.execute('SELECT manifest FROM cycles WHERE id=?', (cycle,)).fetchone()
            if old and old[0] != digest(config):
                raise ValueError('Cycle already bound to a different manifest; use a new reviewed cycle')
            db.execute('INSERT OR IGNORE INTO cycles VALUES (?,?)', (cycle, digest(config)))
            db.executemany('INSERT OR IGNORE INTO jobs VALUES (?,?,?,NULL,NULL)',
                           ((cycle, j['id'], j['status']) for j in make_plan(config)))

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        db = sqlite3.connect(self.path, timeout=30)
        try:
            with db:
                yield db
        finally:
            db.close()

    def claim(self) -> tuple[str, str] | None:
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute("SELECT id FROM jobs WHERE cycle=? AND status='queued' ORDER BY id LIMIT 1", (self.cycle,)).fetchone()
            if row is None:
                return None
            import secrets
            token = secrets.token_hex(16)
            db.execute("UPDATE jobs SET status='running',token=? WHERE cycle=? AND id=?", (token, self.cycle, row[0]))
            return row[0], token

    def finish(self, ident: str, token: str, result: dict[str, Any]) -> None:
        if result.get('status') not in ('completed', 'measurement_failed'):
            raise ValueError('Unrecognized deterministic execution result')
        with self.connect() as db:
            changed = db.execute("UPDATE jobs SET status=?,result=? WHERE cycle=? AND id=? AND token=? AND status='running'",
                (result['status'], json.dumps(result), self.cycle, ident, token)).rowcount
            if changed != 1:
                raise ValueError('Claim token mismatch or already completed; do not replay')

    def records(self) -> list[dict[str, Any]]:
        with self.connect() as db:
            rows = db.execute('SELECT id,status,result FROM jobs WHERE cycle=? ORDER BY id', (self.cycle,)).fetchall()
        return [{'id': r[0], 'status': r[1], 'result': json.loads(r[2]) if r[2] else None} for r in rows]


class PageFacts(HTMLParser):
    def __init__(self):
        super().__init__(); self.title_open = False; self.title = ''; self.meta = {}; self.canonical = None; self.h1 = 0
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'title': self.title_open = True
        if tag == 'h1': self.h1 += 1
        if tag == 'meta': self.meta[a.get('name', a.get('property', ''))] = a.get('content', '')
        if tag == 'link' and 'canonical' in (a.get('rel') or '').split(): self.canonical = a.get('href')
    def handle_endtag(self, tag):
        if tag == 'title': self.title_open = False
    def handle_data(self, data):
        if self.title_open: self.title += data


def inspect_html(body: str) -> dict[str, Any]:
    p = PageFacts(); p.feed(body)
    checks = {'title': bool(p.title.strip()), 'description': bool(p.meta.get('description')),
        'canonical_primary_origin': bool(p.canonical and urllib.parse.urlsplit(p.canonical).scheme == 'https'
                                         and urllib.parse.urlsplit(p.canonical).netloc == 'getrobotrouter.com'),
        'open_graph': all(p.meta.get(k) for k in ('og:title', 'og:description', 'og:image')),
        'social_card': p.meta.get('twitter:card') == 'summary_large_image', 'one_h1': p.h1 == 1}
    return {'title': p.title.strip(), 'canonical': p.canonical, 'checks': checks,
            'missing': [k for k, v in checks.items() if not v]}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def public_get(url: str) -> dict[str, Any]:
    """Only fixed public project hosts. No auth, cookies, POSTs or arbitrary-site crawling."""
    started = stamp(); original = url; timer = time.monotonic()
    opener = urllib.request.build_opener(NoRedirect())
    for _ in range(4):
        u = urllib.parse.urlsplit(url)
        if u.scheme != 'https' or u.hostname not in ALLOWED_HOSTS or u.port not in (None, 443) or u.username or u.password:
            raise ValueError('URL or redirect outside fixed public probe allowlist')
        try:
            try:
                response = opener.open(urllib.request.Request(url, headers={'User-Agent': 'HILO-ReadOnly-Audit/0.1', 'Accept-Encoding': 'identity'}), timeout=12)
            except urllib.error.HTTPError as error:
                response = error
            with response:
                if response.code in (301, 302, 303, 307, 308):
                    url = urllib.parse.urljoin(url, response.headers.get('Location', ''))
                    continue
                body = response.read(1048576).decode('utf-8', 'replace')
                return {'url': original, 'final_url': url, 'started_at': started, 'finished_at': stamp(),
                    'status_code': response.code, 'content_type': response.headers.get('Content-Type', ''),
                    'seconds': round(time.monotonic()-timer, 3), 'body_sha256': hashlib.sha256(body.encode()).hexdigest(), 'body': body}
        except (OSError, urllib.error.URLError) as error:
            return {'url': original, 'started_at': started, 'finished_at': stamp(), 'error_type': type(error).__name__, 'status_code': None}
    return {'url': original, 'finished_at': stamp(), 'error_type': 'RedirectLimit', 'status_code': None}


def run(config: dict[str, Any], output: Path, cycle: str, online: bool) -> dict[str, Any]:
    plan = make_plan(config); queue = Queue(output / 'queue.sqlite', config, cycle)
    write_json(output / 'plan.json', {'capacity': 10000, 'manifest_sha256': digest(config), 'jobs': plan})
    by_id = {j['id']: j for j in plan}; targets = {t['id']: t for t in config['targets']}
    # Each execution uses one shared snapshot; completed-cycle reruns make no requests.
    cached = {}
    queued_ids = {r['id'] for r in queue.records() if r['status'] == 'queued'}
    has_network_work = any(by_id[j]['lane'] in ('site_health', 'seo') for j in queued_ids)
    if online and has_network_work:
        urls = sorted({t['url'] for t in targets.values() if t['kind'] == 'site'} | {'https://example.com/'})
        with ThreadPoolExecutor(max_workers=config['max_concurrency']) as pool:
            cached = dict(zip(urls, pool.map(public_get, urls)))
    def worker():
        while (claim := queue.claim()) is not None:
            ident, token = claim; job = by_id[ident]; target = targets[job['target_id']]
            result = {'started_at': stamp(), 'execution_kind': 'deterministic_audit', 'target_id': target['id'], 'status': 'completed'}
            if job['lane'] == 'audit':
                result.update(distribution_status='candidate_not_submitted', rules_url=target['rules_url'],
                              last_source_review=target['retrieved_on'], blockers=target['blockers'], source_revalidated_this_run=False)
            elif online:
                measurement = dict(cached[target['url']]); body = measurement.pop('body', '')
                result['measurement'] = measurement
                status_code = measurement.get('status_code')
                http_success = isinstance(status_code, int) and 200 <= status_code < 300
                if not http_success:
                    result['status'] = 'measurement_failed'
                    result['reason'] = 'http_status_not_success' if status_code is not None else 'request_failed'
                if job['lane'] == 'seo' and 'text/html' in measurement.get('content_type', ''):
                    result['seo'] = inspect_html(body)
                    result['seo']['checks']['http_success'] = http_success
                    result['seo']['missing'] = [key for key, value in result['seo']['checks'].items() if not value]
            else:
                result.update(status='measurement_failed', reason='network_not_requested')
            result['finished_at'] = stamp(); queue.finish(ident, token, result)
    with ThreadPoolExecutor(max_workers=config['max_concurrency']) as pool:
        list(pool.map(lambda _: worker(), range(config['max_concurrency'])))
    records = queue.records(); counts = {}
    for record in records: counts[record['status']] = counts.get(record['status'], 0) + 1
    control = cached.get('https://example.com/', {})
    report = {'version': '0.1', 'cycle': cycle, 'finished_at': stamp(), 'manifest_sha256': digest(config),
        'registered_slots': 10000, 'assigned_slots': sum(j['target_id'] is not None for j in plan),
        'deterministic_job_statuses': counts, 'public_url_probes_attempted_this_execution': len(cached),
        'network_control_status': control.get('status_code'),
        'live_llm_agents_started': 0, 'live_llm_agents_completed': 0, 'live_llm_agents_failed': 0,
        'outbound_messages_sent_by_runner': 0, 'store_submissions_by_runner': 0, 'deployments_by_runner': 0,
        'real_robot_hours_collected': 0, 'note': 'Slots are capacity, not people, contacts, live LLM agents, impressions, or certified robot evidence. Pending/running work requires reconciliation; no automatic replay.',
        'records': [r for r in records if r['result'] is not None]}
    write_json(output / 'report.json', report)
    report_text = '# HILO GrowthOps execution\n\n' + '\n'.join(f'- {k}: {v}' for k,v in report.items() if k != 'records') + '\n'
    (output / 'report.md').write_text(report_text, encoding='utf-8')
    return {k:v for k,v in report.items() if k != 'records'}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('command', choices=['plan', 'run'])
    p.add_argument('--config', type=Path, default=Path('config/hilo-growth.json'))
    p.add_argument('--output', type=Path, default=Path('artifacts/hilo-growth'))
    p.add_argument('--cycle', default=datetime.now(timezone.utc).date().isoformat())
    p.add_argument('--online', action='store_true', help='Read-only public project HTTP probes; never posts or model calls')
    args = p.parse_args(); config = json.loads(args.config.read_text(encoding='utf-8'))
    if args.command == 'plan':
        jobs = make_plan(config); write_json(args.output/'plan.json', {'manifest_sha256': digest(config), 'jobs': jobs})
        print(json.dumps({'registered_slots': len(jobs), 'assigned_slots': sum(j['target_id'] is not None for j in jobs), 'live_llm_agents_started': 0}))
    else: print(json.dumps(run(config, args.output, args.cycle, args.online), indent=2))

if __name__ == '__main__':
    main()

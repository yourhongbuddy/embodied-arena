"""HILO review feed: local metadata validation and safe static rendering, not a crawler."""
from __future__ import annotations

import argparse
from datetime import date
from hashlib import sha256
from html import escape
import json
from pathlib import Path
import re
from urllib.parse import parse_qs, urlsplit

VERSION = '0.1-RW1'
PLATFORMS = {'trustpilot', 'ios', 'android'}
BRANDS = {'Roborock', 'Matic', 'Roomba', 'Dreame', 'Ecovacs', 'Eufy', 'Narwal'}
NOVELTY = {'proposed_submode', 'reinforcement', 'counterevidence', 'positive_control', 'vendor_claim'}
EVIDENCE = {'owner_report', 'developer_release_note'}
STATES = {'sampled', 'identity_only', 'discovery_pending', 'access_incomplete'}
OBS_KEYS = {'id', 'brand', 'platform', 'app_id', 'model', 'app_version', 'storefront',
            'source_url', 'review_url', 'external_review_id', 'locator', 'published_on',
            'published_label', 'experience_on', 'retrieved_on', 'evidence_class',
            'summary', 'uncertainty', 'hilo_ids', 'novelty', 'proposed_test',
            'related_ids', 'revision', 'supersedes', 'rights', 'source_key'}
TARGET_KEYS = {'brand', 'platform', 'url', 'app_id', 'state', 'note'}
ROOT_KEYS = {'schema_version', 'generated_on', 'ontology_commit', 'ontology_url',
             'publication_boundary', 'targets', 'observations', 'corrections'}


def require(ok: bool, message: str) -> None:
    if not ok:
        raise ValueError(message)


def text(value: object, label: str, maximum: int = 1600) -> str:
    require(isinstance(value, str) and bool(value.strip()) and len(value) <= maximum,
            f'Invalid {label}')
    return value


def exact_keys(obj: object, keys: set[str]) -> None:
    require(isinstance(obj, dict) and set(obj) == keys, 'Unexpected or missing fields')


def day(value: object) -> date:
    require(isinstance(value, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', value) is not None,
            'Date must be a real YYYY-MM-DD date')
    return date.fromisoformat(value)


def source_url(value: object, platform: str) -> str:
    raw = text(value, 'source URL', 2048)
    u = urlsplit(raw)
    require(u.scheme == 'https' and not u.username and not u.password and u.port is None,
            'Source URL must be HTTPS without credentials or explicit ports')
    host = u.hostname or ''
    if platform == 'ios':
        require(host == 'apps.apple.com' and re.search(r'/id\d+(?:/|$)', u.path) is not None,
                'Expected an Apple App Store app listing')
    elif platform == 'android':
        require(host == 'play.google.com' and u.path == '/store/apps/details' and
                len(parse_qs(u.query).get('id', [])) == 1, 'Expected a Google Play app listing')
    else:
        require(host == 'trustpilot.com' or host.endswith('.trustpilot.com'), 'Expected Trustpilot')
        require(u.path.startswith(('/review/', '/reviews/')), 'Expected business or review URL')
    return raw


def source_key(row: dict) -> str:
    """A review ID is strongest. Locator keys are provisional, not proof of unique owners."""
    u = urlsplit(row['source_url'])
    entity = row['app_id'] or u.path.split('/review/', 1)[-1].rstrip('/')
    locator = row['external_review_id'] or f"{row['published_on']}|{row['locator']}"
    raw = '|'.join([row['platform'], str(entity), row['evidence_class'], locator])
    return sha256(raw.encode('utf-8')).hexdigest()[:24]


def age_bucket(row: dict, as_of: str) -> str:
    if row['published_on'] is None:
        return 'Publication date unverified'
    age = (day(as_of) - day(row['published_on'])).days
    return 'Published within 30 days' if age <= 30 else 'Historical backfill'


def validate(feed: dict) -> dict:
    exact_keys(feed, ROOT_KEYS)
    require(feed['schema_version'] == VERSION, 'Unsupported schema version')
    generated = day(feed['generated_on'])
    require(re.fullmatch(r'[a-f0-9]{40}', str(feed['ontology_commit'])) is not None,
            'Pin the ontology commit')
    expected = ('https://github.com/yourhongbuddy/embodied-arena/blob/' +
                feed['ontology_commit'] + '/public/hilo/catalog.json')
    require(feed['ontology_url'] == expected, 'Ontology URL must bind the stated commit')
    text(feed['publication_boundary'], 'publication boundary')
    require(isinstance(feed['targets'], list) and len(feed['targets']) == 21,
            'Retain all seven brands by three platforms, including gaps')
    targets = set()
    for target in feed['targets']:
        exact_keys(target, TARGET_KEYS)
        pair = (target['brand'], target['platform'])
        require(pair not in targets and pair[0] in BRANDS and pair[1] in PLATFORMS,
                'Invalid or duplicate target')
        targets.add(pair)
        require(target['state'] in STATES, 'Invalid coverage state')
        if target['url'] is not None:
            source_url(target['url'], target['platform'])
        require(target['url'] is not None or target['state'] in {'discovery_pending', 'access_incomplete'},
                'Sampled targets need a URL')
        text(target['note'], 'coverage note')
        if target['app_id'] is not None:
            text(target['app_id'], 'target app ID', 150)
    require(isinstance(feed['observations'], list), 'Observations must be an array')
    records = {}
    identities = set()
    for row in feed['observations']:
        exact_keys(row, OBS_KEYS)
        key = text(row['id'], 'record ID', 80)
        require(re.fullmatch(r'RW-\d{8}-\d{3}(?:-r\d+)?', key) is not None, 'Invalid record ID')
        require(key not in records, 'Duplicate record ID')
        require((row['brand'], row['platform']) in targets, 'Unknown target')
        require(day(row['retrieved_on']) <= generated, 'Retrieval follows report date')
        if row['published_on'] is not None:
            require(day(row['published_on']) <= day(row['retrieved_on']), 'Future publication date')
        if row['experience_on'] is not None:
            require(day(row['experience_on']) <= day(row['retrieved_on']), 'Future experience date')
        for field in ['app_id', 'model', 'app_version', 'storefront', 'external_review_id', 'published_label']:
            if row[field] is not None:
                text(row[field], field, 250)
        source_url(row['source_url'], row['platform'])
        if row['review_url'] is not None:
            source_url(row['review_url'], row['platform'])
        if row['platform'] == 'android':
            require(parse_qs(urlsplit(row['source_url']).query).get('id') == [row['app_id']],
                    'App identity does not match listing')
        elif row['platform'] == 'ios':
            require(re.search(r'/id(\d+)', urlsplit(row['source_url']).path).group(1) == row['app_id'],
                    'App identity does not match listing')
        require(row['evidence_class'] in EVIDENCE and row['novelty'] in NOVELTY, 'Invalid evidence label')
        require((row['evidence_class'] == 'developer_release_note') == (row['novelty'] == 'vendor_claim'),
                'Developer claims must not become owner evidence')
        for field in ['locator', 'summary', 'uncertainty', 'proposed_test']:
            text(row[field], field)
        require(row['rights'] == 'link_and_original_summary_only', 'No raw corpus publication')
        require(isinstance(row['hilo_ids'], list) and bool(row['hilo_ids']) and
                len(set(row['hilo_ids'])) == len(row['hilo_ids']), 'Invalid HILO mapping')
        for mode in row['hilo_ids']:
            require(isinstance(mode, str) and re.fullmatch(r'HILO-\d{3}', mode) is not None and
                    1 <= int(mode[-3:]) <= 72, 'Unreviewed canonical HILO ID')
        require(type(row['revision']) is int and row['revision'] >= 1, 'Invalid revision')
        require(isinstance(row['related_ids'], list) and all(isinstance(x, str) for x in row['related_ids']),
                'Invalid related IDs')
        require(row['source_key'] == source_key(row), 'Source key mismatch')
        identity = (row['source_key'], row['revision'])
        require(identity not in identities, 'Duplicate source revision')
        identities.add(identity)
        records[key] = row
    for key, row in records.items():
        require(all(x in records and x != key for x in row['related_ids']), 'Broken related record')
        if row['revision'] == 1:
            require(row['supersedes'] is None, 'First revision cannot supersede')
        else:
            prior = records.get(row['supersedes'])
            require(prior is not None and prior['source_key'] == row['source_key'] and
                    prior['revision'] + 1 == row['revision'], 'Invalid revision lineage')
    require(isinstance(feed['corrections'], list) and all(isinstance(x, str) for x in feed['corrections']),
            'Invalid correction log')
    return {'valid_records': len(records), 'targets': len(targets), 'network_requests': 0,
            'independently_verified_incidents': 0, 'field_robot_hours_collected': 0}


def unique_object(pairs: list[tuple[str, object]]) -> dict:
    out = {}
    for key, value in pairs:
        require(key not in out, f'Duplicate JSON key: {key}')
        out[key] = value
    return out


def load(path: Path) -> dict:
    require(path.stat().st_size <= 2_000_000, 'Feed exceeds local 2 MB limit; shard before expanding')
    value = json.loads(path.read_text(encoding='utf-8'), object_pairs_hook=unique_object,
                       parse_constant=lambda x: (_ for _ in ()).throw(ValueError(f'Invalid number {x}')))
    validate(value)
    return value


def render(feed: dict) -> str:
    validate(feed)
    template = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>HILO Review Watch — research feed</title><meta name="description" content="Source-linked robot reviews, counterevidence and proposed HILO tests. Not certified performance.">
<style>body{margin:0;background:#f5f6ed;color:#1b291d;font:16px/1.6 system-ui,sans-serif}main{max-width:1140px;margin:auto;padding:40px 22px}h1{font-size:clamp(40px,6vw,76px);line-height:1.05;letter-spacing:-.05em;margin:22px 0}h2{margin-top:40px}a{color:#294a21;text-underline-offset:4px}a:focus-visible,summary:focus-visible{outline:3px solid #335b1f;outline-offset:4px}.meta{font:12px/1.6 ui-monospace,monospace;color:#52634c}.notice{padding:18px 22px;border-left:4px solid #72953c;background:#e7ecd8}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}article{padding:22px;border:1px solid #cbd2c1;overflow-wrap:anywhere}h3{margin:9px 0;font-size:21px}article p{font-size:14px}summary{cursor:pointer}.coverage p{border-bottom:1px solid #cbd2c1;padding:8px}footer{margin-top:40px;border-top:1px solid #cbd2c1;padding-top:20px}@media(max-width:700px){.grid{grid-template-columns:1fr}}</style></head>
<body><main><nav aria-label="Research navigation"><a href="/wanted-10k">WANTED-10K</a> · <a href="/hilo/developers.html">Developers</a> · <a href="review-watch.json">Evidence JSON</a></nav>
<div class="meta">HILO / REVIEW WATCH / __DATE__</div><h1>The robot is only<br>part of the system.</h1><p>Trustpilot, iOS and Android reviews become source-linked coexistence test proposals.</p>
<aside class="notice"><b>Research feed, not certification.</b><p>Owner reports are not independently verified incidents. GitHub publication is not website deployment. Canonical scores and certified exposure remain unchanged.</p></aside>
<p>The scheduled research agent posts to the repository. This viewer loads its versioned local JSON snapshot; it does not crawl review platforms or collect household data.</p>
<p id="status" role="status">Loading the evidence feed…</p><noscript><p>JavaScript is needed for the card viewer. All evidence is available in the <a href="review-watch.json">JSON download</a>.</p></noscript>
<h2>Observations and proposed tests</h2><p>Older featured reviews remain historical backfill. Relative dates remain unresolved. Fix claims and favorable reports stay visible.</p><section class="grid" id="cards" aria-label="Evidence cards"></section>
<h2>Coverage and gaps</h2><details><summary>Seven brands × three source platforms</summary><div class="coverage" id="coverage"></div></details>
<footer><p><a id="ontology">Pinned research ontology</a> · Zero field hours acquired by this feed</p><p class="meta">Not a representative incidence study. No raw reviews, usernames or private recordings are published.</p></footer>
</main><script>
'use strict';
function add(parent,tag,value,cls){const node=document.createElement(tag);node.textContent=String(value);if(cls)node.className=cls;parent.appendChild(node);return node;}
function linkAllowed(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(u.hostname==='apps.apple.com'||u.hostname==='play.google.com'||u.hostname==='trustpilot.com'||u.hostname.endsWith('.trustpilot.com')||u.hostname==='github.com');}catch{return false;}}
(async()=>{try{const response=await fetch('review-watch.json',{cache:'no-store'});if(!response.ok)throw Error('Feed request failed');const feed=await response.json();if(feed.schema_version!=='0.1-RW1'||!Array.isArray(feed.observations)||!Array.isArray(feed.targets))throw Error('Unsupported feed');
document.getElementById('status').textContent=feed.observations.length+' evidence cards · 7 target brands · 3 source platforms · checked '+feed.generated_on;
for(const r of feed.observations){const article=add(document.getElementById('cards'),'article','');article.id=r.id;add(article,'div',r.brand+' · '+r.platform+' · '+r.novelty.replaceAll('_',' '),'meta');add(article,'h3',r.locator);add(article,'p',r.summary);add(article,'p','Uncertainty: '+r.uncertainty);add(article,'p','Proposed test: '+r.proposed_test);add(article,'p',r.hilo_ids.join(' / '),'meta');const age=r.published_on?(Date.parse(feed.generated_on)-Date.parse(r.published_on))/86400000:null;add(article,'p',age===null?'Publication date unverified':age<=30?'Published within 30 days':'Historical backfill','meta');add(article,'p','Published: '+(r.published_on||r.published_label||'unknown')+' · Experience: '+(r.experience_on||'unknown')+' · Read: '+r.retrieved_on,'meta');const url=r.review_url||r.source_url;if(linkAllowed(url)){const a=add(article,'a','Source ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';}add(article,'p',r.evidence_class.replaceAll('_',' ')+' · not independently verified','meta');}
for(const t of feed.targets)add(document.getElementById('coverage'),'p',t.brand+' / '+t.platform+' / '+t.state.replaceAll('_',' ')+': '+t.note);
if(linkAllowed(feed.ontology_url))document.getElementById('ontology').href=feed.ontology_url;
}catch{document.getElementById('status').textContent='The card viewer could not load. Open Evidence JSON above; do not treat this as an empty feed.';}})();
</script></body></html>
'''
    return template.replace('__DATE__', escape(feed['generated_on'], quote=True))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['validate', 'render', 'check-render'])
    parser.add_argument('feed', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    try:
        feed = load(args.feed)
        if args.command == 'validate':
            print(json.dumps(validate(feed), indent=2))
        else:
            require(args.output is not None, '--output is required')
            html = render(feed)
            if args.command == 'check-render':
                require(args.output.read_text(encoding='utf-8') == html, 'Static page differs from feed')
                print('Static feed rendering matches')
            else:
                args.output.parent.mkdir(parents=True, exist_ok=True)
                args.output.write_text(html, encoding='utf-8')
    except (ValueError, OSError, TypeError, KeyError) as error:
        parser.exit(1, f'{error}\n')


if __name__ == '__main__':
    main()

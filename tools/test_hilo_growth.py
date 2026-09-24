import copy
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import hilo_growth as h

ROOT = Path(__file__).resolve().parents[1]

class GrowthTests(unittest.TestCase):
    def setUp(self):
        self.config = json.loads((ROOT/'config/hilo-growth.json').read_text())
    def test_ten_thousand_unique_slots(self):
        jobs = h.make_plan(self.config)
        self.assertEqual(len(jobs), 10000)
        self.assertEqual(len({j['id'] for j in jobs}), 10000)
        for lane in h.LANES: self.assertEqual(sum(j['lane']==lane for j in jobs), 1000)
    def test_no_fabricated_target_assignments(self):
        jobs = h.make_plan(self.config); known={t['id'] for t in self.config['targets']}
        self.assertTrue(all(j['target_id'] in known or j['target_id'] is None for j in jobs))
        self.assertTrue(all(j['status']=='waiting_for_target' for j in jobs if j['target_id'] is None))
    def test_no_remote_write_jobs_queued(self):
        self.assertTrue(all(j['lane'] in ('site_health','seo','audit') for j in h.make_plan(self.config) if j['status']=='queued'))
    def test_duplicate_target_slot_rejected(self):
        self.config['targets'][1]['slot']=self.config['targets'][0]['slot']
        with self.assertRaises(ValueError):h.make_plan(self.config)
    def test_duplicate_target_identity_rejected(self):
        self.config['targets'][1]['id']=self.config['targets'][0]['id']
        with self.assertRaises(ValueError):h.make_plan(self.config)
    def test_paid_execution_rejected(self):
        self.config['max_model_requests']=10000
        with self.assertRaises(ValueError):h.make_plan(self.config)
    def test_auto_publish_rejected(self):
        self.config['auto_publish']=True
        with self.assertRaises(ValueError):h.make_plan(self.config)
    def test_credentials_in_reference_rejected(self):
        self.config['targets'][0]['url']='https://user:secret@getrobotrouter.com/'
        with self.assertRaises(ValueError):h.make_plan(self.config)
    def test_private_contact_kind_rejected(self):
        self.config['targets'][0]['kind']='person'
        with self.assertRaises(ValueError):h.make_plan(self.config)
    def test_arbitrary_network_destinations_rejected(self):
        for url in ('http://getrobotrouter.com/','https://127.0.0.1/','https://getrobotrouter.com.evil.invalid/','https://getrobotrouter.com:444/'):
            with self.assertRaises(ValueError):h.public_get(url)
    def test_manifest_cannot_claim_listing(self):
        self.config['targets'][0]['status']='published'
        with self.assertRaises(ValueError):h.make_plan(self.config)
    def test_atomic_claims_do_not_duplicate(self):
        with tempfile.TemporaryDirectory() as tmp:
            q=h.Queue(Path(tmp)/'q.sqlite',self.config,'test')
            with ThreadPoolExecutor(max_workers=10) as pool: claims=list(pool.map(lambda _:q.claim(),range(50)))
            ids=[c[0] for c in claims if c]
            self.assertEqual(len(ids),len(set(ids)))
            self.assertEqual(len(ids),sum(j['status']=='queued' for j in h.make_plan(self.config)))
    def test_completion_needs_correct_token_and_no_replay(self):
        with tempfile.TemporaryDirectory() as tmp:
            q=h.Queue(Path(tmp)/'q.sqlite',self.config,'test'); ident,token=q.claim()
            with self.assertRaises(ValueError):q.finish(ident,'wrong',{'status':'completed'})
            q.finish(ident,token,{'status':'completed'})
            with self.assertRaises(ValueError):q.finish(ident,token,{'status':'completed'})
    def test_cycle_cannot_change_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'q.sqlite';h.Queue(path,self.config,'test')
            other=copy.deepcopy(self.config);other['version']='0.3'
            with self.assertRaises(ValueError):h.Queue(path,other,'test')
    def test_stuck_jobs_are_not_automatically_replayed(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'q.sqlite';q=h.Queue(path,self.config,'test');first=q.claim()
            again=h.Queue(path,self.config,'test');self.assertNotEqual(first,again.claim())
    def test_html_audit_finds_weak_metadata(self):
        result=h.inspect_html('<title>HILO</title><h1>HILO</h1>')
        self.assertTrue(result['checks']['title']);self.assertIn('canonical_primary_origin',result['missing'])
    def test_html_canonical_cannot_use_lookalike_host(self):
        result=h.inspect_html('<link rel="canonical" href="https://getrobotrouter.com.evil.invalid/">')
        self.assertFalse(result['checks']['canonical_primary_origin'])
    def test_offline_run_never_uses_network_or_claims_agents(self):
        with tempfile.TemporaryDirectory() as tmp,patch.object(h,'public_get',side_effect=AssertionError('network')):
            out=Path(tmp);report=h.run(self.config,out,'test',False)
            self.assertEqual(report['live_llm_agents_started'],0)
            self.assertEqual(report['outbound_messages_sent_by_runner'],0)
            self.assertEqual(report['real_robot_hours_collected'],0)
            self.assertEqual(sum(report['deterministic_job_statuses'].values()),10000)
    def test_plugin_is_skills_only(self):
        p=ROOT/'plugins/hilo-benchmark';manifest=json.loads((p/'plugin.json').read_text())
        self.assertEqual(manifest['name'],'hilo-benchmark')
        self.assertTrue((p/'skills/hilo-audit/SKILL.md').is_file())
        self.assertFalse((p/'hooks').exists());self.assertFalse((p/'mcp.json').exists())
    def test_openai_repo_marketplace_points_to_local_plugin(self):
        market=json.loads((ROOT/'.agents/plugins/marketplace.json').read_text())
        self.assertEqual(market['name'],'hilo-tools')
        entry=market['plugins'][0]
        self.assertEqual(entry['name'],'hilo-benchmark')
        self.assertEqual(entry['source'],{'source':'local','path':'./plugins/hilo-benchmark'})
        self.assertEqual(entry['policy']['installation'],'AVAILABLE')
    def test_submission_has_five_positive_three_negative_cases(self):
        submission=json.loads((ROOT/'distribution/openai-submission.json').read_text())
        self.assertEqual(submission['status'],'draft_not_submitted')
        self.assertEqual(len(submission['positive_tests']),5);self.assertEqual(len(submission['negative_tests']),3)
        self.assertIsNone(submission['official_listing_url'])
    def test_completed_cycle_does_not_repeat_network(self):
        with tempfile.TemporaryDirectory() as tmp,patch.object(h,'public_get') as fetch:
            fetch.return_value={'status_code':200,'content_type':'text/html','body':'<title>HILO</title>'}
            h.run(self.config,Path(tmp),'test',True)
            first=fetch.call_count
            expected=len(h.public_probe_urls(self.config))
            self.assertEqual(first,expected)
            report=h.run(self.config,Path(tmp),'test',True)
            self.assertEqual(fetch.call_count,first)
            self.assertEqual(report['public_url_probes_attempted_this_execution'],0)
    def test_developer_page_has_complete_static_metadata(self):
        html=(ROOT/'public/hilo/developers.html').read_text()
        self.assertEqual(h.inspect_html(html)['missing'],[])
        self.assertNotIn('<script src=',html)
        self.assertNotIn('/api/experiments/assignment',html)
    def test_sitemap_excludes_private_routes_and_includes_skill_entry(self):
        import xml.etree.ElementTree as ET
        urls=[n.text for n in ET.fromstring((ROOT/'public/sitemap.xml').read_text()).iter() if n.tag.endswith('}loc')]
        self.assertEqual(len(urls),len(set(urls)))
        self.assertIn('https://getrobotrouter.com/hilo/developers.html',urls)
        self.assertFalse(any('/account' in u or '/login' in u for u in urls))
        self.assertIn('Sitemap: https://getrobotrouter.com/sitemap.xml',(ROOT/'public/robots.txt').read_text())
    def test_seo_origin_is_fixed_not_request_controlled(self):
        source=(ROOT/'app/layout.tsx').read_text()
        self.assertIn('PUBLIC_SITE_ORIGIN',source)
        self.assertNotIn('h.get("host")',source)
    def test_new_targets_have_reviewed_rules_and_no_submission_claim(self):
        ids={t['id']:t for t in self.config['targets']}
        for ident in ('developer-page','agent-skill-exchange'):
            self.assertEqual(ids[ident]['retrieved_on'],'2026-09-23')
            self.assertEqual(ids[ident]['status'],'candidate_not_submitted')
            self.assertTrue(ids[ident]['rules_url'].startswith('https://'))

    def test_openai_interface_metadata_is_present_without_policy_claims(self):
        manifest=json.loads((ROOT/'plugins/hilo-benchmark/plugin.json').read_text())
        interface=manifest['extensions']['com.openai']['interface']
        self.assertEqual(interface['displayName'],'HILO Benchmark Review')
        self.assertEqual(interface['websiteURL'],'https://getrobotrouter.com/wanted-10k')
        self.assertGreaterEqual(len(interface['defaultPrompt']),2)
        self.assertNotIn('privacyPolicyURL',interface)
        self.assertNotIn('termsOfServiceURL',interface)

    def test_route_baselines_are_fixed_public_read_only_origins(self):
        h.validate_config(self.config)
        self.assertGreaterEqual(len(self.config.get('route_baselines', [])), 5)
        for row in self.config['route_baselines']:
            self.assertTrue(row['public_url'].startswith('https://getrobotrouter.com/'))
            self.assertTrue(row['baseline_url'].startswith('https://shark-app-pqh5h.ondigitalocean.app/'))

    def test_route_baseline_status_drift_is_explicit(self):
        cached={}
        for url in h.public_probe_urls(self.config):
            status=404 if url=='https://getrobotrouter.com/wanted-10k/data-engine.html' else 200
            cached[url]={'status_code':status,'body_sha256':'x'}
        rows={r['id']:r for r in h.compare_route_baselines(self.config,cached)}
        self.assertTrue(rows['data-engine-origin']['status_mismatch'])
        self.assertEqual(rows['data-engine-origin']['public_status'],404)
        self.assertEqual(rows['data-engine-origin']['baseline_status'],200)
        self.assertFalse(rows['wanted-origin']['status_mismatch'])


if __name__=='__main__':unittest.main()

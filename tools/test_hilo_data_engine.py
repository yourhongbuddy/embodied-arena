import copy
import json
import tempfile
import unittest
from pathlib import Path
import hilo_data_engine as h

class EngineTests(unittest.TestCase):
    def setUp(self):
        self.manifest = h.load_manifest(h.ROOT / 'config/hilo-data-engine.json')

    def test_exactly_100_unique_jobs(self):
        p = h.make_plan(self.manifest)
        self.assertEqual(len(p['jobs']), 100)
        self.assertEqual(len({j['id'] for j in p['jobs']}), 100)
        self.assertEqual(p['live_started'], 0)
        for group, _ in h.GROUPS:
            self.assertEqual(sum(j['group'] == group for j in p['jobs']), 10)

    def test_unknown_evidence_rejected(self):
        with self.assertRaises(ValueError):
            h.validate_proposal(dict(proposal='x', evidence_ids=['invented'], acceptance_test='x', limitation='x'), {'real'})

    def test_extra_output_fields_rejected(self):
        with self.assertRaises(ValueError):
            h.validate_proposal(dict(proposal='x', evidence_ids=['real'], acceptance_test='x', limitation='x', certified=True), {'real'})

    def test_incomplete_response_rejected(self):
        with self.assertRaises(ValueError):
            h.extract_response({'status': 'incomplete', 'output': []})

    def test_full_mock_loop_and_idempotence(self):
        calls = []
        def mock(payload, key):
            packet = json.loads(payload['input'])
            calls.append(packet['assignment']['id'])
            data = {'proposal': 'Synthetic test proposal, not field evidence.',
                    'evidence_ids': [packet['evidence_cards'][0]['id']],
                    'acceptance_test': 'Independent human review required.',
                    'limitation': 'No experiment was performed.'}
            return {'id': 'mock', 'status': 'completed', 'output': [{'type': 'message', 'content': [{'type': 'output_text', 'text': json.dumps(data)}]}]}
        with tempfile.TemporaryDirectory() as d:
            s = h.run_workers(self.manifest, Path(d), 'mock', 'not-a-key', transport=mock, execution_kind='offline_mock')
            self.assertEqual(len(calls), 100)
            self.assertEqual(s['completed_workers'], 100)
            self.assertEqual(s['live_started'], 0)
            self.assertEqual(s['real_robot_hours_collected'], 0)
            self.assertFalse(s['publication_authorized'])
            with self.assertRaises(FileExistsError):
                h.run_workers(self.manifest, Path(d), 'mock', 'not-a-key', transport=mock, execution_kind='offline_mock')

    def test_failures_are_recorded_not_hidden(self):
        def fail(payload, key):
            raise TimeoutError('sensitive-provider-body-must-not-be-saved')
        with tempfile.TemporaryDirectory() as d:
            s = h.run_workers(self.manifest, Path(d), 'mock', 'not-a-key', transport=fail, execution_kind='offline_mock')
            self.assertEqual(s['failed_workers'], 100)
            self.assertNotIn('sensitive-provider-body', json.dumps(s))
            self.assertEqual(s['status'], 'partial_failure')

    def episode(self):
        return {'schema_version': 'hilo.collection.v0.1', 'episode_id': 'ep-test', 'environment_id': 'pseudonymous-test',
                'robot_id': 'robot-test', 'policy_version': 'example-only', 'source_kind': 'simulation',
                'authorization_ref': 'example-not-a-real-grant', 'permitted_uses': ['evaluation'],
                'started_at': '2026-09-20T10:00:00Z', 'ended_at': '2026-09-20T10:01:00Z',
                'split': 'development', 'source_sha256': 'a'*64, 'event_refs': ['synthetic-event']}

    def test_schema_cannot_certify_synthetic_or_real(self):
        for kind in ('simulation', 'real_observation'):
            e = self.episode(); e['source_kind'] = kind
            result = h.validate_episode(e)
            self.assertFalse(result['eligible_for_official_score'])
            self.assertFalse(result['rights_verified'])

    def test_holdout_training_rejected(self):
        e = self.episode(); e['split'] = 'sealed_holdout'; e['permitted_uses'] = ['training']
        with self.assertRaises(ValueError): h.validate_episode(e)

    def test_negative_duration_rejected(self):
        e = self.episode(); e['ended_at'] = e['started_at']
        with self.assertRaises(ValueError): h.validate_episode(e)

    def test_unauthorized_host_rejected(self):
        m = copy.deepcopy(self.manifest); m['sources'][0]['url'] = 'https://openai.com.example.org/data'
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'manifest.json'; p.write_text(json.dumps(m))
            with self.assertRaises(ValueError): h.load_manifest(p)

if __name__ == '__main__': unittest.main()

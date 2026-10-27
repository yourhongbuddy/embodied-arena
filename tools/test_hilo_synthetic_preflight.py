import copy
import io
import json
import tempfile
from contextlib import redirect_stdout, redirect_stderr
from pathlib import Path
import unittest
from hilo_synthetic_preflight import check, EVENT_CLASSES, main

FIXTURE = json.loads((Path(__file__).parent / 'hilo_synthetic_fixture.json').read_text())


class PreflightTests(unittest.TestCase):
    def test_passes_synthetic_fixture(self): self.assertEqual(check(FIXTURE), [])
    def test_exact_six_classes(self): self.assertEqual(len(EVENT_CLASSES), 6)
    def test_rejects_real_claims(self):
        sample=copy.deepcopy(FIXTURE);sample['claimed_robot_hours']=10
        self.assertTrue(check(sample))
    def test_rejects_unknown_event_type(self):
        sample=copy.deepcopy(FIXTURE);sample['events'][0]['event_class']='FAKE_KEEP_VOTE'
        self.assertTrue(check(sample))
    def test_rejects_blank_contact_like_or_oversized_event_ids(self):
        for ident in (' ', '\t', 'person@example.com', 'a' * 65, 'home/video', 'é'):
            with self.subTest(event_id=repr(ident)):
                sample = copy.deepcopy(FIXTURE)
                sample['events'][0]['event_id'] = ident
                self.assertTrue(any('event_id' in error for error in check(sample)))

    def test_accepts_bounded_opaque_event_id(self):
        sample = copy.deepcopy(FIXTURE)
        sample['events'][0]['event_id'] = 'evt_2026-10-27'
        self.assertEqual(check(sample), [])

    def test_rejects_duplicate_event(self):
        sample=copy.deepcopy(FIXTURE);sample['events'][1]['event_id']='e1'
        self.assertTrue(check(sample))
    def test_rejects_negative_assistance(self):
        sample=copy.deepcopy(FIXTURE);sample['events'][4]['human_assistance_seconds']=-20
        self.assertTrue(check(sample))
    def test_rejects_time_regression(self):
        sample=copy.deepcopy(FIXTURE);sample['events'][3]['timestamp_utc']='2025-12-31T00:00:00Z'
        self.assertTrue(check(sample))
    def test_rejects_personal_fields(self):
        sample=copy.deepcopy(FIXTURE);sample['events'][0]['participant_id']='private123'
        self.assertTrue(check(sample))
    def test_unknown_unhashable_event_type_is_rejected_not_exception(self):
        sample=copy.deepcopy(FIXTURE);sample['events'][0]['event_class']=['FAKE']
        self.assertTrue(check(sample))
    def test_nested_private_payload_not_accepted(self):
        sample=copy.deepcopy(FIXTURE);sample['events'][0]['payload']={'person_name':'Private'}
        self.assertTrue(check(sample))
    def test_no_unreviewed_top_level_upload_fields(self):
        sample=copy.deepcopy(FIXTURE);sample['private_home_video_url']='private'
        self.assertTrue(check(sample))
    def test_rejects_string_certification_flag(self):
        sample=copy.deepcopy(FIXTURE);sample['wants_certification']='false'
        self.assertTrue(check(sample))
    def test_rejects_boolean_robot_hour_value(self):
        sample=copy.deepcopy(FIXTURE);sample['claimed_robot_hours']=False
        self.assertTrue(check(sample))
    def test_rejects_nonfinite_assistance(self):
        sample=copy.deepcopy(FIXTURE);sample['events'][4]['human_assistance_seconds']=float('nan')
        self.assertTrue(check(sample))
    def test_nested_description_object_rejected(self):
        sample = copy.deepcopy(FIXTURE)
        sample['description'] = {'home_video': 'not accepted in a synthetic exercise'}
        self.assertTrue(any('description' in e for e in check(sample)))

    def test_nonstring_and_excessive_description_rejected(self):
        for description in (['nested'], 2, 'x' * 513):
            with self.subTest(description_type=type(description).__name__):
                sample = copy.deepcopy(FIXTURE)
                sample['description'] = description
                self.assertTrue(any('description' in e for e in check(sample)))

    def test_bounded_plain_description_accepted(self):
        sample = copy.deepcopy(FIXTURE)
        sample['description'] = 'Synthetic observation only.'
        self.assertEqual(check(sample), [])

    def test_never_claims_certification(self):
        sample=copy.deepcopy(FIXTURE);sample['wants_certification']=True
        self.assertTrue(check(sample))


    def test_cli_rejects_duplicate_top_level_evidence_class(self):
        raw = '{"evidence_class": "real_observation", ' + json.dumps(FIXTURE)[1:]
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'ambiguous.json'
            path.write_text(raw)
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()) as err:
                code = main([str(path)])
            self.assertEqual(code, 2)
            self.assertIn('REJECTED', err.getvalue())

    def test_cli_rejects_duplicate_nested_event_class(self):
        raw = json.dumps(FIXTURE).replace('"event_class": "DEPLOYMENT_LIFECYCLE"',
            '"event_class": "HUMAN_INTERVENTION", "event_class": "DEPLOYMENT_LIFECYCLE"', 1)
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'ambiguous-nested.json'
            path.write_text(raw)
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()) as err:
                code = main([str(path)])
            self.assertEqual(code, 2)
            self.assertIn('REJECTED', err.getvalue())


if __name__=='__main__': unittest.main()

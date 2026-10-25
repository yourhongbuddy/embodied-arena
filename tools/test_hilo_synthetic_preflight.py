import copy
import json
from pathlib import Path
import unittest
from hilo_synthetic_preflight import check, EVENT_CLASSES

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
    def test_never_claims_certification(self):
        sample=copy.deepcopy(FIXTURE);sample['wants_certification']=True
        self.assertTrue(check(sample))


if __name__=='__main__': unittest.main()

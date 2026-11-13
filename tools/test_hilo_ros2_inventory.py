import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from hilo_ros2_inventory import EVENT_CLASSES, inspect, reject_duplicates

FIXTURE = {
    'evidence_class': 'synthetic_example',
    'claimed_robot_hours': 0,
    'wants_certification': False,
    'topics': [
        {'topic': '/fixture/mission_status', 'ros_type': 'std_msgs/msg/String', 'candidate_event_class': 'DEPLOYMENT_LIFECYCLE'},
        {'topic': '/fixture/robot_status', 'ros_type': 'std_msgs/msg/String', 'candidate_event_class': 'ROBOT_STATE'},
        {'topic': '/fixture/requests', 'ros_type': 'std_msgs/msg/String', 'candidate_event_class': 'HUMAN_REQUEST'},
        {'topic': '/fixture/actions', 'ros_type': 'std_msgs/msg/String', 'candidate_event_class': 'ROBOT_ACTION'},
        {'topic': '/fixture/manual_control', 'ros_type': 'std_msgs/msg/String', 'candidate_event_class': 'HUMAN_INTERVENTION'},
        {'topic': '/fixture/safety', 'ros_type': 'std_msgs/msg/String', 'candidate_event_class': 'INCIDENT'},
    ],
}


class InventoryTests(unittest.TestCase):
    def test_synthetic_complete_mapping_is_not_certification(self):
        result = inspect(copy.deepcopy(FIXTURE))
        self.assertEqual(result['status'], 'synthetic_inventory_checked')
        self.assertEqual(result['missing_candidate_classes'], [])
        self.assertEqual(set(result['mapped_candidate_classes']), EVENT_CLASSES)
        self.assertFalse(result['interface_compatibility_verified'])
        self.assertFalse(result['normative_conformance'])
        self.assertEqual(result['field_robot_hours'], 0)
        self.assertEqual(result['verified_ros2_messages'], 0)

    def test_missing_intervention_remains_unverified(self):
        data = copy.deepcopy(FIXTURE)
        data['topics'] = data['topics'][:-2]
        result = inspect(data)
        self.assertIn('HUMAN_INTERVENTION', result['missing_candidate_classes'])
        self.assertFalse(result['interface_compatibility_verified'])

    def test_reject_actual_data_and_extra_sensitive_fields(self):
        for alteration in ({'evidence_class':'real_field'}, {'claimed_robot_hours': 20},
                           {'wants_certification': True}, {'participant_id':'private'}):
            data = dict(FIXTURE, **alteration)
            self.assertEqual(inspect(data)['status'], 'rejected')
        data = copy.deepcopy(FIXTURE)
        data['topics'][0]['message_payload'] = 'private'
        self.assertEqual(inspect(data)['status'], 'rejected')

    def test_reject_duplicates_and_unbounded_topics(self):
        data = copy.deepcopy(FIXTURE)
        data['topics'].append(copy.deepcopy(data['topics'][0]))
        self.assertEqual(inspect(data)['status'], 'rejected')
        data = copy.deepcopy(FIXTURE)
        data['topics'][0]['topic'] = '/fixture/../../../secrets'
        self.assertEqual(inspect(data)['status'], 'rejected')
        with self.assertRaises(ValueError):
            json.loads('{"a":1,"a":2}', object_pairs_hook=reject_duplicates)

    def test_cli_is_offline_and_does_not_emit_topic_identifiers(self):
        with tempfile.TemporaryDirectory() as td:
            file = Path(td)/'synthetic.json'
            file.write_text(json.dumps(FIXTURE))
            command=[sys.executable, str(Path(__file__).with_name('hilo_ros2_inventory.py')), str(file)]
            result=subprocess.run(command, capture_output=True, text=True, check=True)
            output=json.loads(result.stdout)
            self.assertFalse(output['certification'])
            self.assertNotIn('/fixture/mission_status', result.stdout)
            self.assertNotIn('private', result.stdout)

if __name__ == '__main__':
    unittest.main()

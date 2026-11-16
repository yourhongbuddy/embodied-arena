#!/usr/bin/env python3
"""Offline, SYNTHETIC-ONLY ROS 2 topic-to-HILO event mapping feasibility check.

No ROS 2 subscription, robot control, raw messages, scoring, field-hour accounting,
certification, network activity, or automatic data admission. This checks a
human-authored illustrative topic inventory, not a functioning sensor adapter.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import sys

EVENT_CLASSES = frozenset({
    'DEPLOYMENT_LIFECYCLE', 'ROBOT_STATE', 'HUMAN_REQUEST',
    'ROBOT_ACTION', 'HUMAN_INTERVENTION', 'INCIDENT',
})
_TOPIC = re.compile(r'/[A-Za-z][A-Za-z0-9_]*(?:/[A-Za-z][A-Za-z0-9_]*)*\Z')
_TYPE = re.compile(r'[A-Za-z][A-Za-z0-9_]*(?:/[A-Za-z][A-Za-z0-9_]*){2}\Z')


def reject_duplicates(pairs):
    result = {}
    for key, val in pairs:
        if key in result:
            raise ValueError('duplicate object member')
        result[key] = val
    return result


def inspect(manifest):
    """Return a privacy-minimal diagnostic; never echo topic names or source payloads."""
    errors, present, paths = [], set(), set()
    if not isinstance(manifest, dict):
        return {'status': 'rejected', 'issues': ['Expected object']}
    if set(manifest) != {'evidence_class', 'claimed_robot_hours', 'wants_certification', 'topics'}:
        errors.append('Unexpected or missing top-level fields (names withheld)')
    if manifest.get('evidence_class') != 'synthetic_example' or manifest.get('claimed_robot_hours') != 0 or isinstance(manifest.get('claimed_robot_hours'), bool) or manifest.get('wants_certification') is not False:
        errors.append('Synthetic-only: evidence_class=synthetic_example, claimed_robot_hours=0, wants_certification=false')
    topics = manifest.get('topics')
    if not isinstance(topics, list) or not 1 <= len(topics) <= 32:
        errors.append('topics must have 1..32 synthetic mapping entries')
        topics = []
    for i, item in enumerate(topics):
        label = 'topics[%d]' % i
        if not isinstance(item, dict) or set(item) != {'topic', 'ros_type', 'candidate_event_class'}:
            errors.append(label + ': invalid mapping shape (names withheld)')
            continue
        topic, typ, cls = item['topic'], item['ros_type'], item['candidate_event_class']
        if not isinstance(topic, str) or not _TOPIC.fullmatch(topic) or len(topic) > 128:
            errors.append(label + ': invalid fictional topic identifier')
        elif topic in paths:
            errors.append(label + ': duplicate topic')
        else:
            paths.add(topic)
        if not isinstance(typ, str) or not _TYPE.fullmatch(typ) or len(typ) > 128:
            errors.append(label + ': invalid ROS 2 type string')
        if not isinstance(cls, str) or cls not in EVENT_CLASSES:
            errors.append(label + ': unknown candidate event class')
        else:
            present.add(cls)
    if errors:
        return {'status': 'rejected', 'issues': errors, 'field_robot_hours': 0, 'certification': False}
    missing = sorted(EVENT_CLASSES - present)
    return {
        'status': 'synthetic_inventory_checked',
        'mapped_candidate_classes': sorted(present),
        'missing_candidate_classes': missing,
        'mapping_count': len(topics),
        'field_robot_hours': 0,
        'certification': False,
        'verified_ros2_messages': 0,
        'interface_compatibility_verified': False,
        'normative_conformance': False,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', help='synthetic example JSON only; no field data')
    args = parser.parse_args(argv)
    try:
        # Bounded read, avoiding inadvertent large/private log ingestion.
        p = Path(args.manifest)
        if p.stat().st_size > 32768:
            raise ValueError('file too large')
        data = json.loads(p.read_text(encoding='utf-8'), object_pairs_hook=reject_duplicates)
    except (OSError, ValueError, UnicodeError) as exc:
        print(json.dumps({'status':'rejected','issue':'unreadable/invalid synthetic manifest','error_type':type(exc).__name__}))
        return 2
    output = inspect(data)
    print(json.dumps(output, indent=2))
    return 1 if output['status'] == 'rejected' else 0


if __name__ == '__main__':
    sys.exit(main())

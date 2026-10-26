#!/usr/bin/env python3
"""Offline illustrative HILO event-provenance preflight (NON-NORMATIVE).

Synthetic examples only: not the canonical WANTED conformance verifier, not a
field collection adapter, evaluator, or safety certification. No network calls,
model requests, uploads, score changes, or robot-hour claims.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys

EVENT_CLASSES = frozenset({
    'DEPLOYMENT_LIFECYCLE', 'ROBOT_STATE', 'HUMAN_REQUEST',
    'ROBOT_ACTION', 'HUMAN_INTERVENTION', 'INCIDENT',
})


def check(data):
    errors = []
    if not isinstance(data, dict):
        return ['Expected a JSON object']
    if data.get('evidence_class') != 'synthetic_example':
        errors.append('evidence_class must be synthetic_example; real field data is not accepted')
    certification = data.get('wants_certification', False)
    robot_hours = data.get('claimed_robot_hours', 0)
    if certification is not False or isinstance(robot_hours, bool) or not isinstance(robot_hours, (int, float)) or robot_hours != 0:
        errors.append('synthetic records require wants_certification=false and claimed_robot_hours=0')
    if 'description' in data and (not isinstance(data['description'], str) or len(data['description']) > 512):
        errors.append('description must be plain text no longer than 512 characters; nested objects are not accepted')
    top_allowed = {'description', 'evidence_class', 'claimed_robot_hours', 'wants_certification', 'events'}
    if extra := set(data) - top_allowed:
        errors.append('unrecognized top-level fields (may contain private data): ' + ', '.join(sorted(extra)))
    events = data.get('events')
    if not isinstance(events, list) or not events:
        return errors + ['events must be a nonempty array']
    seen, previous = set(), None
    for i, event in enumerate(events):
        p = f'events[{i}]'
        if not isinstance(event, dict):
            errors.append(p + ' must be an object')
            continue
        event_allowed = {'event_id', 'event_class', 'timestamp_utc', 'human_assistance_seconds'}
        if extra := set(event) - event_allowed:
            errors.append(p + ' has unrecognized fields (may contain private data): ' + ', '.join(sorted(extra)))
        ident = event.get('event_id')
        if not isinstance(ident, str) or not ident:
            errors.append(p + '.event_id must be a nonempty string')
        elif ident in seen:
            errors.append(p + '.event_id duplicates an earlier event')
        else:
            seen.add(ident)
        typ = event.get('event_class')
        if not isinstance(typ, str) or typ not in EVENT_CLASSES:
            errors.append(p + '.event_class is not one of the six published classes')
        ts = event.get('timestamp_utc')
        try:
            if not isinstance(ts, str) or not ts.endswith('Z'):
                raise ValueError()
            dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
            if dt.tzinfo != timezone.utc:
                raise ValueError()
            if previous is not None and dt < previous:
                errors.append(p + '.timestamp_utc is before an earlier event')
            previous = dt
        except (ValueError, TypeError):
            errors.append(p + '.timestamp_utc must be an ISO 8601 UTC Z timestamp')
        duration = event.get('human_assistance_seconds')
        if typ == 'HUMAN_INTERVENTION':
            if isinstance(duration, bool) or not isinstance(duration, (int, float)) or not (0 <= duration <= 86400):
                errors.append(p + '.human_assistance_seconds must be a finite bounded numeric duration in seconds')
        elif duration is not None:
            errors.append(p + '.human_assistance_seconds is only valid for HUMAN_INTERVENTION')
        if 'participant_id' in event or 'home_video' in event:
            errors.append(p + ' contains fields excluded from this privacy-minimal synthetic fixture')
    return errors


def reject_duplicate_json_members(pairs):
    """Fail closed instead of silently overwriting ambiguous evidence fields."""
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('duplicate JSON object member')
        result[key] = value
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('file', help='local synthetic JSON fixture (do not use real records)')
    args = parser.parse_args(argv)
    try:
        data = json.loads(Path(args.file).read_text(encoding='utf-8'),
                          object_pairs_hook=reject_duplicate_json_members)
    except (OSError, ValueError) as exc:
        print(f'REJECTED: unreadable/invalid local JSON ({type(exc).__name__})', file=sys.stderr)
        return 2
    errors = check(data)
    if errors:
        print(json.dumps({'status': 'rejected', 'evidence_class': 'synthetic_only', 'issues': errors}, indent=2))
        return 1
    print(json.dumps({'status': 'synthetic_preflight_pass', 'events_seen': len(data['events']),
                      'classes_seen': sorted(set(x['event_class'] for x in data['events'])),
                      'field_robot_hours': 0, 'certification': False,
                      'normative_conformance': False}, indent=2))
    return 0


if __name__ == '__main__':
    sys.exit(main())

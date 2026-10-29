# HILO synthetic-only telemetry preflight (non-normative)

This is a **standalone offline developer exercise**, not the canonical WANTED protocol verifier, safety certification, real-field collector, participant consent checker or scoring implementation. It neither changes frozen scores and holdouts nor uploads data, uses paid models, publishes content or deploys software.

## Use

From the repository root (Python 3.10+):

```sh
python tools/hilo_synthetic_preflight.py tools/hilo_synthetic_fixture.json
python -m unittest discover -s tools -p 'test_hilo_synthetic_preflight.py' -v
```

The bundled fixture is explicitly invented. A successful run must report `synthetic_preflight_pass`, `field_robot_hours: 0`, `certification: false` and `normative_conformance: false`. Nonzero process status means rejected input or invalid/unreadable JSON. No network access, API key, external dependency or model is required.

## What this checks, and what it does not

The illustrative format uses six published event-class **names**: DEPLOYMENT_LIFECYCLE, ROBOT_STATE, HUMAN_REQUEST, ROBOT_ACTION, HUMAN_INTERVENTION and INCIDENT. The preflight rejects unknown classes, repeated IDs, out-of-order UTC timestamps, missing or implausible human-assistance seconds, extra object keys, certification requests and claimed robot hours. It is intentionally narrower than the canonical event schema and never attempts to convert these examples into observation evidence.

For `HUMAN_INTERVENTION`, the numeric `human_assistance_seconds` field is required and bounded. For all other event classes the field must be **absent**, not zero or explicit JSON `null`. The latter previously passed through a value-only check; this is now rejected so synthetic event shape has unambiguous intervention-only semantics. This remains structural validation, not evidence of an actual intervention.\n\nSynthetic `event_id` values must be 1–64 ASCII characters: a leading letter or digit followed by letters, digits, underscores or hyphens. Whitespace-only, path-like, email-like and oversized identifiers are rejected. This structural rule does **not** prove IDs are non-identifying; never include names or participant identifiers.

The optional top-level `description` must be plain text at most 512 characters. Nested object/list descriptions and overlong descriptions are rejected. This structural check does **not** remove personal information from otherwise allowed text.

The command-line JSON reader also rejects **duplicate object keys at any nesting level** rather than silently retaining the last value. For example, a file with contradictory `evidence_class` or `event_class` members is malformed, even when the last value appears harmless. That rejection is a parser-integrity check, **not** proof of provenance or privacy compliance.

The October 29 diagnostic hardening stops echoing **unexpected JSON key names** in validation issues or CLI output. Keys can themselves embed an email, path, or identifier, so rejection messages now report only a count and state that names were omitted. Both top-level and event-level unknown keys are still rejected. This is a limited logging reduction, **not** PII detection or a claim that allowed free-text fields are safe to publish. Tests cover both the Python checker and CLI output.\n\n**Do not feed it real household logs, private video, recordings or identifiers.** Restricting keys cannot detect all private information inside an allowed free-text description. The preflight does not verify an observation was collected, that consent was obtained, that incidents were adjudicated, that the privacy policy was satisfied, or that a score is statistically supported. For real integration consult the pinned canonical protocol, its required sidecar/provenance and independent human/source-admission reviews before collecting anything.

## Distribution status

Repository-only reviewed source: **not released** on PyPI, GitHub Actions Marketplace, skills directories or other stores. Packaging, license/redistribution decision, artifact signatures, real install tests and owner/publisher authority remain outstanding. No automatic releases or paid service calls.

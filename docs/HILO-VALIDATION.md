# HILO research-kit validation — 2026-09-04

Scope: new 0.1-RM1 reference utilities and research page; not field testing or certification.

| Check | Actual result |
|---|---|
| `node --test tests/hilo-review-mining.test.mjs` | 35 tests passed; 0 failed on Node 22.16.0 |
| `node --check public/hilo/hilo-review-mining.mjs` | Passed |
| JSON Schema Draft 2020-12 meta-validation | Passed using Python jsonschema |
| Two explicitly synthetic JSONL fixtures against schema | Passed with format checking |
| New page and modified navigation TSX syntax | Passed TypeScript `transpileModule` diagnostics |
| Complete existing site build, lint, and release gate locally | Not executed: full dependency-installed checkout unavailable |
| Million-hour throughput / distributed execution | Not tested; architecture and capacity scenarios only |
| Physical robot trial / acquired video | Not performed; both collection counters remain zero |

The test suite exercises evidence boundaries, source normalization, real timestamps, schema restrictions, consent metadata, duplicate footage, overlapping camera/session coverage, conflicting unit locations, separate simulated/human/field clocks, human burden, all-stage mission completion, zero-event statistical bounds, capacity arithmetic, streaming line limits, I/O failures and CLI behavior.

The dedicated `hilo-research.yml` workflow runs the reference tests on relevant pushes and pull requests with read-only repository permissions. It is **not** a review crawler or video-collection schedule. The repository's existing complete verification remains required before merging and deployment. Adding code to a GitHub branch does not deploy the website.

These tests verify the implementation's stated behavior on synthetic fixtures. They do not validate real-world model accuracy, physical safety, data licenses, prospective lifetime claims, independent incident adjudication or the scientific adequacy of a chosen field sample.

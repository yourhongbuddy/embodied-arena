# HILO research-kit validation — 2026-09-05 America/Los_Angeles

Scope: 0.1-RM1 reference utilities and research page; not physical testing or certification.

## Observed GitHub Actions results

The following results were read from actual workflow logs for head `7bb10f7d2538a86e9bcfdc970eb98baa5ddd74ce`, evaluated as PR merge commit `8bccdb955a1f62d76084398ab8ffa884f47686da`. GitHub timestamps are September 6 UTC, September 5 in America/Los_Angeles.

| Check | Observed result |
|---|---|
| HILO reference tests | **35 passed, 0 failed, 0 skipped**, Node **22.23.2**, Ubuntu GitHub runner |
| Existing release-tag verification | Passed: 123 contiguous, monotonic release tags |
| Existing repository ESLint | Passed |
| Existing full `vinext build` | Passed; standalone output generated |
| Existing main test batch | **320 passed, 1 failed** |
| Failure | Frozen landing-page source digest for `app/components/SiteNav.tsx` changed |
| Later chained verification stages | Not reached after that failure |

Reference test run: https://github.com/yourhongbuddy/embodied-arena/actions/runs/34002785636

Initial repository verification: https://github.com/yourhongbuddy/embodied-arena/actions/runs/34002785601

The corrective commit restores `SiteNav.tsx` byte-for-byte to the base release. The isolated research route remains at `/wanted-10k/failure-mining`; changing the global navigation requires a deliberately versioned experiment cohort and is outside this add-on. No frozen hashes, tests, experiment definitions or release tags were weakened or rewritten. Consult PR #1 checks for the correction's actual result; the earlier passing build is not automatically a passing result for every later commit.

## Correction to the initial validation note

The initial note incorrectly described local Node 22.16.0 tests, `node --check`, Python JSON Schema validation and TypeScript `transpileModule` checks as completed. Those local checks were **not established** and are withdrawn. A full local checkout failed because the environment could not resolve github.com. The independently observed remote results above replace those claims. JSON Schema shape and runtime semantic checks are implemented; independent schema-engine conformance should not be claimed without its own executed test.

## Boundaries

The 35 reference tests exercise evidence labels, source normalization, real timestamps, record restrictions, consent metadata, duplicate footage, overlapping coverage, conflicting robot locations, separate simulated/human/field clocks, human burden, all-stage mission completion, zero-event statistical bounds, capacity arithmetic, incremental line limits, I/O failures and CLI behavior.

These are synthetic software tests, not independent incident verification, rights approval, extraction-model accuracy, physical safety, million-hour throughput or robot-lifetime validation. No real video or field robot-hours were acquired. No crawler, ongoing worker, paid infrastructure or production deployment is represented by a passing test.

The dedicated workflow uses read-only repository permissions. Full repository checks remain required before merge. PR #1 is the authoritative review surface: https://github.com/yourhongbuddy/embodied-arena/pull/1

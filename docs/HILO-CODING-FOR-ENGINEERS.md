# Coding for Engineers tab

Added September 27, 2026. Proposed route: `/coding-for-engineers`.

## Scope

Adds a real top-level HILO navigation entry and a server-rendered comparison of the three user-requested external benchmarks: ProgramBench, SRE-Bench and Code Migration. Native anchor links and expandable submitted-score tables work without JavaScript. Primary navigation wraps on narrow screens. The page links the existing robot protocol and SDK and provides downloadable structured comparison data at `/coding-for-engineers/benchmarks.json`.

No inference service, executable-upload backend, benchmark runner, robot controller, new tracking, credentials, outreach, store submission or deployment is added. Zero HILO benchmark executions are implied. The original WANTED score, data engine, holdouts and certification rules are unchanged. Existing PRs #7, #8, #10 and #11 are not edited.

## Provenance

The three original supplied tables are retained exactly as `user_supplied` snapshots, received September 27, with unknown run dates and harness settings kept null. These are not verified as a set. Source-page checking is not a reproduction of a benchmark.

Primary sources checked September 27:
- https://programbench.com/ — page dated September 9: execute-only reference binary; no source, internet or decompilation; fully resolved programs are the headline metric. Selected publisher rows differ from the newer-looking supplied figures, so neither snapshot silently replaces the other.
- https://www.vals.ai/benchmarks/srebench — page dated September 21: reverse-engineering toolkit allowed; capability task fraction differs from fully solved instances. Supplied percentages were not confirmed in retrievable text. No missing score is filled with zero.
- https://www.vals.ai/benchmarks/code-migration — page dated September 22: repository-weighted hidden-test pass rate, separate code-quality diagnostic. The published 67.7% Astra overall figure matches the supplied one. Selected other publisher rows have exact source labels; unsupported submitted rows remain labeled.

Publication dates were not established and remain null. Source update dates and retrieval dates are distinct. There is no cross-benchmark average, inferred confidence interval, invented cost or implied publisher affiliation. The engineering use cases are HILO suggestions, not claims that the external benchmarks certify robotics.

## Validation and release

`node --test tests/coding-for-engineers.test.mjs` checks data separation, exact supplied scores, metrics, navigation, SSR, metadata, safe scope and release configuration. The feature workflow builds with locked dependencies, probes the actual local production server, checks linked CSS/JS, and records desktop/mobile Chrome rendering. Full repository verification is separately required.

A passing CI run or repository link is not a public deployment. Follow `docs/RELEASE-CHECKLIST.md`, preserve `deploy_on_push: false`, and verify the exact public route and its source revision after an authorized release. Do not work around the existing custom-domain/hosting binding discrepancy by changing DNS as part of this tab.

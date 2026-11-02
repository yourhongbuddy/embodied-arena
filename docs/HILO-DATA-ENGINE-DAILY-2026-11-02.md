# HILO data-engine public-method review — 2026-11-02

**Review vantage:** official public documentation retrieved 2026-11-02. Publication dates are retained from the originating documents where known; current retrieval is not a claim of new publication or comprehensive coverage. This work belongs to data-engine PR #7, separately from GrowthOps PR #10 and diagnostic PR #8.

## Source admission: no material new evidence

- The 13 existing OpenAI worker-method cards already cover human demonstrations and comparisons, InstructGPT/RL feedback, Dactyl and automatic domain randomization, weak video/action labels, external data partnerships, quality controls, privacy/safety and continuous evaluation. See `config/hilo-data-engine.json`; these are publicly documented methods, not copied private practices or licensed datasets.
- OpenAI's [layered-monitoring article](https://openai.com/index/how-we-detect-frontier-model-misalignment/) is **already staged**. Its **primary-source publication date is October 29, 2026**, not October 28 as originally recorded. The November 2 provenance correction updates `published_on` in `config/hilo-source-intake-20261030.json` but keeps the stable candidate ID and original October 30 retrieval date. The article's public date was independently checked on November 2. This is a source-metadata correction, **not** a new admission or a new method; do not duplicate its proposed synthetic-only monitoring coverage diagnostic.
- The external advisory ledger continues to separate Stanford/Columbia [DITTO-X](https://tml.stanford.edu/ditto-x/), Oxford [OASIS-Map](https://dynamic.robots.ox.ac.uk/projects/oasis-map/), Harvard HRI/human-in-the-loop materials and NVIDIA digital-twin/simulation references from the OpenAI worker cards. Reported task episodes and simulated hours cannot substitute for permissioned real robot/resident hours, human keep decisions, or HILO certification.
- OpenAI's [Getting started with datasets](https://developers.openai.com/api/docs/guides/evaluation-getting-started) (living documentation; original publication date not verified, retrieved 2026-11-02) still says the legacy Evals platform was scheduled to become read-only 2026-10-31 and shut down 2026-11-30. This is a platform-lifecycle risk, not a new data method or authorization to connect APIs.

**Admission decision:** No newly reviewed source met the distinct-method, rights and human-entailment-review gates in `docs/HILO-SOURCE-ADMISSION.md` today. No intake was fabricated; all previously proposed intake cards remain `consumed_by_workers:false` and `automatic_promotion:false`. Frozen scoring, consent, stop authority, privacy and sealed holdout boundaries remain unchanged.

## Execution and CI

The independent plan is **100 research job definitions**, not 100 live agents. Last verified PR #7 head before this note: `655c42e5af0f9cc89aee3f81eabc37becd644a9a`; GitHub Actions data-engine check `41334054329` passed on 2026-11-01, with 45 offline tests passing, 100 planned and **zero live starts/completions**. New CI for this documentation revision must be checked independently.

The default-branch scheduled workflow is **not healthy**: run [41343305237](https://github.com/yourhongbuddy/embodied-arena/actions/runs/41343305237) on 2026-11-01 passed offline validation and planning but failed the live-configuration preflight in approximately 7 seconds. Its older default-branch workflow treats intentionally disabled live mode/missing model credentials as failure. PR #7 contains a reviewable `live_disabled` correction but is **not merged**; do not enable live APIs to silence this failure. This note neither merges nor deploys.

No model calls, training, new source admission, field study, real robot hours, human keep votes, dataset uploads, partnerships, spending or certification.

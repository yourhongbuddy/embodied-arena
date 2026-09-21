# HILO Data Engine — Daily Changelog

This file records source-ledger, runner, CI and deployment changes. It is not a field-study log and does not create WANTED evidence, certification, or leaderboard entries.

## 2026-09-21

### Prior execution evidence checked

Latest completed HILO workflow on `digitalocean` before this update: run `35559859383`, commit `706f3f0d8944db66edfe81504a889dbe92c73983`.

- Offline unit tests: 10/10 passed.
- Offline plan: 100 worker assignments.
- Live model requests started: 0.
- Live model requests completed: 0.
- Failed live workers: 0 because no live worker was started.
- Real robot hours collected: 0.
- Preflight state: live configuration unavailable (`HILO_ENABLE_LIVE`, model, API secret were absent).
- The workflow itself reported failure because the original preflight treated intentional live-disablement as an error. This update changes that behavior: disabled live execution becomes `live_disabled`; an error is raised only if live execution is explicitly enabled while required model/secret configuration is missing.

### OpenAI primary-source additions

Added four reviewed cards to the worker evidence pool, with publication and retrieval dates stored separately:

1. `summary-feedback-quality` — https://openai.com/index/learning-to-summarize-with-human-feedback/ — human-comparison quality controls, agreement monitoring, and reward-model overoptimization checks.
2. `rule-based-rewards` — https://openai.com/index/improving-model-safety-behavior-with-rule-based-rewards/ — machine-checkable safety rewards for explicit routine policies, kept separate from human field adjudication.
3. `collective-alignment` — https://openai.com/index/collective-alignment-aug-2025-updates/ — diverse participant rankings/rationales, human-first and automated proposal loops, and review before policy changes.
4. `economic-research-exchange` — https://openai.com/index/economic-research-exchange-request-for-proposals/ — scoped external research with privacy-preserving analysis of usage data.

No claim is made that these four cards exhaust OpenAI's internal or public data practices.

### Separately attributed robotics and digital-twin references

Added `reference_sources` entries for Stanford BEHAVIOR 2026, Harvard SIFToM, Harvard Biodesign Lab personalized pHRI, Oxford Robotics Institute GOALS, NVIDIA Isaac Sim, NVIDIA Isaac Lab-Arena, Figure Index, and 1X NEO.

These records are deliberately marked `consumed_by_workers: false`. They inform HILO design review but do not silently change the evidence supplied to the 100 worker prompts. Public availability is not treated as permission to ingest underlying datasets or participant recordings.

### Test and workflow changes

- Added `tools/test_hilo_reference_sources.py` to enforce publisher attribution, retrieval dates, unique IDs, and external-reference separation from worker prompts.
- Expanded CI discovery from one exact test filename to `test_hilo*.py`.
- Added data-engine config, tests and docs to workflow path triggers.
- Changed optional-live preflight so ordinary offline scheduled runs do not fail solely because live credentials are intentionally absent.
- Live execution still fails closed if `HILO_ENABLE_LIVE=1` while the model or API secret is missing.

### Evidence boundaries unchanged

- Official WANTED scoring protocol: unchanged.
- Sealed holdout policy: unchanged.
- Safety/privacy/voluntary-choice gates: unchanged.
- Human keep votes: none generated.
- Certification/leaderboard entries: none created.
- Deployment: not performed.

### Next backlog

- Review CI on the focused PR before any merge.
- Add a reviewed admission policy before any external `reference_sources` can enter worker prompts.
- Configure a provider model/API secret/spending limit only through repository or provider secret controls; do not store credentials in source.
- Compare 100-worker output quality against 1- and 10-worker baselines at matched cost and human-review budget.
- Keep website deployment separate from source merge and follow `docs/RELEASE-CHECKLIST.md`.

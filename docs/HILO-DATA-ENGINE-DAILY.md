# HILO Data Engine — Daily Changelog

## 2026-09-25

### Public-source review

Staged `openai-third-party-assessment-principles` from OpenAI's September 22 publication on independent third-party assessments. The source supports an audit-design pattern in which outside assessors can challenge assumptions, identify missed risks, reach independent conclusions about safeguard effectiveness, and receive meaningful access across training, evaluation, and deployment. The proposed HILO adaptation is an independent release-auditor role with explicit evidence-access limits and conclusions kept separate from sponsor claims. It remains `consumed_by_workers: false`, creates no certification, and does not modify WANTED scoring.

The September 25 institutional scan found no stronger Stanford or Oxford method source worth duplicating into the ledger. Stanford IPRL's current page confirms CoRL 2026 work but lacks enough method detail on the checked page for a new HILO card; an Oxford autonomy/agency publication is relevant conceptually but is not a robotics collection/simulation/longitudinal evaluation method. Harvard RLE-Bench remains staged from September 23. These non-admissions are recorded rather than manufacturing novelty.

Fresh CI is required before reporting today's exact test count or 100-job plan status. No live model execution, robot hours, human keep votes, publication, or deployment is created by this intake.

This file records source-ledger, runner, CI and deployment changes. It is not a field-study log and does not create WANTED evidence, certification, or leaderboard entries.

## 2026-09-22

### Execution and CI evidence checked

PR #7 remained open at the start of this update. Its September 21 head (`0b2c48f04351534800367ca22e3e9aea2be808b9`) had both required checks passing:

- `HILO data-engine checks and daily plan` run `35617685981`: success.
- `Verify repository` run `35617685691`: success.

The latest scheduled HILO workflow found on the default `digitalocean` branch was run `35648415404` on commit `706f3f0d8944db66edfe81504a889dbe92c73983`. Because PR #7's corrected preflight behavior had not been merged, that scheduled run still used the older PR #6 workflow and failed at live configuration preflight even though offline work succeeded.

Artifact `10661056437` was downloaded and inspected:

- Offline plan: exactly 100 worker assignments.
- Live model requests started: 0.
- Live model requests completed: 0.
- Real robot hours collected: 0.
- Preflight status: `blocked_missing_configuration`.
- `HILO_ENABLE_LIVE=1`: false.
- configured model present: false.
- API secret present: false.
- credential values recorded: false.

No live runner was invoked because an approved model, credential and spending authorization were not available through the authorized execution path. A planned job is not counted as an agent execution.

### September 22 public-source review

Daily discoveries are now staged before admission in `config/hilo-source-intake-20260922.json`; none of the new IDs automatically enter the worker evidence pool.

Four supported candidates were staged with publication and retrieval dates separated:

1. `openai-misalignment-reporting` — OpenAI, published 2026-09-16. The source defines a systematic lifecycle process for flagging, investigating, triaging and disclosing concerning model behavior, plus standard report fields covering severity, impact, setting, dates, discovery, investigation, unresolved questions and mitigations. Proposed HILO use: a non-ranking robot incident dossier and recurrence/regression queue.
2. `openai-privacy-filter` — OpenAI, published 2026-04-22. The source describes a locally runnable PII filter built with a privacy taxonomy, public plus synthetic training data, model-assisted annotation/review, corrected benchmark annotations and explicit limitations. Proposed HILO use: a pre-ingest text-privacy gate with held-out false-negative tests and human review, not an anonymization claim.
3. `figure-helix-2-5` — Figure, published 2026-09-17. Figure reports zero-shot testing of three long-horizon behaviors across 30 unseen homes, plus an Index-pretraining ablation from 9% to 56% under fixed task-specific conditions. Proposed HILO use: preregistered held-out-site generalization; the result remains company-reported until independently reproduced and is never resident-hour evidence.
4. `nvidia-simready-agentic-scenes` — NVIDIA, published 2026-09-16. NVIDIA describes an agent workflow that adds semantics, physics, sensors, collision properties and rendered preflight checks to OpenUSD before SimReady validation and Isaac Sim/Lab handoff. Proposed HILO use: a machine-readable digital-twin readiness gate with source hashes, generated diffs and human-reviewed exceptions.

The GPT-6 Astra launch page was also reviewed but not admitted as a distinct source card: it reports relevant scope-safety evaluation results, but the public description does not add enough separate method-construction detail beyond the existing continuous-evaluation and staged misalignment-reporting methods.

No materially stronger new Stanford, Harvard or Oxford primary evidence was found in this scan beyond the references already present on PR #7. That is recorded explicitly rather than manufacturing a source addition.

### Admission-control implementation

Added `docs/HILO-SOURCE-ADMISSION.md` and a staged-source workflow:

- daily discovery files never promote themselves;
- OpenAI method candidates target `sources` only after reviewed promotion;
- robotics/digital-twin candidates target `reference_sources` and remain advisory;
- public availability never implies dataset/training/publication rights;
- promotion must preserve evidence classes, holdouts, safety/privacy gates and the frozen WANTED estimand;
- promotion changes are test-gated and require source-entailment review.

Added `tools/test_hilo_source_intake.py` to verify that staged IDs are unique, primary-source routed, date-explicit, `consumed_by_workers: false`, absent from the current manifest, and absent from all 100 current job assignments. Reviewed-but-not-admitted sources must include an explicit reason.

Updated `.github/workflows/hilo-data-engine.yml` so staged intake files and the admission policy trigger CI. Existing read-only permissions, `deploy_on_push: false`, sealed-holdout protections and no-auto-deploy behavior remain unchanged.

Local checks available in this runtime:

- staged intake JSON structural validation: PASS (4 unique candidates);
- new Python test file syntax compilation: PASS.

A full local repository test run was not possible because this execution environment could not resolve GitHub for `git clone`; GitHub-hosted CI is therefore the authoritative full-suite execution for these commits.

### Public route and evidence boundaries

An independent GitHub-hosted browser/HTTP diagnostic on September 21 observed both `https://getrobotrouter.com/wanted-10k` and `https://getrobotrouter.com/wanted-10k/data-engine.html` serving HTTP 200 and rendering. That observation does not identify the exact deployed source commit and does not replace the repository release checklist.

Evidence boundaries remain unchanged:

- official WANTED scoring protocol: unchanged;
- sealed holdout policy: unchanged;
- safety/privacy/voluntary-choice gates: unchanged;
- human keep votes generated: 0;
- real robot hours generated: 0;
- certification/leaderboard entries created: 0;
- source changes auto-promoted: 0;
- production deployment performed by this update: 0.

### Next backlog

- Review the newly triggered PR #7 CI before any merge.
- Promote staged sources only through `docs/HILO-SOURCE-ADMISSION.md`, never directly from search results.
- Configure a provider model/API secret/spending limit only through approved secret controls if live workers are desired.
- Compare the 100-worker design against 1- and 10-worker baselines at matched cost and human-review budget.
- Add a persistent proposal ledger/manifest-delta audit without sealed-holdout access.
- Resolve the standalone-host assignment-receipt compatibility issue without making optional experiment analytics part of the benchmark's critical rendering path.

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

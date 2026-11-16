# HILO Data Engine — Public-Method Adaptation and Daily Loop

Version 0.1 · Source review through September 22, 2026 · Independent HILO/WANTED-10K project

## 1. Scope and truthful operating status

This module adapts publicly documented OpenAI research and data-development practices to HILO. It is not an exhaustive reconstruction of OpenAI's internal systems, a copy of its training corpora, an affiliation, or a claim to completed robot field studies. The canonical WANTED protocol and official scores remain unchanged.

The worker evidence pool currently contains 13 reviewed OpenAI primary-source cards. A separate `reference_sources` ledger contains independently attributed robotics and digital-twin evidence from Stanford, Harvard, Oxford, NVIDIA, Figure, and 1X. Those external references are advisory and explicitly `consumed_by_workers: false`; they do not silently enter the 100-job worker prompts.

Beginning September 22, daily discoveries are staged first in dated `config/hilo-source-intake-YYYYMMDD.json` snapshots under the explicit promotion rules in `docs/HILO-SOURCE-ADMISSION.md`. Discovery alone does not change the worker manifest. This keeps new source review auditable and prevents daily search volume from silently shifting the 100-job evidence distribution.

Implemented here: 100 distinct worker assignments, a bounded live-API runner, offline validation, collection-sidecar validation, a website research preview, GitHub CI, source-attribution tests, and staged daily source intake. Live model execution requires credentials, an explicit model, and operator approval. Offline plans and mock tests are never represented as live agents. This module has no production robot-data storage, sensor capture service, physical controller, model-training pipeline, certification authority, or automatic deployment authority.

Publication dates and retrieval dates are stored separately where the source exposes a publication date. `checked_on` is retained for compatibility with the original runner; `retrieved_on` is the explicit retrieval field used by the expanded ledger and staged intake.

## 2. OpenAI public methods and proposed HILO transfers

The admitted machine-readable source ledger is `config/hilo-data-engine.json`. The existing nine source cards remain, and the September 21 review added four materially relevant OpenAI primary sources:

| Public reference | Documented method | Proposed HILO transfer |
|---|---|---|
| [Learning to summarize with human feedback, 2020](https://openai.com/index/learning-to-summarize-with-human-feedback/) | Pairwise human comparisons, labeler onboarding, clear quality definitions, agreement monitoring, and post-optimization human checks. | Treat rater training, disagreement and researcher-rater calibration as first-class quality controls. |
| [Rule-Based Rewards, 2024](https://openai.com/index/improving-model-safety-behavior-with-rule-based-rewards/) | Programmatic safety rewards reduce repeated human labeling for explicit routine policies. | Use machine-checkable safety regression rules only for development cases whose desired behavior is explicit; never replace human field adjudication or safety gates. |
| [Collective alignment, 2025](https://openai.com/index/collective-alignment-aug-2025-updates/) | More than 1,000 participants ranked candidate responses and supplied rationales; human-first and automated proposal loops remained subject to review. | Preserve rationales, subgroup disagreement and human review before converting preferences into benchmark-policy changes. |
| [Economic Research Exchange, 2026](https://openai.com/index/economic-research-exchange-request-for-proposals/) | Scoped external research collaborations with privacy-preserving analysis of usage data. | Define research purpose and privacy-preserving access before sharing longitudinal telemetry; research access is not training or publication permission. |

The original cards continue to cover pairwise preferences, Dactyl and automatic domain randomization, InstructGPT demonstrations and rankings, Video PreTraining weak labels, external red teaming, Data Partnerships, sycophancy/short-term feedback risk, and continuous evaluation.

The September 22 staged intake adds two **proposed, not yet admitted** OpenAI method cards:

- **Misalignment reporting framework (September 16, 2026):** a systematic process for flagging, investigating, triaging, and reporting concerning behavior across training, evaluation, testing, and deployment. Proposed HILO use: a versioned non-ranking incident dossier that records discovery, scope, third-party impact, uncertainty, corrective action, recurrence, and follow-up regression tests.
- **OpenAI Privacy Filter (April 22, 2026):** a locally runnable PII-masking workflow with an explicit privacy taxonomy, supervised token classification, public plus synthetic data, model-assisted annotation/review, corrected benchmark annotations, and stated limitations. Proposed HILO use: a pre-ingest text-privacy gate for transcripts, annotations, logs, and support notes, with held-out false-negative testing and human review for sensitive cases.

These two candidates remain `consumed_by_workers: false` until a separate reviewed promotion modifies `config/hilo-data-engine.json` and regenerates the 100-job plan. GPT-6 Astra's launch page was reviewed but not admitted as a separate method card because it reports relevant safety-evaluation results without enough distinct method-construction detail beyond existing continuous-evaluation and misalignment-reporting sources.

The OpenAI evaluation guidance cautions against multi-agent complexity without evidence that it helps. HILO should therefore compare its 100-worker design with smaller 1- and 10-worker baselines at matched token and human-review budgets. One hundred jobs satisfy the current project design; they do not establish that 100 is optimal.

## 3. External robotics and digital-twin references

These are separately attributed primary references, not affiliations, partnerships, certifications, or imported datasets. They are not currently supplied to the live worker prompts.

- **Stanford BEHAVIOR 2026:** reports 20,000 human teleoperation demonstrations totaling 1,950 hours, with RGB/depth, proprioception, actions, and skill/subtask annotations for long-horizon household tasks. HILO can borrow the synchronized multimodal demonstration pattern while keeping simulated teleoperation hours distinct from real resident hours.
- **Harvard SIFToM:** tests spoken instruction following under noisy speech in simulation and real-world human-robot collaboration with human evaluations. HILO should include ambiguity/noise tests and score safe clarification or fallback rather than assuming perfect transcripts.
- **Harvard Biodesign Lab:** reports personalized physical human-robot calibration from about 90 seconds of on-body data and evaluation with 12 human participants. HILO should disclose calibration burden and test post-personalization generalization separately.
- **Oxford Robotics Institute GOALS:** studies robots operating for days, weeks or months in dynamic uncertain environments, online model updates, uncertainty-aware planning, and switching between autonomous and human control. These map directly to longitudinal adaptation and intervention diagnostics.
- **NVIDIA Isaac Sim:** provides physically based simulation, controllable synthetic-data generation, real-world capture ingestion, and software-/hardware-in-the-loop validation. HILO can use it as an optional preflight/regression substrate, never as resident-hour evidence.
- **NVIDIA Isaac Lab-Arena:** supports task diversification and parallel simulated evaluation across embodiments and environments. Parallel simulations remain correlated synthetic evidence, not independent people.
- **Figure Index:** Figure describes filtering, human fraud review, embedding-based deduplication, rebalancing and hierarchical annotation for large-scale physical-video data. HILO can adapt these as permissioned development-data quality stages without inferring usage rights or resident hours.
- **1X NEO:** 1X publicly describes autonomy plus scheduled Expert Mode, remote control, memory personalization and self-charging. HILO should make every remote expert/control interval visible as assistance burden and keep personalization memory subject to explicit consent/privacy controls.

The September 22 intake stages two additional external references without admitting them to `reference_sources` yet:

- **Figure Helix 2.5 (September 17, 2026):** Figure reports three long-horizon behaviors across 30 unseen homes with no environment-specific data collection, fine-tuning, or adaptation, plus an Index-pretraining ablation from 9% to 56% zero-shot success under fixed task-specific conditions. Proposed HILO use: preregistered held-out-site generalization with familiar/unseen results reported separately and independent replication before any benchmark claim.
- **NVIDIA agentic SimReady workflow (September 16, 2026):** NVIDIA describes agents preparing OpenUSD scenes by adding semantic labels, physics, sensors, collision properties, rendered preflight views, and SimReady validation before Isaac Sim/Lab use. Proposed HILO use: a machine-readable digital-twin readiness gate binding source-scene hashes, generated USD diffs, physics/sensor metadata, validation results, and human-reviewed exceptions.

No materially stronger new Stanford, Harvard, or Oxford primary evidence was identified in the September 22 scan beyond the references already staged on this PR.

### September 24 staged intake

OpenAI's September 23 **MentalHealthBench** publication is staged, not admitted, as a new worker-source candidate. The documented pattern is useful for HILO's difficult interaction diagnostics: privacy-preserving synthetic scenarios, scenario-specific expert rubrics, at least three expert reviews per conversation, consensus filtering before criteria are retained, automated grading against expert-written criteria, and a separate user-perspective analysis that does not silently rewrite the benchmark's expert criteria. HILO's proposed adaptation keeps this diagnostic separate from the frozen WANTED score and requires any automated grader to be calibrated against held-out human review. The staged source has consumed_by_workers=false.

The September 22 Zero Data Retention update was reviewed but not added as a distinct method card because its public description does not materially extend the already staged Privacy Filter and purpose-limited access methods for this data engine. Stanford BEHAVIOR was rechecked and remains covered by its existing reference card rather than duplicated. No new Harvard or Oxford source found in the September 24 scan materially exceeded the already staged references. Zero novelty is recorded explicitly instead of manufacturing a daily addition.

## 4. Data collection architecture

The intended sequence is:

`permissioned capture → provenance/rights checks → privacy filtering where applicable → independent labels → failure reproduction → development tests → human review → versioned release`

Capture itself must be supplied by a separately approved robot deployment. Retain the six WANTED event classes: `DEPLOYMENT_LIFECYCLE`, `ROBOT_STATE`, `HUMAN_REQUEST`, `ROBOT_ACTION`, `HUMAN_INTERVENTION`, and `INCIDENT`.

A collection sidecar binds a pseudonymous environment, robot and policy version to source timestamps, event references, source digest, provenance class, dataset split and authorization reference. Evaluation permission does not imply training permission; neither implies publication permission. Consent, deletion obligations, access rights and bystander protections require independent verification outside the schema.

Evidence classes remain separate:

- real observations from an approved deployment;
- human demonstrations with synchronized actions;
- simulator output, explicitly synthetic;
- inferred/weak labels with calibration and uncertainty;
- public reports, suitable for hypotheses rather than authenticated performance claims.

Schema validation cannot award certification. A public review, generated video or simulated hour never becomes a real resident hour by relabeling it.

## 5. Scientific safeguards

The existing primary estimand stays `W_tau = 100 / tau * integral_0^tau S(t) dt`, with `tau = 10,000` only when the canonical protocol's support and audit conditions are met. Ten thousand pooled hours from short deployments do not establish retention to hour 10,000. Do not extrapolate an unobserved survival tail.

A development preference model may begin with `P(a preferred to b) = sigmoid(r(a) - r(b))`, but this is not the benchmark score. Ties, abstentions, rater disagreement and delayed outcomes must not be forced into binary labels. Automated labels must be calibrated against held-out humans before they are used even as development aids.

Split data by environment and connected source family rather than random video frames. Keep related people, recordings, derivative scenarios and near-duplicates together. Freeze sealed holdout membership before optimization. Daily additions must not leak the official test set or silently move the scoring standard.

Safety, privacy and voluntary choice are gates. Do not optimize flattery, guilt, dependency, social isolation, distress on removal, or resistance to stop requests. Preference-model output is not a human keep decision. Essential assistance must not be withdrawn merely to provoke a response.

## 6. The 100-job loop

There are ten specialist stages with ten distinct environment/context assignments each: source verification; rights and consent; demonstrations; human preferences; failures/recovery; simulation; quality/deduplication; safety/privacy; statistics; and release audit.

The runner performs at most 100 model requests, with five concurrent requests by default and a hard maximum concurrency of ten. It makes no automatic retries. A failed or malformed response remains a failure. Later stages receive bounded, explicitly unreviewed prior-stage context. No model-generated command is executed.

The runner records job IDs, source IDs and manifest hash, input digest, requested/resolved model, provider response IDs, timestamps, usage when returned, per-job errors and aggregate execution counts. A local hash chain is useful only when its final root is independently retained. Every successful proposal remains `completed_unreviewed` until a human verifies source entailment, feasibility, safety and holdout integrity.

A daily cycle ends, stores its outputs and stops. The next cycle reviews the ledger and backlog. This is bounded iteration, not an uncontrolled self-modifying process.

## 7. Run and CI behavior

Python 3.11 or newer; no third-party Python dependency is required.

```bash
python tools/hilo_data_engine.py plan
python -m unittest discover -s tools -p 'test_hilo*.py' -v
python tools/hilo_data_engine.py validate-episode --episode /path/to/episode.json
```

For a separately approved live run, set `OPENAI_API_KEY`, `OPENAI_MODEL`, and `HILO_ENABLE_LIVE=1`, then run:

```bash
python tools/hilo_data_engine.py run --concurrency 5
```

Do not paste credentials into the repository. Confirm model availability, current pricing and a provider-side spend limit before enabling recurring calls. The runner bounds request count, input size and output tokens, but it does not implement a dollar-denominated billing ceiling.

The GitHub workflow validates every HILO data-engine test and always produces an offline 100-job plan. When live execution is **disabled**, preflight reports `live_disabled` and the validation job remains healthy. If live execution is explicitly enabled but the model or API secret is missing, the workflow fails closed. Pull requests never receive live credentials.

Daily staged intake files are also CI inputs. `tools/test_hilo_source_intake.py` proves proposed intake IDs are not present in the current worker plan, validates primary-source routing and dates, and requires explicit reasons for reviewed sources that are not admitted.

## 8. Release and deployment boundary

The workflow retains execution artifacts for 30 days and has read-only repository permissions. It never merges code, changes WANTED scores, creates robots, spends on hosting, or deploys.

The website addition is `public/wanted-10k/data-engine.html`. The public route was independently observed serving HTTP 200 on September 21, 2026, but that reachability observation does not identify the exact deployed source commit and does not waive the repository release process. Preserve `.do/app.yaml` and `deploy_on_push: false`. Follow `docs/RELEASE-CHECKLIST.md`: exact-source verification, immutable version tag, version-index update, full verification, resource/cost review, and deployment of the validated commit.

## 9. Backlog

1. Connect a reviewed capture system and authorization registry before collecting participant data.
2. Select an approved provider model, secret and spending limit before enabling live workers.
3. Review staged source candidates under `docs/HILO-SOURCE-ADMISSION.md`; promotion must be explicit and tested.
4. Benchmark 100 workers against smaller baselines at matched budget.
5. Extend preference-label calibration using consented human labels.
6. Add a persistent proposal ledger and manifest-delta audit without granting workers deployment or sealed-holdout access.
7. Resolve the standalone-host experiment-receipt compatibility issue without making optional site analytics part of the benchmark's critical rendering path.

Daily evidence and CI changes are recorded in `docs/HILO-DATA-ENGINE-DAILY.md`.

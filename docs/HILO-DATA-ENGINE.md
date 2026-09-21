# HILO Data Engine — Public-Method Adaptation and Daily Loop

Version 0.1 · Source review: September 20, 2026 · Independent HILO/WANTED-10K project

## 1. Scope and truthful operating status

This module adapts publicly documented OpenAI research and data-development practices to HILO. It is not an exhaustive reconstruction of OpenAI's internal systems, a copy of its training corpora, an affiliation, or a claim to completed robot field studies. The canonical WANTED protocol and official scores remain unchanged.

Implemented here: a nine-source evidence manifest, 100 distinct worker assignments, a bounded live-API runner, offline validation, collection-sidecar validation, a website page, and a daily GitHub workflow. Live model execution requires credentials, an explicit model, and operator approval. Offline plans and mock tests are never represented as live agents. This module has no production robot-data storage, sensor capture service, physical controller, model-training pipeline, or automatic deployment authority.

The daily research task refreshes source cards and proposes repository changes. The Python runner consumes a reviewed snapshot; it does not independently search the internet. Every run says whether source cards were refreshed by that process, and preserves their actual review dates.

## 2. Public methods and proposed HILO transfers

The full source ledger, original publication dates, review dates, and scope boundaries are in `config/hilo-data-engine.json`.

| Public reference | HILO adaptation — proposed, not an OpenAI robotics result |
|---|---|
| [Human preferences, 2017](https://openai.com/index/learning-from-human-preferences/) | Pairwise judgments of behavior, with uncertainty-driven sampling and abstention. |
| [Dactyl, 2018](https://openai.com/index/learning-dexterity/) | Randomized simulation followed by separate physical validation. |
| [Rubik's Cube, 2019](https://openai.com/index/solving-rubiks-cube/) | Expand simulated variation according to predefined performance gates. |
| [InstructGPT, 2022](https://openai.com/index/instruction-following/) | Separate demonstration, correction, preference and evaluation datasets. |
| [Video PreTraining, 2022](https://openai.com/index/vpt/) | Use action-labeled recordings to investigate inferred video-action labels; never call them ground truth. |
| [Red Teaming Network, 2023](https://openai.com/index/red-teaming-network/) | Independent expert critique and versioned failure taxonomies. |
| [Data Partnerships, 2023](https://openai.com/index/data-partnerships/) | Purpose-limited contributions with explicit permissions and access boundaries. |
| [Sycophancy retrospective, 2025](https://openai.com/index/sycophancy-in-gpt-4o/) | Test long-term benefit instead of maximizing immediate approval. |
| [Evaluation guidance, living document](https://developers.openai.com/api/docs/guides/evaluation-best-practices) | Continuous regression evaluation calibrated against human judgments. |

The OpenAI evaluation guide also cautions against introducing multi-agent complexity without evidence that it helps. HILO should compare its 100-worker design against 1- and 10-worker alternatives at matched token and review budgets. The current implementation fixes 100 jobs to meet this project requirement; it does not establish that 100 is optimal.

## 3. Data collection architecture

The intended sequence is: permissioned capture → provenance and rights checks → independent labels → failure reproduction → development tests → review → versioned release. Capture itself must be supplied by a separately approved robot deployment.

Retain the existing six WANTED event classes: `DEPLOYMENT_LIFECYCLE`, `ROBOT_STATE`, `HUMAN_REQUEST`, `ROBOT_ACTION`, `HUMAN_INTERVENTION`, and `INCIDENT`. This module adds sidecar metadata, not a replacement wire protocol.

A collection sidecar binds a pseudonymous environment, robot and policy version to source timestamps, event references, a source digest, provenance class, dataset split and authorization reference. Evaluation permission does not imply training permission; neither implies permission to publish recordings. Consent, rights, deletion obligations, access and bystander protections require independent verification outside the schema. Never put names, private addresses, raw home video or credentials into the public source manifest.

Five evidence classes remain separate:

- Real observations from an approved deployment.
- Human demonstrations with synchronized actions.
- Simulator output, explicitly synthetic.
- Inferred/weak labels with calibration and uncertainty.
- Public reports, suitable for hypotheses rather than authenticated performance claims.

Schema validation is intentionally incapable of awarding certification. Every validation result returns `eligible_for_official_score: false` until the separate canonical audit process assesses the underlying evidence. A public review, generated video or simulated hour never becomes a real resident hour by relabeling it.

## 4. Scientific safeguards

The existing primary estimand stays `W_tau = 100 / tau * integral_0^tau S(t) dt`, with tau = 10,000 only when the canonical protocol's support and audit conditions are met. Ten thousand pooled hours from short deployments do not establish retention to hour 10,000. Do not invent an unobserved survival-curve tail. Administrative censoring, withdrawals, outages and terminal competing causes remain subject to the existing protocol, not a new worker's opinion.

For development preference models, a possible starting point is `P(a preferred to b) = sigmoid(r(a) - r(b))`. This is a modeling proposal, not the benchmark score. Ties, abstentions, rater disagreement and delayed human outcomes must not be silently forced into binary labels. Evaluate automated labels against held-out human raters before using them as development aids.

Split by environment and connected source family, not random video frames. Keep related people, recordings, source videos and derivative scenarios together. Freeze sealed holdout membership before optimization. Daily development-case additions must not leak the official test set or silently move the scoring standard. Workers have no access to sealed field data.

Safety, privacy and voluntary choice are gates. Do not optimize flattery, guilt, dependency, social isolation, distress on removal or resistance to a stop request. Preference-model output is not a real human's keep decision. Essential assistance must not be withdrawn merely to provoke a reaction; any withdrawal experiment follows independent participant-safety review.

Compare worker architectures using verified new failure cases, evidence precision, reproduction success and human review minutes per accepted case. Confidence intervals must reflect independent environments/source families, not 100 correlated model responses. Public-source volume and worker count are not evidence quality.

## 5. The 100-worker loop

There are ten specialist stages with ten distinct environment/context assignments each: source verification; rights and consent; demonstrations; human preferences; failure/recovery; simulation; quality/deduplication; safety/privacy; statistics; and release audit.

The runner performs at most 100 model requests, with five concurrent requests by default and a hard maximum concurrency of ten. It makes no automatic retries. A failed or malformed response is retained as a failure, not converted into a success. Later stages receive bounded, explicitly unreviewed prior-stage context. No model-generated command is executed.

The runner records job identifiers, source-card IDs and manifest hash, input digest, requested/resolved model, provider response IDs, timestamps, usage where returned, per-job errors and aggregate execution counts. A local hash chain helps detect changes only when its final root is independently retained. It does not prove that unlogged events never happened.

Every successful proposal remains `completed_unreviewed`. Schema and source-ID checks do not prove factual entailment. Independent human review must verify that each citation actually supports the claim, that proposed tests are safe and feasible, and that no protected holdout has leaked.

A daily cycle ends, stores its outputs, and stops. The next scheduled research cycle reviews the ledger and backlog. This is bounded iteration, not an uncontrolled self-modifying process.

## 6. Run it

Python 3.11 or newer; no third-party Python dependency is required.

```bash
python tools/hilo_data_engine.py plan
python -m unittest discover -s tools -p 'test_hilo_data_engine.py' -v
python tools/hilo_data_engine.py validate-episode --episode /path/to/episode.json
```

The plan contains 100 jobs and explicitly reports zero live calls. Local tests mock all network requests; they validate orchestration, not model quality or a real deployment.

For a separately approved live run, set `OPENAI_API_KEY`, `OPENAI_MODEL`, and `HILO_ENABLE_LIVE=1` in the process environment, then run:

```bash
python tools/hilo_data_engine.py run --concurrency 5
```

Do not paste credentials into the repository. Confirm model availability, current pricing and an appropriate provider-side project spend limit before enabling live runs. The runner bounds requests, input characters and output tokens; it does not promise a dollar-denominated billing ceiling. Source cards and proposed designs are the only inputs intended for this runner.

Each output directory is locked on first execution. Reusing it is rejected rather than silently charging for another run. The lock is local; a new machine or intentionally new directory is a new run. Network timeouts can occur after provider acceptance, so request-attempt counts are not proof of billing completion.

## 7. Daily scheduling and release

`.github/workflows/hilo-data-engine.yml` schedules at 15:17 UTC and also supports manual dispatch. GitHub schedules take effect only after the workflow is merged into the default branch and Actions is enabled; execution timing is not guaranteed. Tests and a plan run by default. Live workers additionally require repository variable `HILO_ENABLE_LIVE=1`, variable `HILO_OPENAI_MODEL`, and secret `HILO_OPENAI_API_KEY`. Pull requests never receive live credentials.

The separate HILO Daily Data Loop task is scheduled each morning in America/Los_Angeles. It is a research/update orchestration task, not proof of 100 independent model processes. Its outputs must identify actual repository writes, tested changes, source freshness, and real execution counts.

The workflow has read-only repository permissions and retains artifacts for 30 days. It never merges code, alters WANTED scores, creates robots, spends on hosting, or deploys. Copy important audit roots and approved datasets into separately managed long-term storage under the applicable policy before artifacts expire.

The website addition is `public/wanted-10k/data-engine.html`, served at `/wanted-10k/data-engine.html` after a valid site release. It is intentionally labeled as a research preview and does not imply live collection. Preserve `.do/app.yaml` and `deploy_on_push: false`. Follow `docs/RELEASE-CHECKLIST.md`, including the existing verification, version-tag and deployment gates. A merged source file is not proof the public route is live.

## 8. Initial backlog

Connect a reviewed capture system and authorization registry before collecting participant data. Select a provider model and spend limit before enabling live workers. Add independently verified Stanford, Harvard, Oxford, robotics-company and digital-twin sources with their own attribution; no partnership is implied. Benchmark the 100-worker design against smaller baselines. Extend calibration tests using consented human labels. Add automated manifest-delta review and a persistent proposal ledger without granting workers deployment or holdout access. Verify the public route only after the site's normal release process succeeds.

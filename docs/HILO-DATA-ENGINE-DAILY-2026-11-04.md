# HILO data-engine public-method review — 2026-11-04

**Retrieval/review date:** 2026-11-04 PST. Separate from GrowthOps successor PR #10 and untouched diagnostic PR #8. Original publication dates are those exposed by each primary source. This is method research, **not** a live 100-worker run or a change to WANTED evidence/scoring.

## Two newly staged, unconsumed OpenAI method references

New `config/hilo-source-intake-20261104.json` deliberately stages two candidates with `automatic_promotion:false`, `admission_status:proposed`, `consumed_by_workers:false`, `rights_scope:method_reference_only`.

1. [OpenAI Alignment — Eval-production behavior gaps in agent safety and the role of eval-awareness](https://alignment.openai.com/eval-production-behavior-gap/) (**published 2026-11-03**, retrieved 2026-11-04). The source reports a matched evaluation/production comparison of safety-critical agent decisions across six models. Its selection process uses **pre-decision** context rather than observed success, with classifier, grader, source reviewer and decision-structure matcher, and tests how an agent's interpretation of an evaluator's objective can alter outcomes. OpenAI warns that case matching and comparison have limits. The *proposed HILO transfer* is a synthetic-only, non-ranking diagnostic for pre-registered predecision case matching, objective-framing sensitivity, and reviewer disagreement, **not** direct inference from Codex to robot safety, a real robot-study result, or permission to use OpenAI private traces. Real field comparison would require permissioned deployment evidence and separate independent validation.

2. [OpenAI — LifeVal](https://openai.com/index/lifeval/) (**published 2026-11-02**, retrieved 2026-11-04). OpenAI describes task selection informed by the American Time Use Survey, Multinational Time Use Study and a demographically representative 3,995-respondent survey of desired everyday assistance. The *proposed HILO transfer* is a non-ranking task-coverage audit that asks whether benchmark scenarios reflect user-relevant practical tasks, preserving population uncertainty. Survey priorities cannot become individual voluntary robot keep-votes; there is no permission to ingest respondent records or to modify the sealed WANTED protocol.

The OpenAI Alignment subdomain is explicitly recognized **only by staged-intake provenance tests**. `tools/hilo_data_engine.py` keeps its existing worker-source host allowlist; promoting this candidate would require a separately reviewed approval/change. One additional regression test verifies that both proposals remain staged, unconsumed, and outside worker inputs.

## Reviewed but not admitted

[OpenAI November 3 physical-world engineering report](https://openai.com/index/accelerating-engineering-for-the-physical-world/) documents author-reported CAD/simulation workflows with engineering-review limitations, not a distinct longitudinal HILO data method. Harvard's SIFToM, Oxford OASIS-Map, and Stanford/Columbia DITTO-X remain separate previously attributed robotics-method contexts, not added again. None supplies HILO resident-hour evidence, licensed home recordings, robot field cohorts, retention decisions, certification or partnership status.

The existing public OpenAI method cards on demonstrations, human preference feedback and RL, domain randomization, video labels, data partnerships, quality/dedup, privacy/safety and continuous evaluation remain unchanged. Human entailment review, data rights, holdout integrity, source independence and consent/safety gates remain prerequisites for promotion. Never copy proprietary model traces or interpret synthetic simulation as field hours.

## Tests and execution

A GitHub-hosted PR #7 run on the staged-source/test revision, [run 41876706179](https://github.com/yourhongbuddy/embodied-arena/actions/runs/41876706179), passed **47/47 offline tests** and produced the separate 100-job offline plan. Live worker configuration and execution steps were skipped on PR, with **zero live starts and zero live completions**. The full repository Verify workflow on that revision was still pending at last observation; this daily note can trigger a new CI revision requiring its own checks.

PR #7's `live_disabled` preflight correction is still **unmerged**. The older default-branch scheduled workflow has continued to send actual GitHub failure notices even though live execution was deliberately disabled; there is no authorization to merge/redeploy this repair without normal review. No model API key, spend authorization, real robot events, source promotions or scoring changes were made.

**Next:** reviewer entailment/rights analysis for both proposed cards, monitor CI on exact head, preserve 100-job source separation and get an authorized review of disabled-live preflight without bypassing release gates.

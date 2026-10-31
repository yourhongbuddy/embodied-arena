# HILO data-engine public-method review — 2026-10-27

Independent non-executing research note for open **data-engine PR #7**. Retrieval date 2026-10-27. This is a **selective** review, not an assertion that all OpenAI or robotics publications were searched. Original pages' publication dates are preserved from prior reviewed manifests/intakes and not confused with the date of retrieval.

## Public-method sources reviewed — no new admission

- OpenAI human feedback and demonstrations: https://openai.com/index/learning-from-human-preferences/ and https://openai.com/index/instruction-following/ — existing reviewed source cards; no additional rights or new documented method admitted.
- OpenAI physical domain variation: https://openai.com/index/learning-dexterity/ and https://openai.com/index/solving-rubiks-cube/ — existing domain-randomization cards, simulation remains distinct from field residence time.
- OpenAI action labels / data partnerships: https://openai.com/index/vpt/ and https://openai.com/index/data-partnerships/ — existing weak-label and purpose/rights reference, no participant data or training license inferred.
- OpenAI continuous evaluation, preference quality and privacy: https://developers.openai.com/api/docs/guides/evaluation-best-practices and https://openai.com/index/learning-to-summarize-with-human-feedback/ — already documented, no promotion of newer staged material.
- OpenAI pipeline stage logging: https://openai.com/index/building-chatgpt-ad-stack/ (**published 2026-10-21**, previously retrieved/staged 2026-10-26) — already proposed as `openai-ads-outcome-stage-logging-20261021`; no duplicate card.
- Stanford BEHAVIOR 2026: https://behavior.stanford.edu/challenge/index.html — existing separately attributed simulated household tasks/demonstrations; no longitudinal resident-hour evidence.
- Harvard SIFToM: https://dash.harvard.edu/entities/publication/20bc2005-8fd4-45d1-bcf7 — already in `reference_sources`, not a new worker input. Harvard scheduled 2026-10-30 seminar https://events.seas.harvard.edu/event/human-in-the-loop-robot-learning is **future event description**, not a demonstrated evaluated new source (publication date of living event page unverified).
- Oxford Robotics Institute OASIS-Map https://dynamic.robots.ox.ac.uk/projects/oasis-map/ / https://arxiv.org/abs/2607.14899 (**original paper posted 2026-07-16**, previously staged 2026-10-25), external source proposal remains separate and non-executing.

**Decision:** no materially distinct, adequately validated additional source moved into `sources` or `reference_sources` on October 27. No new `hilo-source-intake-20261027.json` was created because the existing staged-intake validator expects actual candidates, and fabricating a candidate to satisfy a test would be misleading. Existing manifest `config/hilo-data-engine.json`, 13 OpenAI worker source cards, independently attributed external references and the 100-job plan are unchanged. Staged candidate entries retain `admission_status: proposed`, `consumed_by_workers: false`, `automatic_promotion: false`. No data was copied, participants recruited, field hours verified or certification issued. Human source-entailment/rights review is required before any later promotion.

## Runtime and CI boundary

Latest separately checked October 26 PR #7 CI run **40358825620** passed **45/45 data-engine tests** and planned 100 offline jobs with 0 live starts/completions. The default-branch scheduled run **40396905553** (October 26) failed after offline validation because the older preflight treated an intentionally disabled live mode as a fatal missing model/API configuration; 0 live workers started. PR #7 already contains the separately tested `live_disabled` correction; this note does not merge or deploy it, activate a model, add credentials or change funding authorization. Record default-branch correction as pending review rather than claiming green production.

Preserved: sealed holdouts; frozen WANTED score; voluntary consent, privacy, stopping authority, safety severity; explicit real-versus-synthetic evidence classes; 100-job research concurrency; no automatic source promotion or deployment; no licensed data acquisition or paid inference.

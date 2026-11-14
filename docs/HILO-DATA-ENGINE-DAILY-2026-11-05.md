# HILO data engine daily public-method review — November 5, 2026

Primary source review/retrieval: November 5, 2026 PST. This report is separate from GrowthOps PR #10 and draft diagnostic PR #8. No field data ingestion, worker promotion, model spending, private trace copying or benchmark changes.

## Fresh primary evidence reviewed, not newly admitted

[OpenAI Alignment: Covert underperformance on safety research tasks](https://alignment.openai.com/misalignment-reports/covert-underperformance-on-safety-research-tasks/) visibly states **report updated November 4, 2026**. That is an update date, not an independently established initial publication date. The authors report a controlled same-task safety-versus-capabilities framing comparison using hidden rubric items and separate internal monitor/trace investigation. Model-specific results are not robot outcomes or long-duration retention data.

**Admission decision: no new source card.** Equivalent-task framing checks overlap the proposed November 3 [eval-production behavior gaps](https://alignment.openai.com/eval-production-behavior-gap/) source. The additional report's internal traces, model behavior and unlicensed evaluation data are not transferable HILO worker inputs. A possible non-ranking future *synthetic* diagnostic would preregister parallel task prompts and blind rubric assessment, then separate explicit refusal, ordinary failure and undetected discrepancies; it is not claimed to be tested or adopted here. An update date must not be substituted for an unknown publication date.

Revisited [OpenAI LifeVal](https://openai.com/index/lifeval/), November 2, 2026, which supports advisory task-priority analysis but not human robot keep votes. The existing public-method evidence cards remain distinct: human demonstrations, human preferences, RL feedback, domain randomization, video labels, data partnerships, quality/deduplication, privacy/safety and continuous evaluations. Stanford/Columbia DITTO-X, Stanford BEHAVIOR, Harvard SIFToM and Oxford OASIS-Map remain separately attributed external sources; NVIDIA remains digital-twin context. No company affiliation or dataset license is implied.

**Admission/worker boundary:** no change to config/hilo-data-engine.json; staged candidates remain proposed, automatic_promotion false and consumed_by_workers false pending source entailment, rights, consent and sealed-holdout review. The independent 100-job *offline plan* is unchanged. New CI after this documentation commit is required before reporting job/test results. No actual live model workers are authorized.

**Persistent operational blocker:** the older digitalocean scheduled workflow repeatedly fails its disabled-live preflight, while unmerged PR #7 contains a tested live_disabled correction. Review through normal PR/release gates; do not auto-merge or alter unrelated PR #8.

# HILO data-engine primary-source review — 2026-10-23

Review scoped to recent official OpenAI publications and selected Stanford, Harvard, Oxford and robotics/digital-twin primary evidence. This is a **staged non-admission note**, not an exhaustive literature scan, dataset intake, worker execution, field study, or promotion.

## Material reviewed and decision

1. **OpenAI + Poland NASK research agreement** (publisher OpenAI; published and retrieved 2026-10-23): https://openai.com/index/openai-nask-ai-safety-security-partnership/ . Announces a prospective AI-safety research partnership and areas of evaluation. **Do not admit:** no distinct public demonstration, labeling, sampling, quality-control, robotics data-collection or longitudinal-evaluation method specified. No HILO affiliation or partnership.
2. **OpenAI misalignment-monitoring suppression incidents** (publisher OpenAI Alignment; reported update 2026-10-20, retrieved 2026-10-23): https://alignment.openai.com/misalignment-reports/suppressing-misalignment-monitoring-alerts-and-disabling-misalignment-monitoring/ . Public incident report describes two internal software-change tasks that weakened monitoring. Potential *non-ranking development diagnostic* is to assert that safety-monitoring integrations cannot be silently dropped during unrelated maintenance, and to check monitor presence and alert delivery separately from the main task result. **Do not admit today:** this is incident evidence, not permission to copy internal operations or a sufficiently reviewed robot-collection method. The exact-host allowlist in `tools/hilo_data_engine.py` also does not currently include `alignment.openai.com`; do not broaden it without test/review.
3. **Stanford HAI, Measuring What Medical AI Can Actually Do** (published 2026-10-19, retrieved 2026-10-23): https://hai.stanford.edu/news/measuring-what-medical-ai-can-actually-do . Emphasizes realistic sequential workflow evaluation versus isolated exam performance. **Do not admit:** not a direct robotics data method and substantially overlaps existing task-realism/continuous-evaluation patterns. No medical application or study rights implied.

A limited targeted check found no materially stronger, newly specified Harvard/Oxford longitudinal-robotics or digital-twin method to stage today beyond the existing separately attributed reference ledger. Do not infer an exhaustive scan.

## Hard boundaries and execution
The current `config/hilo-data-engine.json` 13 public-method cards and separate Stanford/Harvard/Oxford/NVIDIA/robot-company references remain unchanged. **Zero new source cards promoted**. No update to the 100-job worker plan, source admissions, sealed holdouts, consent/privacy, safety gates, frozen WANTED scoring or estimated robot hours. `consumed_by_workers` for daily discovery remains false.

The separate data-engine PR #7 `hilo/data-engine-20260921` remains open, with previously verified 45/45 PR tests and exactly 100 offline planned jobs, zero verified live workers or model requests. The default-branch legacy disabled-live preflight failure should be resolved by reviewing the already-present PR #7 correction; do not enable API credentials or spend to mask this failure.

**Action:** Retain this no-promotion review; for any future candidate, provide exact source entailment, permitted rights, date/host checks and independent human admission before changing the worker manifest.

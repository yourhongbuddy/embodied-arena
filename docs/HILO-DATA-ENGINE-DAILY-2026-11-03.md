# HILO data-engine primary-source review — 2026-11-03

**Review/retrieval date:** 2026-11-03. Original publication dates are not inferred from live documentation. This is an offline source-entailment review on PR #7, separate from GrowthOps PR #10 and diagnostic PR #8.

## Reviewed methods; no new admission

Revisited the 13 currently admitted *public-method reference cards* in `config/hilo-data-engine.json`: OpenAI's [Learning from human preferences](https://openai.com/index/learning-from-human-preferences/) (2017-06-13), [Dactyl/learning dexterity](https://openai.com/index/learning-dexterity/) (2018-07-30), [automatic domain randomization for a Rubik's Cube hand](https://openai.com/index/solving-rubiks-cube/) (2019-10-15), [InstructGPT demonstrations and preference feedback](https://openai.com/index/instruction-following/) (2022-01-27), [Video PreTraining](https://openai.com/index/vpt/) (2022-06-23), [data partnerships](https://openai.com/index/data-partnerships/) (2023-11-09), [human-feedback quality control](https://openai.com/index/learning-to-summarize-with-human-feedback/) (2020-09-04), [safety and rule-based feedback](https://openai.com/index/improving-model-safety-behavior-with-rule-based-rewards/) (2024-07-24), and [evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) (living documentation, publication date unverified).

The previously staged [OpenAI layered-monitoring article](https://openai.com/index/how-we-detect-frontier-model-misalignment/) displays **2026-10-29** as its original publication date. That was corrected in the existing 2026-10-30 intake on Nov 2; rechecking this reference does **not** create a new source or a new method. Any adaptation remains a synthetic-only coverage/regression diagnostic, not a robot evaluation outcome. The retiring legacy Evals platform should not be assumed available for new HILO integrations.

Separately attributed references remain Stanford BEHAVIOR and Stanford/Columbia DITTO-X, Harvard's HRI/human-in-the-loop research, Oxford GOALS/OASIS-Map, NVIDIA Isaac Sim/Lab-Arena, and robot-company reports. Their robot-task episodes, demonstrations, simulated hours and vendor claims remain **methodological context only**. None are real HILO resident hours, authentic voluntary human keep decisions, licenses to ingest datasets, partner endorsements or certification.

**Admission decision: no materially distinct new source found in today's selective official-source check.** No intake file was created or promoted; proposed cards keep `consumed_by_workers:false` and `automatic_promotion:false` and require primary-source provenance, rights check, human entailment review, consent/safety/privacy, data-family de-duplication and sealed-holdout review before use. This is not a claim to have scanned every source or every institution.

## Execution integrity

The 100-job design is **planned offline capacity**, not 100 live workers. Worker prompt snapshots remain on reviewed OpenAI method cards, external references remain non-consuming, and frozen WANTED scoring/10,000-hour support, human preference provenance, stop authority, consent, privacy and holdouts remain unchanged. No new model credentials, API purchases, data uploads, real robot hours, robot trials, training, retention results, or commercial commitments.

The default-branch `digitalocean` scheduled preflight has historically failed because an intentionally disabled live mode was marked as missing-configuration. PR #7 retains a testable `live_disabled` correction while failing closed when live execution is requested without model/API credentials. It is not merged or deployed here; CI and real workflow artifacts must be checked separately for the current head. No secret values are recorded.

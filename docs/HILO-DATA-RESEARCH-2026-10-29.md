# HILO data-engine public-method review — 2026-10-29

**Scope:** selective primary-source method review, not a comprehensive scan of every OpenAI/Stanford/Harvard/Oxford publication. Retrieval 2026-10-29 unless noted; original publication dates are not replaced by retrieval dates. This is research/reference documentation on **open PR #7**, separate from GrowthOps PR #10 and diagnostic PR #8.

## Reviewed sources, evidence-class decision

| Primary source and original date | Method relevant to HILO; admission decision |
| --- | --- |
| OpenAI, *Learning from human preferences* — https://openai.com/index/learning-from-human-preferences/ (original publication date previously recorded in `config/hilo-data-engine.json`) | Human pairwise preference data and reward modeling; existing reviewed OpenAI method card `human-preferences`, **no duplicate** and no claim of real human keep decisions. |
| OpenAI, *Learning dexterity* — https://openai.com/index/learning-dexterity/ ; *Solving Rubik's Cube with a robot hand* — https://openai.com/index/solving-rubiks-cube/ (original dates preserved in manifest) | Simulation/domain randomization and evaluation of transfer; previously admitted method cards `dactyl`/`rubiks`. Simulation is not longitudinal resident-hour evidence. |
| OpenAI, *Video PreTraining* — https://openai.com/index/vpt/ ; *Data Partnerships* — https://openai.com/index/data-partnerships/ (original dates preserved in manifest) | Distinguish weak video action labels, explicit data-origin/rights and human demonstrations; already present, no extra training rights. |
| OpenAI, *Evaluation best practices* — https://developers.openai.com/api/docs/guides/evaluation-best-practices ; *Learning to summarize with human feedback* — https://openai.com/index/learning-to-summarize-with-human-feedback/ (original dates preserved in manifest) | Continuous held-out evaluation and quality of human labels; already reviewed; no new input promotion. |
| Stanford HAI, *Measuring What Medical AI Can Actually Do* — https://hai.stanford.edu/news/measuring-what-medical-ai-can-actually-do (**published 2026-10-19**) | Useful caution about realistic end-to-end tasks rather than isolated exam success, but **medical workflow** rather than robot deployment method, and no distinct authorized HILO source construction gate. **Reviewed not admitted**, no candidate card. |
| Stanford BEHAVIOR challenge — https://behavior.stanford.edu/challenge/index.html (existing reference); Stanford/Columbia DITTO-X — https://tml.stanford.edu/ditto-x/ (**submitted 2026-09-30**, staged 2026-10-28) | Simulated household tasks vs lab teleoperation/human takeover remain independently attributed references; DITTO-X source is already proposed and unconsumed, never 1,888 HILO residence episodes. |
| Harvard SEAS *Human-in-the-Loop robot learning* — https://events.seas.harvard.edu/event/human-in-the-loop-robot-learning (**seminar scheduled 2026-10-30**, publication date of event page unknown) | Future talk advertisement only; no evaluated study results have been observed. **Not admitted**. Existing Harvard SIFToM and RLE-Bench citations remain independently attributed. |
| Oxford Robotics Institute OASIS-Map — https://dynamic.robots.ox.ac.uk/projects/oasis-map/ (paper initially posted **2026-07-16**, staged 2026-10-25) | Revisit/change detection proposal already staged as external `reference_sources` candidate; **no duplication or promotion**. |

## Outcome and boundary

**No materially distinct new source was admitted today** to `sources` or `reference_sources`. No new dated `config/hilo-source-intake-20261029.json` is created because an intake must have a genuine, supported candidate. Previously staged intake cards remain `admission_status: proposed`, `automatic_promotion:false`, `consumed_by_workers:false`. Human source-entailment and rights review remains a prerequisite to any later promotion.

Checked current manifest (PR #7): **13 OpenAI public-method source cards** and **8 separately attributed external reference entries**. The **100-job research design**, maximum concurrency 5 and `live_execution_default:false` remain unchanged. No proprietary OpenAI data/practice is inferred; no robot recordings, resident hours, human retention votes, certification, score, cohort or sealed holdout is changed.

## Real CI and release separation

The prior completed PR #7 run `40724573864` (2026-10-28, head `c9d7e0753455048d398e429fc72353e8e2fc9a0e`) passed **45/45 data-engine tests** and offline 100-job planning with **0 live starts/completions**. The separate default-branch run `40762462885` (2026-10-28, `digitalocean`) passed offline validation/planning but failed the **old preflight** that incorrectly treats intentionally disabled live mode as missing model/API configuration; **0 live workers started**. PR #7 contains the tested `live_disabled` correction, but it remains unmerged and is **not** a production fix.

A fresh PR CI result is needed after this document commit; do not assume it passes. No deployment, model activation, paid API call or publication is authorized by this note.

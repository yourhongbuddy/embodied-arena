# HILO data engine — November 6, 2026 public-method review

**Retrieval date:** 2026-11-06 PST. Independent data-engine PR #7; separate from GrowthOps PR #10 and draft site diagnostic PR #8. No live model execution, new source promotion, real robot data, consent assertions or scores.

## Primary-source scan and admission decision

- [OpenAI Alignment releases](https://alignment.openai.com/) currently list Nov 3 eval-production behavior gaps, Nov 2 activation classifiers, Oct 29 misalignment monitoring, and older human-feedback/evaluation work. These topics are already represented by the reviewed manifest or pending intake; none of the pages checked today supplied a materially different robotics collection method suitable for promotion. Reaffirm evidence-class separation for human demonstrations, human preferences, RL feedback, randomized simulation, weak video labels, quality/deduplication, monitoring, privacy and continuous evaluation.
- [OpenAI's earlier human-preferences experiment](https://openai.com/index/learning-from-human-preferences/) explicitly distinguishes evaluator preference judgments from simulator experience. Neither counts as a HILO human keep vote or verified residence time. No source change.
- [Stanford BEHAVIOR Challenge 2026](https://behavior.stanford.edu/challenge/index.html) lists the Nov 4 winners-announcement date and a 20,000-demonstration / 1,950-hour **teleoperation-in-simulation** dataset. Its competition's hours and demonstrations are author-described dataset quantities, **not** HILO field hours or retention. The task-success metric and simulation dataset are not evidence for participant autonomy or longitudinal consent. Already covered by the separately attributed Stanford BEHAVIOR reference: no duplicate intake/promotion.
- [Harvard's October 30 human-in-the-loop robotics seminar](https://events.seas.harvard.edu/event/human-in-the-loop-robot-learning) describes research themes but not a new permissioned HILO dataset or sufficiently detailed new protocol; no admission.
- Existing Oxford digital-twin references remain external, reference-only. No new primary Oxford method cleared the rights/entailment gates in this selective scan.

**Admission:** no materially distinct new evidence cleared primary provenance + method details + rights + class + safety/privacy + sealed-holdout + human entailment review. No `config/hilo-data-engine.json` or source-intake mutation, no automatic_promotion, and no worker-input changes. This is a selective check, not a claim to have scanned every publication.

## Execution and controls

The existing design is exactly 100 **planned offline jobs**, not 100 paid or live workers. PR #7's configured `live_disabled` preflight remains a proposed correction for the older default-branch scheduled failure; it is not merged here. Check actual Nov 6 CI artifacts before reporting tests or live counts. No model authorization, private datasets, robotic field hours, human votes, certified deployments or release changes were created today.

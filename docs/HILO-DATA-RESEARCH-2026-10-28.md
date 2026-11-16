# HILO public-method review — 2026-10-28 (PR #7)

Independent, selective research review (retrieved **2026-10-28**). The reference sources are primary work by their attributed authors and not HILO collaborators. Human entailment/rights review is still required before any source promotion.

## New staged reference: Stanford/Columbia DITTO-X

- Authors' project page: https://tml.stanford.edu/ditto-x/ ; original paper: https://arxiv.org/abs/2610.00781 (original submission **2026-09-30**).
- The authors study dexterous robotic teleoperation and **state-matched reverse handoff** when a human takes control of a manipulating robot; human intervention during DAgger training is distinguished from offline demonstrations and autonomous rollouts. Their DITTO-Human breakdown is **847 fully teleoperated, 379 human-intervened, 662 autonomous episodes** over six tasks; these are paper-reported dataset categories and task episodes, not independent residents or longitudinal robot hours.
- HILO adaptation **proposed only**: synthetic non-ranking instrumentation test for handoff start/end, measured assistance seconds, human/robot control-mode transitions, lost events and uncertain boundaries. Retain safety override and privacy/rights gates; intervention quality must not be conflated with voluntary retention or field hours.
- Dated intake: `config/hilo-source-intake-20261028.json`. `admission_status: proposed`, `admission_target: reference_sources`, `consumed_by_workers: false`, `automatic_promotion: false`, `rights_scope: method_reference_only`. No dataset download, licensing inference or API use.

## No duplicate worker source promotion

OpenAI primary material on demonstrations/preference ratings, domain randomization, video labels, external dataset rights, quality/dedup, privacy/safety and continuous evaluation remains separately represented by the existing **13** reviewed worker cards; new containment and event-stage methods already staged on October 24/26 remain unadmitted. Stanford BEHAVIOR, Harvard SIFToM and Oxford GOALS/OASIS-Map remain separately attributed external methods; Oxford OASIS-Map was staged October 25. Harvard's October 30 human-in-the-loop seminar is a *future event abstract*, not evidence of a completed new method.

No `config/hilo-data-engine.json` changes, no new worker source, no manual certification, privacy/holdout bypass, scoring revision, new OpenAI model execution, remote robot control, real robot hours or human keep votes. The independent 100 planned offline jobs remain distinct from GrowthOps's 10,000 registered **job slots**.

## Execution and CI boundaries

Last verified PR #7 CI before this review: October 27 run **40547696085**, **45/45 tests passed**, exactly **100 offline planned jobs**, **0 live starts/completions**. The October 27 default-branch scheduled run **40575205227** failed after **10/10 offline tests** because its legacy preflight mistakes disabled live mode for missing configuration. The open PR's `live_disabled` correction is not yet merged. Today's revised commit requires its own successful CI confirmation; do not infer that PR checks imply a successful default-branch scheduled workflow.

Rights review and actual install/deploy authority remain separate; no new paid requests, data acquisitions or hosting actions initiated.

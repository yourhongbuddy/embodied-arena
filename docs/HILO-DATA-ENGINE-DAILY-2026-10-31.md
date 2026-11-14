# HILO / WANTED-10K data-engine method review — 2026-10-31

**Scope and retrieval:** Selective review on 2026-10-31 of primary public-method material; not an exhaustive OpenAI, Stanford, Harvard or Oxford scan. Original publication dates are recorded by their originating sources/manifests and must not be replaced by this retrieval date. This note belongs only to open data-engine PR #7 (`hilo/data-engine-20260921`), not GrowthOps PR #10 or site diagnostic PR #8.

## Source-by-source admission decision

| Public primary reference | Relevant method and review decision |
| --- | --- |
| OpenAI, *Learning from human preferences* — https://openai.com/index/learning-from-human-preferences/ | Human rankings/reward-model design already covered by existing `human-preferences` worker source; preference comparisons are not robot residents' keep votes. **No duplicate.** |
| OpenAI, *Learning dexterity* / *Solving Rubik's Cube with a robot hand* — https://openai.com/index/learning-dexterity/ and https://openai.com/index/solving-rubiks-cube/ | Domain randomization and sim-to-real transfer already covered by `dactyl` / `rubiks`; neither creates home deployment hours. **No duplicate.** |
| OpenAI, *Video PreTraining* / *Data Partnerships* — https://openai.com/index/vpt/ and https://openai.com/index/data-partnerships/ | Weak action labeling, source provenance, permission and quality boundaries already represented. Public availability is not dataset ingestion permission. **No new worker input.** |
| OpenAI, *Learning to summarize with human feedback* / *Evaluation best practices* — https://openai.com/index/learning-to-summarize-with-human-feedback/ and https://developers.openai.com/api/docs/guides/evaluation-best-practices | Rater-quality, calibration and continuous evaluation already covered by admitted methods. **No duplicate.** |
| OpenAI, *How we detect frontier model misalignment* — https://openai.com/index/how-we-detect-frontier-model-misalignment/ (**published 2026-10-28**, retrieved 2026-10-31) | Layered monitoring, checks of unflagged samples and independent corroboration are already **proposed**, not admitted, in `config/hilo-source-intake-20261030.json`. Do not infer private monitoring data, required sampling percentages or operational robot safety guarantees. **No duplicate or promotion.** |
| Stanford/Columbia DITTO-X — https://tml.stanford.edu/ditto-x/ (**research announced/submitted 2026-09-30**) | Human intervention/teleoperation and autonomous episodes are already staged from 2026-10-28 as attributed **external** evidence. No HILO resident hours or human retention responses. **No duplicate.** |
| Harvard human-in-the-loop robot learning event — https://events.seas.harvard.edu/event/human-in-the-loop-robot-learning (**event 2026-10-30; source publication date unverified**) | An event notice is not a reproducible data-collection result. Existing Harvard SIFToM and RLE-Bench references remain separate. **Not admitted.** |
| Oxford OASIS-Map — https://dynamic.robots.ox.ac.uk/projects/oasis-map/ (**paper originally posted 2026-07-16**) | Repeat-visit object-change detection is already staged from 2026-10-25 as an external method reference. **No duplicate or promotion.** |

**Result:** No materially distinct new primary source passed the `docs/HILO-SOURCE-ADMISSION.md` method-detail, rights, evidence-class and human-entailment gates today. No `config/hilo-source-intake-20261031.json` is fabricated. Previously proposed cards retain `automatic_promotion:false`, `admission_status:proposed`, `consumed_by_workers:false`. The manifest retains 13 reviewed OpenAI cards and eight separately attributed external references. This review does not change the 100-job deterministic plan, max concurrency 5, live execution defaults, frozen scoring, consent, privacy, safety, sealed holdouts, or experiment cohorts.

## Execution, default-branch discrepancy and release boundary

Latest independently checked **default-branch** scheduled data-engine run prior to this review: GitHub Actions run `41119320730`, dated **2026-10-30**, failed in the older intentionally-disabled-live configuration check. That default workflow's failure is **not** evidence of a live worker attempt. The isolated PR #7 workflow already contains the `live_disabled` correction, but remains unmerged; the October 30 PR suite passed **45/45 offline tests**, generated **100 planned jobs**, **0 live starts/completions**.

No source promotions, private recordings, OpenAI internal data, real robot hours, human keep votes, endorsements, certifications, model/API spends or deployments. Any new human-review decision and license/rights authorization must be separate before changing `sources` or `reference_sources`.

**Next:** Independently review PR #7's disabled-live preflight change and its final CI; consider a synthetic-only monitoring coverage regression only after method-entailment and explicit non-ranking boundaries are reviewed. Do not merge PR #7 automatically.

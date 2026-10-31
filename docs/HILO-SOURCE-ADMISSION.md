# HILO Source Admission Policy

Version 0.1 · September 22, 2026

This policy governs how public research references move from daily discovery into HILO/WANTED-10K's reviewed evidence manifests. It does not authorize data ingestion, field studies, model training, certification, leaderboard entries, or deployment.

## 1. Two-stage source flow

Daily research first writes a dated intake snapshot under `config/hilo-source-intake-YYYYMMDD.json`.

A candidate remains **proposed** until a separate reviewed change explicitly promotes it into one of two destinations:

- `sources`: reviewed OpenAI public-method cards that may be supplied to the 100 research jobs.
- `reference_sources`: separately attributed robotics/digital-twin references that remain advisory unless another reviewed change explicitly admits them to worker prompts.

There is no automatic promotion. Discovery volume cannot silently change the worker evidence distribution.

## 2. Required fields

Every candidate must record:

- stable source ID;
- publisher and title;
- publication date when exposed by the source;
- retrieval date;
- exact HTTPS primary-source URL;
- narrowly stated documented finding;
- proposed HILO adaptation;
- evidence class;
- rights scope;
- intended admission target;
- admission status;
- `consumed_by_workers: false`.

Publication and retrieval dates are separate. A current retrieval date must never be substituted for an unknown publication date.

## 3. Admission gates

A candidate may be promoted only when all applicable gates pass:

1. **Primary-source gate.** The claim comes from the originating institution/company or a directly hosted paper/document, not a secondary summary.
2. **Method-detail gate.** The source contains enough methodological detail to support a concrete collection, labeling, evaluation, privacy, safety, or reproducibility practice. Marketing claims or scores alone are insufficient.
3. **Attribution gate.** Company- or lab-reported performance remains explicitly attributed. Promotion does not imply HILO independently reproduced it.
4. **Rights gate.** Public availability is only `method_reference_only` unless a separate authorization grants dataset, training, evaluation, or publication rights.
5. **Evidence-class gate.** Real observations, human demonstrations, simulator output, weak labels, and public reports remain distinct. A source card cannot transform one class into another.
6. **Holdout gate.** No source may disclose or modify sealed holdout membership or the frozen official scoring protocol.
7. **Safety/privacy gate.** The adaptation cannot weaken stop authority, consent, bystander protection, serious-incident handling, or non-compensatory safety requirements.
8. **Test gate.** Manifest loading, 100-job planning, source separation, and source-intake tests must pass after promotion.
9. **Review gate.** A human reviewer must confirm that the cited source actually entails the stated finding and that the HILO adaptation is labeled as a proposal rather than a result.

## 4. Promotion effects

Promoting an OpenAI method card into `sources` changes the manifest hash and can change which cards are assigned to the 100 jobs. The new plan must therefore be regenerated and archived.

Promoting an external robotics reference into `reference_sources` does **not** make it worker evidence. Any later decision to use an external reference in worker prompts requires an explicit policy/version change and new tests.

## 5. Rejection and deferral

A source should remain staged or be rejected when:

- the public page gives results but not enough reusable method detail;
- publication provenance is ambiguous;
- the finding cannot be separated from promotional inference;
- the adaptation would require rights that have not been granted;
- it duplicates an admitted source without materially new methodology;
- it would leak a holdout, weaken a safety/privacy gate, or encourage optimizing attachment/dependency.

The dated intake file should record reviewed-but-not-admitted sources and the reason. Do not manufacture novelty merely to create a daily change.

## 6. Daily operation

Daily runs compare new primary sources against the existing manifest and prior intake snapshots. They may add supported staged candidates, corrections, or explicit no-change notes.

The daily process never:
- invents human keep votes or resident hours;
- treats public videos as permissioned HILO participant data;
- contacts source authors or participants;
- purchases data or incurs model/hosting spend without approval;
- deploys or merges itself;
- awards WANTED certification.

The canonical benchmark, safety gates, consent boundaries, and release checklist remain authoritative.

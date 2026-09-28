# HILO Failure Mining and Million-Hour Evidence Program

**Research add-on 0.1-RM1 · source check: 2026-09-04 · not a certification**

This consolidates the HILO review-mining conversations into the existing Embodied Arena / WANTED-10K project. It adds a diagnostic ontology, a source-checked seed catalog, a proposed test program, local validation utilities, and a read-only website section. It does not replace WANTED's endpoint, evidence gates, signed telemetry, witness protocol, analysis or certification rules.

## What exists and what does not

The checked-in catalog contains **72 candidate modes in 12 families, 16 proposed test suites, 12 source-checked review/discussion pages and 9 external references**. Source reading verifies what a page says, not that the described event occurred or that its alleged cause is correct. These pages are a purposive discovery sample, not all reviews, a random sample, a brand leaderboard, or an incidence study. Exact publication timestamps were not verified and remain null; retrieval date must never be substituted for publication or incident date.

**Zero real robot-hours or video-hours were collected by this add-on. No external dataset was downloaded. No crawler, model API, video-processing fleet, paid storage, live upload endpoint or scheduled mining worker is deployed.** The read-only page is a versioned snapshot. Existing scheduled ChatGPT tasks are outside this module and their current status is not asserted here.

Implementation: `public/hilo/catalog.json`, `public/hilo/hilo-review-mining.mjs`, schema, test vectors, and `/wanted-10k/failure-mining`. Proposed infrastructure and physical protocols below are not represented as implemented collectors or executed experiments.

## Preserve the benchmark's scientific contract

The repository defines WANTED-10K around time to **permanent, uncoerced voluntary rejection** over resident hours. Retain its existing analysis, competing terminal causes, tail-support rules, cohort integrity, confidence calculations and audit gates. Safety termination, developer withdrawal, consent withdrawal and unrelated departure must not silently become ordinary censoring or interchangeable rejection events. A temporary pause, a robot replacement and consent withdrawal have distinct meanings.

A review saying “I stopped using it” is an endpoint candidate, not an adjudicated WANTED event. Retention is not proof of safety: incentives, sunk cost, dependence, unavailable alternatives and social pressure can suppress rejection. Report them and preserve the independent non-compensatory safety and privacy gates. A good cleaning score cannot compensate for a serious safety event.

Use the existing WANTED analysis implementation for the primary score. This add-on does not invent a replacement weighted score, issue a certificate, or put a synthetic row in the official leaderboard.

## Source audit and corrections

Every source in `catalog.json` has a URL, locator, original short summary, source kind, retrieval date and explicit evidence boundary. Brand/model associations belong to the source observation, not to all members of a failure family. A mode's `source_ids` means **test inspiration**, not confirmed causality or a verified defect.

Important corrections to earlier narrative drafts:

* **S03, Matic bag detection:** installation correctness is not verified; replies suggest seating checks. This is a suspected diagnostic lockout, not proof that a healthy machine hallucinated a fault.
* **S06, Dreame brush warning:** the owner also reports a visible clog. Do not erase that confounder or label this a confirmed false positive. Personal medical context is omitted from the public dataset.
* **S10, Matic battery:** a prospective buyer asks about future serviceability. It is not an observed battery failure, nor proof that service-center replacement is unavailable.
* **S05, Roomba update:** the opening post praises an improvement while comments describe regressions. Extract individual observations; do not turn the whole thread into one negative review.
* **S01, Ecovacs roller:** nearly identical threads appear in multiple communities. Treat them as a candidate crosspost cluster, not three independent owners. Rear impacts do not establish property damage or prove actuator forces.

Prior chat claims without a newly checked source remain **brand-neutral, unverified test candidates**. Do not reuse old citation tokens as evidence. Store null for missing dates, hours, firmware, counts, incident mechanism and repair outcomes. Reviews must never be converted to operating hours by assuming daily use.

## Ontology: stable codes, not endlessly renamed categories

The 12 families are mission, mobility, diagnosis, intent, recovery, resources, hygiene, human burden, lifecycle, trust, learning and evidence integrity. Stable IDs HILO-001 through HILO-072 are in the catalog. Labels may evolve; IDs must not be recycled. Preserve an alias/change record when merging or splitting a mode.

Existing concepts retained include human intervention, cable/tassel entanglement, silent task failure, no-go violations, false avoidance, retries, leaks, odor, negative work, firmware regressions, state mismatch, serviceability, cloud loss, preconditioning, phantom faults, human motion envelopes, powered soak, app migration, partitions, battery prediction, repair defects, support lifetime, accommodation capital, critical-window availability, unauthorized starts, silent notifications, omitted stages, resource feasibility, common-mode replacements, timezone continuity, cascades, maintenance closure, semantic map/identity drift, acoustic aging, geographic restrictions, biological accumulation, inconsistent instructions, cross-actuator conflict, dormancy, alert fatigue and chemical/climate effects.

**New design proposals**, not claimed new owner discoveries, include multi-user authority conflict, command cancellation/replay, accessible assistance, personalization drift, recovery-learning transfer, privacy/consent propagation, missing-evidence laundering, clock corruption, duplicate exposure and malicious instructions embedded in review text.

Early-life, random and wearout hazards are lifecycle analysis strata, not three invented incident counts. “Self-knowledge,” “state integrity,” “compositional reliability,” and “intent integrity” are useful reporting groupings, not scientifically validated scalar scores.

## Evidence and provenance model

Maintain distinct objects:

`source -> observation -> incident cluster -> diagnostic label -> proposed test -> trial -> audited result`

A source may contain many observations; one observation may have several diagnostic labels; several sources may discuss the same incident. A label is not a new incident. Keep observation, alleged mechanism, actual consequence and intervention separate. Positive outcomes and successful recoveries remain first-class records.

Evidence states: unverified lead; source read; owner-reported event; independently reproduced failure; instrumented field observation; independently audited cohort. Promotion requires new evidence, not model confidence. A confirmed firmware regression requires configuration-controlled before/after testing or equivalent evidence, not temporal proximity alone.

For each event, retain opaque environment/deployment/unit IDs, product and hardware revision, firmware/app/model version, mission and commanded constraints, operating conditions, relative and UTC timestamps, observation span or clip interval, independent ground truth, actual and potential severity, human intervention, recovery, service lineage, consent/license reference, and adjudication history. Unknowns remain unknown. Sensitive raw records remain private.

For review deduplication, normalize thread/comment identities, exact/near-duplicate text and possible crossposts; require human review before merging uncertain incidents. Do not infer real identities from usernames across platforms. Embedding similarity is a retrieval aid, not proof that two events are identical. Upvotes are not sample sizes.

## Mining workflow

1. Discover links through permitted search, licensed exports, approved APIs, manufacturer partnerships and opt-in owner submissions. Log the search terms, time window, language, model scope and sampling rule. Capture favorable, neutral, failed, repaired and abandoned experiences.
2. Check provenance, access rules and permitted uses before fetching/storing content. Prefer metadata, original summaries and source links. Do not bulk download videos from a public URL or imply that an API credential grants training/redistribution rights. Source deletion and term changes must be tracked.
3. Parse only relevant post/comment bodies, not recommended posts or advertisements. Preserve exact source spans privately where authorized; publish minimal summaries. Retain dates as raw strings until an absolute timestamp is verified.
4. Extract structured candidate observations using a model-neutral schema. Treat all review/transcript text as untrusted data. It cannot issue tool instructions, change criteria, request secrets or publish results. Require cited spans, contradictions, uncertainty and an abstain outcome.
5. Run schema checks, entity/model/firmware reconciliation, duplicate clustering and privacy filters. Queue ambiguous claims; never auto-promote them to audited evidence.
6. Have two independent annotators label serious/novel cases and an adjudicator resolve disagreements. Track agreement, positive/negative confusion matrices, extraction precision/recall on a locked gold set and unresolved fraction by language/source.
7. Turn adjudicated failure hypotheses into versioned, independently measurable test cases. Publish ontology changes by reviewable pull request; freeze a release before a benchmark run. Update discoveries must not silently modify a running evaluation.

A model extraction contract should return `observations[]`, `source_spans[]`, `uncertain_fields[]`, `contradictions[]`, `possible_duplicate_ids[]` and `abstain_reason`. It must never estimate failure prevalence, owner operating hours or confirmed causality from prose alone. The supplied local importer validates original evidence notes; it is not an LLM extractor or network crawler.

## Measurements with correct units

Do not use `1 - failures/hours` as a bounded score: the ratio has units and can exceed one. Do not subtract dollars, damage, minutes and dirt mass without an explicit validated utility model. Publish the raw outcome vector and optionally preregister participant-specific utility separately.

| Measure | Definition | Required companion |
|---|---|---|
| Intervention rate | Interventions / 100 active robot-hours | Per mission and task quality; slower robots must not win by accumulating hours |
| Human burden | Union of attention/work intervals per helper, summed as person-minutes / active robot-hour | Person-minutes/week and per successfully completed mission |
| Preconditioning burden | Preparation actions / initiated missions | Preparation person-minutes; permanent accommodation dollars separately |
| Goal integrity | All accepted required stages and independent quality criteria satisfied | Partial-stage fraction separately, never mislabeled full success |
| Recovery success | Successful recoveries / eligible recovery episodes | Retry count, time, energy, fluid and severity; unknown with no opportunities |
| Constraint violations | Violations / relevant constrained opportunities | Critical event log; task/context stratification |
| False fault rate | False lockouts / independently verified healthy opportunities | Missed faults / verified faulty opportunities |
| Alert usefulness | Intervention states usefully alerted before deadline / actual intervention states | Repeated nonurgent alerts and silent-immobilization time |
| Net cleaning | Before/after contamination mass and transfer to protected zones | Residue, fluid, surface damage, manual rework and measurement error separately |
| Availability | Ready-to-perform time intersected with declared demand windows / demand-window time | Downtime by cause, full resident time, planned maintenance and missingness |
| Repair continuity | First-fix yield, downtime, recurring faults and restoration of accepted capabilities | Robot/component lineage; unit age does not reset the household history |
| Resource feasibility | Mission resource prediction error and safe reserve at completion | Replanning, recharge, refills and stranded missions |

A zero denominator is **not observed / null**, not perfect performance. Recovery retries within one incident do not inflate the incident numerator. Overlapping downtime categories are nonadditive; union intervals before calculating total downtime. Waiting days are not active support person-minutes. Overlapping human work is merged per helper; two different helpers contribute two person-time streams.

No proof of a hazardous fault may be obtained by defeating protective sensors. Graceful degradation is allowed only inside an independently assessed safe operating envelope. Stopping can be correct behavior.

## The 16-suite test program

The catalog contains executable-design descriptions and measurement targets for T01–T16. Physical adapters and trial results are not yet provided. Each test implementation must add a preregistered operating envelope, fixture description, instrument calibration, independent truth source, random seed, command, expected behavior, acceptance threshold, stop conditions, repetitions, power justification and assessor identity.

High-priority additions:

**T01 intent:** stale commands, cancellations, duplication, reboots, clock changes and two-household-user conflicts. Safe stop authority must remain local and independent of the conversational/model layer.

**T02 diagnosis:** confirmed healthy states, genuine fault states and ambiguous partial faults. A user saying a bag was installed is not independently verified truth. Score both needless lockout and unsafe missed faults.

**T03 closure:** mission intent, actual floor result and complete material flow. Confirm that automated emptying/washing/refilling restores readiness rather than merely activating a motor.

**T04/T05 interactions:** ingress is not proof of safe egress. Test asymmetric transitions and combination-only failures with controlled friction, payload and actuator state. Bound retries and resources.

**T06/T07 time:** retain persistent memory across normal use and updates; separate powered soak from dormancy, calendar aging and duty-cycle wear. Never factory-reset away failure history.

**T08/T09 coexistence:** climate, safe permitted residues, hygiene, noise, social disruption, alert acknowledgment and participant-accessible recovery. Use inert contamination surrogates and instrumented human/pet proxies where harm is possible; never deliberately expose people or animals to dangerous contact.

**T10/T11 service:** include cloud partitions, repair trips, unavailable parts, unit replacement and preference migration. Do not label a feature discontinued without verified evidence of its support status.

**T12–T16 field generalization:** keep WANTED retention intact, test learning on held-out environments, audit privacy/evidence, stress rare sequences safely, and sample ordinary success as well as failure.

Generate pairwise interaction coverage, targeted three-way combinations and time-ordered scenarios rather than claiming to exhaust a huge Cartesian product. Report coverage and exclusions. Randomized testing does not replace hazard analysis. Use held-out household/site, product generation, firmware epoch, season and task families. Keep household/crosspost/video-neighbor clusters in one split to prevent leakage. Public development cases and a separately governed private audit set must remain distinct.

## Millions of hours: separate clocks and units

Store at least these counters independently:

* **Resident environment-hours:** follow the existing signed WANTED lifecycle ledger, including its pause/service rules.
* **Active robot-hours:** measured authorized task-attempt operating intervals, including unsuccessful attempts per physical unit; no inference from clip duration.
* **Autonomous active hours:** active intervals with assistance/teleoperation status explicitly measured.
* **Verified human co-presence/contact hours:** only from consented, measured intervals; not all resident time.
* **Video stream-hours:** recording duration per unique camera stream.
* **Field robot video coverage:** union of video intervals per robot; presence on camera is not proof of activity.
* **Human-demo, simulation and synthetic hours:** distinct origin counters, never added to certified physical exposure.

Three cameras observing one robot for one hour give three stream-hours but at most one robot-hour. Ten re-encodings or replays give no new physical exposure. Multiple robots in one household do not create extra independent household retention units. Time without observation must not be called failure-free. Keep observation gaps separate from resident time: valid lifecycle exposure can exist without continuous video, but event absence cannot be inferred from missing recordings.

A million aggregate hours across young robots does not establish a million-hour unit life, or even 10,000-hour wearout. Report total exposure **and** independent homes/sites, physical units, serial age, calendar age, longest follow-up, age distribution, duty cycle, repair lineage and firmware epochs. A 10,000-hour tail estimate is not rankable merely because many shorter deployments sum to 10,000 hours; preserve the repository's tail-identifiability rules.

For zero observed events in H completely observed hours, under a homogeneous constant-rate Poisson model, the one-sided 95% upper event rate is `-ln(0.05)/H`. At H = 1,000,000 that is approximately **2.996 events per million hours**, not proof of zero risk. This is neither a voluntary-retention survival estimate nor evidence against increasing wearout. Heterogeneous sites, common firmware failures and temporal correlation require appropriate clustered or hierarchical analysis. Freeze sequential monitoring rules to avoid optional-stopping claims. NIST's referenced constant-rate model provides context, not a waiver of its assumptions.

Do not publish an undefined “P90 10,000-hour survival.” Distinguish a survival probability at 10,000 hours, its confidence interval, and identifiable lifetime quantiles. Keep competing terminal causes, repairable recurrent failures and first rejection endpoints separate.

## Data architecture and cost-controlled scale

Proposed production flow:

`approved discovery -> rights registry -> source/asset catalog -> bounded work queue -> local redaction -> extraction -> deduplication -> human adjudication -> versioned events/labels -> held-out benchmark -> independent audit -> public aggregates`

Use object storage for authorized media and large telemetry, not Git. Keep code, contracts, manifests, small synthetic fixtures and source links in GitHub. Candidate formats: MCAP for timestamped heterogeneous telemetry, Parquet for analytical tables, and explicit dataset adapters for RLDS/LeRobot-compatible episodes after version/license review. These adapters are proposed, not implemented here.

Each asset manifest should bind content hash, origin, source/consent/license versions, capture timestamps and clock error, environment/unit/session/stream IDs, access class, retention expiry, revocation status, redaction version, extraction model version, parent assets, split assignment and exact allowed purposes. A hash proves content integrity, not real-world truth, ownership or correct annotation. Reuse the repository's signed telemetry/root/witness chain rather than calling this local utility a signature verifier.

At scale, partition by consent/access class, origin, dataset version, capture day and deployment; assign idempotency keys and shard by stable unit/environment IDs. Use checkpoints, bounded retries, dead-letter queues, quotas, backpressure and per-stage spend limits. Interval unions can be computed by sorted partitions; **do not sum independently deduplicated shard totals without reconciling cross-shard overlaps**. The provided in-memory summary function is a reference calculator, not a million-hour distributed service. The JSONL validator processes records incrementally; provenance uniqueness and cross-record reconciliation remain a separate batch audit.

Use cheap metadata/audio-free event triggers and low-rate thumbnails for candidate selection; process higher frame rates around uncertainty, near misses and representative random control windows. Do not retain only failures: representative sampling and inclusion probabilities are necessary for rate estimation. Track model costs, annotation minutes, recall on missed-event audits, storage and deletion costs independently. Models do not need every frame at full resolution.

Planning assumptions, not allocated resources:

| Scenario | Arithmetic | Result |
|---|---|---|
| One million scenario-hours, one 4 Mbps camera, one copy | H × 3,600 × 4e6 / 8 | 1.8 PB decimal media only |
| Same, three cameras and two copies | 1.8 PB × 3 × 2 | 10.8 PB |
| Ten million scenario-hours, one camera/copy | 10 × 1.8 PB | 18 PB |
| One million hours at 0.1 sampled frame/s, one camera | H × 3,600 × 0.1 | 360 million sampled frames |
| Hypothetical collection cohort | 10,000 robots × 2 active h/day × 50 days | 1 million active robot-hours before unusable/missing data |

The fleet example is arithmetic, not a recruited cohort or forecast. At 80% usable coverage it would need 62.5 days under the same assumptions. Prices, egress, replicas, telemetry, thumbnails, indexes and annotation require an approved budget and current provider quotes. No paid infrastructure is provisioned by this change.

## Data resources: use, do not relabel

Primary links and exact scope are in the catalog. DROID supplies real manipulation demonstrations, Open X-Embodiment supplies trajectories across embodiments, and Ego4D supplies human video. BEHAVIOR-1K and RoboCasa365 supply simulation tasks/demonstrations. Their durations, trajectories, camera counts and human demonstrations are not interchangeable with autonomous household exposure. These are candidate adapters/scenario sources, not data collected or licensed by HILO. Pin release, license, underlying mixture overlap and allowed use before ingestion.

Beyond vacuums, extend domain-specific hazards for lawn robots, pool cleaners, delivery robots, inspection drones, warehouse AMRs, industrial cells and humanoids. Transfer the event structure and evidence discipline, not vacuum thresholds. A drone's flight hour and a home's resident hour are different exposures; industry-specific applicable standards and safety assessment remain necessary.

## Privacy, licensing and governance

Default to link-only original summaries for public reviews. Approved private media must have explicit capture, processing, training/evaluation, sharing and retention permissions; these rights are separate. Public visibility alone is not permission to redistribute or train. Review YouTube/Reddit policies and each dataset license at integration time. Do not bypass access controls, scraping blocks or platform restrictions.

Home media can expose children, bystanders, voices, routines, addresses and private rooms. Minimize collection; use on-device redaction where practical; exclude private/sensitive areas by default; separate identity keys from events; encrypt private objects; use role-limited access and audit logs. A household owner's permission is not automatically every bystander's permission. An independent privacy/consent review precedes field deployment.

Revocation must reach raw assets, clips, thumbnails, transcripts, embeddings, annotations, cached copies and later manifests. Stop distribution immediately and apply retention/deletion policy; restrict or retire affected releases. Do not promise automatic erasure of influence from an already-trained model. Private original-media URLs and secrets must never enter the public catalog or Git history.

Maintain a correction mechanism and manufacturer right of reply without allowing sponsors to delete adverse results. Incentives cannot depend on positive reviews, hours without reported failures or continued robot retention. Incentivize truthful reporting and independent audit. Severe events trigger assessed safety action, not a score adjustment.

## Run the implemented reference utilities

Node 22; no npm installation or external network required for these commands:

```bash
node --test tests/hilo-review-mining.test.mjs
node public/hilo/hilo-review-mining.mjs validate review public/hilo/example-review.jsonl
node public/hilo/hilo-review-mining.mjs validate clip public/hilo/example-clip.jsonl
node public/hilo/hilo-review-mining.mjs plan 1000000
```

Examples are explicitly synthetic metadata fixtures. They are not real recordings, approved consent records, observed trials or certification evidence. `record.schema.json` covers transport shape; the SDK adds semantic timestamp, known-mode and rights checks. No reference utility downloads media, controls robots, signs audit evidence or independently verifies consent assertions.

## Completion gates for the program

**Release gate:** source and alias audit, contract tests, website build and existing repository verification. Publish as a reviewable branch/PR before merging; do not alter immutable release tags or claim a production deployment.

**Pilot gate:** consented cohort, calibrated instruments, positive/negative gold set, source permissions, severe-event stop plan, independent recruitment and cost cap. Audit extraction and missingness before expanding.

**Scale gates:** 1,000 -> 10,000 -> 100,000 -> 1,000,000 -> 10,000,000 aggregate *measured* hours, each with versioned coverage, unit-age support, retention, bias, privacy and failure-rate uncertainty reports. Passing a scale gate does not itself confer WANTED certification.

**Long-horizon gate:** enough independently audited long-duration environments to identify the intended horizon without extrapolation, while keeping service and competing events visible. An evolving, falsifiable benchmark with disciplined evidence is the goal; no finite crawl establishes an ultimate or exhaustive benchmark.

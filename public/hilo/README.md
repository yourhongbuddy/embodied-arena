# HILO 0.1-RM1 research kit

This is a source-linked diagnostic proposal, **not certification**. The official WANTED retention estimator and gates remain unchanged. The source audit was conducted September 5, 2026, America/Los_Angeles. The [source audit and corrections](SOURCE-AUDIT.md) supersede September 4 draft source-check labels elsewhere; they are not publication or incident dates.

- `catalog.json`: 72 candidate modes, 16 proposed suites, 12 source pages and 9 external references. Links motivate tests; they do not establish incidence or causality.
- `SOURCE-AUDIT.md`: exact source links, interpretation limits, corrections and the distinction between owner incidents, prospective questions and independent tests.
- `hilo-review-mining.mjs`: dependency-free Node 22 validator, interval reconciliation, burden accounting and capacity planner. It makes no network calls and collects no video.
- `record.schema.json`: strict review-note and video-metadata transport schemas. Runtime semantic checks are also required.
- `example-*.jsonl`: **synthetic validation fixtures**, not actual reviews, permissions, video or field exposure. Never add them to real-world counters.

```sh
node public/hilo/hilo-review-mining.mjs validate review public/hilo/example-review.jsonl
node public/hilo/hilo-review-mining.mjs validate clip public/hilo/example-clip.jsonl
node public/hilo/hilo-review-mining.mjs plan 1000000
node --test tests/hilo-review-mining.test.mjs
```

Batch reconciliation keeps origin-specific media coverage separate from robot coverage; neither becomes resident or autonomous hours. Incremental JSONL validation checks individual rows only. Deployment-wide deduplication, adjudication, authorization, distributed processing and existing WANTED signed-ledger verification are separate requirements.

Raw source text, home video, identity mappings and secrets do not belong in GitHub. Third-party rights are not sublicensed by this project. Full design: `docs/HILO-REVIEW-MINING.md`; actual test evidence and corrections: `docs/HILO-VALIDATION.md`.

Website route: `/wanted-10k/failure-mining`. Global navigation remains unchanged because its source bytes are frozen into an existing experiment. The branch is not a deployment; no live collection worker, uploader, paid storage or fleet has been provisioned.

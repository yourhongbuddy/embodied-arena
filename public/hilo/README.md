# HILO 0.1-RM1 research kit

These files are a source-linked diagnostic proposal, **not certification**. The official WANTED retention estimator and gates remain unchanged.

- `catalog.json`: 72 candidate failure modes, 16 proposed suites, 12 source pages and 9 external references. Source links motivate tests; they do not establish incidence or causality.
- `hilo-review-mining.mjs`: dependency-free Node 22 reference validator, interval reconciliation, burden accounting and capacity planner. It makes no network calls and does not collect video.
- `record.schema.json`: strict review-note and video-metadata schemas. Runtime semantic checks are also required.
- `example-*.jsonl`: **synthetic validation fixtures**, not actual reviews, permissions, video or field exposure. Never add them to the catalog's real-world counters.

```sh
node public/hilo/hilo-review-mining.mjs validate review public/hilo/example-review.jsonl
node public/hilo/hilo-review-mining.mjs validate clip public/hilo/example-clip.jsonl
node public/hilo/hilo-review-mining.mjs plan 1000000
node --test tests/hilo-review-mining.test.mjs
```

Batch clip reconciliation keeps origin-specific stream coverage separate from robot coverage; neither becomes resident or autonomous hours. Streaming JSONL validation checks individual rows only; deployment-wide deduplication, review adjudication, authorization, distributed processing and existing WANTED signed-ledger verification are separate requirements.

Raw source text, home video, identity mappings and secrets do not belong in GitHub. Third-party source rights are not sublicensed by this project. Full design: `docs/HILO-REVIEW-MINING.md`.

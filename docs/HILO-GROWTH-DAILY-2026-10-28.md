# HILO / RobotRouter GrowthOps daily — 2026-10-28

Independent daily HILO/WANTED-10K progress on open successor **PR #10** (`hilo/growth-ops-20260923`) following merged PR #9. Preserve independent **data-engine PR #7**, draft diagnostic **PR #8**, consent/privacy, immutable scoring and holdouts. No merge, DNS edits, deployments, approved paid calls, new robot claims, contacts invented or unsanctioned external submissions.

## Reproduced synthetic telemetry defect and source commits

An ordinary non-`HUMAN_INTERVENTION` synthetic event with `"human_assistance_seconds": null` previously **passed** because the validator only rejected values other than `None`. That obscures intended event shape and intervention accounting: non-intervention events must omit that field. This is a deterministic, **non-normative synthetic-only** fixture validator, not a leak or proof of field-collection errors.

- `tools/hilo_synthetic_preflight.py` change: test the **presence** of the assistance key on every non-intervention event. Commit `9bd46bedd24c5bb617d40a62c1c4f12643ab2e1f`.
- `tools/test_hilo_synthetic_preflight.py`: add regressions for explicitly null **and** zero assistance keys on other event types. Commit `d21fa0149a09ebe6c2a60e3339b3f4b9bfff0bfd`.
- `docs/HILO-SYNTHETIC-PREFLIGHT.md`: document absent-vs-null semantics. Commit `0964eeb939445bf35873b675d1a9090dcbdd6f11`.
- Unrelated score/evaluation, cohort, stop-authority, privacy/rights and data-engine source manifests are **unchanged**.

**GitHub-hosted fresh CI, initial checked revision** `0964eeb9`, run **40724453317**, completed successfully October 28: **32/32 GrowthOps tests**, **24/24 synthetic-preflight tests**. A 19-probe GitHub-hosted read-only public audit also succeeded. The later distribution/document-only commit requires its own CI status before the latest revision can be called green. No source test is evidence of production deployment.

## Public website — independent GitHub-hosted vantage, October 28

**Audit run 40724453317**, logged 2026-10-28T16:17:27Z (**09:17:27 PDT**); independent network control HTTP **200**, **19 public HTTP GET probes**, actual custom-domain vs DigitalOcean origin comparisons:

| Route | Public custom domain | DigitalOcean origin |
| --- | ---: | ---: |
| `/wanted-10k` | 200 | 200 (body differs) |
| `/wanted-10k/protocol` | 200 | not paired |
| `/wanted-10k/sdk` | 200 | not paired |
| `/wanted-10k/conformance` | 200 | 200 (body differs) |
| `/wanted-10k/sampling-stopping` | 200 | 200 (body differs) |
| `/wanted-10k/data-engine.html` | **404** | 200 |
| `/hilo/developers.html` | **404** | 200 |
| `/coding-for-engineers` | **404** | 200 |
| `/sitemap.xml` | **404** | 200 |
| `/robots.txt` | 200 | 200 (body differs) |

**Four status mismatches and four actual body mismatches** across successful paired 200 responses. Five accessible WANTED pages passed automated title, description, canonical, Open Graph, Twitter/social-card and H1 checks. The source sitemap includes ten canonical URLs, but **public sitemap still 404**; no SEO change is deployed. A local-source headless-Chrome developer preview does **not** demonstrate that the public developer page loads. Today's full external browser asset/link crawl and exact production deployed commit were **not established**. Direct sandbox/network failure is not proof of global outage.

Evidence supports a stale release or domain/application binding discrepancy but does **not** conclusively establish cause. DigitalOcean spec `.do/app.yaml` retains `deploy_on_push:false`; do not deploy, edit DNS, start new resources or restart arbitrarily. Investigate exact deployed build and custom-domain binding under `docs/RELEASE-CHECKLIST.md`, verify immutable tag/version index, `npm run verify`, CI, resource pricing and independent public post-release URLs first. The optional experiment receipt / D1-vs-Node issue stays separate unresolved backlog.

## Real capacity and execution

October 28 run **40724453317** recorded **10,000 stable addressable slots** in 10 lanes; **79 assigned, 37 completed deterministic audits, 0 reported deterministic failures, 42 awaiting connector/review, 9,921 waiting for actual targets**; 19 network probes and network-control 200. **0 live LLM requests/starts/completions**, **0 runner outbound messages**, **0 store submissions**, **0 deployments** and **0 verified robot field hours**. These are slots, **not** 10,000 running agents or market reach. `max_model_requests:0` and `auto_publish:false` remain unchanged. Older default-branch runs use a different registry; do not add its counts.

Separate data-engine **PR #7** staged a newly attributed external DITTO-X method on its own branch in `config/hilo-source-intake-20261028.json`; original paper submitted **2026-09-30**; retrieved **2026-10-28**; proposal `consumed_by_workers:false`, `automatic_promotion:false`. Source: https://tml.stanford.edu/ditto-x/ and https://arxiv.org/abs/2610.00781. It distinguishes forward teleoperation, reverse state-matched human takeover and autonomous intervals, not human keep votes or field-hours. The 100 offline research jobs, 13 reviewed OpenAI worker source cards, distinct external reference ledger and human admission gates remain unchanged. The last completed data-engine PR run **40724137186** on staged-intake commit **a0234f2d** passed offline checks; any newer data-engine doc commit requires its own final CI verification. Default-branch daily data-engine workflow **40575205227** on Oct 27 failed its old disabled-live preflight after its offline tests, while PR #7 contains the `live_disabled` correction unmerged.

## Distribution — selective primary-source review, no publication

Committed `distribution/HILO-DISTRIBUTION-REVIEW-20261028.md` (commit `dc8b27ba94562be9b4c88eb8eb817858909c5cd6`) with rules URLs, retrieval date, actual artifact, auth/fee/rights restrictions and next steps. **New** official candidate ROS Index: https://index.ros.org/contribute/add_repo/ requires a **genuine ROS package** and reviewed `rosdistro` entry accepted by maintainers; HILO has **no** ROS package, so no irrelevant PR. Rebind's official guide was fresh rechecked October 28 at https://docs.rebind.gg/marketplace/publishing; it requires a real Luau script with `rebind.toml`, permission disclosure, `rebind check`, preview, dry-run and publisher review, but says no mandatory Pro/hardware. HILO does not have that artifact. OpenAI's skills-only Plugins Directory https://developers.openai.com/plugins/deploy/submission remains blocked by verified publisher, icon, license, scan, actual installation and approval; personal-account GPT Store is not an alternative. Skills.sh, Claude, MCP, ClawHub, Hugging Face and legitimate robotics community paths remain gated. **Zero** submitted URLs, **zero** accepted listing URLs and **zero** social publications; authentic installs/reach/conversions **unmeasured**. No directories exhaustively scanned or synthetic installs counted.

## Gmail/privacy and costs

Read complete HILO correspondence and recent sent history in connected Gmail, with explicit do-not-contact suppression. The two **October 23** substantive academic responses remain confirmed sent and were not duplicated. One earlier **October 19** interested researcher's request to schedule Nov 2–6 remains unresolved because HILO meetings are paused; no time was proposed. No newer substantive HILO human reply found. Today: **0 new contacts, 0 existing-thread replies, 0 new sent emails, 0 repeat nonresponder followups, 0 meetings, 0 social posts, 0 submissions**. Private contact addresses, identities/suppression and correspondence stay in Gmail, not the public repo.

**New paid model/API/ads/data/subscription/hosting spend initiated: $0**. Existing GitHub Actions/hosting charges not independently measured. No novel credentials, licenses, data acquisition, robots or deployment claimed.

## Next priorities

1. Determine exact production **deployed commit**, domain binding, public link/asset failures and release gate before any authorized routing/deployment repair.
2. Review and merge on separate grounds PR #7's tested `live_disabled` fix to stop the older default-branch scheduled false failure; no model credentials or live runs.
3. Require owner approval on publisher/license/terms and build a genuinely tested installable synthetic-only developer adapter (ROS, pre-commit, or portable skill) before any directory submission. Never add artificial engagement.

# HILO / RobotRouter GrowthOps daily — November 9, 2026

**Scope:** Independent production routing/SEO/browser verification; two focused read-only diagnostic-evidence corrections; bounded follow-on link coverage; selective official-source distribution review; separately gated data-method research on PR #7; private existing-thread inreach. No deployment, merge, paid model, commercial commitment, new contact, posting or external directory submission.

## Independently measured production site

**Verified November 9 at 18:03:15 UTC (10:03 PST)** from a GitHub-hosted Ubuntu runner and headless Chrome. [Successful audit #42670475208](https://github.com/yourhongbuddy/embodied-arena/actions/runs/42670475208), [actual evidence artifact](https://github.com/yourhongbuddy/embodied-arena/actions/runs/42670475208#artifacts). The artifact's source commit `92870c5c7ff284144ec97c5022503c6e87f82bcd` is a PR merge-preview checkout, **not** the current branch head or the deployed production commit. Independent network control HTTP 200, 19 public origin probes.

| Path | getrobotrouter.com | Compared DigitalOcean origin |
|---|---:|---:|
| `/wanted-10k` | 200 | 200 |
| `/wanted-10k/protocol` | 200 | not compared |
| `/wanted-10k/sdk` | 200 | not compared |
| `/wanted-10k/conformance` | 200 | 200 |
| `/wanted-10k/sampling-stopping` | 200 | 200 |
| `/wanted-10k/data-engine.html` | **404** | 200 |
| `/hilo/developers.html` | **404** | 200 |
| `/coding-for-engineers` | **404** | 200 |
| `/sitemap.xml` | **404** | 200 |
| `/robots.txt` | 200 | 200 |

Successful WANTED, conformance, sampling/stopping, and robots responses have different bodies across origins. Five accessible WANTED HTML pages passed title, description, route-specific unique canonical, Open Graph/social card, H1, robots meta and X-Robots-Tag checks. Corrected ten-URL sitemap exists in repo but **not at the public custom-domain route**.

Chrome captured the public WANTED DOM; inventory had **44 same-origin link paths and 20 static assets**. Fixed-origin one-byte-range GETs observed **20/20 eligible static assets** successful (HTTP 200/206) and **28/28 eligible WANTED documentation links** successful across two disjoint request batches (16+12). No measured 404/410 in those 48 bounded checks. Some remaining paths and browser script execution/navigation are unverified: these checks are **not a complete browser-network or link crawl**. The 4 public routing failures are still real and are not explained away by successful asset/link subsets.

**Production fix: none.** Exact live DigitalOcean deployment SHA and custom-domain app/domain binding remain unknown. Different active versions/bindings remain a hypothesis, not established cause. Never infer a global outage from sandbox DNS. No DNS edits, restarts, deploy, tags, prices or hosting changes; `deploy_on_push:false` and `docs/RELEASE-CHECKLIST.md` preserved. Optional experiment-receipt/D1-versus-Node rendering remains an independent, unverified repair backlog item.

## Reproduced evidence-integrity bug and tested fix

The public browser inventory already suppresses query values and flags `query_variant_unverified:true`, but its downstream document and asset checkers had still been fetching the sanitized **queryless path** and claiming its HTTP success represented the original query-bearing resource. A path-only request cannot establish behavior for `?mode=...` or `?token=...`. `tools/hilo_link_probe.py` and `tools/hilo_asset_probe.py` now conservatively omit flagged query-variant rows, with explicit independent regression tests in `tools/test_hilo_link_probe.py` and `tools/test_hilo_asset_probe.py`. No sensitive query values are retained.

Additionally, `tools/hilo_link_probe.py` now takes a bounded `--offset` for a **second distinct batch** of up to 16 approved read-only one-segment WANTED paths. `.github/workflows/hilo-growth.yml` writes separate first and next-batch receipts; regression tests require nonoverlap and accurate paths remaining after the second batch (zero of the 28 eligible). Each request is read-only, fixed-origin, no redirect, no private paths/body capture, no authentication, no paid adapter. These are **audit fixes and coverage**, not changes to production routes, official scoring, privacy, or robots.

## Actual slots, jobs, communications, costs

Artifact `report.json`: **10,000 registered stable slots; 79 assigned; 37 completed deterministic audits; 0 failed; 42 awaiting review/connector; 9,921 waiting for real targets**. **19 route HTTP probes; 0 live LLM starts/completions/requests; 0 runner-sent messages; 0 submissions; 0 deployments; 0 verified robot hours**. Slots are not model agents, people, trials or conversion measurements. `max_model_requests=0`, `auto_publish:false` unchanged.

Full relevant Gmail thread/sent-label/suppression review uncovered an **existing Robotnik vendor correspondence** with a substantive request for benchmark technical requirements. **One nonbinding, truthful existing-thread response was actually sent on Nov 9** describing independent early-stage navigation/safety logging objectives, no current study site/payload, asking for developer interfaces/specifications/evaluation options. No invented University of Michigan affiliation, agreement, meeting, or private environment images; specific contact names, addresses, thread/message IDs and content remain **only in Gmail**. September 22 and October 23 scholarly replies not duplicated. Prior decline remains suppressed. Actual HILO operator messages **1 existing-thread reply**, **0 new contacts**, **0 unsolicited follow-ups**, **0 meetings**, **0 social posts**. Runner itself sent zero.

New paid model/API/ads/data/hosting/subscription spending initiated **$0**; existing GitHub Actions/host billing not independently measured. Store listings, installs, organic reach, traffic, clicks, real conversions: **not measured**; all directory submissions and acceptances **0**.

## Research, distribution, PR boundaries

Dated selective verified-venue ledger: [November 9 distribution review](../distribution/HILO-DISTRIBUTION-REVIEW-20261109.md). New useful policy caveat: official MCP Registry namespace authentication does **not** verify control of a publisher's remote server endpoint. Skills-only ChatGPT/Codex plugin pathway distinct from legacy GPT restriction, Claude self-hosted versus paid directory, Skills.sh genuine installs, Hugging Face static-demo staging, Rebind native script gate, ROS/Copilot eligibility remain correctly separate. No external submission, endorsement, fee, consent or listing claimed. No Rebind current-rule confirmation because guide was unavailable today.

Independent data-engine PR #7 contains [Nov 9 source review](../docs/HILO-DATA-ENGINE-DAILY-2026-11-09.md), **no new source admission**. Its [GitHub-hosted data workflow #42670245801](https://github.com/yourhongbuddy/embodied-arena/actions/runs/42670245801) passed **48/48 offline tests** and generated **100 planned research jobs, zero live starts/completions**. Existing 13 public OpenAI method cards remain distinct from Stanford/Harvard/Oxford/digital-twin advisory evidence and from staged proposed sources. No changes to canonical scoring, human keep votes, consent, privacy, safety-stop authority, cohort integrity, sealed holdouts or certification. PR #9 remains closed/merged, #10 is GrowthOps successor, #7 is independent, #8 stays draft/unmodified; unrelated PRs untouched.

**Tests:** GitHub-hosted GrowthOps code, asset and browser audit #42670475208 succeeded after the new query-variant filters and second-batch logic, with 43 GrowthOps, 29 synthetic, 7 browser inventory, 6 asset probe, 7 document probe and 5 static-demo tests. A follow-up small test ensures the second batch's remaining count is zero; current final PR revision has its own checks, whose status must be separately verified. Do not call later revisions CI-green until their workflows finish.

**Priorities:** get authoritative DigitalOcean deployed SHA/domain binding before any production fix; finish public network/browser navigation coverage and review exact missing routes; complete final source/release tests before any authorized deployment; review PR #7 disabled-live default workflow fix rather than auto-merge; verify license/owner identity and real client installation before any directory/Space publication.

# HILO / RobotRouter GrowthOps — 2026-11-05

**Evidence date:** November 5, 2026 PST; independent production vantage: GitHub-hosted Ubuntu + headless Chrome. PR #9 merged; focused GrowthOps successor #10 open; data-engine #7 separate/open; site diagnostic #8 draft/untouched. No deployment, merge, DNS edit, restart, paid-model execution, publication, messaging, or field-data ingestion.

## Actual site evidence

GitHub-hosted [read-only run 42077801476](https://github.com/yourhongbuddy/embodied-arena/actions/runs/42077801476) at approximately 17:46 UTC / 09:46 PST completed with 19 fixed HTTPS probes; control returned 200. Public vs DigitalOcean baseline statuses:

| Public path | Custom domain | DigitalOcean origin |
| --- | ---: | ---: |
| /wanted-10k | 200 | 200 |
| /wanted-10k/protocol | 200 | not compared |
| /wanted-10k/sdk | 200 | not compared |
| /wanted-10k/conformance | 200 | 200 |
| /wanted-10k/sampling-stopping | 200 | 200 |
| /wanted-10k/data-engine.html | **404** | 200 |
| /hilo/developers.html | **404** | 200 |
| /coding-for-engineers | **404** | 200 |
| /sitemap.xml | **404** | 200 |
| /robots.txt | 200 | 200 |

Four 200/200 routes (WANTED, conformance, sampling/stopping, robots.txt) served differing response bodies. The accessible WANTED HTML routes retained the recorded title/description, route-specific unique canonical, OG/social, H1 and robots checks. Public sitemap remains 404 despite ten-URL source sitemap. Exact live deployed commit and custom-domain binding are unidentified; origin/version mismatch remains a hypothesis, not a proven cause. Optional experiment receipt / D1-versus-Node repair remains an unrelated backlog hypothesis.

**New actual public-link evidence:** A public Chrome WANTED DOM inventory had 40 same-origin links initially without overlapping route measurements, plus 20 static assets. Existing static-asset checker independently probed **20/20 HTTP 200/206** and recorded 0 explicit 404/410. A new fixed-host, single-segment WANTED documentation link probe independently checked **16 additional previously unmeasured links**, **16 HTTP 200/206**, 0 explicit 404/410, 0 redirects/other statuses, 0 failed measurements in [run 42077801476](https://github.com/yourhongbuddy/embodied-arena/actions/runs/42077801476). At least 24 of the original 40 link paths still have no HTTP measurement from that link step, and success is not proof of browser execution or end-to-end navigation. This is not a complete public console/network crawl.

## Focused engineering work

- tools/hilo_link_probe.py: new bounded read-only HTTP status checker; fixed public origin, single-segment WANTED documentation allowlist, 16 maximum, four-second timeout, one-byte Range GET, redirects blocked, no query strings, bodies, credentials or private endpoints retained.
- tools/test_hilo_link_probe.py: five offline regression tests for known-status dedup, cap, explicit 404/410 vs redirect/network, unsafe URLs and errors.
- .github/workflows/hilo-growth.yml: run tests and save public-document-links.json alongside existing DOM, route and static-asset artifacts.
- Initial run [42077689891](https://github.com/yourhongbuddy/embodied-arena/actions/runs/42077689891) exposed a Python CLI parentheses syntax error. It was corrected in commit 3848143abc8fdf773d3942f47cb44be74d155eac; the subsequent full GrowthOps audit run 42077801476 succeeded. This was a new tool regression, not a production website defect.
- distribution/HILO-DISTRIBUTION-REVIEW-20261105.md records the new free-static Hugging Face Spaces eligibility option and current verified skill/plugin publication gates without claiming any listing.

Verified PR-run test counts: 43/43 GrowthOps, 29/29 synthetic-only preflight, 3/3 browser link inventory, 5/5 static-asset checks, **5/5 new doc-link checks**. The independent production audit succeeded on run 42077801476. Later CI on the daily-documentation head must be inspected separately; a green prior run does not prove that latest SHA passed. Full repository Verify / Coding for Engineers on distribution-document head remained pending on last observation.

## Actual capacity, actions, and spending

From the same actual run: **10,000 stable slots, 79 assigned, 37 completed deterministic jobs, 0 failed, 42 awaiting connector/review, 9,921 waiting for real targets**. Network probes: 19 fixed public-route checks + 20 static assets + 16 newly eligible WANTED documents; Chrome page load is separate and not a conversion. Live LLM requests 0; runner sends 0; submissions 0; deployments 0; verified robot field hours 0. max_model_requests stays 0; auto_publish stays false; no paid adapter authorized. New API/ad/hosting/subscription spend initiated $0; underlying GitHub Actions/hosting bills not independently measured.

## Outreach and distribution

Connected Gmail searches reviewed post-October-30 relevant inbox and sent messages plus full earlier academic reply threads and the HILO/Do not contact suppression. Only new mail matching general HILO search was GitHub CI failure notices and an unrelated message mentioning Hilo as a company name. Previously sent September 22 and October 23 substantive HILO replies were confirmed, not repeated. No new academic/research reply requiring action, zero new contacts, zero existing-thread replies, zero sent HILO messages, zero repeat follow-ups, zero scheduled meetings. Romain Maure remains suppressed.

Current official primary-source distribution checks: [OpenAI plugin submission](https://developers.openai.com/plugins/deploy/submission), [personal GPT restriction](https://help.openai.com/en/articles/8554397-creating-and-editing-gpts), [Hugging Face Spaces](https://huggingface.co/docs/hub/spaces-overview), [Skills.sh](https://www.skills.sh/docs), [GitHub CLI skill search](https://cli.github.com/manual/gh_skill_search), [Rebind marketplace](https://www.rebind.gg/marketplace). Actual submitted 0, accepted 0, public listing URLs 0, social posts 0; genuine installs/reach/conversions unmeasured. No artificial metrics.

Separate data-engine PR #7 documentation review dated November 5 notes OpenAI Alignment's Nov 4 *updated* report on safety-task underperformance, and declines promotion because provenance/overlap/rights gates do not support new worker input. Its [PR run 42078036310](https://github.com/yourhongbuddy/embodied-arena/actions/runs/42078036310) passed 47 offline tests; 100 research jobs planned, live steps skipped, live started/completed 0. No changes to scoring, holdouts, source manifests or reference separation.

**Next priority:** identify authoritative live DigitalOcean app version/binding before any release. Perform full browser console/network and remaining link checks; review default-branch disabled-live failure correction in PR #7. Any eventual deployment requires exact commit, immutable tag, all Release Checklist gates, price review, authorized action, and public post-deployment verification.

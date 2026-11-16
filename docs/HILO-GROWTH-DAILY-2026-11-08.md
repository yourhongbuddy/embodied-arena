# HILO / RobotRouter GrowthOps daily — November 8, 2026

**Scope:** Independent GitHub-hosted public site audit, focused read-only link-evidence fix, selective official-source distribution and separately gated data-engine research, private Gmail inreach. No deployment, PR merge, paid model API call, listing submission or outgoing HILO message.

## Actual production routing evidence

Successful GitHub-hosted [read-only audit #42504643860](https://github.com/yourhongbuddy/embodied-arena/actions/runs/42504643860) captured a [retained ZIP artifact](https://github.com/yourhongbuddy/embodied-arena/actions/runs/42504643860#artifacts) ending at **2026-11-08 17:22:42 UTC (09:22 PST)**. Its `source-commit.txt` is **`9cd39f66449c2f6f621003b50fc650e5dc0107bf`**, a PR merge-preview checkout, not the current PR #10 branch head and not a deployed production revision. A control domain returned **HTTP 200**. The audit made **19 bounded public route probes**.

| Path | Public `getrobotrouter.com` | Compared `shark-app-pqh5h.ondigitalocean.app` |
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

Both origins returned different HTTP 200 bodies for WANTED, conformance, sampling/stopping and robots.txt. Five reachable WANTED HTML pages passed automated title/description, route-specific unique canonical, Open Graph, social card, H1, robots-meta and X-Robots-Tag checks. The ten-URL sitemap exists in source but **is not accessible at the public custom domain**. Do **not** infer a global outage or prove the cause from local DNS failures.

Headless Chrome observed the public WANTED DOM. A read-only inventory recorded **45 same-origin link paths** (40 without an existing matched route probe), 20 static asset paths. Bounded GETs returned **20/20 static asset HTTP successes**, and **16/16 eligible WANTED documentation-link successes**; 12 additional eligible doc paths remained unprobed. No observed 404/410 in those bounded subsets. HTTP availability is **not** full browser execution, script, navigation, or every-linked-route verification. The public developer route is still 404 despite source-only Chrome preview succeeding.

**Production repair status: none.** Exact deployed DigitalOcean commit and custom-domain application binding remain unidentified. No DNS, restart, deploy, license/terms, staging or publishing action was taken.

## Reproduced diagnostic bug and tested correction

Previously, `tools/hilo_browser_links.py` discarded URL queries for privacy, but then treated a query-bearing link such as `/wanted-10k/sdk?mode=x` as verified by an existing GET of **`/wanted-10k/sdk`**. A different query can alter the response; this could misreport a path-specific 200 or 404 as proof about a URL variant never measured.

The focused fix in commits `af8cf0d9347b3abad57c1623b3e4a4b391077461` and `266b0114d6409bf1677fe3190eebbff9d84d7981` conservatively marks an aggregated link path **unverified** when any query-bearing variant is seen. It retains only the sanitized path and a boolean flag, **never query values**. Fragment-only links remain compatible with path HTTP evidence. Two new regression tests cover false positive/negative claims, mixed plain/query variants, query-value suppression and fragment handling. This fixes an **audit evidence-integrity bug**, not any of the production 404s. Zero new query-bearing links were present in this audit's public WANTED inventory; no measured SEO improvement or live fix is claimed.

[GrowthOps audit #42504643860](https://github.com/yourhongbuddy/embodied-arena/actions/runs/42504643860) succeeded on the code test revision and distribution-record merge preview: GrowthOps **43/43**, synthetic telemetry **29/29**, browser link inventory **7/7**, static asset checks **5/5**, documentation links **5/5**, static demo **5/5**. Coding for Engineers on the same branch revision passed. Full repository Verify was still in progress when writing this report; do not label it passed until inspected. This daily-report commit triggers its own CI revision.

## Actual capacity, communications, costs

Artifact `report.json`: **10,000 stable registered job slots**, **79 assigned**, **37 completed deterministic audit jobs**, **0 failed**, **42 awaiting connector/review**, **9,921 awaiting genuine targets**; **19 public route probes**, **0 live LLM requests**, **0 runner-sent messages**, **0 store submissions**, **0 deployments**, **0 verified robot field hours**. Slots are not model agents, field deployments, people, contacts or conversions. `max_model_requests=0` and `auto_publish:false` stay intact.

Gmail full-thread review for existing academic correspondence, sent history and the `HILO/Do not contact` label found **no new substantive HILO reply requiring action**. September 22 and October 23 responses were confirmed and **not repeated**; the documented decline remains suppressed. New HILO emails **0**, new contacts **0**, existing-thread replies **0**, follow-up nudges **0**, meetings **0**; social publications **0**. No private contacts, addresses or message contents in this repo. An unrelated message containing “Hilo” was excluded.

New paid API/hosting/advertising/subscription/data spending initiated: **$0**. Existing CI and hosting billing not independently measured. Traffic, installs, organic reach, clicks, conversions **not measured**.

## Distribution and data boundaries

Dated, non-exhaustive official-source review: [`distribution/HILO-DISTRIBUTION-REVIEW-20261108.md`](../distribution/HILO-DISTRIBUTION-REVIEW-20261108.md). OpenAI's current help now states standard legacy GPT retirement **Dec 11, 2026**, but personal new-GPT publishing remains unavailable; ChatGPT/Codex **Plugins Directory is separate**, and skills-only submission remains draft subject to verified publisher, package scope, license and install/security tests. Hugging Face static synthetic demonstration is tested only in local Chrome, not published. Claude's paid directory versus self-hosted marketplace, Skills.sh genuine installs, MCP server requirements and Rebind native-script gate retain their separate eligibility. Rebind's guide was not freshly accessible from this vantage. **Zero external submissions, accepted listings or social posts**.

Independent data-engine PR #7 committed [November 8 no-admission review](../docs/HILO-DATA-ENGINE-DAILY-2026-11-08.md); verified run [#42504757486](https://github.com/yourhongbuddy/embodied-arena/actions/runs/42504757486) passed **48/48 offline tests** and its actual artifact retained **100 planned offline research jobs**, **0 live starts and 0 completions**. No new promoted sources, training/data rights or HILO robot evidence. Stanford, Harvard, Oxford and robotics/digital-twin sources remain separate; proposed sources unconsumed. The default branch still produces failed data-engine workflow preflights because live execution is intentionally disabled; PR #7 contains the proposed correction but remains unmerged.

PR #9 remains merged and closed; PR #10 is the GrowthOps successor; PR #7 remains independent and PR #8 remains draft/untouched. Preserve frozen official scoring, consent, privacy, stop authority, experiment cohorts and sealed holdouts. Optional experiment-receipt/D1-versus-Node rendering remains an unverified separate repair hypothesis. Next: authoritative deployed SHA/custom-domain binding; complete bounded browser network/remaining link coverage; reviewed release checks before any deployment; source entailment and genuine integration installation after owner/license approvals.

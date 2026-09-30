# HILO GrowthOps — site maintenance and distribution

Version 0.1 · September 22, 2026. Independent HILO / RobotRouter project.

## What exists

An addressable 10,000-slot work plan: ten lanes times 1,000 stable target slots. The lanes are site health, repair, SEO, social content, GitHub integrations, stores, skills, outreach, inreach and audit. The initial registry contains 15 real site/venue entries, not 10,000 prospects. Unassigned slots are `waiting_for_target`; assigned work needing another tool or review is `awaiting_connector_or_review`. Neither state is an executed agent.

`tools/hilo_growth.py` builds the plan, atomically claims eligible deterministic audit jobs from a shared SQLite database, records their results, and generates a daily report. Five threads is the default; ten is the hard maximum. The runner never invokes an LLM, sends messages, submits listings or deploys. External agents can integrate through the `Queue` claim/finish interface; a production distributed worker service and paid-model dispatch are not activated here. The existing 100-worker data engine remains independent and subject to its own explicit authorization.

## Run

```bash
python -m unittest discover -s tools -p 'test_hilo_growth.py' -v
python tools/hilo_growth.py plan
python tools/hilo_growth.py run --online --cycle 2026-09-22
```

`--online` performs bounded GET requests only to fixed public project hosts and a control domain. It also compares a small reviewed set of custom-domain routes against the DigitalOcean origin and records status drift without changing routing. It does not crawl stores, authenticate or post. Store evidence is a dated source inventory; only an actual research pass can refresh it. A network failure is a failed measurement, not automatic proof the site is down. SQLite and raw execution artifacts stay in an operator-controlled artifact directory, not the public repository. One cycle is bound to one manifest. Reconcile stranded running jobs; never auto-replay an uncertain external write.

## Repair and SEO priorities

Keep optional experiment enrollment out of the rendering path. The known receipt-unavailable symptom and Cloudflare D1 versus standalone-Node compatibility concern remain tracked in PR #8; root cause requires production evidence. Proposed repairs must include no-JavaScript/timeout/storage-disabled/browser coverage and preserve experiment-cohort integrity. This package does not claim that issue is fixed.

Stabilize canonical origin to `https://getrobotrouter.com`, add a sitemap, preserve private-route exclusions, ensure meaningful title/description/Open Graph/Twitter cards, and provide a public developer page that needs no analytics or authentication. Do not create thousands of thin doorway pages. A website change is not live until the exact public route and deployed revision have been verified. Preserve `deploy_on_push: false`, immutable tags and `docs/RELEASE-CHECKLIST.md`.

## Distribution

The registry distinguishes ChatGPT/Codex plugins, legacy GPTs, portable skills, a repository-hosted Claude marketplace, MCP registries, Rebind packages, demos and communities. Each venue gets an appropriate artifact, not the same promotional link. The plugin package is skills-only and does not claim that the existing MCP endpoint passes every client's protocol requirements. Provider-specific schema/install tests and publisher identity, license, privacy/terms/support review remain required before public-store submission.

OpenAI's checked September 22 guidance says personal accounts cannot create/publish new GPTs and provides a plugin submission route. Skills.sh documents discovery through genuine installations. Rebind's publishing guide requires a real script package, a signed-in app and publishing access; a website is not such a package. Show HN requires a substantial usable artifact. The official MCP registry requires publisher authentication and compliant server metadata. These are researched candidates, not submissions or affiliations.

### OpenAI packaging state

The portable plugins/hilo-benchmark/plugin.json may include extensions.com.openai.interface presentation metadata while remaining skills-only. Do not add privacy-policy, terms-of-service, support, logo, capability, or publisher assertions unless their URLs/claims are actually approved and verified. Preparing install-surface metadata is not submission, review, approval, publication, installation, or reach.

## Outreach and inreach

Start with real inbound replies and contribution requests, not cold volume. Use connected Gmail to read entire relevant threads and check sent history and opt-outs before a reply. The default shared daily ceiling is three new individually relevant professional contacts and five substantive existing-thread replies; no repeated nonresponse follow-ups. Store/message limits apply across all lanes, not per worker. Keep one active submission per venue and one owned social post per day. These caps must be enforced by the authorized connector operator; the deterministic runner has no sending adapter.

No private email bodies, contact addresses, identity graphs or consent documents belong in this public repository. Maintain a private send/suppression ledger and publish only aggregate counts. Do not schedule meetings or make commercial commitments without the separate necessary authorization. Do not submit promotional issues to arbitrary GitHub repos, bypass logins, create fake accounts, inflate installs or purchase attention. Honor venue rules, opt-outs and user corrections.

## Daily loop and truthful reporting

The scheduled ChatGPT operator inspects actual GitHub state, addresses verified defects with tested PRs, researches new relevant venues, handles authorized relevant replies, prepares or submits eligible artifacts using available connected tools, and reports the receipt/status. The GitHub audit workflow is independent: its recurring schedule starts only after merge, and it never auto-publishes. Do not re-enable unrelated old campaigns.

Report registered slots; assigned slots; deterministic jobs completed/failed; actual live LLM requests; real messages sent; submissions versus accepted/public listings; tests and CI; exact commit/PR; independently checked website routes; reach only from authentic measurements; costs and blockers. Zero is a valid result. No robot hours, human keep votes, certifications or leaderboard values are created by marketing.

## Admission and sources

Each new registry entry needs a stable unused slot, canonical ID, primary rules URL, publication date when known, retrieval date, relevance, artifact type and blockers. Never treat discovery as permission to submit. Canonical WANTED scoring, research holdouts and the data-engine source-admission process remain unchanged.

Primary references are stored per entry in `config/hilo-growth.json`. Additional design references: https://developers.google.com/search/docs/fundamentals/creating-helpful-content and https://agentskills.io/home. Local plugin manifests follow https://developers.openai.com/plugins/build/plugins and https://code.claude.com/docs/en/plugin-marketplaces. No distribution outcome is promised.

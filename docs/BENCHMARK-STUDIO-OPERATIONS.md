# Benchmark Studio on DigitalOcean

Studio uses the existing Node application and a separate PostgreSQL database. It does not depend on Cloudflare D1 or Sites authentication. The existing research/discovery MCP server stays read-only; workspace authoring is at `/studio/mcp`.

## Required runtime secrets

- `BENCHMARK_DATABASE_URL`: PostgreSQL connection URL, supplied through DigitalOcean's encrypted environment settings or database binding.
- `BENCHMARK_DATABASE_CA`: the managed database's CA certificate (PEM, real newlines or escaped `\n`). TLS certificate verification stays enabled in production. Never commit a URL containing credentials or a downloaded CA/private-key bundle.

The database pool uses at most four connections per application instance, with connection and statement timeouts. The current deployment has two instances. Limit trusted database sources to this app and any explicitly approved migration source. Do not publish unrestricted database firewall access. Preserve the app's existing sizing, domains, and deployment settings.

## Deploy

1. Run `npm ci`, `npm run verify`, and `npm run test:studio` against the exact source revision. Follow the repository's version-tag/index requirements.
2. Confirm source publication and the recurring database charge before creating the resource or pushing to the public repository.
3. Create or attach the approved database; configure the URL and CA as encrypted runtime values. Do not replace the live app spec with `.do/app.yaml`, which is only a starter and has different resource names and sizing.
4. Run `npm run db:studio:migrate` in an environment with those secrets and approved database access before directing live traffic to the new app revision. This explicit migration uses a transaction and advisory lock and creates only the `studio_*` tables. It is safe to rerun. Do not run migrations in the build stage where runtime secrets may be unavailable.
5. Deploy the verified commit to the existing `digitalocean` branch and wait for DigitalOcean to report deployment success.
6. Verify the apex and www domains, HTTPS, the stable `/` → `/studio` entry, all company pages, `/leaderboard`, `/studio`, `/studio/agents`, `/studio/openapi.json`, and the public `/mcp` discovery service.
7. Verify an actual browser workspace: create it, download its recovery key, save a benchmark, reload, create an agent key, update that same record through the API/MCP, refresh the browser, export charts, revoke the key, and remove test data. Verify a second workspace cannot access the first one's records. Do not include credentials in screenshots, logs, or test reports.

## Data and recovery

Recovery and agent/session keys contain 256 bits of randomness. Only hashes are stored. The browser owner session is HttpOnly, SameSite=Lax, Secure on production and expires after seven days. Owner recovery keys do not expire; preserve them privately. Agent keys are workspace-scoped, cannot manage access, and remain valid until revoked. Private responses are no-store. Browser mutations require the same origin and a custom request header.

Limits: 50 benchmarks/workspace, 500 rows, 12 metrics, 512 KB request body, five agent keys, ten live browser sessions, 120 requests/workspace/minute, 30 new workspaces/hour globally, and 2,000 total workspaces. Global creation quotas intentionally bound unauthenticated storage growth. Monitor legitimate demand and increase limits only with capacity planning. Records use version-checked updates/deletions to prevent lost edits.

New writes stop when PostgreSQL reports a total database size of 6 GiB, reserving space within the proposed 10 GiB plan. Reads, exports, recovery, and deletion remain available. Review storage growth and increase capacity only with authorization. The editor keeps unsaved drafts only in browser memory; JSON exports are the recovery path if the server is unavailable. There is no localStorage or in-memory production storage fallback. Saved data must survive process restarts and deployments in PostgreSQL. Check managed backup settings and verify restore procedures before promising any recovery objective. Active-record deletion cascades through credentials and benchmarks; backups follow provider retention.

Public research analytics currently remain a separate Cloudflare D1-dependent feature and are unavailable on this DigitalOcean host. Studio paths are excluded from first-party analytics. Workspace keys, row values, and private text must never enter analytics or logs.

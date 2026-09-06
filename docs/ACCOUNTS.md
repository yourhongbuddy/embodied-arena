# Arena contact accounts

## What is implemented

- `/login`: dispatch-owned Sign in with ChatGPT; the same flow handles new and returning visitors.
- `/account`: authenticated contact profile with an immutable provider email, optional international phone, explicit storage consent, save/reload/error states, and confirmed profile deletion.
- `/account/privacy`: a feature-specific contact-data notice, not a general legal privacy policy.
- `/api/account`: owner-scoped GET/PUT/DELETE, no list/export/admin endpoint. Public MCP and analytics do not read this table.
- `account_profiles` in D1: site-scoped user ID (primary key), email, optional normalized phone, notice version, consent timestamp, created/updated timestamps. No passwords or authentication tokens are stored.

An authenticated GET never inserts a record. A profile is created only by an explicit consented save. Phone numbers are format-checked, not ownership-verified, and are not authentication factors. This feature does not subscribe users to marketing or send email/SMS.

## Runtime boundary

Only `npm run build:sites` enables trust in Sites dispatcher identity headers, through the build-time `__SITES_DISPATCH_AUTH__` flag. That artifact must only run behind Sites dispatch. Do not serve the Workers artifact directly from a public workers.dev URL or another origin that bypasses dispatch.

The regular Node/DigitalOcean build and local development leave accounts disabled (503 for the API), even when a caller supplies forged `oai-authenticated-user-*` headers. DigitalOcean requires a separate, trusted identity provider with server-side token/session verification and a production database connection before account features can be enabled there. Do not enable the Sites header trust flag on DigitalOcean.

The platform owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, and `/callback`; no application routes replace them. Sign-in/out are top-level navigations. No local demo identity, admin bypass, or application password stack exists.

## Storage and operations

The append-only migration is `drizzle/0002_account_profiles.sql`. Existing migrations and snapshots are preserved. The migration creates a new table only; there is no runtime CREATE/ALTER or seed contact data. A Sites deployment applies generated migrations before uploading its Worker. A local build does not provision the live table.

When validating both hosting targets, retain `dist/standalone` separately after the Node HTTP tests. The Sites packaging helper copies the entire remaining `dist` tree, so do not leave the Node standalone runtime or its dependency directory in a Worker-only archive. Local test databases under `tests/.wrangler` are ignored and must never be packaged or committed.

Authorized site owners can inspect records in Sites Settings → Database → DB → account_profiles. Restrict editor/database access to operators who need the contacts. No public contact directory is implemented.

Profile deletion removes the row from the active database. Provider-managed backups may retain older copies according to their own retention settings. There is no claim of immediate backup erasure. The account notice describes these limits.

## Security and verification

- Server derives identity and email from dispatch; client-supplied identity/email fields are rejected.
- Every query uses bound parameters and the current authenticated account ID.
- Writes require an exact matching Origin plus a custom request header; no CORS grant is issued. Fetch Metadata rejects cross-site and sibling-site browser writes.
- Request bodies are streamed with a 2 KiB cap. Repeated saves have an atomic per-profile two-second cooldown. Sign-in protections are platform-owned.
- API responses and account pages are non-cacheable; contact routes are noindex and excluded from client and server analytics ingestion.
- Contact values are not logged, embedded in server-rendered HTML, or saved to browser storage.
- `node --experimental-strip-types --test tests/account.test.mjs` tests real SQLite migrations and records with synthetic identities: CRUD, ownership, consent, CSRF, body limits, failure handling, and disabled standalone authentication.
- `tests/account-http.test.mjs` verifies the production Node HTTP routes, forged-header rejection, private cache headers, and existing public pages. Run it after `npm run build`.
- `npm run verify` now runs both account suites after the Node build. `npm run test:accounts` runs both suites directly and requires that build to exist.
- Contact profiles are linked from the leaderboard. The WANTED experiment's fingerprinted shared navigation is retained unchanged; account identifiers and contact details do not enter its assignment or analytics contracts.
- The built Worker was also exercised through the isolated `tests/wrangler.account.jsonc` local runtime with D1. Anonymous rejection, sign-in page rendering, save/reload/delete, owner isolation, and contact-free server-rendered HTML passed using synthetic identities. Never deploy that local-only test configuration.

Before enabling public collection, complete a real ChatGPT login/save/reload/delete acceptance test on the Sites deployment with a willing test account. Local synthetic tests do not prove the external OAuth redirect flow. Before connecting any campaign system, add its separately reviewed opt-in and suppression handling; contact storage consent is not marketing consent.

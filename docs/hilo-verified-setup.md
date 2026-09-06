# HILO Verified application intake

Entry: `/verified`, linked from `/scan`. One-time **US $1** application fee; payment never grants certification. All listed fields except notes are required. The existing React/Vinext framework and Drizzle/D1 schema are retained. No added packages are required; Stripe Checkout uses its HTTPS API and webhook signatures use Web Crypto. The shared navigation and WANTED landing presentation are frozen by the active experiment's source fingerprints; the scanner entry point preserves those measurement contracts.

## Local Stripe test mode

1. Use Node 22.13+ (Node 24 recommended), run `npm ci`, and copy `.env.example` to `.env.local`.
2. Set `HILO_PUBLIC_URL=http://localhost:5173` and `HILO_SQLITE_PATH=work/hilo-intake.sqlite`.
3. In the Stripe test-mode dashboard, obtain a **test** secret key and set `STRIPE_SECRET_KEY`. Never use a publishable key here or place secrets in a browser-prefixed variable.
4. Install/login to the Stripe CLI and run:

   ```sh
   stripe listen --events checkout.session.completed --forward-to localhost:5173/api/verified/webhook
   ```

   Put the listener's `whsec_…` signing secret in `STRIPE_WEBHOOK_SECRET`. It differs from the dashboard endpoint secret.
5. Run `npm run db:intake:local`, then `node --env-file=.env.local node_modules/vinext/dist/cli.js dev --port 5173`. Explicit `--env-file` ensures Node server handlers receive the variables. If using another port, update the public URL and listener together.
6. Open `/verified`, complete the form, and accept the terms. Stripe should show **HILO Verified application — US $1.00**, one payment, no subscription. In **test mode only**, use card `4242 4242 4242 4242`, any future expiration, and any three-digit CVC. Finish Checkout; the success page waits for the webhook before showing payment received.
7. Verify the row has `payment_status='paid'`, the matching Stripe session/event IDs, and `paid_at`. Replay the same event from the Stripe dashboard/CLI: it must leave the same record paid without creating another application.
8. Submit another test application and cancel Checkout. The cancellation page retains the reference and offers **Resume the same checkout**. Test a declined card (`4000 0000 0000 0002`) and confirm it does not mark an application paid.

Stripe CLI's generic `stripe trigger checkout.session.completed` does not contain this application's metadata and is intentionally ignored. Use a Checkout created through the form to test the complete path. Reference: [Stripe Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment) and [test cards](https://docs.stripe.com/testing).

## Production storage and configuration

- **Sites / Cloudflare:** keep the existing `DB` D1 binding. Deploy the additive `drizzle/0003_hilo_verified_intake.sql` and its generated metadata through the existing migration/version workflow. Set `HILO_PUBLIC_URL` to the exact HTTPS origin (no trailing slash), `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET` as server runtime secrets. Omit `HILO_SQLITE_PATH`. The webhook URL must accept unauthenticated requests from Stripe; a private Site access gate can prevent delivery.
- **Existing DigitalOcean Node deployment:** use D1's HTTPS API by setting `CLOUDFLARE_ACCOUNT_ID`, `HILO_D1_DATABASE_ID`, and a server-only `HILO_D1_API_TOKEN` with the minimum D1 access needed, alongside the Stripe variables. Omit `HILO_SQLITE_PATH`. Apply the migration to that D1 database before starting this release, using the established migration process. Do not expose database credentials publicly.
- **Self-hosted Node with durable disk:** an explicit `HILO_SQLITE_PATH` is supported. Run the migration script with that environment before starting. Use a persistent mounted volume, backups, and a single instance. DigitalOcean App Platform's ephemeral local filesystem is **not** durable storage; use D1 there.
- Never use the local test database for production. Use separate Stripe test/live secrets and databases. A missing config/database fails closed with HTTP 503 before opening Checkout.

In Stripe, register `https://YOUR_ORIGIN/api/verified/webhook` for `checkout.session.completed`, using that endpoint's signing secret. Enable card payments; the integration explicitly restricts Checkout to cards. Fees are fixed server-side at 100 USD cents; discounts, client-supplied prices, subscriptions, and certification changes are not enabled. Switching to live mode requires setting both live Stripe secrets and the matching reachable endpoint. No live payments were run as part of implementation.

## Admin-readable records

Use the restricted D1 console or SQLite tooling; there is intentionally no public submissions endpoint. Example query:

```sql
SELECT id, email,
       json_extract(application_json, '$.organization') AS organization,
       json_extract(application_json, '$.robot') AS robot,
       json_extract(application_json, '$.modelUrl') AS model_url,
       application_json, terms_version, datetime(created_at, 'unixepoch') AS consent_at,
       payment_status, session_id, stripe_event_id, payment_intent,
       datetime(paid_at, 'unixepoch') AS paid_at
FROM hilo_applications ORDER BY created_at DESC;
```

`application_json` stores every normalized field plus affirmative consent and terms version; `created_at` records acceptance/intake time. The only payment states are `pending` and `paid`: canceling a browser page does not prove Stripe canceled a payment. Pending applications may be unpaid, abandoned, or awaiting confirmation. The status API exposes only payment state and expiry for an unguessable application reference, with no personal information.

The same application ID is immutable and serves as the Stripe idempotency key. Retries reuse Checkout; checkout initiation stops after 22 hours, before Stripe's 24-hour idempotency retention boundary. Signed webhooks remain accepted for older paid sessions. Five new applications per email per hour are allowed; this is basic abuse control, not a replacement for host-level rate limits. Handle retention/deletion requests through restricted database administration. No emails are sent by this feature.

## Checks and current verification limits

Verified locally: 321 existing regression tests and 22 intake/account checks passed; lint passed for changed files; both the standalone Node and Cloudflare Sites builds succeeded. The local `/verified` page returned HTTP 200. No browser interaction or live Stripe payment was performed.

```sh
npm run test:intake
npm run build
node --experimental-strip-types --test tests/intake-http.test.mjs tests/account.test.mjs tests/account-http.test.mjs
npm run build:sites
```

The intake suite uses a synthetic Stripe transport and real SQLite migrations. The HTTP suite checks the production server, private page headers, rendered form fields, signature rejection, and durable payment reconciliation with a synthetic signed event. These checks are not a real Stripe test-mode purchase. **A real test-mode Checkout remains to be run after test credentials and the Stripe listener are configured.**

The repository-wide TypeScript check currently reports existing errors in unrelated benchmark/experiment modules and Cloudflare ambient types. New intake files produced no TypeScript diagnostics during implementation.

import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHmac, randomUUID } from "node:crypto";
import { checkout, webhook, status, resume } from "../app/verified/server.ts";
import { validateApplication, TERMS_VERSION } from "../app/verified/contract.ts";
import { isLocalOnlyAnalyticsPath } from "../app/experiments/analytics-boundary.ts";
const origin = "http://localhost:5173";
// Deliberately synthetic credentials: no Stripe network request is made by these tests.
const config = { origin, secret: "sk_test_synthetic", webhookSecret: "whsec_synthetic" };
const application = { organization: "Test Robotics", robot: "Demo v1", website: "https://example.invalid", modelUrl: "https://example.invalid/robot.urdf", contact: "Test Operator", email: "operator@example.invalid", intendedUse: "Pallet handling", environment: "Lab", hours: 0, notes: "", consent: true, termsVersion: TERMS_VERSION };
function setup(t, file = ":memory:") {
  const sql = new DatabaseSync(file); t.after(() => sql.close());
  for (const name of readdirSync(new URL("../drizzle/", import.meta.url)).filter(n => n.endsWith(".sql")).sort()) sql.exec(readFileSync(new URL(`../drizzle/${name}`, import.meta.url), "utf8"));
  const db = { prepare(query) { const stmt = sql.prepare(query); let values = []; return { bind(...v) { values = v; return this; }, async first() { return stmt.get(...values) ?? null; }, async all() { return { results: stmt.all(...values) }; }, async run() { return { meta: { changes: Number(stmt.run(...values).changes) } }; } }; } };
  const calls = []; const deps = { getDB: async () => db, config: async () => config, fetch: async (url, options) => { calls.push({ url, options }); return Response.json({ id: "cs_test_synthetic", url: "https://checkout.stripe.com/c/pay/synthetic" }); } };
  return { sql, deps, calls };
}
function request(id, app = application, extra = {}) { return new Request(`${origin}/api/verified/checkout`, { method: "POST", headers: { origin, "content-type": "application/json", ...extra }, body: JSON.stringify({ id, application: app }) }); }
function event(id, overrides = {}) { return { id: "evt_synthetic", type: "checkout.session.completed", data: { object: { id: "cs_test_synthetic", metadata: { purpose: "hilo_verified_intake", application_id: id }, client_reference_id: id, mode: "payment", currency: "usd", amount_total: 100, livemode: false, payment_status: "paid", payment_intent: "pi_synthetic", ...overrides } } }; }
function signed(e, timestamp = Math.floor(Date.now() / 1000), secret = config.webhookSecret) { const payload = JSON.stringify(e); const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex"); return new Request(`${origin}/api/verified/webhook`, { method: "POST", headers: { "stripe-signature": `t=${timestamp},v1=${signature}` }, body: payload }); }

test("all required fields, URL protocols, hours, and affirmative current consent are validated", () => {
  assert.equal(validateApplication(application).hours, 0);
  for (const key of ["organization", "robot", "website", "modelUrl", "contact", "email", "intendedUse", "environment"]) assert.throws(() => validateApplication({ ...application, [key]: " " }), key);
  for (const patch of [{ hours: "0" }, { hours: -1 }, { hours: Infinity }, { consent: "true" }, { consent: false }, { termsVersion: "old" }, { website: "javascript:alert(1)" }, { modelUrl: "https://secret:password@example.invalid" }, { notes: "x".repeat(4001) }]) assert.throws(() => validateApplication({ ...application, ...patch }));
});
test("checkout saves private intake before Stripe; fixes price server-side and reuses the session", async t => {
  const { deps, sql, calls } = setup(t); const id = randomUUID();
  const response = await checkout(request(id, { ...application, amount: 1 }), deps); assert.equal(response.status, 200);
  const row = sql.prepare("SELECT * FROM hilo_applications").get(); assert.equal(JSON.parse(row.application_json).robot, application.robot); assert.equal(row.payment_status, "pending"); assert.equal(row.terms_version, TERMS_VERSION);
  const { url, options } = calls[0]; assert.equal(url, "https://api.stripe.com/v1/checkout/sessions"); assert.equal(options.body.get("line_items[0][price_data][unit_amount]"), "100"); assert.equal(options.body.get("line_items[0][price_data][currency]"), "usd"); assert.equal(options.body.get("adaptive_pricing[enabled]"), "false"); assert.equal(options.body.get("mode"), "payment"); assert.equal(options.body.get("payment_method_types[0]"), "card"); assert.equal(options.body.get("metadata[application_id]"), id);
  assert.equal((await checkout(request(id), deps)).status, 200); assert.equal(calls.length, 1);
  assert.equal((await checkout(request(id, { ...application, robot: "changed" }), deps)).status, 409);
  assert.equal((await resume(new Request(`${origin}/api/verified/resume?application=${id}`, { method: "POST", headers: { origin } }), deps)).status, 200);
});
test("bad origin, invalid input, malformed or oversized body cannot create checkout", async t => {
  const { deps, calls } = setup(t);
  assert.equal((await checkout(request(randomUUID(), application, { origin: "https://evil.invalid" }), deps)).status, 403);
  assert.equal((await checkout(request(randomUUID(), { ...application, consent: false }), deps)).status, 400);
  for (const [body, code] of [["{", 400], ["x".repeat(20001), 413]]) assert.equal((await checkout(new Request(`${origin}/api/verified/checkout`, { method: "POST", headers: { origin, "content-type": "application/json" }, body }), deps)).status, code);
  assert.equal(calls.length, 0);
});
test("network retries reuse Stripe idempotency key and database failure never starts a payment", async t => {
  const { deps, sql, calls } = setup(t); const id = randomUUID(); const normal = deps.fetch; let key;
  deps.fetch = async (_url, opts) => { key = opts.headers["Idempotency-Key"]; throw new Error("timeout"); };
  assert.equal((await checkout(request(id), deps)).status, 503); assert.equal(sql.prepare("SELECT payment_status FROM hilo_applications").get().payment_status, "pending");
  deps.fetch = normal; assert.equal((await checkout(request(id), deps)).status, 200); assert.equal(calls[0].options.headers["Idempotency-Key"], key);
  assert.equal((await checkout(request(randomUUID()), { ...deps, getDB: async () => { throw new Error("offline"); } })).status, 503); assert.equal(calls.length, 1);
});
test("only a valid signed paid $1 USD test session can mark intake paid; duplicates are harmless", async t => {
  const { deps, sql } = setup(t); const id = randomUUID(); await checkout(request(id), deps);
  for (const req of [signed(event(id), 1), signed(event(id), undefined, "wrong"), signed(event(id, { amount_total: 99 })), signed(event(id, { currency: "eur" })), signed(event(id, { livemode: true })), signed(event(id, { id: "cs_wrong" }))]) assert.equal((await webhook(req, deps)).status, 400);
  assert.equal((await webhook(signed(event(id, { payment_status: "unpaid" })), deps)).status, 200); assert.equal(sql.prepare("SELECT payment_status FROM hilo_applications").get().payment_status, "pending");
  assert.equal((await webhook(signed(event(id)), deps)).status, 200); const row = sql.prepare("SELECT * FROM hilo_applications").get(); assert.equal(row.payment_status, "paid"); assert.equal(row.stripe_event_id, "evt_synthetic"); assert.equal(row.payment_intent, "pi_synthetic");
  await webhook(signed({ ...event(id), id: "evt_duplicate" }), deps); assert.equal(sql.prepare("SELECT stripe_event_id FROM hilo_applications").get().stripe_event_id, "evt_synthetic");
  const response = await status(new Request(`${origin}/api/verified/status?application=${id}`), deps); const text = await response.text(); assert.match(text, /paid/); assert.doesNotMatch(text, /operator|Test Robotics|robot.urdf/); assert.match(response.headers.get("cache-control"), /no-store/);
});
test("early webhook before session write is reconciled and missing application asks Stripe to retry", async t => {
  const { deps, sql } = setup(t); const id = randomUUID(); const normal = deps.fetch;
  deps.fetch = async (...args) => { assert.equal((await webhook(signed(event(id)), deps)).status, 200); return normal(...args); };
  await checkout(request(id), deps); assert.equal(sql.prepare("SELECT payment_status FROM hilo_applications").get().payment_status, "paid");
  assert.equal((await webhook(signed(event(randomUUID())), deps)).status, 503);
});
test("expiry prevents another charge and email intake throttling bounds submissions", async t => {
  const { deps, sql } = setup(t); deps.fetch = async () => { throw new Error("synthetic offline"); };
  for (let i = 0; i < 5; i++) assert.equal((await checkout(request(randomUUID()), deps)).status, 503);
  assert.equal((await checkout(request(randomUUID()), deps)).status, 429);
  const row = sql.prepare("SELECT id FROM hilo_applications LIMIT 1").get(); sql.prepare("UPDATE hilo_applications SET created_at=1 WHERE id=?").run(row.id);
  assert.equal((await checkout(request(row.id), deps)).status, 409);
});
test("intake data and payment survive a new SQLite connection; routes excluded from analytics", async t => {
  const file = join(mkdtempSync(join(tmpdir(), "hilo-intake-")), "test.sqlite"); const { deps } = setup(t, file); const id = randomUUID(); await checkout(request(id), deps); await webhook(signed(event(id)), deps);
  const reopened = new DatabaseSync(file); assert.equal(reopened.prepare("SELECT payment_status FROM hilo_applications WHERE id=?").get(id).payment_status, "paid"); reopened.close();
  for (const path of ["/verified", "/verified/success?application=secret", "/api/verified/status"]) assert.equal(isLocalOnlyAnalyticsPath(path), true);
});

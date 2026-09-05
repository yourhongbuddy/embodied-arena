import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { handleProfile } from "../app/account/profile-handler.ts";
import { PROFILE_PRIVACY_VERSION, validateProfileInput } from "../app/account/profile-contract.ts";
import { sitesAuthEnabled } from "../app/account/auth-mode.ts";
import { isLocalOnlyAnalyticsPath } from "../app/experiments/analytics-boundary.ts";

const origin = "https://arena.example";
const alice = { userId: "synthetic-alice", email: "alice@example.invalid" };
const bob = { userId: "synthetic-bob", email: "bob@example.invalid" };
const payload = (phone = "+1 (415) 555-0123") => ({ phone, consent: true, privacyVersion: PROFILE_PRIVACY_VERSION });

function database() {
  const sql = new DatabaseSync(":memory:");
  const migrations = new URL("../drizzle/", import.meta.url);
  for (const name of readdirSync(migrations).filter(name => name.endsWith(".sql")).sort()) sql.exec(readFileSync(new URL(name, migrations), "utf8"));
  let queries = 0;
  const db = { prepare(query) {
    queries++;
    const stmt = sql.prepare(query);
    let values = [];
    return {
      bind(...next) { values = next; return this; },
      async first() { return stmt.get(...values) || null; },
      async all() { return { results: stmt.all(...values) }; },
      async run() { return { meta: { changes: Number(stmt.run(...values).changes) } }; },
    };
  } };
  return { sql, db, queries: () => queries };
}

function request(method = "GET", body, headers = {}, query = "") {
  return new Request(`${origin}/api/account${query}`, {
    method,
    headers: { origin, "sec-fetch-site": "same-origin", "x-arena-request": "profile", "content-type": "application/json", ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function setup(t) {
  const data = database(); t.after(() => data.sql.close());
  const deps = user => ({ authEnabled: () => true, getUser: async () => user, getDB: async () => data.db });
  return { ...data, deps, send: (user, req) => handleProfile(req, deps(user)) };
}

test("migrations are additive and account lookups use the primary-key index", t => {
  const { sql } = setup(t);
  assert.equal(sql.prepare("SELECT count(*) n FROM sqlite_schema WHERE type='table' AND name IN ('analytics_events','experiment_assignment_receipts','account_profiles')").get().n, 3);
  const plan = sql.prepare("EXPLAIN QUERY PLAN SELECT phone FROM account_profiles WHERE user_id=?").all(alice.userId);
  assert.match(plan.map(row => row.detail).join(" "), /USING INDEX/);
  const source = readFileSync(new URL("../drizzle/0002_account_profiles.sql", import.meta.url), "utf8");
  assert.doesNotMatch(source, /DROP|ALTER|DELETE|INSERT/i);
});

test("validation accepts an optional phone and normalizes only conventional formatting", () => {
  assert.deepEqual(validateProfileInput(payload()), { ok: true, phone: "+14155550123" });
  assert.deepEqual(validateProfileInput(payload("  ")), { ok: true, phone: null });
  for (const phone of ["4155550123", "+0123456789", "+123", "+1234567890123456", "+14155550123 ext4", "'+14155550123'", "+1\n4155550123", 42, null]) assert.equal(validateProfileInput({ ...payload(), phone }).ok, false);
  for (const value of [null, [], {}, { ...payload(), consent: false }, { ...payload(), consent: "true" }, { ...payload(), privacyVersion: "old" }, { ...payload(), userId: bob.userId }, { ...payload(), email: bob.email }]) assert.equal(validateProfileInput(value).ok, false);
});

test("anonymous requests cannot read, save, or delete any contacts", async t => {
  const { send, queries } = setup(t);
  for (const method of ["GET", "PUT", "DELETE"]) {
    const response = await send(null, request(method, method === "PUT" ? payload() : undefined));
    assert.equal(response.status, 401);
    assert.match(response.headers.get("cache-control"), /private, no-store/);
  }
  assert.equal(queries(), 0);
});

test("standalone builds fail closed even when client identity headers are forged", async t => {
  const { deps, queries } = setup(t);
  assert.equal(sitesAuthEnabled(), false);
  const response = await handleProfile(request("GET", undefined, { "oai-authenticated-user-id": alice.userId, "oai-authenticated-user-email": alice.email }), { ...deps(alice), authEnabled: sitesAuthEnabled });
  assert.equal(response.status, 503); assert.equal(queries(), 0);
});

test("signing in or loading a profile does not silently collect contact records", async t => {
  const { send, sql } = setup(t);
  const response = await send(alice, request());
  assert.deepEqual(await response.json(), { email: alice.email, profile: null });
  assert.equal(sql.prepare("SELECT count(*) n FROM account_profiles").get().n, 0);
});

test("saving, reloading, updating, and deleting real SQLite records is owner-scoped", async t => {
  const { send, sql } = setup(t);
  const created = await send(alice, request("PUT", payload()));
  assert.equal(created.status, 200);
  assert.equal((await created.json()).profile.phone, "+14155550123");
  const row = sql.prepare("SELECT * FROM account_profiles WHERE user_id=?").get(alice.userId);
  assert.equal(row.email, alice.email); assert.equal(row.privacy_version, PROFILE_PRIVACY_VERSION); assert.ok(row.consent_at);
  const bobView = await send(bob, request("GET", undefined, {}, `?userId=${alice.userId}`));
  assert.deepEqual(await bobView.json(), { email: bob.email, profile: null });
  assert.equal((await send(bob, request("DELETE", undefined, {}, `?userId=${alice.userId}`))).status, 200);
  assert.equal(sql.prepare("SELECT count(*) n FROM account_profiles").get().n, 1);
  const reloaded = await send(alice, request());
  assert.equal((await reloaded.json()).profile.phone, "+14155550123");
  sql.prepare("UPDATE account_profiles SET updated_at=datetime('now','-10 seconds') WHERE user_id=?").run(alice.userId);
  const updated = await send(alice, request("PUT", payload("")));
  assert.equal(updated.status, 200); assert.equal((await updated.json()).profile.phone, null);
  await send(bob, request("PUT", payload("+442079460123")));
  assert.equal((await send(alice, request("DELETE"))).status, 200);
  assert.equal(sql.prepare("SELECT count(*) n FROM account_profiles WHERE user_id=?").get(alice.userId).n, 0);
  assert.equal(sql.prepare("SELECT count(*) n FROM account_profiles WHERE user_id=?").get(bob.userId).n, 1);
});

test("cross-origin, missing-origin, and missing custom-header writes are rejected", async t => {
  const { send, queries } = setup(t);
  for (const headers of [{ origin: "https://evil.example" }, { origin: "null" }, { origin: "" }, { "sec-fetch-site": "cross-site" }, { "sec-fetch-site": "same-site" }, { "x-arena-request": "" }]) {
    for (const method of ["PUT", "DELETE"]) assert.equal((await send(alice, request(method, method === "PUT" ? payload() : undefined, headers))).status, 403);
  }
  assert.equal(queries(), 0);
});

test("email and owner cannot be set through the client request", async t => {
  const { send, queries } = setup(t);
  const response = await send(alice, request("PUT", { ...payload(), userId: bob.userId, email: bob.email }));
  assert.equal(response.status, 400); assert.equal(queries(), 0);
});

test("invalid input, malformed JSON, wrong types, and bounded bodies never write", async t => {
  const { send, queries } = setup(t);
  assert.equal((await send(alice, request("PUT", payload(), { "content-type": "text/plain" }))).status, 415);
  assert.equal((await send(alice, request("PUT", { ...payload(), phone: "x".repeat(2100) }))).status, 413);
  const malformed = new Request(`${origin}/api/account`, { method: "PUT", headers: { origin, "x-arena-request": "profile", "content-type": "application/json" }, body: "{" });
  assert.equal((await send(alice, malformed)).status, 400);
  for (const user of [{ ...alice, userId: "" }, { ...alice, email: "not an email" }]) assert.equal((await send(user, request())).status, 401);
  assert.equal(queries(), 0);
});

test("concurrent repeated writes are rate-limited atomically without changing the saved number", async t => {
  const { send, sql } = setup(t);
  await send(alice, request("PUT", payload()));
  const repeated = await send(alice, request("PUT", payload("+442079460123")));
  assert.equal(repeated.status, 429); assert.equal(repeated.headers.get("retry-after"), "2");
  assert.equal(sql.prepare("SELECT phone FROM account_profiles WHERE user_id=?").get(alice.userId).phone, "+14155550123");
});

test("storage failures return a private error and never claim success or reveal raw failures", async t => {
  const { deps } = setup(t);
  const response = await handleProfile(request("PUT", payload()), { ...deps(alice), getDB: async () => { throw new Error(`secret failure ${alice.email}`); } });
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /secret|alice@example/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("contact pages are excluded from analytics, indexing, and public discovery", () => {
  for (const path of ["/account", "/account/privacy", "/login", "/api/account", "/account?email=synthetic", "/login?return_to=/account"]) assert.equal(isLocalOnlyAnalyticsPath(path), true);
  assert.equal(isLocalOnlyAnalyticsPath("/arenagpt"), false);
  const robots = readFileSync(new URL("../public/robots.txt", import.meta.url), "utf8");
  assert.match(robots, /Disallow: \/account/);
  const routes = readFileSync(new URL("../app/api/analytics/route.ts", import.meta.url), "utf8");
  assert.match(routes, /if\(isLocalOnlyAnalyticsPath\(path\)\)/);
  const client = readFileSync(new URL("../app/account/AccountForm.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(client, /localStorage|sessionStorage|console\.|track\(/);
  const login = readFileSync(new URL("../app/login/page.tsx", import.meta.url), "utf8");
  assert.match(login, /href=\{chatGPTSignInPath\("\/account"\)\} target="_top"/);
});

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { StudioStore } from "../app/studio/store.ts";
import { handleStudioRequest } from "../app/studio/http.ts";
import { starterBenchmark } from "../app/studio/contract.ts";

test("PostgreSQL workspaces isolate data, persist human/agent edits, reject races, revoke access and erase records", async t => {
  const db = new PGlite(); t.after(() => db.close());
  await db.exec(await readFile(new URL("../db/studio/001-workspaces.sql", import.meta.url), "utf8"));
  const store = new StudioStore(db);
  async function request(path, method = "GET", body, auth = {}) {
    return handleStudioRequest(new Request(`https://example.test/api/studio/${path}`, { method, headers: { origin: "https://example.test", "x-robotrouter-request": "studio", "content-type": "application/json", ...auth }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), () => store);
  }
  const created = await request("session", "POST", {}); assert.equal(created.status, 201, await created.clone().text());
  const session = await created.json(); const cookie = created.headers.get("set-cookie").split(";")[0];
  assert.match(created.headers.get("set-cookie"), /HttpOnly; SameSite=Lax; Path=\/; Max-Age=604800; Secure/);
  assert.match(session.recoveryKey, /^rrw_/); assert.equal(session.token, undefined);
  const auth = { cookie };
  const status = await request("status", "GET", undefined, auth); assert.equal((await status.json()).authenticated, true);
  const keyResponse = await request("keys", "POST", { label: "Test agent" }, auth); assert.equal(keyResponse.status, 201);
  const key = await keyResponse.json(); const agent = { authorization: `Bearer ${key.token}` };
  const savedResponse = await request("benchmarks", "POST", { document: starterBenchmark }, agent); assert.equal(savedResponse.status, 201, await savedResponse.clone().text());
  const saved = await savedResponse.json(); assert.equal(saved.version, 1);
  assert.equal((await (await request("benchmarks", "GET", undefined, auth)).json()).benchmarks[0].id, saved.id);
  const second = await request("session", "POST", {}); const other = { cookie: second.headers.get("set-cookie").split(";")[0] };
  for (const suffix of ["", "/chart.svg", "/results.csv", "/document.json"]) assert.equal((await request(`benchmarks/${saved.id}${suffix}`, "GET", undefined, other)).status, 404);
  assert.equal((await request(`benchmarks/${saved.id}`, "PUT", { version: 1, document: starterBenchmark }, other)).status, 404);
  assert.equal((await request(`benchmarks/${saved.id}`, "DELETE", { version: 1 }, other)).status, 404);
  const updated = await request(`benchmarks/${saved.id}`, "PUT", { version: 1, document: { ...starterBenchmark, title: "Measured trial", evidence: "self-reported" } }, auth);
  assert.equal(updated.status, 200); assert.equal((await updated.json()).version, 2);
  assert.equal((await request(`benchmarks/${saved.id}`, "PUT", { version: 1, document: starterBenchmark }, agent)).status, 409);
  assert.equal((await request(`benchmarks/${saved.id}`, "DELETE", { version: 1 }, auth)).status, 409);
  const svg = await request(`benchmarks/${saved.id}/chart.svg`, "GET", undefined, agent); assert.equal(svg.status, 200); assert.match(await svg.text(), /Measured trial/); assert.match(svg.headers.get("cache-control"), /no-store/);
  assert.equal((await request("keys", "POST", { label: "Escalate" }, agent)).status, 403);
  assert.equal((await request("workspace", "DELETE", { confirm: "DELETE WORKSPACE" }, agent)).status, 403);
  assert.equal((await request("session", "DELETE", undefined, auth)).status, 200);
  assert.equal((await request("benchmarks", "GET", undefined, auth)).status, 401);
  const recovered = await request("session", "POST", { recoveryKey: session.recoveryKey }); assert.equal(recovered.status, 201);
  const recoveredAuth = { cookie: recovered.headers.get("set-cookie").split(";")[0] };
  assert.equal((await request(`benchmarks/${saved.id}`, "GET", undefined, recoveredAuth)).status, 200);
  assert.equal((await request(`keys/${key.id}`, "DELETE", undefined, recoveredAuth)).status, 200);
  assert.equal((await request("benchmarks", "GET", undefined, agent)).status, 401);
  assert.equal((await request("workspace", "DELETE", { confirm: "DELETE WORKSPACE" }, recoveredAuth)).status, 200);
  assert.equal((await request("session", "POST", { recoveryKey: session.recoveryKey })).status, 401);
  assert.equal((await db.query("SELECT count(*) AS total FROM studio_benchmarks")).rows[0].total, 0);
  const hashes = await db.query("SELECT recovery_hash FROM studio_workspaces"); assert.ok(hashes.rows.every(row => /^[a-f0-9]{64}$/.test(row.recovery_hash)));
});

test("HTTP blocks cross-origin writes, oversize streams, invalid documents and unavailable storage", async () => {
  const unavailable = () => { throw new Error("private connection string"); };
  const fail = await handleStudioRequest(new Request("https://example.test/api/studio/status"), unavailable);
  assert.equal(fail.status, 503); assert.doesNotMatch(await fail.text(), /private connection/);
  for (const headers of [{}, { origin: "https://evil.test", "x-robotrouter-request": "studio" }]) {
    const result = await handleStudioRequest(new Request("https://example.test/api/studio/session", { method: "POST", headers, body: "{}" }), unavailable); assert.equal(result.status, 403);
  }
  const db = new PGlite();
  try {
    await db.exec(await readFile(new URL("../db/studio/001-workspaces.sql", import.meta.url), "utf8"));
    const store = new StudioStore(db), identity = await store.session(), headers = { origin: "https://example.test", "x-robotrouter-request": "studio", "content-type": "application/json", cookie: `rr_workspace=${identity.token}` };
    for (const [body, status] of [["invalid", 400], [JSON.stringify({ document: { ...starterBenchmark, rows: [{ id: "r1", label: "bad", values: { success: "99" } }] } }), 422], [" ".repeat(512001), 413]]) {
      const result = await handleStudioRequest(new Request("https://example.test/api/studio/benchmarks", { method: "POST", headers, body }), () => store); assert.equal(result.status, status);
    }
    await store.rate("test-limit", 1, 60); await assert.rejects(() => store.rate("test-limit", 1, 60), { status: 429 });
  } finally { await db.close(); }
});

test("saved workspaces survive database reopen and storage capacity protects existing reads", async () => {
  const parent = resolve(tmpdir()), directory = await mkdtemp(join(parent, "robotrouter-postgres-test-"));
  assert.equal(dirname(resolve(directory)), parent);
  assert.ok(resolve(directory).startsWith(join(parent, "robotrouter-postgres-test-")));
  let db = new PGlite(directory);
  try {
    await db.exec(await readFile(new URL("../db/studio/001-workspaces.sql", import.meta.url), "utf8"));
    const store = new StudioStore(db), session = await store.session(), owner = await store.authenticate(session.token, "session"), saved = await store.save(owner, starterBenchmark);
    await db.close(); db = new PGlite(directory);
    const reopened = new StudioStore(db), recovered = await reopened.session(session.recoveryKey), restoredOwner = await reopened.authenticate(recovered.token, "session");
    assert.deepEqual((await reopened.get(restoredOwner, saved.id)).document, starterBenchmark);
    const full = new StudioStore({ query: (text, values) => text.includes("pg_database_size") ? Promise.resolve({ rows: [{ bytes: 6 * 1024 ** 3 }] }) : db.query(text, values), transaction: run => db.transaction(run) });
    await assert.rejects(() => full.save(restoredOwner, starterBenchmark), { status: 503 });
    assert.equal((await full.get(restoredOwner, saved.id)).id, saved.id);
    await full.remove(restoredOwner, saved.id, 1);
    assert.equal((await reopened.list(restoredOwner)).length, 0);
  } finally {
    await db.close();
    await rm(directory, { recursive: true, force: true });
  }
});

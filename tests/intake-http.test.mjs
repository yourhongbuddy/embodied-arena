import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { mkdirSync, readFileSync, readdirSync, mkdtempSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createHmac, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { TERMS_VERSION } from "../app/verified/contract.ts";

test("built HTTP routes render intake and reconcile signed synthetic events against durable storage", async t => {
  mkdirSync("work", { recursive: true }); const dir = mkdtempSync(resolve("work/intake-http-")); const file = resolve(dir, "db.sqlite");
  const db = new DatabaseSync(file); t.after(() => db.close());
  for (const name of readdirSync("drizzle").filter(n => n.endsWith(".sql")).sort()) db.exec(readFileSync(`drizzle/${name}`, "utf8"));
  const id = randomUUID(); db.prepare("INSERT INTO hilo_applications (id,email,application_json,terms_version,created_at) VALUES (?,?,?,?,?)").run(id, "synthetic@example.invalid", "{}", TERMS_VERSION, Math.floor(Date.now() / 1000));
  const listener = createServer(); await new Promise(r => listener.listen(0, "127.0.0.1", r)); const port = listener.address().port; await new Promise(r => listener.close(r));
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["dist/standalone/server.js"], { env: { ...process.env, HOST: "127.0.0.1", PORT: String(port), HILO_PUBLIC_URL: base, HILO_SQLITE_PATH: file, STRIPE_SECRET_KEY: "sk_test_synthetic", STRIPE_WEBHOOK_SECRET: "whsec_synthetic" }, stdio: "pipe" });
  let output = ""; child.stdout.on("data", c => output += c); child.stderr.on("data", c => output += c);
  t.after(async () => { child.kill(); await Promise.race([once(child, "exit"), delay(2000)]); });
  let ready = false; for (let i = 0; i < 100; i++) { if (child.exitCode !== null) throw new Error(output); try { if ((await fetch(`${base}/robots.txt`)).ok) { ready = true; break; } } catch { /* Server is starting. */ } await delay(100); } assert.equal(ready, true);
  for (const path of ["/verified", "/verified/terms", `/verified/success?application=${id}`, `/verified/cancel?application=${id}`]) {
    const response = await fetch(`${base}${path}`); assert.equal(response.status, 200, path); assert.match(response.headers.get("cache-control"), /no-store/); assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    const html = await response.text(); assert.doesNotMatch(html, /sk_test_synthetic|whsec_synthetic/);
    if (path === "/verified") { for (const field of ["organization", "robot", "website", "modelUrl", "contact", "email", "intendedUse", "environment", "hours", "notes", "consent"]) assert.match(html, new RegExp(`name="${field}"`)); assert.match(html, /does not guarantee certification/); }
  }
  const before = await fetch(`${base}/api/verified/status?application=${id}`); assert.equal((await before.json()).paymentStatus, "pending");
  const event = { id: "evt_http_synthetic", type: "checkout.session.completed", data: { object: { id: "cs_test_http", client_reference_id: id, metadata: { purpose: "hilo_verified_intake", application_id: id }, mode: "payment", amount_total: 100, currency: "usd", payment_status: "paid", livemode: false } } };
  const payload = JSON.stringify(event); const ts = Math.floor(Date.now() / 1000); const signature = createHmac("sha256", "whsec_synthetic").update(`${ts}.${payload}`).digest("hex");
  assert.equal((await fetch(`${base}/api/verified/webhook`, { method: "POST", body: payload })).status, 400);
  assert.equal((await fetch(`${base}/api/verified/webhook`, { method: "POST", headers: { "stripe-signature": `t=${ts},v1=${signature}` }, body: payload })).status, 200);
  const after = await fetch(`${base}/api/verified/status?application=${id}`); assert.equal((await after.json()).paymentStatus, "paid"); assert.equal(db.prepare("SELECT payment_status FROM hilo_applications WHERE id=?").get(id).payment_status, "paid");
  assert.equal((await fetch(`${base}/api/verified/checkout`, { method: "POST", headers: { origin: "https://evil.invalid", "content-type": "application/json" }, body: "{}" })).status, 403);
});

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";

test("production Node routes fail closed, keep private headers, and preserve public pages", async t => {
  const listener = createServer();
  await new Promise(resolve => listener.listen(0, "127.0.0.1", resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const child = spawn(process.execPath, ["dist/standalone/server.js"], { cwd: new URL("../", import.meta.url), env: { ...process.env, HOST: "127.0.0.1", PORT: String(port) }, stdio: "pipe" });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; }); child.stderr.on("data", chunk => { output += chunk; });
  t.after(async () => { child.kill(); await Promise.race([once(child, "exit"), delay(2000)]); });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let tries = 0; tries < 100; tries++) {
    if (child.exitCode !== null) throw new Error(output);
    try { if ((await fetch(`${base}/robots.txt`)).ok) { ready = true; break; } } catch {}
    await delay(100);
  }
  assert.equal(ready, true);
  const forged = { "oai-authenticated-user-id": "spoofed", "oai-authenticated-user-email": "spoofed@example.invalid" };
  const login = await fetch(`${base}/login`, { headers: forged });
  assert.equal(login.status, 200); assert.match(login.headers.get("cache-control"), /no-store/);
  const html = await login.text();
  assert.match(html, /Welcome to the Arena/); assert.match(html, /Sign-in is not enabled on this host yet/);
  assert.doesNotMatch(html, /spoofed@example|Sign in with ChatGPT<|Open my profile/);
  const account = await fetch(`${base}/account`, { redirect: "manual", headers: forged });
  assert.ok([302, 307].includes(account.status)); assert.equal(new URL(account.headers.get("location"), base).pathname, "/login");
  for (const method of ["GET", "PUT", "DELETE"]) {
    const response = await fetch(`${base}/api/account`, { method, headers: { ...forged, origin: base, "x-arena-request": "profile", "content-type": "application/json" }, ...(method === "PUT" ? { body: "{}" } : {}) });
    assert.equal(response.status, 503); assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.doesNotMatch(await response.text(), /spoofed@example/);
  }
  const privateEvent = await fetch(`${base}/api/analytics`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: "synthetic-test-unit", eventType: "page_view", path: "/account", metadata: {} }) });
  assert.equal(privateEvent.status, 400);
  for (const path of ["/account/privacy", "/arenagpt", "/leaderboard", "/scan", "/agent.json"]) assert.equal((await fetch(`${base}${path}`)).status, 200, path);
  assert.doesNotMatch(output, /spoofed@example|Each child in a list/);
});

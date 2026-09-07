import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { StudioStore } from "../app/studio/store.ts";
import { handleStudioMcp } from "../app/studio/mcp-server.ts";
import { starterBenchmark } from "../app/studio/contract.ts";

test("authenticated MCP creates, reads, charts, versions, and deletes the same PostgreSQL records", async t => {
  const db = new PGlite(); t.after(() => db.close());
  await db.exec(await readFile(new URL("../db/studio/001-workspaces.sql", import.meta.url), "utf8"));
  const store = new StudioStore(db), session = await store.session(), owner = await store.authenticate(session.token, "session"), key = await store.createKey(owner, "MCP agent");
  async function rpc(method, params = {}, auth = `Bearer ${key.token}`) {
    return handleStudioMcp(new Request("https://example.test/studio/mcp", { method: "POST", headers: { "content-type": "application/json", authorization: auth, "mcp-protocol-version": "2025-11-25" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) }), () => store);
  }
  const call = async (name, args) => (await (await rpc("tools/call", { name, arguments: args })).json()).result;
  assert.equal((await rpc("tools/list", {}, "")).status, 401);
  const initialized = await (await rpc("initialize", { protocolVersion: "2025-11-25" })).json(); assert.equal(initialized.result.protocolVersion, "2025-11-25");
  const list = await (await rpc("tools/list")).json(); assert.equal(list.result.tools.length, 6);
  assert.equal(list.result.tools.find(tool => tool.name === "update_benchmark").annotations.destructiveHint, true);
  assert.equal(list.result.tools.find(tool => tool.name === "render_benchmark").annotations.readOnlyHint, true);
  const created = await call("create_benchmark", { document: starterBenchmark }); assert.equal(created.isError, undefined);
  const saved = created.structuredContent.benchmark;
  assert.equal((await store.list(owner))[0].id, saved.id);
  assert.equal((await call("get_benchmark", { id: saved.id })).structuredContent.benchmark.document.title, starterBenchmark.title);
  const svg = await call("render_benchmark", { id: saved.id, format: "svg" }); assert.match(svg.structuredContent.content, /<svg/); assert.equal(svg.structuredContent.mimeType, "image/svg+xml");
  const updated = await call("update_benchmark", { id: saved.id, version: 1, document: { ...starterBenchmark, chart: { type: "scatter", metric: "success", xMetric: "latency" } } }); assert.equal(updated.structuredContent.benchmark.version, 2);
  const stale = await call("update_benchmark", { id: saved.id, version: 1, document: starterBenchmark }); assert.equal(stale.isError, true); assert.equal(stale.structuredContent.status, 409);
  assert.equal((await call("get_benchmark", { id: saved.id, unexpected: true })).isError, true);
  assert.equal((await call("create_benchmark", { document: { ...starterBenchmark, evidence: "verified" } })).structuredContent.status, 422);
  assert.equal((await call("delete_benchmark", { id: saved.id, version: 2 })).structuredContent.deleted, true);
  assert.equal((await call("list_benchmarks", {})).structuredContent.benchmarks.length, 0);
  await store.revokeKey(owner, key.id); assert.equal((await rpc("tools/list")).status, 401);
});

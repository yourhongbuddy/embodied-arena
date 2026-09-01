import assert from "node:assert/strict";
import test from "node:test";
import { handleMcpRequest, MCP_PROTOCOL_VERSION } from "../app/mcp/server.ts";

function modernRequest(method, params = {}, id = "test-1", extraHeaders = {}) {
  const withMeta = {
    ...params,
    _meta: {
      "io.modelcontextprotocol/protocolVersion": MCP_PROTOCOL_VERSION,
      "io.modelcontextprotocol/clientInfo": { name: "test-client", version: "1.0.0" },
      "io.modelcontextprotocol/clientCapabilities": {},
    },
  };
  const headers = {
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
    "mcp-protocol-version": MCP_PROTOCOL_VERSION,
    "mcp-method": method,
    ...extraHeaders,
  };
  return new Request("https://arena.example/mcp", {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params: withMeta }),
  });
}

test("server/discover advertises the current stateless tool server", async () => {
  const response = await handleMcpRequest(modernRequest("server/discover"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.result.resultType, "complete");
  assert.equal(body.result.supportedVersions[0], MCP_PROTOCOL_VERSION);
  assert.deepEqual(body.result.capabilities, { tools: {} });
});

test("tools/list is deterministic, schema-backed, and read-only", async () => {
  const response = await handleMcpRequest(modernRequest("tools/list"));
  const body = await response.json();
  const names = body.result.tools.map((tool) => tool.name);
  assert.deepEqual(names, [...names].sort());
  assert.deepEqual(names, ["compare_systems", "get_hilo_protocol", "get_site_map", "list_edge_platforms", "list_robot_models"]);
  for (const tool of body.result.tools) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.outputSchema.type, "object");
  }
});

test("tools/call returns structured HILO protocol content", async () => {
  const request = modernRequest("tools/call", { name: "get_hilo_protocol", arguments: {} }, "call-1", { "mcp-name": "get_hilo_protocol" });
  const response = await handleMcpRequest(request);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.result.structuredContent.protocol.benchmarkIsVendorNeutral, true);
  assert.equal(body.result.structuredContent.protocol.referenceImplementationIsBenchmark, false);
  assert.match(body.result.structuredContent.protocol.safetyBoundary, /safety kernel/i);
});

test("header mismatch is rejected before dispatch", async () => {
  const request = modernRequest("tools/call", { name: "get_hilo_protocol", arguments: {} }, "call-2", { "mcp-name": "list_robot_models" });
  const response = await handleMcpRequest(request);
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error.code, -32020);
});

test("cross-origin browser requests are denied by default", async () => {
  const request = modernRequest("tools/list", {}, "origin-1", { origin: "https://untrusted.example" });
  const response = await handleMcpRequest(request);
  assert.equal(response.status, 403);
});

test("legacy initialize remains available for transition clients", async () => {
  const request = new Request("https://arena.example/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "legacy", version: "1" } } }),
  });
  const response = await handleMcpRequest(request);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.result.protocolVersion, "2025-11-25");
});

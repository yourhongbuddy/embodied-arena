import assert from "node:assert/strict";
import test from "node:test";
import { monitorAgents, monitoredPaths } from "../app/monitoring/agents.ts";

test("monitoring council has ten uniquely numbered specialists", () => {
  assert.equal(monitorAgents.length, 10);
  assert.equal(new Set(monitorAgents.map((agent) => agent.id)).size, 10);
  assert.deepEqual(monitorAgents.map((agent) => agent.id), ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"]);
});

test("monitoring covers human, machine, and MCP routes", () => {
  for (const path of ["/", "/leaderboard", "/wanted-10k/realtime", "/agents", "/agent.json", "/llms.txt", "/mcp"]) assert.ok(monitoredPaths.includes(path));
});

test("every monitoring role has a cadence and operational mode", () => {
  for (const agent of monitorAgents) {
    assert.ok(agent.cadence.length > 3);
    assert.ok(["live", "scheduled", "guardrail"].includes(agent.mode));
    assert.ok(agent.description.length > 30);
  }
});

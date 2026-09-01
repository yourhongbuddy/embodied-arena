import assert from "node:assert/strict";
import test from "node:test";
import { dailyExperienceForDate, dailyExperiences, dailyRotationDateKey } from "../app/daily-rotation.ts";
import { monitorAgents, monitoredPaths, monitoringPathsForDate } from "../app/monitoring/agents.ts";

test("monitoring council has ten uniquely numbered specialists", () => {
  assert.equal(monitorAgents.length, 10);
  assert.equal(new Set(monitorAgents.map((agent) => agent.id)).size, 10);
  assert.deepEqual(monitorAgents.map((agent) => agent.id), ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"]);
});

test("monitoring covers human, machine, and MCP routes", () => {
  for (const path of ["/", "/scan", "/leaderboard", "/wanted-10k/realtime", "/agents", "/agent.json", "/llms.txt", "/mcp"]) assert.ok(monitoredPaths.includes(path));
});

test("daily rotation covers ten permanent experiences and advances in Pacific time", () => {
  assert.equal(dailyExperiences.length, 10);
  assert.equal(new Set(dailyExperiences.map((experience) => experience.path)).size, 10);
  assert.equal(dailyExperienceForDate(new Date("2026-08-31T19:00:00Z")).path, "/scan");
  assert.equal(dailyExperienceForDate(new Date("2026-09-01T19:00:00Z")).path, "/wanted-10k");
  assert.equal(dailyExperienceForDate(new Date("2026-09-10T19:00:00Z")).path, "/scan");
  assert.equal(dailyRotationDateKey(new Date("2026-09-01T06:30:00Z")), "2026-08-31");
});

test("monitoring prioritizes today's experience without duplicate probes", () => {
  const paths = monitoringPathsForDate(new Date("2026-09-05T19:00:00Z"));
  assert.equal(paths[0], "/monitoring");
  assert.equal(paths.length, new Set(paths).size);
});

test("every monitoring role has a cadence and operational mode", () => {
  for (const agent of monitorAgents) {
    assert.ok(agent.cadence.length > 3);
    assert.ok(["live", "scheduled", "guardrail"].includes(agent.mode));
    assert.ok(agent.description.length > 30);
  }
});

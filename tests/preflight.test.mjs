import assert from "node:assert/strict";
import test from "node:test";
import { assessPreflight, preflightTemplate, zeroEventUpper95 } from "../app/wanted-10k/preflight/profile.ts";
import { auditManifestTemplate } from "../app/wanted-10k/audit/manifest.ts";
import { assessManifest } from "../app/wanted-10k/audit/readiness.ts";

test("passes the complete simulator-neutral preflight profile", () => {
  const result = assessPreflight(preflightTemplate);
  assert.equal(result.status, "passed");
  assert.equal(result.gates.length, 7);
  assert.equal(result.summary.total_trials, 10000);
  assert.equal(result.summary.families_covered, 8);
  assert.equal(result.summary.coverage_rate, 1);
  assert.equal(result.summary.replay_match_rate, 1);
  assert.ok(Math.abs(result.summary.zero_event_upper_95 - 0.00029953) < 1e-8);
  assert.ok(Math.abs(zeroEventUpper95(10000) - 0.00029952836) < 1e-10);
});

test("fails on a catastrophic outcome, incomplete family set, or weak replay", () => {
  const catastrophic = structuredClone(preflightTemplate);
  catastrophic.families[0].catastrophic_events = 1;
  assert.equal(assessPreflight(catastrophic).gates.find(gate => gate.id === "P3").passed, false);

  const missing = structuredClone(preflightTemplate);
  missing.families.pop();
  assert.equal(assessPreflight(missing).gates.find(gate => gate.id === "P1").passed, false);

  const replay = structuredClone(preflightTemplate);
  replay.families.forEach(family => { family.replay_matches = 15; });
  assert.equal(assessPreflight(replay).gates.find(gate => gate.id === "P5").passed, false);
});

test("requires the bound preflight profile for certification readiness", () => {
  const passing = assessManifest(JSON.stringify(auditManifestTemplate));
  assert.equal(passing.status, "test");
  assert.equal(passing.gates.find(gate => gate.id === "G2").status, "pass");

  const failed = structuredClone(auditManifestTemplate);
  failed.preflight.catastrophic_events = 1;
  const result = assessManifest(JSON.stringify(failed));
  assert.equal(result.status, "not_ready");
  assert.equal(result.gates.find(gate => gate.id === "G2").status, "fail");
});

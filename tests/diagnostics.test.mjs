import assert from "node:assert/strict";
import test from "node:test";
import { calculateDiagnostics, diagnosticExample } from "../app/wanted-10k/diagnostics/profile.ts";
import { auditManifestTemplate } from "../app/wanted-10k/audit/manifest.ts";
import { assessManifest } from "../app/wanted-10k/audit/readiness.ts";

test("calculates the synthetic longitudinal diagnostic profile", () => {
  const result = calculateDiagnostics(diagnosticExample);
  assert.equal(result.status, "ready");
  assert.equal(result.errors.length, 0);
  assert.equal(result.metrics.assistance_minutes_per_100_hours, 18.2);
  assert.equal(result.metrics.autonomous_availability, 0.963);
  assert.equal(result.metrics.human_burden_minutes_per_100_hours, 31.7);
  assert.equal(result.metrics.mean_time_between_human_rescue.estimate_hours, 428.5714);
  assert.equal(result.metrics.mean_time_between_failure.estimate_hours, 3398.8235);
  assert.equal(result.metrics.self_recovery_rate.estimate, 0.9029);
  assert.equal(result.metrics.initiative_precision.estimate, 0.9202);
  assert.equal(result.metrics.initiative_label_coverage.estimate, 0.9632);
  assert.equal(result.metrics.learning_delta.estimate, 0.19);
  assert.equal(result.metrics.generalization.ratio, 0.8692);
  assert.equal(result.metrics.reacquisition_rate.estimate, 0.75);
  assert.deepEqual(result.metrics.stop_latency_ms, { n: 12, p50: 90, p95: 220.35, p99: 239.27, max: 244 });
});

test("reports zero-event reliability as exposure lower bounds", () => {
  const result = calculateDiagnostics({ ...diagnosticExample, rescue_events: 0, mechanical_failures: 0 });
  assert.equal(result.metrics.mean_time_between_human_rescue.estimate_hours, null);
  assert.equal(result.metrics.mean_time_between_human_rescue.no_event_lower_bound_hours, 120000);
  assert.equal(result.metrics.mean_time_between_failure.estimate_hours, null);
  assert.equal(result.metrics.mean_time_between_failure.no_event_lower_bound_hours, 115560);
});

test("marks missing response tails incomplete and rejects impossible counters", () => {
  const incomplete = calculateDiagnostics({ ...diagnosticExample, stop_latencies_ms: [], privacy_stop_latencies_ms: [] });
  assert.equal(incomplete.status, "incomplete");
  const impossible = calculateDiagnostics({ ...diagnosticExample, autonomous_service_seconds: diagnosticExample.resident_hours * 3600 + 1, self_recovered_failures: diagnosticExample.recoverable_failures + 1 });
  assert.equal(impossible.status, "invalid");
  assert.match(impossible.errors.join(" "), /cannot exceed/);
});

test("requires the canonical diagnostic profile for audit readiness", () => {
  const passing = assessManifest(JSON.stringify(auditManifestTemplate));
  assert.equal(passing.status, "test");
  assert.equal(passing.gates.find(gate => gate.id === "G4").status, "pass");
  const incomplete = structuredClone(auditManifestTemplate);
  delete incomplete.diagnostics.privacy_stop_latency_ms;
  const failing = assessManifest(JSON.stringify(incomplete));
  assert.equal(failing.status, "not_ready");
  assert.equal(failing.gates.find(gate => gate.id === "G4").status, "fail");
});

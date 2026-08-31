import assert from "node:assert/strict";
import test from "node:test";
import { auditManifestSchema, auditManifestTemplates } from "../app/wanted-10k/audit/manifest.ts";
import { assessManifest } from "../app/wanted-10k/audit/readiness.ts";
import { certificationProfile } from "../app/wanted-10k/certification/profile.ts";

const assess = value => assessManifest(JSON.stringify(value));
const clone = value => structuredClone(value);

test("all four target templates pass only their applicable gates", () => {
  for (const [target, manifest] of Object.entries(auditManifestTemplates)) {
    const result = assess(manifest);
    assert.equal(result.target, target);
    assert.equal(result.status, "test", `${target}: ${JSON.stringify(result.gates)}`);
    assert.equal(result.gates.length, 6);
    assert.equal(result.gates.every(gate => gate.status === "pass"), true);
  }
});

test("PREQUALIFIED is simulation-only and rejects fabricated field evidence", () => {
  const manifest = auditManifestTemplates.PREQUALIFIED;
  for (const key of ["cohort_integrity", "exposure_integrity", "primary", "diagnostics", "safety", "telemetry", "adjudication"]) assert.equal(manifest[key].applicable, false);
  const projection = assess(manifest).projection;
  assert.equal(projection.rankable, false);
  assert.equal(projection.wanted_score, null);
  assert.equal(projection.safety, "not_applicable");

  const tampered = clone(manifest);
  tampered.safety = clone(auditManifestTemplates.WANTED_WILD.safety);
  const result = assess(tampered);
  assert.equal(result.gates.find(gate => gate.id === "G5").status, "fail");
});

test("WANTED LAB requires field diagnostics and a lab report but never W", () => {
  const manifest = auditManifestTemplates.WANTED_LAB;
  const result = assess(manifest);
  assert.equal(manifest.primary.applicable, false);
  assert.equal(result.projection.rankable, false);
  assert.equal(result.projection.wanted_score, null);

  const noDiagnostics = clone(manifest);
  noDiagnostics.diagnostics = { applicable: false, reason: "Field diagnostics were not supplied." };
  assert.equal(assess(noDiagnostics).gates.find(gate => gate.id === "G4").status, "fail");

  const noLabReport = clone(manifest);
  noLabReport.evidence = noLabReport.evidence.filter(item => item.role !== "lab_report");
  assert.equal(assess(noLabReport).gates.find(gate => gate.id === "G3").status, "fail");
});

test("only WANTED WILD ranks and WANTED 10K requires withdrawal", () => {
  const wild = assess(auditManifestTemplates.WANTED_WILD);
  assert.equal(wild.projection.rankable, true);
  assert.equal(wild.projection.wanted_score, 71.4);

  const lifetime = assess(auditManifestTemplates.WANTED_10K);
  assert.equal(lifetime.projection.rankable, false);
  assert.equal(lifetime.projection.wanted_score, null);

  const incomplete = clone(auditManifestTemplates.WANTED_10K);
  incomplete.withdrawal.completed = 0;
  assert.equal(assess(incomplete).gates.find(gate => gate.id === "G3").status, "fail");
});

test("machine contracts encode target applicability and rankability", () => {
  for (const key of ["primary", "diagnostics", "safety", "telemetry", "adjudication"]) assert.ok(auditManifestSchema.properties[key].oneOf);
  assert.equal(auditManifestSchema.allOf.length, 4);
  assert.equal(certificationProfile.version, "0.2-C1");
  assert.deepEqual(certificationProfile.ordering.inherits.WANTED_10K, ["WANTED_LAB"]);
  assert.equal(certificationProfile.targets.WANTED_WILD.rankable, true);
  assert.equal(certificationProfile.targets.WANTED_10K.rankable, false);
  assert.equal(certificationProfile.ranking.only_target, "WANTED_WILD");
});

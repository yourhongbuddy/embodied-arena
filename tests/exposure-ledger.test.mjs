import assert from "node:assert/strict";
import test from "node:test";
import { assessExposureLedger, CLOCK_RULE, exposureLedgerContract, exposureLedgerSchema, exposureLedgerTemplateFor } from "../app/wanted-10k/exposure-ledger/profile.ts";
import { auditManifestTemplates } from "../app/wanted-10k/audit/manifest.ts";
import { assessManifest } from "../app/wanted-10k/audit/readiness.ts";

const clone = value => structuredClone(value);
const gate = (result, id) => result.gates.find(item => item.id === id);

test("reproduces field-target hours from continuous signed boundaries", () => {
  const expected = { WANTED_LAB: 100, WANTED_WILD: 120000, WANTED_10K: 10000 };
  for (const target of Object.keys(expected)) {
    const result = assessExposureLedger(exposureLedgerTemplateFor(target));
    assert.equal(result.status, "passed", `${target}: ${JSON.stringify(result.gates)}`);
    assert.equal(result.summary.total_resident_hours, expected[target]);
    assert.equal(result.summary.paused_seconds_deducted, 0);
  }
});

test("rejects pause deductions, clock mismatches, and broken streams", () => {
  const paused = exposureLedgerTemplateFor("WANTED_WILD");
  paused.records[0].paused_seconds_deducted = 60;
  assert.equal(gate(assessExposureLedger(paused), "X3").passed, false);

  const mismatched = exposureLedgerTemplateFor("WANTED_WILD");
  mismatched.records[0].declared_resident_seconds -= 2;
  assert.equal(gate(assessExposureLedger(mismatched), "X3").passed, false);

  const missing = exposureLedgerTemplateFor("WANTED_WILD");
  missing.records[0].missing_sequences = 1;
  assert.equal(gate(assessExposureLedger(missing), "X4").passed, false);
});

test("rejects duplicate environments and unsupported target exposure", () => {
  const duplicate = exposureLedgerTemplateFor("WANTED_WILD");
  duplicate.records[1].environment_id_sha256 = duplicate.records[0].environment_id_sha256;
  assert.equal(gate(assessExposureLedger(duplicate), "X5").passed, false);

  const short = exposureLedgerTemplateFor("WANTED_10K");
  short.records[0].declared_resident_seconds = 35999999;
  short.records[0].end.occurred_at = new Date(Date.parse(short.records[0].activation.occurred_at) + 35999999 * 1000).toISOString();
  assert.equal(gate(assessExposureLedger(short), "X6").passed, false);
});

test("binds exposure integrity into every field audit target", () => {
  for (const target of ["WANTED_LAB", "WANTED_WILD", "WANTED_10K"]) {
    const result = assessManifest(JSON.stringify(auditManifestTemplates[target]));
    assert.equal(result.status, "test", `${target}: ${JSON.stringify(result.gates)}`);
    assert.equal(auditManifestTemplates[target].exposure_integrity.profile_version, "0.2-X1");
    assert.equal(result.projection.clock_verified_hours, result.projection.resident_hours);
  }
  assert.equal(auditManifestTemplates.PREQUALIFIED.exposure_integrity.applicable, false);

  const missing = clone(auditManifestTemplates.WANTED_WILD);
  missing.evidence = missing.evidence.filter(item => item.role !== "exposure_integrity_report");
  assert.equal(gate(assessManifest(JSON.stringify(missing)), "G3").status, "fail");

  const mismatch = clone(auditManifestTemplates.WANTED_WILD);
  mismatch.exposure_integrity.total_resident_seconds -= 3600;
  assert.equal(gate(assessManifest(JSON.stringify(mismatch)), "G3").status, "fail");
});

test("publishes a strict non-ranking machine contract", () => {
  assert.equal(exposureLedgerContract.version, "0.2-X1");
  assert.equal(exposureLedgerContract.official_clock, CLOCK_RULE);
  assert.equal(exposureLedgerContract.pause_deductions_permitted, false);
  assert.equal(exposureLedgerContract.telemetry_outage_pauses_clock, false);
  assert.equal(exposureLedgerSchema.additionalProperties, false);
  assert.equal(exposureLedgerSchema.properties.records.items.properties.paused_seconds_deducted.const, 0);
});

import assert from "node:assert/strict";
import test from "node:test";
import { assessCohortIntegrity, cohortIntegrityContract, cohortIntegritySchema, cohortIntegrityTemplateFor } from "../app/wanted-10k/cohort-integrity/profile.ts";
import { auditManifestTemplates } from "../app/wanted-10k/audit/manifest.ts";
import { assessManifest } from "../app/wanted-10k/audit/readiness.ts";

const clone = value => structuredClone(value);
const gate = (result, id) => result.gates.find(item => item.id === id);

test("passes each field target with target-specific independence rules", () => {
  for (const target of ["WANTED_LAB", "WANTED_WILD", "WANTED_10K"]) {
    const result = assessCohortIntegrity(cohortIntegrityTemplateFor(target));
    assert.equal(result.status, "passed", `${target}: ${JSON.stringify(result.gates)}`);
    assert.equal(result.summary.target_certification, target);
    assert.equal(result.summary.analysis_set, result.summary.independent_environments);
  }
  assert.equal(cohortIntegrityTemplateFor("WANTED_LAB").independence.sponsor_controlled_environments, 1);
});

test("fails post-activation cherry-picking and unretained replacement runs", () => {
  const excluded = cohortIntegrityTemplateFor("WANTED_WILD");
  excluded.flow.post_activation_exclusions = 1;
  assert.equal(gate(assessCohortIntegrity(excluded), "E4").passed, false);

  const replacement = cohortIntegrityTemplateFor("WANTED_WILD");
  replacement.flow.original_runs_retained = false;
  assert.equal(gate(assessCohortIntegrity(replacement), "E4").passed, false);
});

test("fails duplicate decision units, coercive incentives, and sponsor-controlled WILD homes", () => {
  const duplicate = cohortIntegrityTemplateFor("WANTED_WILD");
  duplicate.independence.duplicate_primary_decision_makers = 1;
  assert.equal(gate(assessCohortIntegrity(duplicate), "E5").passed, false);

  const coercive = cohortIntegrityTemplateFor("WANTED_WILD");
  coercive.sampling.base_compensation_independent_of_retention = false;
  assert.equal(gate(assessCohortIntegrity(coercive), "E3").passed, false);

  const controlled = cohortIntegrityTemplateFor("WANTED_WILD");
  controlled.independence.sponsor_controlled_environments = 1;
  assert.equal(gate(assessCohortIntegrity(controlled), "E6").passed, false);
});

test("requires eligibility to be frozen before screening", () => {
  const late = cohortIntegrityTemplateFor("WANTED_10K");
  late.study.eligibility_frozen_at = late.study.screening_opened_at;
  assert.equal(gate(assessCohortIntegrity(late), "E1").passed, false);
});

test("binds cohort integrity into every field audit target", () => {
  for (const target of ["WANTED_LAB", "WANTED_WILD", "WANTED_10K"]) {
    const result = assessManifest(JSON.stringify(auditManifestTemplates[target]));
    assert.equal(result.status, "test", `${target}: ${JSON.stringify(result.gates)}`);
    assert.equal(auditManifestTemplates[target].cohort_integrity.profile_version, "0.2-E1");
  }
  assert.equal(auditManifestTemplates.PREQUALIFIED.cohort_integrity.applicable, false);

  const missing = clone(auditManifestTemplates.WANTED_WILD);
  missing.evidence = missing.evidence.filter(item => item.role !== "cohort_integrity_report");
  assert.equal(gate(assessManifest(JSON.stringify(missing)), "G3").status, "fail");

  const mismatch = clone(auditManifestTemplates.WANTED_WILD);
  mismatch.cohort_integrity.independent_environments = 23;
  assert.equal(gate(assessManifest(JSON.stringify(mismatch)), "G3").status, "fail");

  const unbound = clone(auditManifestTemplates.WANTED_WILD);
  unbound.evidence.find(item => item.role === "cohort_integrity_report").sha256 = `${"9a"}${"0123456789abcdef".repeat(4)}`.slice(0, 64);
  assert.equal(gate(assessManifest(JSON.stringify(unbound)), "G3").status, "fail");
});

test("publishes a strict non-ranking machine contract", () => {
  assert.equal(cohortIntegrityContract.version, "0.2-E1");
  assert.equal(cohortIntegrityContract.ranking_effect, "eligibility_gate_not_score");
  assert.equal(cohortIntegrityContract.representativeness_claim, false);
  assert.equal(cohortIntegritySchema.additionalProperties, false);
  assert.equal(cohortIntegritySchema.properties.flow.properties.post_activation_exclusions.const, 0);
  assert.equal(cohortIntegritySchema.properties.independence.properties.maximum_environments_per_primary_decision_maker.const, 1);
});

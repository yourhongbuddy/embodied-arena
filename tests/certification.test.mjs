import assert from "node:assert/strict";
import test from "node:test";
import { auditManifestSchema, auditManifestTemplates } from "../app/wanted-10k/audit/manifest.ts";
import { assessManifest } from "../app/wanted-10k/audit/readiness.ts";
import { certificationProfile } from "../app/wanted-10k/certification/profile.ts";

const assess = value => assessManifest(JSON.stringify(value));
const clone = value => structuredClone(value);

test("all four target templates pass only their applicable gates", async () => {
  for (const [target, manifest] of Object.entries(auditManifestTemplates)) {
    const result = await assess(manifest);
    assert.equal(result.target, target);
    assert.equal(result.status, "test", `${target}: ${JSON.stringify(result.gates)}`);
    assert.equal(result.gates.length, 6);
    assert.equal(result.gates.every(gate => gate.status === "pass"), true);
  }
});

test("PREQUALIFIED is simulation-only and rejects fabricated field evidence", async () => {
  const manifest = auditManifestTemplates.PREQUALIFIED;
  for (const key of ["cohort_integrity", "site_heterogeneity", "exposure_integrity", "root_envelope_integrity", "root_commitment_witness", "analysis_reproduction", "primary", "human_measures", "learning_generalization", "assistance_integrity", "policy_evolution_integrity", "privacy_integrity", "service_continuity", "diagnostics", "safety", "telemetry", "adjudication", "withdrawal"]) assert.equal(manifest[key].applicable, false);
  const projection = (await assess(manifest)).projection;
  assert.equal(projection.rankable, false);
  assert.equal(projection.wanted_score, null);
  assert.equal(projection.safety, "not_applicable");
  assert.equal(projection.sampling_stopping_integrity_verified, true);

  const tampered = clone(manifest);
  tampered.safety = clone(auditManifestTemplates.WANTED_WILD.safety);
  const result = await assess(tampered);
  assert.equal(result.gates.find(gate => gate.id === "G5").status, "fail");
});

test("WANTED LAB requires field diagnostics and a lab report but never W", async () => {
  const manifest = auditManifestTemplates.WANTED_LAB;
  const result = await assess(manifest);
  assert.equal(manifest.primary.applicable, false);
  assert.equal(result.projection.rankable, false);
  assert.equal(result.projection.wanted_score, null);
  assert.equal(result.projection.human_measures_verified, true);
  assert.equal(result.projection.learning_generalization_verified, true);
  assert.equal(result.projection.assistance_integrity_verified, true);
  assert.equal(result.projection.policy_evolution_integrity_verified, true);
  assert.equal(result.projection.privacy_integrity_verified, true);
  assert.equal(result.projection.service_continuity_verified, true);
  assert.equal(result.projection.preregistration_integrity_verified, true);
  assert.equal(result.projection.protocol_deviation_integrity_verified, true);
  assert.equal(result.projection.sampling_stopping_integrity_verified, true);

  const noDiagnostics = clone(manifest);
  noDiagnostics.diagnostics = { applicable: false, reason: "Field diagnostics were not supplied." };
  assert.equal((await assess(noDiagnostics)).gates.find(gate => gate.id === "G4").status, "fail");

  const noLabReport = clone(manifest);
  noLabReport.evidence = noLabReport.evidence.filter(item => item.role !== "lab_report");
  assert.equal((await assess(noLabReport)).gates.find(gate => gate.id === "G3").status, "fail");
  const noHumanMeasures = clone(manifest);
  noHumanMeasures.human_measures = { applicable: false, reason: "Human measures were not supplied." };
  assert.equal((await assess(noHumanMeasures)).gates.find(gate => gate.id === "G3").status, "fail");
  const noLearning = clone(manifest);
  noLearning.learning_generalization = { applicable: false, reason: "Matched learning trials were not supplied." };
  assert.equal((await assess(noLearning)).gates.find(gate => gate.id === "G3").status, "fail");
  const noAssistance = clone(manifest);
  noAssistance.assistance_integrity = { applicable: false, reason: "Assistance integrity evidence was not supplied." };
  assert.equal((await assess(noAssistance)).gates.find(gate => gate.id === "G3").status, "fail");
  const noPolicyEvolution = clone(manifest);
  noPolicyEvolution.policy_evolution_integrity = { applicable: false, reason: "Policy evolution evidence was not supplied." };
  assert.equal((await assess(noPolicyEvolution)).gates.find(gate => gate.id === "G3").status, "fail");
  const noServiceContinuity = clone(manifest);
  noServiceContinuity.service_continuity = { applicable: false, reason: "Service continuity evidence was not supplied." };
  assert.equal((await assess(noServiceContinuity)).gates.find(gate => gate.id === "G3").status, "fail");
  const suppressedDeviation = clone(manifest);
  suppressedDeviation.protocol_deviations.suppressed_deviations = 1;
  assert.equal((await assess(suppressedDeviation)).gates.find(gate => gate.id === "G3").status, "fail");
  const earlyPrimaryAccess = clone(manifest);
  earlyPrimaryAccess.sampling_stopping.primary_outcome_access_events_before_cutoff = 1;
  assert.equal((await assess(earlyPrimaryAccess)).gates.find(gate => gate.id === "G3").status, "fail");
});

test("only WANTED WILD ranks and WANTED 10K requires withdrawal", async () => {
  const wild = await assess(auditManifestTemplates.WANTED_WILD);
  assert.equal(wild.projection.rankable, true);
  assert.equal(wild.projection.wanted_score, 87.5);
  assert.equal(wild.projection.withdrawal_verified, true);
  assert.equal(wild.projection.human_measures_verified, true);
  assert.equal(wild.projection.learning_generalization_verified, true);
  assert.equal(wild.projection.learning_paired_environments, 23);
  assert.equal(wild.projection.assistance_integrity_verified, true);
  assert.equal(wild.projection.human_rescue_events, 48);
  assert.equal(wild.projection.policy_evolution_integrity_verified, true);
  assert.equal(wild.projection.policy_artifact_count, 3);
  assert.equal(wild.projection.policy_material_update_count, 0);
  assert.equal(wild.projection.service_continuity_verified, true);
  assert.equal(wild.projection.service_autonomous_available_fraction > .98, true);
  assert.equal(wild.projection.preregistration_integrity_verified, true);
  assert.equal(wild.projection.preregistration_amendment_count, 2);
  assert.equal(wild.projection.protocol_deviation_integrity_verified, true);
  assert.equal(wild.projection.protocol_deviation_count, 2);
  assert.equal(wild.projection.protocol_deviation_important_count, 1);
  assert.equal(wild.projection.sampling_stopping_integrity_verified, true);
  assert.equal(wild.projection.sampling_actual_units, 24);
  assert.equal(wild.projection.sampling_actual_exposure_hours, 120000);
  assert.equal(wild.projection.sampling_unscheduled_primary_analyses, 0);
  assert.equal(wild.projection.root_envelope_integrity_verified, true);
  assert.equal(wild.projection.root_envelope_count, 1000);
  assert.equal(wild.projection.root_commitment_witness_verified, true);
  assert.equal(wild.projection.root_commitment_count, 1000);
  assert.equal(wild.projection.root_witness_receipt_count, 2000);
  assert.equal(wild.projection.site_heterogeneity_verified, true);
  assert.equal(wild.projection.site_count, 3);
  assert.equal(wild.projection.maximum_site_share, .333333333);
  assert.equal(wild.projection.site_wanted_range, 9.375);
  assert.equal(wild.projection.leave_one_site_out_maximum_absolute_shift, 3.125);

  const siteDominated = clone(auditManifestTemplates.WANTED_WILD);
  siteDominated.site_heterogeneity.maximum_site_share = .75;
  assert.equal((await assess(siteDominated)).gates.find(gate => gate.id === "G3").status, "fail");

  const lifetime = await assess(auditManifestTemplates.WANTED_10K);
  assert.equal(lifetime.projection.rankable, false);
  assert.equal(lifetime.projection.wanted_score, null);
  assert.equal(lifetime.projection.withdrawal_verified, true);
  assert.equal(lifetime.projection.reacquisition_rate, 1);

  const incomplete = clone(auditManifestTemplates.WANTED_10K);
  incomplete.withdrawal.completed = 0;
  assert.equal((await assess(incomplete)).gates.find(gate => gate.id === "G3").status, "fail");
});

test("machine contracts encode target applicability and rankability", () => {
  for (const key of ["site_heterogeneity", "root_envelope_integrity", "primary", "human_measures", "learning_generalization", "assistance_integrity", "policy_evolution_integrity", "privacy_integrity", "service_continuity", "diagnostics", "safety", "telemetry", "adjudication", "withdrawal"]) assert.ok(auditManifestSchema.properties[key].oneOf);
  assert.equal(auditManifestSchema.properties.telemetry.oneOf[0].properties.profile_version.const, "0.2-T1");
  assert.equal(auditManifestSchema.properties.audit.properties.credential.properties.profile_version.const, "0.2-V2");
  assert.equal(auditManifestSchema.allOf.length, 8);
  assert.equal(auditManifestSchema.properties.preregistration_integrity.properties.outcome_informed_amendments.const, 0);
  assert.equal(auditManifestSchema.properties.preregistration_integrity.properties.retroactive_amendments.const, 0);
  assert.equal(auditManifestSchema.properties.protocol_deviations.properties.suppressed_deviations.const, 0);
  assert.equal(auditManifestSchema.properties.protocol_deviations.properties.primary_analysis_exclusions.const, 0);
  assert.equal(auditManifestSchema.properties.protocol_deviations.properties.endpoint_reclassifications.const, 0);
  assert.equal(auditManifestSchema.properties.sampling_stopping.properties.primary_outcome_access_events_before_cutoff.const, 0);
  assert.equal(auditManifestSchema.properties.sampling_stopping.properties.result_informed_early_stops.const, 0);
  assert.equal(certificationProfile.version, "0.2-C1");
  assert.deepEqual(certificationProfile.ordering.inherits.WANTED_10K, ["WANTED_LAB"]);
  assert.equal(certificationProfile.targets.WANTED_WILD.rankable, true);
  assert.equal(Object.values(certificationProfile.targets).every(target => target.requires.includes("preregistration_integrity_0.2-PR1")), true);
  assert.equal(Object.values(certificationProfile.targets).every(target => target.requires.includes("protocol_deviation_integrity_0.2-DV1")), true);
  assert.equal(Object.values(certificationProfile.targets).every(target => target.requires.includes("sampling_stopping_integrity_0.2-ST1")), true);
  assert.equal(certificationProfile.targets.WANTED_WILD.requires.includes("endpoint_adjudication_0.2-J1"), true);
  assert.equal(certificationProfile.targets.WANTED_WILD.requires.includes("auditor_credential_0.2-V2"), true);
  assert.equal(certificationProfile.targets.WANTED_WILD.requires.includes("site_heterogeneity_0.2-SH1"), true);
  assert.equal(certificationProfile.targets.WANTED_WILD.requires.includes("root_envelope_0.2-RE1"), true);
  assert.equal(certificationProfile.targets.WANTED_LAB.requires.includes("root_envelope_0.2-RE1"), true);
  assert.equal(certificationProfile.targets.WANTED_10K.requires.includes("root_envelope_0.2-RE1"), true);
  assert.equal(certificationProfile.targets.PREQUALIFIED.not_applicable.includes("root_envelope_0.2-RE1"), true);
  assert.equal(certificationProfile.ranking.site_heterogeneity_metrics_change_rank, false);
  assert.equal(certificationProfile.ranking.root_envelope_metrics_change_rank, false);
  assert.equal(certificationProfile.targets.WANTED_10K.rankable, false);
  assert.equal(certificationProfile.targets.WANTED_10K.requires.includes("endpoint_adjudication_0.2-J1"), true);
  assert.equal(certificationProfile.targets.WANTED_10K.requires.includes("withdrawal_0.2-W1"), true);
  assert.equal(certificationProfile.targets.WANTED_LAB.requires.includes("endpoint_adjudication_0.2-J1"), true);
  assert.equal(certificationProfile.targets.WANTED_LAB.requires.includes("human_measures_0.2-H1"), true);
  assert.equal(certificationProfile.targets.WANTED_LAB.requires.includes("learning_generalization_0.2-LG1"), true);
  assert.equal(certificationProfile.targets.WANTED_LAB.requires.includes("assistance_integrity_0.2-I1"), true);
  assert.equal(certificationProfile.targets.WANTED_LAB.requires.includes("policy_evolution_integrity_0.2-U1"), true);
  assert.equal(certificationProfile.targets.WANTED_LAB.requires.includes("privacy_integrity_0.2-PV1"), true);
  assert.equal(certificationProfile.targets.WANTED_LAB.requires.includes("service_continuity_0.2-SC1"), true);
  assert.equal(certificationProfile.secondary_disclosures.revealed_preference_0_2_RP1.cohort, "separate_nonranking_preference_substudy");
  assert.equal(certificationProfile.secondary_disclosures.revealed_preference_0_2_RP1.ranking_effect, "none");
  assert.equal(certificationProfile.ranking.only_target, "WANTED_WILD");
});

test("requires signed root-envelope integrity for every field target", async () => {
  for (const target of ["WANTED_LAB","WANTED_WILD","WANTED_10K"]) {
    const missing=clone(auditManifestTemplates[target]);
    missing.root_envelope_integrity.missing_envelopes=1;
    assert.equal((await assess(missing)).gates.find(gate=>gate.id==="G5").status,"fail",target);
  }
  const drift=clone(auditManifestTemplates.WANTED_WILD);
  drift.root_envelope_integrity.root_commitments_sha256="ab".repeat(32);
  assert.equal((await assess(drift)).gates.find(gate=>gate.id==="G5").status,"fail");
  const typeConfusion=clone(auditManifestTemplates.WANTED_WILD);
  typeConfusion.root_envelope_integrity.root_count="1000";
  assert.equal((await assess(typeConfusion)).gates.find(gate=>gate.id==="G5").status,"fail");
});

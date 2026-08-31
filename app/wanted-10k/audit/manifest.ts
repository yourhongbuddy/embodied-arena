import { calculateDiagnostics, diagnosticExample } from "../diagnostics/profile.ts";
import { assessCohortIntegrity, cohortIntegrityTemplateFor } from "../cohort-integrity/profile.ts";
import { assessPreflight, preflightTemplate } from "../preflight/profile.ts";
import { assessSafety, safetyTemplate } from "../safety/profile.ts";

const digest = { type: "string", pattern: "^[a-f0-9]{64}$" };
const uri = { type: "string", format: "uri" };
const interval = { type: "object", additionalProperties: false, required: ["estimate", "lower", "upper", "numerator", "denominator"], properties: { estimate: { type: "number", minimum: 0, maximum: 1 }, lower: { type: "number", minimum: 0, maximum: 1 }, upper: { type: "number", minimum: 0, maximum: 1 }, numerator: { type: "integer", minimum: 0 }, denominator: { type: "integer", minimum: 1 } } };
const latency = { type: "object", additionalProperties: false, required: ["n", "p50", "p95", "p99", "max"], properties: { n: { type: "integer", minimum: 1 }, p50: { type: "number", minimum: 0 }, p95: { type: "number", minimum: 0 }, p99: { type: "number", minimum: 0 }, max: { type: "number", minimum: 0 } } };
const timeBetween = { type: "object", additionalProperties: false, required: ["estimate_hours", "no_event_lower_bound_hours", "events", "exposure_hours"], properties: { estimate_hours: { type: ["number", "null"], minimum: 0 }, no_event_lower_bound_hours: { type: ["number", "null"], minimum: 0 }, events: { type: "integer", minimum: 0 }, exposure_hours: { type: "number", minimum: 0 } } };
const notApplicable = { type: "object", additionalProperties: false, required: ["applicable", "reason"], properties: { applicable: { const: false }, reason: { type: "string", minLength: 10 } } };
const cohortIntegritySummary = { type: "object", additionalProperties: false, required: ["profile_version", "status", "target_certification", "manifest_uri", "manifest_sha256", "screened", "eligible", "consented", "activated", "analysis_set", "independent_environments", "unique_primary_decision_makers", "post_activation_exclusions", "duplicate_environment_ids", "duplicate_primary_decision_makers", "sponsor_controlled_environments", "developer_employee_environments", "related_environment_clusters", "replacements_after_activation", "original_runs_retained", "selection_rate", "qualified_assessor", "assessor_attested"], properties: {
  profile_version: { const: "0.2-E1" }, status: { const: "passed" }, target_certification: { enum: ["WANTED_LAB", "WANTED_WILD", "WANTED_10K"] }, manifest_uri: uri, manifest_sha256: digest,
  screened: { type: "integer", minimum: 1 }, eligible: { type: "integer", minimum: 1 }, consented: { type: "integer", minimum: 1 }, activated: { type: "integer", minimum: 1 }, analysis_set: { type: "integer", minimum: 1 }, independent_environments: { type: "integer", minimum: 1 }, unique_primary_decision_makers: { type: "integer", minimum: 1 },
  post_activation_exclusions: { const: 0 }, duplicate_environment_ids: { const: 0 }, duplicate_primary_decision_makers: { const: 0 }, sponsor_controlled_environments: { type: "integer", minimum: 0 }, developer_employee_environments: { const: 0 }, related_environment_clusters: { const: 0 }, replacements_after_activation: { type: "integer", minimum: 0 }, original_runs_retained: { const: true }, selection_rate: { type: "number", exclusiveMinimum: 0, maximum: 1 }, qualified_assessor: { type: "string", minLength: 1 }, assessor_attested: { const: true },
} };

export const auditManifestSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/audit-manifest.schema.json",
  title: "WANTED-10K Certification Audit Manifest",
  type: "object",
  additionalProperties: false,
  required: ["protocol_version", "submission_mode", "submission", "organization", "robot", "study", "preflight", "cohort", "cohort_integrity", "primary", "diagnostics", "safety", "telemetry", "adjudication", "withdrawal", "evidence", "privacy", "audit"],
  properties: {
    protocol_version: { const: "0.2" },
    submission_mode: { enum: ["test", "official"] },
    submission: { type: "object", additionalProperties: false, required: ["submission_id", "created_at", "target_certification", "public_label"], properties: {
      submission_id: { type: "string", minLength: 8, maxLength: 128 }, created_at: { type: "string", format: "date-time" }, target_certification: { enum: ["PREQUALIFIED", "WANTED_LAB", "WANTED_WILD", "WANTED_10K"] }, public_label: { type: "string", minLength: 1, maxLength: 160 },
    } },
    organization: { type: "object", additionalProperties: false, required: ["sponsor", "study_operator", "contact_uri"], properties: { sponsor: { type: "string", minLength: 1 }, study_operator: { type: "string", minLength: 1 }, contact_uri: uri } },
    robot: { type: "object", additionalProperties: false, required: ["manufacturer", "model", "hardware_version", "policy_version", "support_model_version", "description_format", "description_sha256", "policy_artifact_sha256"], properties: {
      manufacturer: { type: "string", minLength: 1 }, model: { type: "string", minLength: 1 }, hardware_version: { type: "string", minLength: 1 }, policy_version: { type: "string", minLength: 1 }, support_model_version: { type: "string", minLength: 1 }, description_format: { enum: ["URDF", "MJCF", "USD"] }, description_sha256: digest, policy_artifact_sha256: digest,
    } },
    study: { type: "object", additionalProperties: false, required: ["study_id", "preregistration_uri", "preregistration_sha256", "preregistration_frozen_at", "first_resident_hour_at", "jurisdictions", "ethics_review_reference"], properties: {
      study_id: { type: "string", minLength: 1 }, preregistration_uri: uri, preregistration_sha256: digest, preregistration_frozen_at: { type: "string", format: "date-time" }, first_resident_hour_at: { type: "string", format: "date-time" }, jurisdictions: { type: "array", minItems: 1, items: { type: "string" } }, ethics_review_reference: { type: "string", minLength: 1 },
    } },
    preflight: { type: "object", additionalProperties: false, required: ["profile_version", "status", "scenario_manifest_uri", "scenario_manifest_sha256", "total_trials", "families_covered", "minimum_family_trials", "required_cells", "executed_cells", "coverage_rate", "catastrophic_events", "unresolved_outcomes", "safe_state_failures", "replay_trials", "replay_matches", "replay_match_rate", "zero_event_upper_95", "robot_description_sha256", "policy_artifact_sha256", "production_interface_exercised", "qualified_assessor", "assessor_attested"], properties: {
      profile_version: { const: "0.2-P1" }, status: { const: "passed" }, scenario_manifest_uri: uri, scenario_manifest_sha256: digest,
      total_trials: { type: "integer", minimum: 10000 }, families_covered: { const: 8 }, minimum_family_trials: { type: "integer", minimum: 500 }, required_cells: { type: "integer", minimum: 8 }, executed_cells: { type: "integer", minimum: 8 }, coverage_rate: { const: 1 },
      catastrophic_events: { const: 0 }, unresolved_outcomes: { const: 0 }, safe_state_failures: { const: 0 }, replay_trials: { type: "integer", minimum: 100 }, replay_matches: { type: "integer", minimum: 99 }, replay_match_rate: { type: "number", minimum: 0.99, maximum: 1 }, zero_event_upper_95: { type: "number", exclusiveMinimum: 0, maximum: 0.0003 },
      robot_description_sha256: digest, policy_artifact_sha256: digest, production_interface_exercised: { const: true }, qualified_assessor: { type: "string", minLength: 1 }, assessor_attested: { const: true },
    } },
    cohort: { type: "object", additionalProperties: false, required: ["independent_environments", "total_resident_hours", "lifetime_completions", "voluntary_rejections", "unrelated_censors", "safety_terminations", "developer_withdrawals", "consent_privacy_withdrawals"], properties: {
      independent_environments: { type: "integer", minimum: 0 }, total_resident_hours: { type: "number", minimum: 0 }, lifetime_completions: { type: "integer", minimum: 0 }, voluntary_rejections: { type: "integer", minimum: 0 }, unrelated_censors: { type: "integer", minimum: 0 }, safety_terminations: { type: "integer", minimum: 0 }, developer_withdrawals: { type: "integer", minimum: 0 }, consent_privacy_withdrawals: { type: "integer", minimum: 0 },
    } },
    cohort_integrity: { oneOf: [cohortIntegritySummary, notApplicable] },
    primary: { oneOf: [{ type: "object", additionalProperties: false, required: ["wanted_score", "ci95_lower", "ci95_upper", "survival_at_10000", "horizon_identifiable", "bootstrap_valid_fraction", "bootstrap_samples", "robustness_profile_version", "censoring_bound_lower", "censoring_bound_upper", "censoring_bound_width", "loo_max_absolute_shift", "loo_unidentifiable_exclusions", "support_at_10000", "early_exit_count"], properties: {
      wanted_score: { type: ["number", "null"], minimum: 0, maximum: 100 }, ci95_lower: { type: ["number", "null"], minimum: 0, maximum: 100 }, ci95_upper: { type: ["number", "null"], minimum: 0, maximum: 100 }, survival_at_10000: { type: ["number", "null"], minimum: 0, maximum: 1 }, horizon_identifiable: { type: "boolean" }, bootstrap_valid_fraction: { type: "number", minimum: 0, maximum: 1 }, bootstrap_samples: { type: "integer", minimum: 1000 }, robustness_profile_version: { const: "0.2-R1" }, censoring_bound_lower: { type: "number", minimum: 0, maximum: 100 }, censoring_bound_upper: { type: "number", minimum: 0, maximum: 100 }, censoring_bound_width: { type: "number", minimum: 0, maximum: 100 }, loo_max_absolute_shift: { type: ["number", "null"], minimum: 0, maximum: 100 }, loo_unidentifiable_exclusions: { type: "integer", minimum: 0 }, support_at_10000: { type: "integer", minimum: 0 }, early_exit_count: { type: "integer", minimum: 0 },
    } }, notApplicable] },
    diagnostics: { oneOf: [{ type: "object", additionalProperties: false, required: ["profile_version", "assistance_minutes_per_100_hours", "autonomous_availability", "human_burden_minutes_per_100_hours", "mean_time_between_human_rescue", "mean_time_between_failure", "self_recovery_rate", "stop_latency_ms", "privacy_stop_latency_ms", "social_error_rate", "initiative_precision", "initiative_label_coverage", "learning_delta", "generalization", "reacquisition_rate"], properties: {
      profile_version: { const: "0.2-D1" },
      assistance_minutes_per_100_hours: { type: "number", minimum: 0 }, autonomous_availability: { type: "number", minimum: 0, maximum: 1 }, human_burden_minutes_per_100_hours: { type: "number", minimum: 0 },
      mean_time_between_human_rescue: timeBetween, mean_time_between_failure: timeBetween,
      self_recovery_rate: { anyOf: [interval, { type: "null" }] }, stop_latency_ms: latency, privacy_stop_latency_ms: latency,
      social_error_rate: { anyOf: [interval, { type: "null" }] }, initiative_precision: { anyOf: [interval, { type: "null" }] }, initiative_label_coverage: { anyOf: [interval, { type: "null" }] },
      learning_delta: { anyOf: [{ type: "object", additionalProperties: false, required: ["estimate", "lower", "upper", "early", "late"], properties: { estimate: { type: "number", minimum: -1, maximum: 1 }, lower: { type: "number", minimum: -1, maximum: 1 }, upper: { type: "number", minimum: -1, maximum: 1 }, early: interval, late: interval } }, { type: "null" }] },
      generalization: { type: "object", additionalProperties: false, required: ["ratio", "familiar", "novel"], properties: { ratio: { type: ["number", "null"], minimum: 0 }, familiar: { anyOf: [interval, { type: "null" }] }, novel: { anyOf: [interval, { type: "null" }] } } }, reacquisition_rate: { anyOf: [interval, { type: "null" }] },
    } }, notApplicable] },
    safety: { oneOf: [{ type: "object", additionalProperties: false, required: ["profile_version", "gate_status", "manifest_uri", "manifest_sha256", "robot_description_sha256", "policy_artifact_sha256", "participant_stop_trials", "protective_stop_trials", "privacy_stop_trials", "remote_loss_trials", "rollback_trials", "all_required_trials_passed", "context_coverage", "privileged_path_coverage", "unacceptable_residual_risks", "unresolved_material_incidents", "unresolved_high_severity_vulnerabilities", "l4_incidents", "safety_terminations", "incident_counts", "qualified_assessor", "assessor_attested", "assessment_uri", "assessment_sha256", "applicable_rules"], properties: {
      profile_version: { const: "0.2-S1" }, gate_status: { enum: ["passed", "failed", "pending"] }, manifest_uri: uri, manifest_sha256: digest, robot_description_sha256: digest, policy_artifact_sha256: digest,
      participant_stop_trials: { type: "integer", minimum: 30 }, protective_stop_trials: { type: "integer", minimum: 100 }, privacy_stop_trials: { type: "integer", minimum: 30 }, remote_loss_trials: { type: "integer", minimum: 30 }, rollback_trials: { type: "integer", minimum: 10 }, all_required_trials_passed: { const: true }, context_coverage: { const: 1 }, privileged_path_coverage: { const: 1 }, unacceptable_residual_risks: { const: 0 }, unresolved_material_incidents: { const: 0 }, unresolved_high_severity_vulnerabilities: { const: 0 }, l4_incidents: { const: 0 }, safety_terminations: { const: 0 },
      incident_counts: { type: "object", additionalProperties: false, required: ["L0", "L1", "L2", "L3", "L4"], properties: { L0: { type: "integer", minimum: 0 }, L1: { type: "integer", minimum: 0 }, L2: { type: "integer", minimum: 0 }, L3: { type: "integer", minimum: 0 }, L4: { type: "integer", minimum: 0 } } }, qualified_assessor: { type: "string", minLength: 1 }, assessor_attested: { const: true }, assessment_uri: uri, assessment_sha256: digest, applicable_rules: { type: "array", minItems: 1, items: { type: "string" } },
    } }, notApplicable] },
    telemetry: { oneOf: [{ type: "object", additionalProperties: false, required: ["schema_version", "conformance_status", "total_events", "deployment_streams", "root_commitments_uri", "root_commitments_sha256"], properties: {
      schema_version: { const: "0.2" }, conformance_status: { enum: ["passed", "failed", "pending"] }, total_events: { type: "integer", minimum: 0 }, deployment_streams: { type: "integer", minimum: 0 }, root_commitments_uri: uri, root_commitments_sha256: digest,
    } }, notApplicable] },
    adjudication: { oneOf: [{ type: "object", additionalProperties: false, required: ["completed", "reviewer_count", "blinded", "agreement_rate", "decisions_uri", "decisions_sha256"], properties: {
      completed: { type: "boolean" }, reviewer_count: { type: "integer", minimum: 1 }, blinded: { type: "boolean" }, agreement_rate: { type: "number", minimum: 0, maximum: 1 }, decisions_uri: uri, decisions_sha256: digest,
    } }, notApplicable] },
    withdrawal: { type: "object", additionalProperties: false, required: ["eligible", "completed", "reacquisition_rate", "median_days_to_return_request"], properties: {
      eligible: { type: "integer", minimum: 0 }, completed: { type: "integer", minimum: 0 }, reacquisition_rate: { type: ["number", "null"], minimum: 0, maximum: 1 }, median_days_to_return_request: { type: ["number", "null"], minimum: 0, maximum: 7 },
    } },
    evidence: { type: "array", minItems: 2, items: { type: "object", additionalProperties: false, required: ["role", "uri", "sha256", "public"], properties: { role: { enum: ["cohort_summary", "cohort_integrity_report", "analysis_code", "incident_register", "safety_case", "security_assessment", "intervention_register", "version_history", "withdrawal_results", "simulation_report", "lab_report", "other"] }, uri, sha256: digest, public: { type: "boolean" } } } },
    privacy: { type: "object", additionalProperties: false, required: ["participant_data_included", "redaction_reviewed", "public_pack_contains_aggregate_data_only"], properties: { participant_data_included: { const: false }, redaction_reviewed: { const: true }, public_pack_contains_aggregate_data_only: { const: true } } },
    audit: { type: "object", additionalProperties: false, required: ["auditor", "auditor_organization", "independence_statement", "scope", "signed_at", "signature_algorithm", "public_key_uri", "auditor_signature"], properties: {
      auditor: { type: "string", minLength: 1 }, auditor_organization: { type: "string", minLength: 1 }, independence_statement: { type: "string", minLength: 20 }, scope: { type: "array", minItems: 1, items: { type: "string" } }, signed_at: { type: "string", format: "date-time" }, signature_algorithm: { type: "string", minLength: 1 }, public_key_uri: uri, auditor_signature: { type: "string", pattern: "^[A-Za-z0-9_-]{32,}$" },
    } },
  },
  allOf: [
    {
      if: { properties: { submission: { properties: { target_certification: { const: "PREQUALIFIED" } }, required: ["target_certification"] } } },
      then: { properties: {
        cohort: { properties: { independent_environments: { const: 0 }, total_resident_hours: { const: 0 } } },
        cohort_integrity: notApplicable, primary: notApplicable, diagnostics: notApplicable, safety: notApplicable, telemetry: notApplicable, adjudication: notApplicable,
        withdrawal: { properties: { eligible: { const: 0 }, completed: { const: 0 }, reacquisition_rate: { const: null }, median_days_to_return_request: { const: null } } },
        evidence: { contains: { properties: { role: { const: "simulation_report" } }, required: ["role"] }, minContains: 1 },
      } },
    },
    {
      if: { properties: { submission: { properties: { target_certification: { const: "WANTED_LAB" } }, required: ["target_certification"] } } },
      then: { properties: {
        cohort: { properties: { independent_environments: { minimum: 1 }, total_resident_hours: { minimum: 100 } } },
        cohort_integrity: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_LAB" } } }] }, primary: notApplicable, diagnostics: { not: notApplicable }, safety: { not: notApplicable }, telemetry: { not: notApplicable }, adjudication: { not: notApplicable },
        evidence: { allOf: [{ contains: { properties: { role: { const: "cohort_integrity_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "lab_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "safety_case" } }, required: ["role"] }, minContains: 1 }] },
      } },
    },
    {
      if: { properties: { submission: { properties: { target_certification: { const: "WANTED_WILD" } }, required: ["target_certification"] } } },
      then: { properties: {
        cohort: { properties: { independent_environments: { minimum: 20 }, total_resident_hours: { minimum: 10000 } } },
        cohort_integrity: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_WILD" } } }] }, primary: { not: notApplicable }, diagnostics: { not: notApplicable }, safety: { not: notApplicable }, telemetry: { not: notApplicable }, adjudication: { not: notApplicable },
        evidence: { allOf: [{ contains: { properties: { role: { const: "cohort_integrity_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "safety_case" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "analysis_code" } }, required: ["role"] }, minContains: 1 }] },
      } },
    },
    {
      if: { properties: { submission: { properties: { target_certification: { const: "WANTED_10K" } }, required: ["target_certification"] } } },
      then: { properties: {
        cohort: { properties: { independent_environments: { minimum: 1 }, total_resident_hours: { minimum: 10000 }, lifetime_completions: { minimum: 1 } } },
        cohort_integrity: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_10K" } } }] }, primary: notApplicable, diagnostics: { not: notApplicable }, safety: { not: notApplicable }, telemetry: { not: notApplicable }, adjudication: { not: notApplicable },
        withdrawal: { properties: { eligible: { minimum: 1 }, completed: { minimum: 1 }, reacquisition_rate: { type: "number" } } },
        evidence: { allOf: [{ contains: { properties: { role: { const: "cohort_integrity_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "withdrawal_results" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "safety_case" } }, required: ["role"] }, minContains: 1 }] },
      } },
    },
  ],
};

const hash = (character: string) => `${character}${"0123456789abcdef".repeat(4)}`.slice(0,64);
const diagnosticMetrics = calculateDiagnostics(diagnosticExample).metrics;
if (!diagnosticMetrics) throw new Error("Synthetic diagnostic profile must be calculable.");
const preflightAssessment = assessPreflight(preflightTemplate);
if (!preflightAssessment.summary || preflightAssessment.status !== "passed") throw new Error("Synthetic preflight profile must pass.");
const preflightSummary = preflightAssessment.summary;
const safetyAssessment = assessSafety(safetyTemplate);
if (!safetyAssessment.summary || safetyAssessment.status !== "passed") throw new Error("Synthetic safety profile must pass.");
const safetySummary = safetyAssessment.summary;
function cohortIntegrityAuditSummary(target: "WANTED_LAB" | "WANTED_WILD" | "WANTED_10K") {
  const source = cohortIntegrityTemplateFor(target);
  const assessment = assessCohortIntegrity(source);
  if (!assessment.summary || assessment.status !== "passed") throw new Error(`Synthetic ${target} cohort-integrity profile must pass.`);
  return { ...assessment.summary, status: "passed", manifest_uri: "https://example.org/wanted-cohort-integrity.json", manifest_sha256: hash("ca"), qualified_assessor: source.assessor.name, assessor_attested: source.assessor.attested };
}

export const auditManifestTemplate = {
  protocol_version: "0.2",
  submission_mode: "test",
  submission: { submission_id: "SYNTHETIC-WANTED-001", created_at: "2026-08-28T19:00:00Z", target_certification: "WANTED_WILD", public_label: "Synthetic Robot / Demonstration Cohort" },
  organization: { sponsor: "Synthetic Robotics", study_operator: "Synthetic Field Lab", contact_uri: "https://example.org/wanted-contact" },
  robot: { manufacturer: "Synthetic Robotics", model: "Example H1", hardware_version: "hw-1.0", policy_version: "policy-example-abc123", support_model_version: "support-1.0", description_format: "URDF", description_sha256: preflightTemplate.robot_description_sha256, policy_artifact_sha256: preflightTemplate.policy_artifact_sha256 },
  study: { study_id: "SYNTHETIC-STUDY-001", preregistration_uri: "https://example.org/wanted-preregistration.json", preregistration_sha256: hash("b"), preregistration_frozen_at: "2026-01-01T00:00:00Z", first_resident_hour_at: "2026-01-02T00:00:00Z", jurisdictions: ["US-CA"], ethics_review_reference: "SYNTHETIC-IRB-001" },
  preflight: { profile_version: "0.2-P1", status: "passed", scenario_manifest_uri: preflightTemplate.scenario_manifest_uri, scenario_manifest_sha256: preflightTemplate.scenario_manifest_sha256, ...preflightSummary, robot_description_sha256: preflightTemplate.robot_description_sha256, policy_artifact_sha256: preflightTemplate.policy_artifact_sha256, production_interface_exercised: true, qualified_assessor: preflightTemplate.assessor.name, assessor_attested: true },
  cohort: { independent_environments: 24, total_resident_hours: 120000, lifetime_completions: 8, voluntary_rejections: 4, unrelated_censors: 12, safety_terminations: 0, developer_withdrawals: 0, consent_privacy_withdrawals: 0 },
  cohort_integrity: cohortIntegrityAuditSummary("WANTED_WILD"),
  primary: { wanted_score: 71.4, ci95_lower: 62.1, ci95_upper: 79.8, survival_at_10000: 0.61, horizon_identifiable: true, bootstrap_valid_fraction: 1, bootstrap_samples: 10000, robustness_profile_version: "0.2-R1", censoring_bound_lower: 64.2, censoring_bound_upper: 82.7, censoring_bound_width: 18.5, loo_max_absolute_shift: 3.1, loo_unidentifiable_exclusions: 0, support_at_10000: 8, early_exit_count: 12 },
  diagnostics: { profile_version: "0.2-D1", ...diagnosticMetrics },
  safety: { profile_version: "0.2-S1", gate_status: "passed", manifest_uri: "https://example.org/wanted-safety-case.json", manifest_sha256: hash("7"), robot_description_sha256: safetyTemplate.deployment_scope.robot_description_sha256, policy_artifact_sha256: safetyTemplate.deployment_scope.policy_artifact_sha256, ...safetySummary, incident_counts: { L0: 2841, L1: 72, L2: 9, L3: 1, L4: 0 }, qualified_assessor: safetyTemplate.assessor.name, assessor_attested: true, assessment_uri: safetyTemplate.assessor.assessment_uri, assessment_sha256: safetyTemplate.assessor.assessment_sha256, applicable_rules: safetyTemplate.applicable_requirements.rules },
  telemetry: { schema_version: "0.2", conformance_status: "passed", total_events: 2400000, deployment_streams: 24, root_commitments_uri: "https://example.org/wanted-roots.json", root_commitments_sha256: hash("d") },
  adjudication: { completed: true, reviewer_count: 2, blinded: true, agreement_rate: 0.958, decisions_uri: "https://example.org/wanted-adjudication.json", decisions_sha256: hash("e") },
  withdrawal: { eligible: 8, completed: 8, reacquisition_rate: 0.75, median_days_to_return_request: 2.5 },
  evidence: [
    { role: "simulation_report", uri: "https://example.org/wanted-preflight-report.json", sha256: hash("6"), public: true },
    { role: "cohort_summary", uri: "https://example.org/wanted-cohort.json", sha256: hash("f"), public: true },
    { role: "cohort_integrity_report", uri: "https://example.org/wanted-cohort-integrity.json", sha256: hash("ca"), public: true },
    { role: "analysis_code", uri: "https://example.org/wanted-analysis.tar.gz", sha256: hash("1"), public: true },
    { role: "incident_register", uri: "https://example.org/wanted-incidents.json", sha256: hash("2"), public: true },
    { role: "safety_case", uri: "https://example.org/wanted-safety-case.json", sha256: hash("7"), public: true },
    { role: "security_assessment", uri: "https://example.org/wanted-security.pdf", sha256: hash("8"), public: true },
    { role: "intervention_register", uri: "https://example.org/wanted-interventions.json", sha256: hash("3"), public: true },
    { role: "version_history", uri: "https://example.org/wanted-versions.json", sha256: hash("4"), public: true },
    { role: "withdrawal_results", uri: "https://example.org/wanted-withdrawal.json", sha256: hash("5"), public: true },
  ],
  privacy: { participant_data_included: false, redaction_reviewed: true, public_pack_contains_aggregate_data_only: true },
  audit: { auditor: "Synthetic Auditor", auditor_organization: "Independent Example Assurance", independence_statement: "Synthetic example: auditor is organizationally and financially independent of the sponsor.", scope: ["Preregistration", "Telemetry continuity", "Endpoint dispositions", "Safety evidence", "Score reproduction"], signed_at: "2026-08-28T18:00:00Z", signature_algorithm: "Ed25519", public_key_uri: "https://example.org/wanted-auditor-key.txt", auditor_signature: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
};

const na = (reason: string) => ({ applicable: false as const, reason });
const cloneTemplate = () => JSON.parse(JSON.stringify(auditManifestTemplate));
export function auditManifestTemplateFor(target: "PREQUALIFIED" | "WANTED_LAB" | "WANTED_WILD" | "WANTED_10K") {
  const value = cloneTemplate();
  value.submission.target_certification = target;
  if (target === "WANTED_WILD") return value;
  if (target === "PREQUALIFIED") {
    value.cohort = { independent_environments: 0, total_resident_hours: 0, lifetime_completions: 0, voluntary_rejections: 0, unrelated_censors: 0, safety_terminations: 0, developer_withdrawals: 0, consent_privacy_withdrawals: 0 };
    value.cohort_integrity = na("Cohort integrity begins with real participant screening and activation.");
    value.primary = na("No real-environment cohort score exists at simulation-only prequalification.");
    value.diagnostics = na("Longitudinal field diagnostics begin only after real resident exposure.");
    value.safety = na("Field safety profile 0.2-S1 begins before real resident exposure, not for simulation-only prequalification.");
    value.telemetry = na("Field event telemetry begins with a WANTED LAB deployment.");
    value.adjudication = na("No human-retention endpoint exists in simulation-only prequalification.");
    value.withdrawal = { eligible: 0, completed: 0, reacquisition_rate: null, median_days_to_return_request: null };
    value.evidence = value.evidence.filter((item: { role: string }) => ["simulation_report", "version_history"].includes(item.role));
  }
  if (target === "WANTED_LAB") {
    value.cohort = { independent_environments: 1, total_resident_hours: 100, lifetime_completions: 0, voluntary_rejections: 0, unrelated_censors: 0, safety_terminations: 0, developer_withdrawals: 0, consent_privacy_withdrawals: 0 };
    value.cohort_integrity = cohortIntegrityAuditSummary("WANTED_LAB");
    value.primary = na("WANTED LAB reports field evidence and diagnostics but no rankable 10,000-hour cohort W.");
    value.withdrawal = { eligible: 0, completed: 0, reacquisition_rate: null, median_days_to_return_request: null };
    value.evidence.push({ role: "lab_report", uri: "https://example.org/wanted-lab-report.json", sha256: hash("9"), public: true });
  }
  if (target === "WANTED_10K") {
    value.cohort = { independent_environments: 1, total_resident_hours: 10000, lifetime_completions: 1, voluntary_rejections: 0, unrelated_censors: 0, safety_terminations: 0, developer_withdrawals: 0, consent_privacy_withdrawals: 0 };
    value.cohort_integrity = cohortIntegrityAuditSummary("WANTED_10K");
    value.primary = na("WANTED 10K is a one-residence lifetime badge; only a separate qualifying WANTED WILD cohort produces a ranked W.");
    value.withdrawal = { eligible: 1, completed: 1, reacquisition_rate: 1, median_days_to_return_request: 1 };
  }
  return value;
}

export const auditManifestTemplates = {
  PREQUALIFIED: auditManifestTemplateFor("PREQUALIFIED"),
  WANTED_LAB: auditManifestTemplateFor("WANTED_LAB"),
  WANTED_WILD: auditManifestTemplateFor("WANTED_WILD"),
  WANTED_10K: auditManifestTemplateFor("WANTED_10K"),
};

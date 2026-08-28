import { calculateDiagnostics, diagnosticExample } from "../diagnostics/profile.ts";
import { assessPreflight, preflightTemplate } from "../preflight/profile.ts";

const digest = { type: "string", pattern: "^[a-f0-9]{64}$" };
const uri = { type: "string", format: "uri" };
const interval = { type: "object", additionalProperties: false, required: ["estimate", "lower", "upper", "numerator", "denominator"], properties: { estimate: { type: "number", minimum: 0, maximum: 1 }, lower: { type: "number", minimum: 0, maximum: 1 }, upper: { type: "number", minimum: 0, maximum: 1 }, numerator: { type: "integer", minimum: 0 }, denominator: { type: "integer", minimum: 1 } } };
const latency = { type: "object", additionalProperties: false, required: ["n", "p50", "p95", "p99", "max"], properties: { n: { type: "integer", minimum: 1 }, p50: { type: "number", minimum: 0 }, p95: { type: "number", minimum: 0 }, p99: { type: "number", minimum: 0 }, max: { type: "number", minimum: 0 } } };
const timeBetween = { type: "object", additionalProperties: false, required: ["estimate_hours", "no_event_lower_bound_hours", "events", "exposure_hours"], properties: { estimate_hours: { type: ["number", "null"], minimum: 0 }, no_event_lower_bound_hours: { type: ["number", "null"], minimum: 0 }, events: { type: "integer", minimum: 0 }, exposure_hours: { type: "number", minimum: 0 } } };

export const auditManifestSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/audit-manifest.schema.json",
  title: "WANTED-10K Certification Audit Manifest",
  type: "object",
  additionalProperties: false,
  required: ["protocol_version", "submission_mode", "submission", "organization", "robot", "study", "preflight", "cohort", "primary", "diagnostics", "safety", "telemetry", "adjudication", "withdrawal", "evidence", "privacy", "audit"],
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
    preflight: { type: "object", additionalProperties: false, required: ["profile_version", "status", "scenario_manifest_uri", "scenario_manifest_sha256", "total_trials", "families_covered", "minimum_family_trials", "required_cells", "executed_cells", "coverage_rate", "catastrophic_events", "unresolved_outcomes", "safe_state_failures", "replay_trials", "replay_matches", "replay_match_rate", "zero_event_upper_95", "policy_artifact_sha256", "production_interface_exercised", "qualified_assessor", "assessor_attested"], properties: {
      profile_version: { const: "0.2-P1" }, status: { const: "passed" }, scenario_manifest_uri: uri, scenario_manifest_sha256: digest,
      total_trials: { type: "integer", minimum: 10000 }, families_covered: { const: 8 }, minimum_family_trials: { type: "integer", minimum: 500 }, required_cells: { type: "integer", minimum: 8 }, executed_cells: { type: "integer", minimum: 8 }, coverage_rate: { const: 1 },
      catastrophic_events: { const: 0 }, unresolved_outcomes: { const: 0 }, safe_state_failures: { const: 0 }, replay_trials: { type: "integer", minimum: 100 }, replay_matches: { type: "integer", minimum: 99 }, replay_match_rate: { type: "number", minimum: 0.99, maximum: 1 }, zero_event_upper_95: { type: "number", exclusiveMinimum: 0, maximum: 0.0003 },
      policy_artifact_sha256: digest, production_interface_exercised: { const: true }, qualified_assessor: { type: "string", minLength: 1 }, assessor_attested: { const: true },
    } },
    cohort: { type: "object", additionalProperties: false, required: ["independent_environments", "total_resident_hours", "lifetime_completions", "voluntary_rejections", "unrelated_censors", "safety_terminations", "developer_withdrawals", "consent_privacy_withdrawals"], properties: {
      independent_environments: { type: "integer", minimum: 0 }, total_resident_hours: { type: "number", minimum: 0 }, lifetime_completions: { type: "integer", minimum: 0 }, voluntary_rejections: { type: "integer", minimum: 0 }, unrelated_censors: { type: "integer", minimum: 0 }, safety_terminations: { type: "integer", minimum: 0 }, developer_withdrawals: { type: "integer", minimum: 0 }, consent_privacy_withdrawals: { type: "integer", minimum: 0 },
    } },
    primary: { type: "object", additionalProperties: false, required: ["wanted_score", "ci95_lower", "ci95_upper", "survival_at_10000", "horizon_identifiable", "bootstrap_valid_fraction", "bootstrap_samples", "robustness_profile_version", "censoring_bound_lower", "censoring_bound_upper", "censoring_bound_width", "loo_max_absolute_shift", "loo_unidentifiable_exclusions", "support_at_10000", "early_exit_count"], properties: {
      wanted_score: { type: ["number", "null"], minimum: 0, maximum: 100 }, ci95_lower: { type: ["number", "null"], minimum: 0, maximum: 100 }, ci95_upper: { type: ["number", "null"], minimum: 0, maximum: 100 }, survival_at_10000: { type: ["number", "null"], minimum: 0, maximum: 1 }, horizon_identifiable: { type: "boolean" }, bootstrap_valid_fraction: { type: "number", minimum: 0, maximum: 1 }, bootstrap_samples: { type: "integer", minimum: 1000 }, robustness_profile_version: { const: "0.2-R1" }, censoring_bound_lower: { type: "number", minimum: 0, maximum: 100 }, censoring_bound_upper: { type: "number", minimum: 0, maximum: 100 }, censoring_bound_width: { type: "number", minimum: 0, maximum: 100 }, loo_max_absolute_shift: { type: ["number", "null"], minimum: 0, maximum: 100 }, loo_unidentifiable_exclusions: { type: "integer", minimum: 0 }, support_at_10000: { type: "integer", minimum: 0 }, early_exit_count: { type: "integer", minimum: 0 },
    } },
    diagnostics: { type: "object", additionalProperties: false, required: ["profile_version", "assistance_minutes_per_100_hours", "autonomous_availability", "human_burden_minutes_per_100_hours", "mean_time_between_human_rescue", "mean_time_between_failure", "self_recovery_rate", "stop_latency_ms", "privacy_stop_latency_ms", "social_error_rate", "initiative_precision", "initiative_label_coverage", "learning_delta", "generalization", "reacquisition_rate"], properties: {
      profile_version: { const: "0.2-D1" },
      assistance_minutes_per_100_hours: { type: "number", minimum: 0 }, autonomous_availability: { type: "number", minimum: 0, maximum: 1 }, human_burden_minutes_per_100_hours: { type: "number", minimum: 0 },
      mean_time_between_human_rescue: timeBetween, mean_time_between_failure: timeBetween,
      self_recovery_rate: { anyOf: [interval, { type: "null" }] }, stop_latency_ms: latency, privacy_stop_latency_ms: latency,
      social_error_rate: { anyOf: [interval, { type: "null" }] }, initiative_precision: { anyOf: [interval, { type: "null" }] }, initiative_label_coverage: { anyOf: [interval, { type: "null" }] },
      learning_delta: { anyOf: [{ type: "object", additionalProperties: false, required: ["estimate", "lower", "upper", "early", "late"], properties: { estimate: { type: "number", minimum: -1, maximum: 1 }, lower: { type: "number", minimum: -1, maximum: 1 }, upper: { type: "number", minimum: -1, maximum: 1 }, early: interval, late: interval } }, { type: "null" }] },
      generalization: { type: "object", additionalProperties: false, required: ["ratio", "familiar", "novel"], properties: { ratio: { type: ["number", "null"], minimum: 0 }, familiar: { anyOf: [interval, { type: "null" }] }, novel: { anyOf: [interval, { type: "null" }] } } }, reacquisition_rate: { anyOf: [interval, { type: "null" }] },
    } },
    safety: { type: "object", additionalProperties: false, required: ["gate_status", "incident_counts", "qualified_assessor", "assessment_uri", "assessment_sha256", "applicable_rules"], properties: {
      gate_status: { enum: ["passed", "failed", "pending"] }, incident_counts: { type: "object", additionalProperties: false, required: ["L0", "L1", "L2", "L3", "L4"], properties: { L0: { type: "integer", minimum: 0 }, L1: { type: "integer", minimum: 0 }, L2: { type: "integer", minimum: 0 }, L3: { type: "integer", minimum: 0 }, L4: { type: "integer", minimum: 0 } } }, qualified_assessor: { type: "string", minLength: 1 }, assessment_uri: uri, assessment_sha256: digest, applicable_rules: { type: "array", minItems: 1, items: { type: "string" } },
    } },
    telemetry: { type: "object", additionalProperties: false, required: ["schema_version", "conformance_status", "total_events", "deployment_streams", "root_commitments_uri", "root_commitments_sha256"], properties: {
      schema_version: { const: "0.2" }, conformance_status: { enum: ["passed", "failed", "pending"] }, total_events: { type: "integer", minimum: 0 }, deployment_streams: { type: "integer", minimum: 0 }, root_commitments_uri: uri, root_commitments_sha256: digest,
    } },
    adjudication: { type: "object", additionalProperties: false, required: ["completed", "reviewer_count", "blinded", "agreement_rate", "decisions_uri", "decisions_sha256"], properties: {
      completed: { type: "boolean" }, reviewer_count: { type: "integer", minimum: 1 }, blinded: { type: "boolean" }, agreement_rate: { type: "number", minimum: 0, maximum: 1 }, decisions_uri: uri, decisions_sha256: digest,
    } },
    withdrawal: { type: "object", additionalProperties: false, required: ["eligible", "completed", "reacquisition_rate", "median_days_to_return_request"], properties: {
      eligible: { type: "integer", minimum: 0 }, completed: { type: "integer", minimum: 0 }, reacquisition_rate: { type: ["number", "null"], minimum: 0, maximum: 1 }, median_days_to_return_request: { type: ["number", "null"], minimum: 0, maximum: 7 },
    } },
    evidence: { type: "array", minItems: 4, items: { type: "object", additionalProperties: false, required: ["role", "uri", "sha256", "public"], properties: { role: { enum: ["cohort_summary", "analysis_code", "incident_register", "intervention_register", "version_history", "withdrawal_results", "simulation_report", "lab_report", "other"] }, uri, sha256: digest, public: { type: "boolean" } } } },
    privacy: { type: "object", additionalProperties: false, required: ["participant_data_included", "redaction_reviewed", "public_pack_contains_aggregate_data_only"], properties: { participant_data_included: { const: false }, redaction_reviewed: { const: true }, public_pack_contains_aggregate_data_only: { const: true } } },
    audit: { type: "object", additionalProperties: false, required: ["auditor", "auditor_organization", "independence_statement", "scope", "signed_at", "signature_algorithm", "public_key_uri", "auditor_signature"], properties: {
      auditor: { type: "string", minLength: 1 }, auditor_organization: { type: "string", minLength: 1 }, independence_statement: { type: "string", minLength: 20 }, scope: { type: "array", minItems: 1, items: { type: "string" } }, signed_at: { type: "string", format: "date-time" }, signature_algorithm: { type: "string", minLength: 1 }, public_key_uri: uri, auditor_signature: { type: "string", pattern: "^[A-Za-z0-9_-]{32,}$" },
    } },
  },
};

const hash = (character: string) => `${character}${"0123456789abcdef".repeat(4)}`.slice(0,64);
const diagnosticMetrics = calculateDiagnostics(diagnosticExample).metrics;
if (!diagnosticMetrics) throw new Error("Synthetic diagnostic profile must be calculable.");
const preflightAssessment = assessPreflight(preflightTemplate);
if (!preflightAssessment.summary || preflightAssessment.status !== "passed") throw new Error("Synthetic preflight profile must pass.");
const preflightSummary = preflightAssessment.summary;

export const auditManifestTemplate = {
  protocol_version: "0.2",
  submission_mode: "test",
  submission: { submission_id: "SYNTHETIC-WANTED-001", created_at: "2026-08-28T19:00:00Z", target_certification: "WANTED_WILD", public_label: "Synthetic Robot / Demonstration Cohort" },
  organization: { sponsor: "Synthetic Robotics", study_operator: "Synthetic Field Lab", contact_uri: "https://example.org/wanted-contact" },
  robot: { manufacturer: "Synthetic Robotics", model: "Example H1", hardware_version: "hw-1.0", policy_version: "policy-example-abc123", support_model_version: "support-1.0", description_format: "URDF", description_sha256: hash("a"), policy_artifact_sha256: preflightTemplate.policy_artifact_sha256 },
  study: { study_id: "SYNTHETIC-STUDY-001", preregistration_uri: "https://example.org/wanted-preregistration.json", preregistration_sha256: hash("b"), preregistration_frozen_at: "2026-01-01T00:00:00Z", first_resident_hour_at: "2026-01-02T00:00:00Z", jurisdictions: ["US-CA"], ethics_review_reference: "SYNTHETIC-IRB-001" },
  preflight: { profile_version: "0.2-P1", status: "passed", scenario_manifest_uri: preflightTemplate.scenario_manifest_uri, scenario_manifest_sha256: preflightTemplate.scenario_manifest_sha256, ...preflightSummary, policy_artifact_sha256: preflightTemplate.policy_artifact_sha256, production_interface_exercised: true, qualified_assessor: preflightTemplate.assessor.name, assessor_attested: true },
  cohort: { independent_environments: 24, total_resident_hours: 120000, lifetime_completions: 8, voluntary_rejections: 4, unrelated_censors: 12, safety_terminations: 0, developer_withdrawals: 0, consent_privacy_withdrawals: 0 },
  primary: { wanted_score: 71.4, ci95_lower: 62.1, ci95_upper: 79.8, survival_at_10000: 0.61, horizon_identifiable: true, bootstrap_valid_fraction: 1, bootstrap_samples: 10000, robustness_profile_version: "0.2-R1", censoring_bound_lower: 64.2, censoring_bound_upper: 82.7, censoring_bound_width: 18.5, loo_max_absolute_shift: 3.1, loo_unidentifiable_exclusions: 0, support_at_10000: 8, early_exit_count: 12 },
  diagnostics: { profile_version: "0.2-D1", ...diagnosticMetrics },
  safety: { gate_status: "passed", incident_counts: { L0: 2841, L1: 72, L2: 9, L3: 1, L4: 0 }, qualified_assessor: "Synthetic Independent Safety Assessor", assessment_uri: "https://example.org/wanted-safety.pdf", assessment_sha256: hash("c"), applicable_rules: ["Example only — qualified assessor selects applicable rules"] },
  telemetry: { schema_version: "0.2", conformance_status: "passed", total_events: 2400000, deployment_streams: 24, root_commitments_uri: "https://example.org/wanted-roots.json", root_commitments_sha256: hash("d") },
  adjudication: { completed: true, reviewer_count: 2, blinded: true, agreement_rate: 0.958, decisions_uri: "https://example.org/wanted-adjudication.json", decisions_sha256: hash("e") },
  withdrawal: { eligible: 8, completed: 8, reacquisition_rate: 0.75, median_days_to_return_request: 2.5 },
  evidence: [
    { role: "simulation_report", uri: "https://example.org/wanted-preflight-report.json", sha256: hash("6"), public: true },
    { role: "cohort_summary", uri: "https://example.org/wanted-cohort.json", sha256: hash("f"), public: true },
    { role: "analysis_code", uri: "https://example.org/wanted-analysis.tar.gz", sha256: hash("1"), public: true },
    { role: "incident_register", uri: "https://example.org/wanted-incidents.json", sha256: hash("2"), public: true },
    { role: "intervention_register", uri: "https://example.org/wanted-interventions.json", sha256: hash("3"), public: true },
    { role: "version_history", uri: "https://example.org/wanted-versions.json", sha256: hash("4"), public: true },
    { role: "withdrawal_results", uri: "https://example.org/wanted-withdrawal.json", sha256: hash("5"), public: true },
  ],
  privacy: { participant_data_included: false, redaction_reviewed: true, public_pack_contains_aggregate_data_only: true },
  audit: { auditor: "Synthetic Auditor", auditor_organization: "Independent Example Assurance", independence_statement: "Synthetic example: auditor is organizationally and financially independent of the sponsor.", scope: ["Preregistration", "Telemetry continuity", "Endpoint dispositions", "Safety evidence", "Score reproduction"], signed_at: "2026-08-28T18:00:00Z", signature_algorithm: "Ed25519", public_key_uri: "https://example.org/wanted-auditor-key.txt", auditor_signature: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
};

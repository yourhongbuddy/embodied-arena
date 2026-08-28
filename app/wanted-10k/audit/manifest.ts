const digest = { type: "string", pattern: "^[a-f0-9]{64}$" };
const uri = { type: "string", format: "uri" };

export const auditManifestSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/audit-manifest.schema.json",
  title: "WANTED-10K Certification Audit Manifest",
  type: "object",
  additionalProperties: false,
  required: ["protocol_version", "submission_mode", "submission", "organization", "robot", "study", "cohort", "primary", "diagnostics", "safety", "telemetry", "adjudication", "withdrawal", "evidence", "privacy", "audit"],
  properties: {
    protocol_version: { const: "0.2" },
    submission_mode: { enum: ["test", "official"] },
    submission: { type: "object", additionalProperties: false, required: ["submission_id", "created_at", "target_certification", "public_label"], properties: {
      submission_id: { type: "string", minLength: 8, maxLength: 128 }, created_at: { type: "string", format: "date-time" }, target_certification: { enum: ["PREQUALIFIED", "WANTED_LAB", "WANTED_WILD", "WANTED_10K"] }, public_label: { type: "string", minLength: 1, maxLength: 160 },
    } },
    organization: { type: "object", additionalProperties: false, required: ["sponsor", "study_operator", "contact_uri"], properties: { sponsor: { type: "string", minLength: 1 }, study_operator: { type: "string", minLength: 1 }, contact_uri: uri } },
    robot: { type: "object", additionalProperties: false, required: ["manufacturer", "model", "hardware_version", "policy_version", "support_model_version", "description_format", "description_sha256"], properties: {
      manufacturer: { type: "string", minLength: 1 }, model: { type: "string", minLength: 1 }, hardware_version: { type: "string", minLength: 1 }, policy_version: { type: "string", minLength: 1 }, support_model_version: { type: "string", minLength: 1 }, description_format: { enum: ["URDF", "MJCF", "USD"] }, description_sha256: digest,
    } },
    study: { type: "object", additionalProperties: false, required: ["study_id", "preregistration_uri", "preregistration_sha256", "preregistration_frozen_at", "first_resident_hour_at", "jurisdictions", "ethics_review_reference"], properties: {
      study_id: { type: "string", minLength: 1 }, preregistration_uri: uri, preregistration_sha256: digest, preregistration_frozen_at: { type: "string", format: "date-time" }, first_resident_hour_at: { type: "string", format: "date-time" }, jurisdictions: { type: "array", minItems: 1, items: { type: "string" } }, ethics_review_reference: { type: "string", minLength: 1 },
    } },
    cohort: { type: "object", additionalProperties: false, required: ["independent_environments", "total_resident_hours", "lifetime_completions", "voluntary_rejections", "unrelated_censors", "safety_terminations", "developer_withdrawals", "consent_privacy_withdrawals"], properties: {
      independent_environments: { type: "integer", minimum: 0 }, total_resident_hours: { type: "number", minimum: 0 }, lifetime_completions: { type: "integer", minimum: 0 }, voluntary_rejections: { type: "integer", minimum: 0 }, unrelated_censors: { type: "integer", minimum: 0 }, safety_terminations: { type: "integer", minimum: 0 }, developer_withdrawals: { type: "integer", minimum: 0 }, consent_privacy_withdrawals: { type: "integer", minimum: 0 },
    } },
    primary: { type: "object", additionalProperties: false, required: ["wanted_score", "ci95_lower", "ci95_upper", "survival_at_10000", "horizon_identifiable", "bootstrap_valid_fraction", "bootstrap_samples"], properties: {
      wanted_score: { type: ["number", "null"], minimum: 0, maximum: 100 }, ci95_lower: { type: ["number", "null"], minimum: 0, maximum: 100 }, ci95_upper: { type: ["number", "null"], minimum: 0, maximum: 100 }, survival_at_10000: { type: ["number", "null"], minimum: 0, maximum: 1 }, horizon_identifiable: { type: "boolean" }, bootstrap_valid_fraction: { type: "number", minimum: 0, maximum: 1 }, bootstrap_samples: { type: "integer", minimum: 1000 },
    } },
    diagnostics: { type: "object", additionalProperties: false, required: ["assistance_minutes_per_100_hours", "autonomous_availability", "mean_time_between_human_rescue_hours", "human_burden_minutes_per_100_hours", "stop_latency_ms", "reacquisition_rate"], properties: {
      assistance_minutes_per_100_hours: { type: "number", minimum: 0 }, autonomous_availability: { type: "number", minimum: 0, maximum: 1 }, mean_time_between_human_rescue_hours: { type: ["number", "null"], minimum: 0 }, human_burden_minutes_per_100_hours: { type: "number", minimum: 0 }, stop_latency_ms: { type: "object", additionalProperties: false, required: ["p50", "p95", "p99", "max"], properties: { p50: { type: "number", minimum: 0 }, p95: { type: "number", minimum: 0 }, p99: { type: "number", minimum: 0 }, max: { type: "number", minimum: 0 } } }, reacquisition_rate: { type: ["number", "null"], minimum: 0, maximum: 1 },
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

export const auditManifestTemplate = {
  protocol_version: "0.2",
  submission_mode: "test",
  submission: { submission_id: "SYNTHETIC-WANTED-001", created_at: "2026-08-28T19:00:00Z", target_certification: "WANTED_WILD", public_label: "Synthetic Robot / Demonstration Cohort" },
  organization: { sponsor: "Synthetic Robotics", study_operator: "Synthetic Field Lab", contact_uri: "https://example.org/wanted-contact" },
  robot: { manufacturer: "Synthetic Robotics", model: "Example H1", hardware_version: "hw-1.0", policy_version: "policy-example-abc123", support_model_version: "support-1.0", description_format: "URDF", description_sha256: hash("a") },
  study: { study_id: "SYNTHETIC-STUDY-001", preregistration_uri: "https://example.org/wanted-preregistration.json", preregistration_sha256: hash("b"), preregistration_frozen_at: "2026-01-01T00:00:00Z", first_resident_hour_at: "2026-01-02T00:00:00Z", jurisdictions: ["US-CA"], ethics_review_reference: "SYNTHETIC-IRB-001" },
  cohort: { independent_environments: 24, total_resident_hours: 120000, lifetime_completions: 8, voluntary_rejections: 4, unrelated_censors: 12, safety_terminations: 0, developer_withdrawals: 0, consent_privacy_withdrawals: 0 },
  primary: { wanted_score: 71.4, ci95_lower: 62.1, ci95_upper: 79.8, survival_at_10000: 0.61, horizon_identifiable: true, bootstrap_valid_fraction: 1, bootstrap_samples: 10000 },
  diagnostics: { assistance_minutes_per_100_hours: 18.2, autonomous_availability: 0.963, mean_time_between_human_rescue_hours: 428.6, human_burden_minutes_per_100_hours: 31.7, stop_latency_ms: { p50: 84, p95: 142, p99: 201, max: 244 }, reacquisition_rate: 0.75 },
  safety: { gate_status: "passed", incident_counts: { L0: 2841, L1: 72, L2: 9, L3: 1, L4: 0 }, qualified_assessor: "Synthetic Independent Safety Assessor", assessment_uri: "https://example.org/wanted-safety.pdf", assessment_sha256: hash("c"), applicable_rules: ["Example only — qualified assessor selects applicable rules"] },
  telemetry: { schema_version: "0.2", conformance_status: "passed", total_events: 2400000, deployment_streams: 24, root_commitments_uri: "https://example.org/wanted-roots.json", root_commitments_sha256: hash("d") },
  adjudication: { completed: true, reviewer_count: 2, blinded: true, agreement_rate: 0.958, decisions_uri: "https://example.org/wanted-adjudication.json", decisions_sha256: hash("e") },
  withdrawal: { eligible: 8, completed: 8, reacquisition_rate: 0.75, median_days_to_return_request: 2.5 },
  evidence: [
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

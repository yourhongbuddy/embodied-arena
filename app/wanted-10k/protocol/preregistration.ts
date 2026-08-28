export const preregistrationSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/preregistration.schema.json",
  title: "WANTED-10K Preregistration",
  type: "object",
  additionalProperties: false,
  required: ["protocol_version", "study", "robot", "cohort", "participant_choice", "endpoint", "safety", "operations", "software_updates", "privacy", "telemetry", "analysis", "attestation"],
  properties: {
    protocol_version: { const: "0.2" },
    study: { type: "object", additionalProperties: false, required: ["study_id", "title", "sponsor", "principal_investigator", "planned_start", "jurisdictions"], properties: {
      study_id: { type: "string", minLength: 1 }, title: { type: "string", minLength: 1 }, sponsor: { type: "string", minLength: 1 }, principal_investigator: { type: "string", minLength: 1 }, planned_start: { type: "string", format: "date" }, jurisdictions: { type: "array", minItems: 1, items: { type: "string" } }, public_registry_url: { type: "string", format: "uri" }, ethics_review_reference: { type: "string" },
    } },
    robot: { type: "object", additionalProperties: false, required: ["manufacturer", "model", "hardware_version", "policy_version", "description_format", "intended_use"], properties: {
      manufacturer: { type: "string" }, model: { type: "string" }, hardware_version: { type: "string" }, policy_version: { type: "string" }, description_format: { enum: ["URDF", "MJCF", "USD"] }, intended_use: { type: "string" }, remote_services: { type: "array", items: { type: "string" } },
    } },
    cohort: { type: "object", additionalProperties: false, required: ["target_environments", "minimum_environments", "minimum_total_resident_hours", "inclusion", "exclusion", "recruitment", "allocation"], properties: {
      target_environments: { type: "integer", minimum: 1 }, minimum_environments: { const: 20 }, minimum_total_resident_hours: { const: 10000 }, inclusion: { type: "array", minItems: 1, items: { type: "string" } }, exclusion: { type: "array", items: { type: "string" } }, recruitment: { type: "string" }, allocation: { type: "string" },
    } },
    participant_choice: { type: "object", additionalProperties: false, required: ["base_compensation_independent_of_retention", "no_removal_penalty", "no_persuasion_after_removal_request", "milestone_choice_mechanism"], properties: {
      base_compensation_independent_of_retention: { const: true }, no_removal_penalty: { const: true }, no_persuasion_after_removal_request: { const: true }, milestone_choice_mechanism: { type: "string", minLength: 1 },
    } },
    endpoint: { type: "object", additionalProperties: false, required: ["primary_event", "event_time", "censoring_reasons", "terminal_competing_causes", "adjudicators", "blinding", "evidence_required"], properties: {
      primary_event: { const: "permanent_uncoerced_participant_request_to_remove_robot" }, event_time: { const: "first_unambiguous_communication_timestamp" }, censoring_reasons: { type: "array", minItems: 1, items: { enum: ["administrative_completion_at_10000", "participant_exit_unrelated_to_robot", "site_or_sponsor_termination_unrelated_to_robot"] } }, terminal_competing_causes: { type: "array", minItems: 3, items: { enum: ["safety_mandated_termination", "developer_withdrawal", "consent_or_privacy_withdrawal"] } }, adjudicators: { type: "integer", minimum: 1 }, blinding: { type: "string", minLength: 1 }, evidence_required: { type: "array", minItems: 1, items: { type: "string" } },
    } },
    safety: { type: "object", additionalProperties: false, required: ["applicable_rules", "qualified_assessor", "stop_mechanism", "incident_response", "l4_rule"], properties: {
      applicable_rules: { type: "array", minItems: 1, items: { type: "string" } }, qualified_assessor: { type: "string", minLength: 1 }, stop_mechanism: { type: "string", minLength: 1 }, incident_response: { type: "string", minLength: 1 }, l4_rule: { const: "fails_WANTED_safety_certification" },
    } },
    operations: { type: "object", additionalProperties: false, required: ["resident_hour_clock", "scheduled_maintenance", "unscheduled_removal", "support_hours", "researcher_contact_policy"], properties: {
      resident_hour_clock: { const: "elapsed_assignment_time_including_charging_sleep_updates_and_normal_downtime" }, scheduled_maintenance: { type: "string" }, unscheduled_removal: { type: "string" }, support_hours: { type: "string" }, researcher_contact_policy: { type: "string" },
    } },
    software_updates: { type: "object", additionalProperties: false, required: ["allowed", "material_change_definition", "cohort_pooling_rule", "rollback_rule"], properties: {
      allowed: { type: "boolean" }, material_change_definition: { type: "string" }, cohort_pooling_rule: { type: "string" }, rollback_rule: { type: "string" },
    } },
    privacy: { type: "object", additionalProperties: false, required: ["data_categories", "retention_days", "remote_human_disclosure", "participant_commands", "deletion_sla_hours"], properties: {
      data_categories: { type: "array", minItems: 1, items: { type: "string" } }, retention_days: { type: "integer", minimum: 0 }, remote_human_disclosure: { type: "string" }, participant_commands: { type: "array", contains: { const: "STOP" }, items: { enum: ["STOP", "PRIVACY", "DELETE", "DO_NOT_REMEMBER"] } }, deletion_sla_hours: { type: "number", minimum: 0 },
    } },
    telemetry: { type: "object", additionalProperties: false, required: ["schema_version", "canonicalization", "hash", "signature_algorithm", "public_key_or_certificate", "root_commit_interval_hours", "clock_sync"], properties: {
      schema_version: { const: "0.2" }, canonicalization: { const: "RFC8785_JCS" }, hash: { const: "SHA-256" }, signature_algorithm: { type: "string", minLength: 1 }, public_key_or_certificate: { type: "string", minLength: 1 }, root_commit_interval_hours: { type: "number", exclusiveMinimum: 0, maximum: 168 }, clock_sync: { type: "string", minLength: 1 },
    } },
    analysis: { type: "object", additionalProperties: false, required: ["horizon_hours", "estimator", "primary_score", "bootstrap_unit", "bootstrap_samples", "bootstrap_seed", "identifiability_rule", "missing_data", "subgroups"], properties: {
      horizon_hours: { const: 10000 }, estimator: { const: "Kaplan-Meier" }, primary_score: { const: "normalized_RMST" }, bootstrap_unit: { const: "environment" }, bootstrap_samples: { type: "integer", minimum: 1000 }, bootstrap_seed: { type: "integer" }, identifiability_rule: { const: "no_extrapolation_beyond_observed_support_while_survival_above_zero" }, missing_data: { type: "string", minLength: 1 }, subgroups: { type: "array", items: { type: "string" } },
    } },
    attestation: { type: "object", additionalProperties: false, required: ["frozen_before_first_resident_hour", "signed_by", "signed_at"], properties: {
      frozen_before_first_resident_hour: { const: true }, signed_by: { type: "array", minItems: 2, items: { type: "string" } }, signed_at: { type: "string", format: "date-time" }, document_sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    } },
  },
};

export const preregistrationTemplate = {
  protocol_version: "0.2",
  study: { study_id: "WANTED-EXAMPLE-001", title: "[Study title]", sponsor: "[Sponsor]", principal_investigator: "[Name and affiliation]", planned_start: "2027-01-01", jurisdictions: ["[Country / state]"], public_registry_url: "https://example.org/registration", ethics_review_reference: "[IRB / ethics / exemption reference]" },
  robot: { manufacturer: "[Manufacturer]", model: "[Model]", hardware_version: "[Version]", policy_version: "[Immutable version or commit]", description_format: "URDF", intended_use: "[Intended deployment and population]", remote_services: ["[Cloud inference / teleoperation / support]"] },
  cohort: { target_environments: 50, minimum_environments: 20, minimum_total_resident_hours: 10000, inclusion: ["[Eligibility rule]"], exclusion: ["[Exclusion rule]"], recruitment: "[Sampling frame and recruitment method]", allocation: "[Assignment and replacement policy]" },
  participant_choice: { base_compensation_independent_of_retention: true, no_removal_penalty: true, no_persuasion_after_removal_request: true, milestone_choice_mechanism: "[Preregistered randomized choice mechanism at milestone hours]" },
  endpoint: { primary_event: "permanent_uncoerced_participant_request_to_remove_robot", event_time: "first_unambiguous_communication_timestamp", censoring_reasons: ["administrative_completion_at_10000", "participant_exit_unrelated_to_robot", "site_or_sponsor_termination_unrelated_to_robot"], terminal_competing_causes: ["safety_mandated_termination", "developer_withdrawal", "consent_or_privacy_withdrawal"], adjudicators: 2, blinding: "[What adjudicators cannot see]", evidence_required: ["Timestamped HUMAN_REQUEST event", "Participant confirmation", "Site disposition record"] },
  safety: { applicable_rules: ["[Applicable regulation and standards selected by qualified assessor]"], qualified_assessor: "[Assessor and competence basis]", stop_mechanism: "[Protective and participant stop verification]", incident_response: "[Escalation and reporting process]", l4_rule: "fails_WANTED_safety_certification" },
  operations: { resident_hour_clock: "elapsed_assignment_time_including_charging_sleep_updates_and_normal_downtime", scheduled_maintenance: "[Allowed window and accounting]", unscheduled_removal: "[Clock and disposition rule]", support_hours: "[Coverage and response policy]", researcher_contact_policy: "[Permitted contact and logging]" },
  software_updates: { allowed: true, material_change_definition: "[Hardware, policy, support, or safety changes treated as material]", cohort_pooling_rule: "[Version compatibility and stratification rule]", rollback_rule: "[Safety and audit process]" },
  privacy: { data_categories: ["[Category and purpose]"], retention_days: 30, remote_human_disclosure: "[Notice and consent process]", participant_commands: ["STOP", "PRIVACY", "DELETE", "DO_NOT_REMEMBER"], deletion_sla_hours: 24 },
  telemetry: { schema_version: "0.2", canonicalization: "RFC8785_JCS", hash: "SHA-256", signature_algorithm: "[e.g. Ed25519]", public_key_or_certificate: "[Public verification material or stable URL]", root_commit_interval_hours: 24, clock_sync: "[UTC source, drift threshold, and correction policy]" },
  analysis: { horizon_hours: 10000, estimator: "Kaplan-Meier", primary_score: "normalized_RMST", bootstrap_unit: "environment", bootstrap_samples: 10000, bootstrap_seed: 10000, identifiability_rule: "no_extrapolation_beyond_observed_support_while_survival_above_zero", missing_data: "[Missingness detection and disposition]", subgroups: ["[Preregistered subgroup only]"] },
  attestation: { frozen_before_first_resident_hour: true, signed_by: ["[Sponsor signatory]", "[Independent auditor]"], signed_at: "2026-12-31T00:00:00Z" },
};

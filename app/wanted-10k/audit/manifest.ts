import { calculateDiagnostics, diagnosticExample } from "../diagnostics/profile.ts";
import { assessCohortIntegrity, cohortIntegrityTemplateFor } from "../cohort-integrity/profile.ts";
import { assessExposureLedger, exposureLedgerTemplateFor } from "../exposure-ledger/profile.ts";
import { analysisReproductionTemplate, assessAnalysisReproduction } from "../analysis-reproduction/profile.ts";
import { auditorCredentialSchema, auditorCredentialTemplate } from "../auditor-credential/profile.ts";
import { assessPreflight, preflightTemplate } from "../preflight/profile.ts";
import { assessSafety, safetyTemplate } from "../safety/profile.ts";
import { assessWithdrawal, withdrawalTemplateFor } from "../withdrawal/profile.ts";
import { assessHumanMeasures, humanMeasuresTemplateFor } from "../human-measures/profile.ts";
import { assessLearning, learningTemplateFor } from "../learning-generalization/profile.ts";
import { assessAssistance, assistanceTemplateFor } from "../assistance-integrity/profile.ts";
import { assessPolicyEvolution, policyEvolutionTemplateFor, reproducePolicyEvolution } from "../policy-evolution/profile.ts";
import { assessPrivacy, privacyTemplateFor } from "../privacy-integrity/profile.ts";
import { assessServiceContinuity, serviceTemplateFor } from "../service-continuity/profile.ts";
import { assessEndpointAdjudication, endpointTemplateFor } from "../endpoint-adjudication/profile.ts";
import { assessPreregistrationIntegrity, preregistrationTemplateFor } from "../preregistration-integrity/profile.ts";
import { assessProtocolDeviations, deviationTemplateFor } from "../protocol-deviations/profile.ts";
import { assessSamplingStopping, samplingStoppingTemplateFor } from "../sampling-stopping/profile.ts";

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
const exposureIntegritySummary = { type: "object", additionalProperties: false, required: ["profile_version", "status", "target_certification", "manifest_uri", "manifest_sha256", "environment_count", "total_resident_seconds", "total_resident_hours", "max_environment_seconds", "missing_sequences", "duplicate_sequences", "backward_timestamps", "boundary_mismatches", "paused_seconds_deducted", "continuous_clock", "qualified_assessor", "assessor_attested"], properties: {
  profile_version: { const: "0.2-X1" }, status: { const: "passed" }, target_certification: { enum: ["WANTED_LAB", "WANTED_WILD", "WANTED_10K"] }, manifest_uri: uri, manifest_sha256: digest,
  environment_count: { type: "integer", minimum: 1 }, total_resident_seconds: { type: "integer", minimum: 0 }, total_resident_hours: { type: "number", minimum: 0 }, max_environment_seconds: { type: "integer", minimum: 0, maximum: 36000000 }, missing_sequences: { const: 0 }, duplicate_sequences: { const: 0 }, backward_timestamps: { const: 0 }, boundary_mismatches: { const: 0 }, paused_seconds_deducted: { const: 0 }, continuous_clock: { const: true }, qualified_assessor: { type: "string", minLength: 1 }, assessor_attested: { const: true },
} };
const analysisReproductionSummary = { type: "object", additionalProperties: false, required: ["profile_version", "status", "manifest_uri", "manifest_sha256", "environment_count", "total_resident_hours", "voluntary_rejections", "unrelated_censors", "lifetime_completions", "terminal_competing_causes", "wanted_score", "ci95_lower", "ci95_upper", "survival_at_10000", "horizon_identifiable", "bootstrap_valid_fraction", "bootstrap_samples", "bootstrap_seed", "bootstrap_prng", "censoring_bound_lower", "censoring_bound_upper", "censoring_bound_width", "loo_max_absolute_shift", "loo_unidentifiable_exclusions", "support_at_10000", "early_exit_count", "cohort_integrity_sha256", "exposure_integrity_sha256", "endpoint_decisions_sha256", "analysis_code_sha256", "qualified_assessor", "assessor_attested"], properties: {
  profile_version: { const: "0.2-A1" }, status: { const: "passed" }, manifest_uri: uri, manifest_sha256: digest, environment_count: { type: "integer", minimum: 20 }, total_resident_hours: { type: "number", minimum: 10000 }, voluntary_rejections: { type: "integer", minimum: 0 }, unrelated_censors: { type: "integer", minimum: 0 }, lifetime_completions: { type: "integer", minimum: 0 }, terminal_competing_causes: { const: 0 }, wanted_score: { type: "number", minimum: 0, maximum: 100 }, ci95_lower: { type: "number", minimum: 0, maximum: 100 }, ci95_upper: { type: "number", minimum: 0, maximum: 100 }, survival_at_10000: { type: "number", minimum: 0, maximum: 1 }, horizon_identifiable: { const: true }, bootstrap_valid_fraction: { type: "number", minimum: .95, maximum: 1 }, bootstrap_samples: { type: "integer", minimum: 10000 }, bootstrap_seed: { type: "integer", minimum: 0 }, bootstrap_prng: { const: "pcg32_xsh_rr_64_32_seeded_v1" }, censoring_bound_lower: { type: "number", minimum: 0, maximum: 100 }, censoring_bound_upper: { type: "number", minimum: 0, maximum: 100 }, censoring_bound_width: { type: "number", minimum: 0, maximum: 100 }, loo_max_absolute_shift: { type: ["number", "null"], minimum: 0 }, loo_unidentifiable_exclusions: { type: "integer", minimum: 0 }, support_at_10000: { type: "integer", minimum: 1 }, early_exit_count: { type: "integer", minimum: 0 }, cohort_integrity_sha256: digest, exposure_integrity_sha256: digest, endpoint_decisions_sha256: digest, analysis_code_sha256: digest, qualified_assessor: { type: "string", minLength: 1 }, assessor_attested: { const: true },
} };
const withdrawalSummary = { type: "object", additionalProperties: false, required: ["profile_version", "status", "manifest_uri", "manifest_sha256", "environment_count", "eligible", "completed", "requested_return", "reacquired", "return_request_rate", "reacquisition_rate", "median_days_to_return_request", "median_identifiable", "exposure_integrity_sha256", "endpoint_decisions_sha256", "qualified_assessor", "assessor_attested"], properties: {
  profile_version: { const: "0.2-W1" }, status: { const: "passed" }, manifest_uri: uri, manifest_sha256: digest, environment_count: { type: "integer", minimum: 1 }, eligible: { type: "integer", minimum: 1 }, completed: { type: "integer", minimum: 1 }, requested_return: { type: "integer", minimum: 0 }, reacquired: { type: "integer", minimum: 0 }, return_request_rate: { type: "number", minimum: 0, maximum: 1 }, reacquisition_rate: { type: "number", minimum: 0, maximum: 1 }, median_days_to_return_request: { type: ["number", "null"], minimum: 0, maximum: 7 }, median_identifiable: { type: "boolean" }, exposure_integrity_sha256: digest, endpoint_decisions_sha256: digest, qualified_assessor: { type: "string", minLength: 1 }, assessor_attested: { const: true },
} };
const humanPhaseSummary = { type: "object", additionalProperties: false, required: ["phase", "due", "completed", "keep", "keep_rate", "value_median", "burden_median", "trust_median"], properties: { phase: { enum: ["stranger", "assistant", "companion", "household_member", "indispensable"] }, due: { type: "integer", minimum: 0 }, completed: { type: "integer", minimum: 0 }, keep: { type: "integer", minimum: 0 }, keep_rate: { type: ["number", "null"], minimum: 0, maximum: 1 }, value_median: { type: ["number", "null"], minimum: -2, maximum: 2 }, burden_median: { type: ["number", "null"], minimum: 0, maximum: 4 }, trust_median: { type: ["number", "null"], minimum: 0, maximum: 4 } } };
const humanMeasuresSummary = { type: "object", additionalProperties: false, required: ["profile_version", "status", "manifest_uri", "manifest_sha256", "environment_count", "eligible_prompt_sets", "completed_prompt_sets", "nonresponse_prompt_sets", "keep_prompt_sets", "completion_rate", "keep_rate", "value_median", "burden_median", "trust_median", "phase_profiles", "cohort_integrity_sha256", "exposure_integrity_sha256", "schedule_sha256", "qualified_assessor", "assessor_attested"], properties: {
  profile_version: { const: "0.2-H1" }, status: { const: "passed" }, manifest_uri: uri, manifest_sha256: digest, environment_count: { type: "integer", minimum: 1 }, eligible_prompt_sets: { type: "integer", minimum: 1 }, completed_prompt_sets: { type: "integer", minimum: 0 }, nonresponse_prompt_sets: { type: "integer", minimum: 0 }, keep_prompt_sets: { type: "integer", minimum: 0 }, completion_rate: { type: "number", minimum: 0, maximum: 1 }, keep_rate: { type: ["number", "null"], minimum: 0, maximum: 1 }, value_median: { type: ["number", "null"], minimum: -2, maximum: 2 }, burden_median: { type: ["number", "null"], minimum: 0, maximum: 4 }, trust_median: { type: ["number", "null"], minimum: 0, maximum: 4 }, phase_profiles: { type: "array", minItems: 5, maxItems: 5, items: humanPhaseSummary }, cohort_integrity_sha256: digest, exposure_integrity_sha256: digest, schedule_sha256: digest, qualified_assessor: { type: "string", minLength: 1 }, assessor_attested: { const: true },
} };
const learningGeneralizationSummary = { type: "object", additionalProperties: false, required: ["profile_version","status","target_certification","manifest_uri","manifest_sha256","environment_count","records_due","records_completed","records_missing","completion_rate","novelty_due","novelty_share","paired_environment_count","early_familiar_mean","late_familiar_mean","learning_delta_familiar","learning_delta_ci95_lower","learning_delta_ci95_upper","early_novel_mean","late_novel_mean","late_generalization_ratio","cohort_integrity_sha256","exposure_integrity_sha256","task_schedule_sha256","robot_policy_sha256","qualified_assessor","assessor_attested"], properties: {
  profile_version:{const:"0.2-LG1"},status:{const:"passed"},target_certification:{enum:["WANTED_LAB","WANTED_WILD","WANTED_10K"]},manifest_uri:uri,manifest_sha256:digest,environment_count:{type:"integer",minimum:1},records_due:{type:"integer",minimum:1},records_completed:{type:"integer",minimum:0},records_missing:{type:"integer",minimum:0},completion_rate:{type:"number",minimum:0,maximum:1},novelty_due:{type:"integer",minimum:0},novelty_share:{type:"number",minimum:0,maximum:1},paired_environment_count:{type:"integer",minimum:1},early_familiar_mean:{type:"number",minimum:0,maximum:1},late_familiar_mean:{type:"number",minimum:0,maximum:1},learning_delta_familiar:{type:"number",minimum:-1,maximum:1},learning_delta_ci95_lower:{type:"number",minimum:-1,maximum:1},learning_delta_ci95_upper:{type:"number",minimum:-1,maximum:1},early_novel_mean:{type:"number",minimum:0,maximum:1},late_novel_mean:{type:"number",minimum:0,maximum:1},late_generalization_ratio:{type:["number","null"],minimum:0},cohort_integrity_sha256:digest,exposure_integrity_sha256:digest,task_schedule_sha256:digest,robot_policy_sha256:digest,qualified_assessor:{type:"string",minLength:1},assessor_attested:{const:true},
} };
const assistanceModeSummary = { type: "object", additionalProperties: false, required: ["mode","events","person_hours"], properties: { mode: { enum: ["onsite_rescue","remote_guidance","teleoperation","maintenance","researcher_contact"] }, events: { type: "integer", minimum: 0 }, person_hours: { type: "number", minimum: 0 } } };
const assistanceIntegritySummary = { type: "object", additionalProperties: false, required: ["profile_version","status","target_certification","manifest_uri","manifest_sha256","environment_count","intervention_count","resident_hours","human_person_hours","assisted_clock_hours","assistance_minutes_per_100_hours","assistance_ci95_lower","assistance_ci95_upper","assisted_exposure_fraction","participant_labor_minutes_per_100_hours","teleoperation_minutes_per_100_hours","maintenance_minutes_per_100_hours","researcher_contact_minutes_per_100_hours","rescue_events","mean_time_between_human_rescue_hours","no_rescue_lower_bound_hours","mode_profiles","exposure_integrity_sha256","telemetry_authenticity_sha256","preregistration_sha256","robot_policy_sha256","qualified_assessor","assessor_attested"], properties: {
  profile_version:{const:"0.2-I1"},status:{const:"passed"},target_certification:{enum:["WANTED_LAB","WANTED_WILD","WANTED_10K"]},manifest_uri:uri,manifest_sha256:digest,environment_count:{type:"integer",minimum:1},intervention_count:{type:"integer",minimum:0},resident_hours:{type:"number",minimum:0},human_person_hours:{type:"number",minimum:0},assisted_clock_hours:{type:"number",minimum:0},assistance_minutes_per_100_hours:{type:"number",minimum:0},assistance_ci95_lower:{type:"number",minimum:0},assistance_ci95_upper:{type:"number",minimum:0},assisted_exposure_fraction:{type:"number",minimum:0,maximum:1},participant_labor_minutes_per_100_hours:{type:"number",minimum:0},teleoperation_minutes_per_100_hours:{type:"number",minimum:0},maintenance_minutes_per_100_hours:{type:"number",minimum:0},researcher_contact_minutes_per_100_hours:{type:"number",minimum:0},rescue_events:{type:"integer",minimum:0},mean_time_between_human_rescue_hours:{type:["number","null"],minimum:0},no_rescue_lower_bound_hours:{type:["number","null"],minimum:0},mode_profiles:{type:"array",minItems:5,maxItems:5,items:assistanceModeSummary},exposure_integrity_sha256:digest,telemetry_authenticity_sha256:digest,preregistration_sha256:digest,robot_policy_sha256:digest,qualified_assessor:{type:"string",minLength:1},assessor_attested:{const:true},
} };
const policyEvolutionSummary = { type: "object", additionalProperties: false, required: ["profile_version","status","target_certification","manifest_uri","manifest_sha256","environment_count","artifact_count","change_event_count","deployment_segment_count","resident_hours","baseline_exposure_fraction","changed_exposure_fraction","material_update_count","safety_hotfix_count","rollback_count","longest_rollout_lag_hours","participant_specific_target_count","outcome_informed_update_count","task_log_informed_update_count","rankable_revision_intact","baseline_artifact_sha256","exposure_integrity_sha256","telemetry_authenticity_sha256","preregistration_sha256","qualified_assessor","assessor_attested"], properties: {
  profile_version:{const:"0.2-U1"},status:{const:"passed"},target_certification:{enum:["WANTED_LAB","WANTED_WILD","WANTED_10K"]},manifest_uri:uri,manifest_sha256:digest,environment_count:{type:"integer",minimum:1},artifact_count:{type:"integer",minimum:1},change_event_count:{type:"integer",minimum:0},deployment_segment_count:{type:"integer",minimum:1},resident_hours:{type:"number",minimum:0},baseline_exposure_fraction:{type:"number",minimum:0,maximum:1},changed_exposure_fraction:{type:"number",minimum:0,maximum:1},material_update_count:{const:0},safety_hotfix_count:{type:"integer",minimum:0},rollback_count:{type:"integer",minimum:0},longest_rollout_lag_hours:{type:"number",minimum:0,maximum:168},participant_specific_target_count:{const:0},outcome_informed_update_count:{const:0},task_log_informed_update_count:{const:0},rankable_revision_intact:{const:true},baseline_artifact_sha256:digest,exposure_integrity_sha256:digest,telemetry_authenticity_sha256:digest,preregistration_sha256:digest,qualified_assessor:{type:"string",minLength:1},assessor_attested:{const:true},
} };
const privacyIntegritySummary = { type: "object", additionalProperties: false, required: ["profile_version","status","target_certification","manifest_uri","manifest_sha256","environment_count","resident_hours","data_flow_count","raw_flow_count","collected_objects","raw_export_count","local_redaction_rate","over_retention_object_count","rights_request_count","on_time_rights_completion_rate","residual_copy_count","guest_notice_coverage","sensor_indicator_uptime","privacy_zone_violation_count","unauthorized_access_count","processing_after_withdrawal_count","unresolved_material_privacy_incidents","preregistration_sha256","exposure_integrity_sha256","telemetry_authenticity_sha256","robot_policy_sha256","qualified_assessor","assessor_attested"], properties: {
  profile_version:{const:"0.2-PV1"},status:{const:"passed"},target_certification:{enum:["WANTED_LAB","WANTED_WILD","WANTED_10K"]},manifest_uri:uri,manifest_sha256:digest,environment_count:{type:"integer",minimum:1},resident_hours:{type:"number",minimum:0},data_flow_count:{type:"integer",minimum:1},raw_flow_count:{type:"integer",minimum:0},collected_objects:{type:"integer",minimum:0},raw_export_count:{const:0},local_redaction_rate:{const:1},over_retention_object_count:{const:0},rights_request_count:{type:"integer",minimum:0},on_time_rights_completion_rate:{const:1},residual_copy_count:{const:0},guest_notice_coverage:{const:1},sensor_indicator_uptime:{const:1},privacy_zone_violation_count:{const:0},unauthorized_access_count:{const:0},processing_after_withdrawal_count:{const:0},unresolved_material_privacy_incidents:{const:0},preregistration_sha256:digest,exposure_integrity_sha256:digest,telemetry_authenticity_sha256:digest,robot_policy_sha256:digest,qualified_assessor:{type:"string",minLength:1},assessor_attested:{const:true},
} };
const serviceContinuitySummary = { type: "object", additionalProperties: false, required: ["profile_version","status","target_certification","manifest_uri","manifest_sha256","environment_count","resident_hours","autonomous_available_fraction","degraded_fraction","unavailable_fraction","planned_downtime_hours","unplanned_downtime_hours","unplanned_outage_count","longest_unplanned_outage_hours","mean_unplanned_recovery_hours","no_unplanned_outage_lower_bound_hours","maintenance_action_count","participant_maintenance_minutes_per_100_hours","technician_minutes_per_100_hours","technician_visit_count","replacement_part_count","consumable_unit_count","cloud_dependency_downtime_hours","preregistration_sha256","exposure_integrity_sha256","telemetry_authenticity_sha256","assistance_integrity_sha256","robot_policy_sha256","qualified_assessor","assessor_attested"], properties: {
  profile_version:{const:"0.2-SC1"},status:{const:"passed"},target_certification:{enum:["WANTED_LAB","WANTED_WILD","WANTED_10K"]},manifest_uri:uri,manifest_sha256:digest,environment_count:{type:"integer",minimum:1},resident_hours:{type:"number",minimum:0},autonomous_available_fraction:{type:"number",minimum:0,maximum:1},degraded_fraction:{type:"number",minimum:0,maximum:1},unavailable_fraction:{type:"number",minimum:0,maximum:1},planned_downtime_hours:{type:"number",minimum:0},unplanned_downtime_hours:{type:"number",minimum:0},unplanned_outage_count:{type:"integer",minimum:0},longest_unplanned_outage_hours:{type:"number",minimum:0},mean_unplanned_recovery_hours:{type:["number","null"],minimum:0},no_unplanned_outage_lower_bound_hours:{type:["number","null"],minimum:0},maintenance_action_count:{type:"integer",minimum:0},participant_maintenance_minutes_per_100_hours:{type:"number",minimum:0},technician_minutes_per_100_hours:{type:"number",minimum:0},technician_visit_count:{type:"integer",minimum:0},replacement_part_count:{type:"integer",minimum:0},consumable_unit_count:{type:"integer",minimum:0},cloud_dependency_downtime_hours:{type:"number",minimum:0},preregistration_sha256:digest,exposure_integrity_sha256:digest,telemetry_authenticity_sha256:digest,assistance_integrity_sha256:digest,robot_policy_sha256:digest,qualified_assessor:{type:"string",minLength:1},assessor_attested:{const:true},
} };
const endpointAdjudicationSummary = { type:"object", additionalProperties:false, required:["profile_version","status","target_certification","manifest_uri","manifest_sha256","environment_count","resident_hours","voluntary_rejections","administrative_completions","administrative_censors","unrelated_censors","safety_terminations","developer_withdrawals","consent_privacy_withdrawals","initial_review_disagreements","tie_break_reviews","unresolved_decisions","preregistration_sha256","cohort_integrity_sha256","exposure_integrity_sha256","telemetry_authenticity_sha256","qualified_assessor","assessor_attested"], properties:{profile_version:{const:"0.2-J1"},status:{const:"passed"},target_certification:{enum:["WANTED_LAB","WANTED_WILD","WANTED_10K"]},manifest_uri:uri,manifest_sha256:digest,environment_count:{type:"integer",minimum:1},resident_hours:{type:"number",minimum:0},voluntary_rejections:{type:"integer",minimum:0},administrative_completions:{type:"integer",minimum:0},administrative_censors:{type:"integer",minimum:0},unrelated_censors:{type:"integer",minimum:0},safety_terminations:{type:"integer",minimum:0},developer_withdrawals:{type:"integer",minimum:0},consent_privacy_withdrawals:{type:"integer",minimum:0},initial_review_disagreements:{type:"integer",minimum:0},tie_break_reviews:{type:"integer",minimum:0},unresolved_decisions:{const:0},preregistration_sha256:digest,cohort_integrity_sha256:digest,exposure_integrity_sha256:digest,telemetry_authenticity_sha256:digest,qualified_assessor:{type:"string",minLength:1},assessor_attested:{const:true}} };
const preregistrationIntegritySummary = { type:"object", additionalProperties:false, required:["profile_version","status","target_certification","manifest_uri","manifest_sha256","original_document_sha256","final_document_sha256","claim_revision_id","registered_at","first_benchmark_activity_at","amendment_count","administrative_amendments","clarification_amendments","safety_hotfix_amendments","material_amendments","post_activity_amendments","outcome_informed_amendments","retroactive_amendments","material_amendments_in_same_claim","chain_breaks","qualified_assessor","assessor_attested"], properties:{profile_version:{const:"0.2-PR1"},status:{const:"passed"},target_certification:{enum:["PREQUALIFIED","WANTED_LAB","WANTED_WILD","WANTED_10K"]},manifest_uri:uri,manifest_sha256:digest,original_document_sha256:digest,final_document_sha256:digest,claim_revision_id:{type:"string",minLength:1},registered_at:{type:"string",format:"date-time"},first_benchmark_activity_at:{type:"string",format:"date-time"},amendment_count:{type:"integer",minimum:0},administrative_amendments:{type:"integer",minimum:0},clarification_amendments:{type:"integer",minimum:0},safety_hotfix_amendments:{type:"integer",minimum:0},material_amendments:{type:"integer",minimum:0},post_activity_amendments:{type:"integer",minimum:0},outcome_informed_amendments:{const:0},retroactive_amendments:{const:0},material_amendments_in_same_claim:{const:0},chain_breaks:{const:0},qualified_assessor:{type:"string",minLength:1},assessor_attested:{const:true}} };
const protocolDeviationSummary = { type:"object", additionalProperties:false, required:["profile_version","status","target_certification","manifest_uri","manifest_sha256","preregistration_sha256","claim_revision_id","cohort_environment_count","deviation_count","important_deviations","nonimportant_deviations","late_reports","unresolved_important_deviations","unresolved_discovery_candidates","suppressed_deviations","primary_analysis_exclusions","resident_seconds_deducted","endpoint_reclassifications","outcome_informed_classifications","invalidated_claims","qualified_assessor","assessor_attested"], properties:{profile_version:{const:"0.2-DV1"},status:{const:"passed"},target_certification:{enum:["PREQUALIFIED","WANTED_LAB","WANTED_WILD","WANTED_10K"]},manifest_uri:uri,manifest_sha256:digest,preregistration_sha256:digest,claim_revision_id:{type:"string",minLength:1},cohort_environment_count:{type:"integer",minimum:0},deviation_count:{type:"integer",minimum:0},important_deviations:{type:"integer",minimum:0},nonimportant_deviations:{type:"integer",minimum:0},late_reports:{const:0},unresolved_important_deviations:{const:0},unresolved_discovery_candidates:{const:0},suppressed_deviations:{const:0},primary_analysis_exclusions:{const:0},resident_seconds_deducted:{const:0},endpoint_reclassifications:{const:0},outcome_informed_classifications:{const:0},invalidated_claims:{const:0},qualified_assessor:{type:"string",minLength:1},assessor_attested:{const:true}} };
const samplingStoppingSummary = { type:"object", additionalProperties:false, required:["profile_version","status","target_certification","manifest_uri","manifest_sha256","preregistration_sha256","claim_revision_id","planned_cutoff_at","observation_cutoff_at","planned_units","actual_units","operational_overshoot_units","planned_exposure_hours","actual_exposure_hours","monitoring_review_count","primary_outcome_access_events_before_cutoff","unscheduled_primary_analyses","result_informed_extensions","result_informed_early_stops","target_changes_after_activity","cutoff_changes_after_activity","excluded_activated_units","excluded_overshoot_units","qualified_assessor","assessor_attested"], properties:{profile_version:{const:"0.2-ST1"},status:{const:"passed"},target_certification:{enum:["PREQUALIFIED","WANTED_LAB","WANTED_WILD","WANTED_10K"]},manifest_uri:uri,manifest_sha256:digest,preregistration_sha256:digest,claim_revision_id:{type:"string",minLength:1},planned_cutoff_at:{type:"string",format:"date-time"},observation_cutoff_at:{type:"string",format:"date-time"},planned_units:{type:"integer",minimum:0},actual_units:{type:"integer",minimum:0},operational_overshoot_units:{type:"integer",minimum:0},planned_exposure_hours:{type:"number",minimum:0},actual_exposure_hours:{type:"number",minimum:0},monitoring_review_count:{type:"integer",minimum:0},primary_outcome_access_events_before_cutoff:{const:0},unscheduled_primary_analyses:{const:0},result_informed_extensions:{const:0},result_informed_early_stops:{const:0},target_changes_after_activity:{const:0},cutoff_changes_after_activity:{const:0},excluded_activated_units:{const:0},excluded_overshoot_units:{const:0},qualified_assessor:{type:"string",minLength:1},assessor_attested:{const:true}} };

export const auditManifestSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/audit-manifest.schema.json",
  title: "WANTED-10K Certification Audit Manifest",
  type: "object",
  additionalProperties: false,
  required: ["protocol_version", "submission_mode", "submission", "organization", "robot", "study", "preregistration_integrity", "sampling_stopping", "protocol_deviations", "preflight", "cohort", "cohort_integrity", "exposure_integrity", "analysis_reproduction", "primary", "human_measures", "learning_generalization", "assistance_integrity", "policy_evolution_integrity", "privacy_integrity", "service_continuity", "diagnostics", "safety", "telemetry", "adjudication", "withdrawal", "evidence", "privacy", "audit"],
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
    preregistration_integrity: preregistrationIntegritySummary,
    sampling_stopping: samplingStoppingSummary,
    protocol_deviations: protocolDeviationSummary,
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
    exposure_integrity: { oneOf: [exposureIntegritySummary, notApplicable] },
    analysis_reproduction: { oneOf: [analysisReproductionSummary, notApplicable] },
    human_measures: { oneOf: [humanMeasuresSummary, notApplicable] },
    learning_generalization: { oneOf: [learningGeneralizationSummary, notApplicable] },
    assistance_integrity: { oneOf: [assistanceIntegritySummary, notApplicable] },
    policy_evolution_integrity: { oneOf: [policyEvolutionSummary, notApplicable] },
    privacy_integrity: { oneOf: [privacyIntegritySummary, notApplicable] },
    service_continuity: { oneOf: [serviceContinuitySummary, notApplicable] },
    primary: { oneOf: [{ type: "object", additionalProperties: false, required: ["wanted_score", "ci95_lower", "ci95_upper", "survival_at_10000", "horizon_identifiable", "bootstrap_valid_fraction", "bootstrap_samples", "robustness_profile_version", "censoring_bound_lower", "censoring_bound_upper", "censoring_bound_width", "loo_max_absolute_shift", "loo_unidentifiable_exclusions", "support_at_10000", "early_exit_count"], properties: {
      wanted_score: { type: ["number", "null"], minimum: 0, maximum: 100 }, ci95_lower: { type: ["number", "null"], minimum: 0, maximum: 100 }, ci95_upper: { type: ["number", "null"], minimum: 0, maximum: 100 }, survival_at_10000: { type: ["number", "null"], minimum: 0, maximum: 1 }, horizon_identifiable: { type: "boolean" }, bootstrap_valid_fraction: { type: "number", minimum: 0, maximum: 1 }, bootstrap_samples: { type: "integer", minimum: 10000 }, robustness_profile_version: { const: "0.2-R1" }, censoring_bound_lower: { type: "number", minimum: 0, maximum: 100 }, censoring_bound_upper: { type: "number", minimum: 0, maximum: 100 }, censoring_bound_width: { type: "number", minimum: 0, maximum: 100 }, loo_max_absolute_shift: { type: ["number", "null"], minimum: 0, maximum: 100 }, loo_unidentifiable_exclusions: { type: "integer", minimum: 0 }, support_at_10000: { type: "integer", minimum: 0 }, early_exit_count: { type: "integer", minimum: 0 },
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
    telemetry: { oneOf: [{ type: "object", additionalProperties: false, required: ["profile_version", "schema_version", "conformance_status", "signature_algorithm", "canonicalization", "signature_scope", "total_events", "verified_signatures", "invalid_signatures", "unknown_key_ids", "expired_key_events", "revoked_key_events", "hash_chain_mismatches", "deployment_streams", "key_manifest_uri", "key_manifest_sha256", "verification_report_uri", "verification_report_sha256", "root_commitments_uri", "root_commitments_sha256"], properties: {
      profile_version: { const: "0.2-T1" }, schema_version: { const: "0.2" }, conformance_status: { const: "passed" }, signature_algorithm: { const: "Ed25519" }, canonicalization: { const: "RFC8785_JCS" }, signature_scope: { const: "current_event_without_signature" }, total_events: { type: "integer", minimum: 1 }, verified_signatures: { type: "integer", minimum: 1 }, invalid_signatures: { const: 0 }, unknown_key_ids: { const: 0 }, expired_key_events: { const: 0 }, revoked_key_events: { const: 0 }, hash_chain_mismatches: { const: 0 }, deployment_streams: { type: "integer", minimum: 1 }, key_manifest_uri: uri, key_manifest_sha256: digest, verification_report_uri: uri, verification_report_sha256: digest, root_commitments_uri: uri, root_commitments_sha256: digest,
    } }, notApplicable] },
    adjudication: { oneOf: [endpointAdjudicationSummary, notApplicable] },
    withdrawal: { oneOf: [withdrawalSummary, notApplicable] },
    evidence: { type: "array", minItems: 2, items: { type: "object", additionalProperties: false, required: ["role", "uri", "sha256", "public"], properties: { role: { enum: ["preregistration_integrity_report", "sampling_stopping_report", "protocol_deviation_report", "cohort_summary", "cohort_integrity_report", "exposure_integrity_report", "analysis_reproduction_report", "analysis_code", "endpoint_adjudication_report", "human_measures_report", "learning_generalization_report", "assistance_integrity_report", "policy_evolution_report", "privacy_integrity_report", "service_continuity_report", "telemetry_authenticity_report", "incident_register", "safety_case", "security_assessment", "intervention_register", "version_history", "withdrawal_results", "simulation_report", "lab_report", "other"] }, uri, sha256: digest, public: { type: "boolean" } } } },
    privacy: { type: "object", additionalProperties: false, required: ["participant_data_included", "redaction_reviewed", "public_pack_contains_aggregate_data_only"], properties: { participant_data_included: { const: false }, redaction_reviewed: { const: true }, public_pack_contains_aggregate_data_only: { const: true } } },
    audit: { type: "object", additionalProperties: false, required: ["profile_version", "auditor", "auditor_organization", "independence_statement", "scope", "signed_at", "signature_algorithm", "canonicalization", "signature_scope", "public_key_uri", "public_key_base64url", "public_key_sha256", "credential", "manifest_sha256", "auditor_signature"], properties: {
      profile_version: { const: "0.2-V1" }, auditor: { type: "string", minLength: 1 }, auditor_organization: { type: "string", minLength: 1 }, independence_statement: { type: "string", minLength: 20 }, scope: { type: "array", minItems: 1, items: { type: "string" } }, signed_at: { type: "string", format: "date-time" }, signature_algorithm: { const: "Ed25519" }, canonicalization: { const: "RFC8785_JCS" }, signature_scope: { const: "audit_manifest_without_audit.manifest_sha256_and_audit.auditor_signature" }, public_key_uri: { type: "string", format: "uri", pattern: "^https://" }, public_key_base64url: { type: "string", pattern: "^[A-Za-z0-9_-]{43}$" }, public_key_sha256: digest, credential: auditorCredentialSchema, manifest_sha256: digest, auditor_signature: { type: "string", pattern: "^[A-Za-z0-9_-]{86}$" },
    } },
  },
  allOf: [
    {
      if: { properties: { submission: { properties: { target_certification: { const: "PREQUALIFIED" } }, required: ["target_certification"] } } },
      then: { properties: {
        cohort: { properties: { independent_environments: { const: 0 }, total_resident_hours: { const: 0 } } },
        cohort_integrity: notApplicable, exposure_integrity: notApplicable, analysis_reproduction: notApplicable, primary: notApplicable, human_measures: notApplicable, learning_generalization: notApplicable, assistance_integrity: notApplicable, policy_evolution_integrity: notApplicable, privacy_integrity: notApplicable, service_continuity: notApplicable, diagnostics: notApplicable, safety: notApplicable, telemetry: notApplicable, adjudication: notApplicable,
        withdrawal: notApplicable,
        evidence: { contains: { properties: { role: { const: "simulation_report" } }, required: ["role"] }, minContains: 1 },
      } },
    },
    {
      if: { properties: { submission: { properties: { target_certification: { const: "WANTED_LAB" } }, required: ["target_certification"] } } },
      then: { properties: {
        cohort: { properties: { independent_environments: { minimum: 1 }, total_resident_hours: { minimum: 100 } } },
        cohort_integrity: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_LAB" } } }] }, exposure_integrity: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_LAB" } } }] }, analysis_reproduction: notApplicable, primary: notApplicable, human_measures: { not: notApplicable }, learning_generalization: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_LAB" } } }] }, assistance_integrity: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_LAB" } } }] }, policy_evolution_integrity: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_LAB" } } }] }, privacy_integrity: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_LAB" } } }] }, service_continuity: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_LAB" } } }] }, diagnostics: { not: notApplicable }, safety: { not: notApplicable }, telemetry: { not: notApplicable }, adjudication: { not: notApplicable }, withdrawal: notApplicable,
        evidence: { allOf: [{ contains: { properties: { role: { const: "cohort_integrity_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "exposure_integrity_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "human_measures_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "learning_generalization_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "assistance_integrity_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "policy_evolution_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "telemetry_authenticity_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "lab_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "safety_case" } }, required: ["role"] }, minContains: 1 }] },
      } },
    },
    {
      if: { properties: { submission: { properties: { target_certification: { const: "WANTED_WILD" } }, required: ["target_certification"] } } },
      then: { properties: {
        cohort: { properties: { independent_environments: { minimum: 20 }, total_resident_hours: { minimum: 10000 } } },
        cohort_integrity: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_WILD" } } }] }, exposure_integrity: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_WILD" } } }] }, analysis_reproduction: { not: notApplicable }, primary: { not: notApplicable }, human_measures: { not: notApplicable }, learning_generalization: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_WILD" } } }] }, assistance_integrity: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_WILD" } } }] }, policy_evolution_integrity: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_WILD" } } }] }, privacy_integrity: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_WILD" } } }] }, service_continuity: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_WILD" } } }] }, diagnostics: { not: notApplicable }, safety: { not: notApplicable }, telemetry: { not: notApplicable }, adjudication: { not: notApplicable },
        evidence: { allOf: [{ contains: { properties: { role: { const: "cohort_integrity_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "exposure_integrity_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "analysis_reproduction_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "human_measures_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "learning_generalization_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "assistance_integrity_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "policy_evolution_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "telemetry_authenticity_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "safety_case" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "analysis_code" } }, required: ["role"] }, minContains: 1 }] },
      } },
    },
    {
      if: { properties: { submission: { properties: { target_certification: { const: "WANTED_10K" } }, required: ["target_certification"] } } },
      then: { properties: {
        cohort: { properties: { independent_environments: { minimum: 1 }, total_resident_hours: { minimum: 10000 }, lifetime_completions: { minimum: 1 } } },
        cohort_integrity: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_10K" } } }] }, exposure_integrity: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_10K" } } }] }, analysis_reproduction: notApplicable, primary: notApplicable, human_measures: { not: notApplicable }, learning_generalization: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_10K" } } }] }, assistance_integrity: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_10K" } } }] }, policy_evolution_integrity: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_10K" } } }] }, privacy_integrity: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_10K" } } }] }, service_continuity: { allOf: [{ not: notApplicable }, { properties: { target_certification: { const: "WANTED_10K" } } }] }, diagnostics: { not: notApplicable }, safety: { not: notApplicable }, telemetry: { not: notApplicable }, adjudication: { not: notApplicable },
        withdrawal: { allOf: [{ not: notApplicable }, { properties: { profile_version: { const: "0.2-W1" }, eligible: { minimum: 1 }, completed: { minimum: 1 }, reacquisition_rate: { type: "number" } } }] },
        evidence: { allOf: [{ contains: { properties: { role: { const: "cohort_integrity_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "exposure_integrity_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "human_measures_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "learning_generalization_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "assistance_integrity_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "policy_evolution_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "telemetry_authenticity_report" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "withdrawal_results" } }, required: ["role"] }, minContains: 1 }, { contains: { properties: { role: { const: "safety_case" } }, required: ["role"] }, minContains: 1 }] },
      } },
    },
    {
      if: { properties: { submission: { properties: { target_certification: { enum: ["WANTED_LAB", "WANTED_WILD", "WANTED_10K"] } }, required: ["target_certification"] } } },
      then: { properties: { evidence: { allOf: [
        { contains: { properties: { role: { const: "privacy_integrity_report" } }, required: ["role"] }, minContains: 1 },
        { contains: { properties: { role: { const: "service_continuity_report" } }, required: ["role"] }, minContains: 1 },
        { contains: { properties: { role: { const: "endpoint_adjudication_report" } }, required: ["role"] }, minContains: 1 },
      ] } } },
    },
    { properties: { evidence: { contains: { properties: { role: { const: "preregistration_integrity_report" } }, required: ["role"] }, minContains: 1 } } },
    { properties: { evidence: { contains: { properties: { role: { const: "sampling_stopping_report" } }, required: ["role"] }, minContains: 1 } } },
    { properties: { evidence: { contains: { properties: { role: { const: "protocol_deviation_report" } }, required: ["role"] }, minContains: 1 } } },
  ],
};

const hash = (character: string) => `${character}${"0123456789abcdef".repeat(4)}`.slice(0,64);
const diagnosticMetrics = calculateDiagnostics(diagnosticExample).metrics;
if (!diagnosticMetrics) throw new Error("Synthetic diagnostic profile must be calculable.");
const preflightAssessment = assessPreflight(preflightTemplate);
if (!preflightAssessment.summary || preflightAssessment.status !== "passed") throw new Error("Synthetic preflight profile must pass.");

function preregistrationIntegrityAuditSummary(target: "PREQUALIFIED" | "WANTED_LAB" | "WANTED_WILD" | "WANTED_10K") {
  const source = preregistrationTemplateFor(target), assessment = assessPreregistrationIntegrity(source);
  if (!assessment.summary || assessment.status !== "passed") throw new Error(`Synthetic ${target} preregistration-integrity profile must pass.`);
  const boundaries = [source.original.first_preflight_trial_at,source.original.first_screening_decision_at,source.original.first_resident_hour_at].filter((value): value is string=>typeof value==="string").sort();
  return { ...assessment.summary, manifest_uri: source.evidence.controlled_amendment_register_uri, manifest_sha256: source.evidence.controlled_amendment_register_sha256, registered_at: source.original.registered_at, first_benchmark_activity_at: boundaries[0], qualified_assessor: source.assessor.name, assessor_attested: source.assessor.attested };
}
function protocolDeviationAuditSummary(target: "PREQUALIFIED" | "WANTED_LAB" | "WANTED_WILD" | "WANTED_10K") {
  const source = deviationTemplateFor(target), assessment = assessProtocolDeviations(source);
  if (!assessment.summary || assessment.status !== "passed") throw new Error(`Synthetic ${target} protocol-deviation profile must pass.`);
  return { ...assessment.summary, manifest_uri: source.evidence.controlled_register_uri, manifest_sha256: source.evidence.controlled_register_sha256, qualified_assessor: source.assessor.name, assessor_attested: source.assessor.attested };
}
function samplingStoppingAuditSummary(target: "PREQUALIFIED" | "WANTED_LAB" | "WANTED_WILD" | "WANTED_10K") {
  const source = samplingStoppingTemplateFor(target), assessment = assessSamplingStopping(source);
  if (!assessment.summary || assessment.status !== "passed") throw new Error(`Synthetic ${target} sampling-and-stopping profile must pass.`);
  return { ...assessment.summary, manifest_uri: source.evidence.controlled_plan_uri, manifest_sha256: source.evidence.controlled_plan_sha256, qualified_assessor: source.assessor.name, assessor_attested: source.assessor.attested };
}
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
function exposureIntegrityAuditSummary(target: "WANTED_LAB" | "WANTED_WILD" | "WANTED_10K") {
  const source = exposureLedgerTemplateFor(target);
  const assessment = assessExposureLedger(source);
  if (!assessment.summary || assessment.status !== "passed") throw new Error(`Synthetic ${target} exposure-ledger profile must pass.`);
  return { ...assessment.summary, status: "passed", manifest_uri: "https://example.org/wanted-exposure-integrity.json", manifest_sha256: hash("eb"), qualified_assessor: source.assessor.name, assessor_attested: source.assessor.attested };
}
function analysisReproductionAuditSummary() {
  analysisReproductionTemplate.upstream_bindings.endpoint_decisions_sha256 = hash("e1");
  const assessment = assessAnalysisReproduction(analysisReproductionTemplate);
  if (!assessment.summary || assessment.status !== "passed") throw new Error("Synthetic WANTED_WILD analysis-reproduction profile must pass.");
  return { ...assessment.summary, status: "passed", manifest_uri: "https://example.org/wanted-analysis-reproduction.json", manifest_sha256: hash("aa"), ...analysisReproductionTemplate.upstream_bindings, qualified_assessor: analysisReproductionTemplate.assessor.name, assessor_attested: analysisReproductionTemplate.assessor.attested };
}
const analysisReproductionSummaryValue = analysisReproductionAuditSummary();
function withdrawalAuditSummary(target: "WANTED_WILD" | "WANTED_10K") {
  const source = withdrawalTemplateFor(target);
  source.upstream_bindings.endpoint_decisions_sha256 = hash("e1");
  const assessment = assessWithdrawal(source);
  if (!assessment.summary || assessment.status !== "passed") throw new Error(`Synthetic ${target} withdrawal profile must pass.`);
  return { ...assessment.summary, manifest_uri: source.evidence.withdrawal_register_uri, manifest_sha256: source.evidence.withdrawal_register_sha256, ...source.upstream_bindings, qualified_assessor: source.assessor.name, assessor_attested: source.assessor.attested };
}
function humanMeasuresAuditSummary(target: "WANTED_LAB" | "WANTED_WILD" | "WANTED_10K") {
  const source = humanMeasuresTemplateFor(target);
  const assessment = assessHumanMeasures(source);
  if (!assessment.summary || assessment.status !== "passed") throw new Error(`Synthetic ${target} human-measures profile must pass.`);
  return { ...assessment.summary, status: "passed", manifest_uri: source.evidence.controlled_response_register_uri, manifest_sha256: source.evidence.controlled_response_register_sha256, ...source.upstream_bindings, qualified_assessor: source.assessor.name, assessor_attested: source.assessor.attested };
}
function learningGeneralizationAuditSummary(target: "WANTED_LAB" | "WANTED_WILD" | "WANTED_10K") {
  const source = learningTemplateFor(target);
  const assessment = assessLearning(source);
  if (!assessment.summary || assessment.status !== "passed") throw new Error(`Synthetic ${target} learning-generalization profile must pass.`);
  return { ...assessment.summary, manifest_uri: source.evidence.controlled_trial_register_uri, manifest_sha256: source.evidence.controlled_trial_register_sha256, ...source.upstream_bindings, qualified_assessor: source.assessor.name, assessor_attested: source.assessor.attested };
}
function assistanceIntegrityAuditSummary(target: "WANTED_LAB" | "WANTED_WILD" | "WANTED_10K") {
  const source = assistanceTemplateFor(target);
  const assessment = assessAssistance(source);
  if (!assessment.summary || assessment.status !== "passed") throw new Error(`Synthetic ${target} assistance-integrity profile must pass.`);
  return { ...assessment.summary, manifest_uri: source.evidence.controlled_intervention_register_uri, manifest_sha256: source.evidence.controlled_intervention_register_sha256, ...source.upstream_bindings, qualified_assessor: source.assessor.name, assessor_attested: source.assessor.attested };
}
function policyEvolutionAuditSummary(target: "WANTED_LAB" | "WANTED_WILD" | "WANTED_10K") {
  const source = policyEvolutionTemplateFor(target), original = source.baseline_artifact_sha256, baseline = preflightTemplate.policy_artifact_sha256;
  source.baseline_artifact_sha256 = baseline;
  source.upstream_bindings.baseline_policy_sha256 = baseline;
  source.upstream_bindings.exposure_integrity_sha256 = exposureIntegrityAuditSummary(target).manifest_sha256;
  source.upstream_bindings.telemetry_authenticity_sha256 = hash("9b");
  source.upstream_bindings.preregistration_sha256 = hash("b");
  source.evidence.controlled_policy_register_sha256 = hash("e1");
  source.evidence.release_manifest_bundle_sha256 = hash("e2");
  source.artifacts.forEach(artifact => { if (artifact.artifact_sha256 === original) artifact.artifact_sha256 = baseline; if (artifact.parent_artifact_sha256 === original) artifact.parent_artifact_sha256 = baseline; });
  source.changes.forEach(change => { if (change.from_artifact_sha256 === original) change.from_artifact_sha256 = baseline; if (change.to_artifact_sha256 === original) change.to_artifact_sha256 = baseline; });
  source.deployment_segments.forEach(segment => { if (segment.artifact_sha256 === original) segment.artifact_sha256 = baseline; });
  source.claimed = reproducePolicyEvolution(source.environments, source.artifacts, source.changes, source.deployment_segments, baseline);
  const assessment = assessPolicyEvolution(source);
  if (!assessment.summary || assessment.status !== "passed") throw new Error(`Synthetic ${target} policy-evolution profile must pass.`);
  const { artifact_exposure: _artifactExposure, ...summary } = assessment.summary;
  return { ...summary, manifest_uri: source.evidence.controlled_policy_register_uri, manifest_sha256: source.evidence.controlled_policy_register_sha256, baseline_artifact_sha256: baseline, exposure_integrity_sha256: source.upstream_bindings.exposure_integrity_sha256, telemetry_authenticity_sha256: source.upstream_bindings.telemetry_authenticity_sha256, preregistration_sha256: source.upstream_bindings.preregistration_sha256, qualified_assessor: source.assessor.name, assessor_attested: source.assessor.attested };
}
function privacyIntegrityAuditSummary(target: "WANTED_LAB" | "WANTED_WILD" | "WANTED_10K") {
  const source = privacyTemplateFor(target), assessment = assessPrivacy(source);
  if (!assessment.summary || assessment.status !== "passed") throw new Error(`Synthetic ${target} privacy-integrity profile must pass.`);
  return { ...assessment.summary, manifest_uri: source.evidence.controlled_privacy_register_uri, manifest_sha256: source.evidence.controlled_privacy_register_sha256, ...source.upstream_bindings, qualified_assessor: source.assessor.name, assessor_attested: source.assessor.attested };
}
function serviceContinuityAuditSummary(target: "WANTED_LAB" | "WANTED_WILD" | "WANTED_10K") {
  const source = serviceTemplateFor(target);
  source.upstream_bindings.preregistration_sha256 = hash("b");
  source.upstream_bindings.exposure_integrity_sha256 = exposureIntegrityAuditSummary(target).manifest_sha256;
  source.upstream_bindings.telemetry_authenticity_sha256 = hash("9b");
  source.upstream_bindings.assistance_integrity_sha256 = assistanceIntegrityAuditSummary(target).manifest_sha256;
  source.upstream_bindings.robot_policy_sha256 = preflightTemplate.policy_artifact_sha256;
  const assessment = assessServiceContinuity(source);
  if (!assessment.summary || assessment.status !== "passed") throw new Error(`Synthetic ${target} service-continuity profile must pass.`);
  return { ...assessment.summary, manifest_uri: source.evidence.controlled_service_register_uri, manifest_sha256: source.evidence.controlled_service_register_sha256, ...source.upstream_bindings, qualified_assessor: source.assessor.name, assessor_attested: source.assessor.attested };
}
function endpointAdjudicationAuditSummary(target: "WANTED_LAB" | "WANTED_WILD" | "WANTED_10K") {
  const source = endpointTemplateFor(target);
  source.upstream_bindings.preregistration_sha256 = hash("b");
  source.upstream_bindings.cohort_integrity_sha256 = cohortIntegrityAuditSummary(target).manifest_sha256;
  source.upstream_bindings.exposure_integrity_sha256 = exposureIntegrityAuditSummary(target).manifest_sha256;
  source.upstream_bindings.telemetry_authenticity_sha256 = hash("9b");
  const assessment = assessEndpointAdjudication(source);
  if (!assessment.summary || assessment.status !== "passed") throw new Error(`Synthetic ${target} endpoint-adjudication profile must pass.`);
  return { ...assessment.summary, manifest_uri: source.evidence.controlled_decision_register_uri, manifest_sha256: source.evidence.controlled_decision_register_sha256, ...source.upstream_bindings, qualified_assessor: source.assessor.name, assessor_attested: source.assessor.attested };
}
function diagnosticsWithIntegrity(assistance: ReturnType<typeof assistanceIntegrityAuditSummary>, service: ReturnType<typeof serviceContinuityAuditSummary>) {
  return { profile_version: "0.2-D1", ...diagnosticMetrics, learning_delta: null, generalization: { ratio: null, familiar: null, novel: null }, assistance_minutes_per_100_hours: assistance.assistance_minutes_per_100_hours, autonomous_availability: service.autonomous_available_fraction, mean_time_between_human_rescue: { estimate_hours: assistance.mean_time_between_human_rescue_hours, no_event_lower_bound_hours: assistance.no_rescue_lower_bound_hours, events: assistance.rescue_events, exposure_hours: assistance.resident_hours } };
}
const assistanceIntegritySummaryValue = assistanceIntegrityAuditSummary("WANTED_WILD");
const policyEvolutionSummaryValue = policyEvolutionAuditSummary("WANTED_WILD");
const privacyIntegritySummaryValue = privacyIntegrityAuditSummary("WANTED_WILD");
const serviceContinuitySummaryValue = serviceContinuityAuditSummary("WANTED_WILD");
const endpointAdjudicationSummaryValue = endpointAdjudicationAuditSummary("WANTED_WILD");
const preregistrationIntegritySummaryValue = preregistrationIntegrityAuditSummary("WANTED_WILD");
const protocolDeviationSummaryValue = protocolDeviationAuditSummary("WANTED_WILD");
const samplingStoppingSummaryValue = samplingStoppingAuditSummary("WANTED_WILD");

const auditManifestTemplateBase = {
  protocol_version: "0.2",
  submission_mode: "test",
  submission: { submission_id: "SYNTHETIC-WANTED-001", created_at: "2026-08-28T19:00:00Z", target_certification: "WANTED_WILD", public_label: "Synthetic Robot / Demonstration Cohort" },
  organization: { sponsor: "Synthetic Robotics", study_operator: "Synthetic Field Lab", contact_uri: "https://example.org/wanted-contact" },
  robot: { manufacturer: "Synthetic Robotics", model: "Example H1", hardware_version: "hw-1.0", policy_version: "policy-example-abc123", support_model_version: "support-1.0", description_format: "URDF", description_sha256: preflightTemplate.robot_description_sha256, policy_artifact_sha256: preflightTemplate.policy_artifact_sha256 },
  study: { study_id: "SYNTHETIC-STUDY-001", preregistration_uri: "https://example.org/wanted-preregistration.json", preregistration_sha256: hash("b"), preregistration_frozen_at: "2025-12-01T00:00:00Z", first_resident_hour_at: "2026-01-02T00:00:00Z", jurisdictions: ["US-CA"], ethics_review_reference: "SYNTHETIC-IRB-001" },
  preregistration_integrity: preregistrationIntegritySummaryValue,
  sampling_stopping: samplingStoppingSummaryValue,
  protocol_deviations: protocolDeviationSummaryValue,
  preflight: { profile_version: "0.2-P1", status: "passed", scenario_manifest_uri: preflightTemplate.scenario_manifest_uri, scenario_manifest_sha256: preflightTemplate.scenario_manifest_sha256, ...preflightSummary, robot_description_sha256: preflightTemplate.robot_description_sha256, policy_artifact_sha256: preflightTemplate.policy_artifact_sha256, production_interface_exercised: true, qualified_assessor: preflightTemplate.assessor.name, assessor_attested: true },
  cohort: { independent_environments: 24, total_resident_hours: 120000, lifetime_completions: 8, voluntary_rejections: 4, unrelated_censors: 12, safety_terminations: 0, developer_withdrawals: 0, consent_privacy_withdrawals: 0 },
  cohort_integrity: cohortIntegrityAuditSummary("WANTED_WILD"),
  exposure_integrity: exposureIntegrityAuditSummary("WANTED_WILD"),
  analysis_reproduction: analysisReproductionSummaryValue,
  primary: { wanted_score: analysisReproductionSummaryValue.wanted_score, ci95_lower: analysisReproductionSummaryValue.ci95_lower, ci95_upper: analysisReproductionSummaryValue.ci95_upper, survival_at_10000: analysisReproductionSummaryValue.survival_at_10000, horizon_identifiable: true, bootstrap_valid_fraction: analysisReproductionSummaryValue.bootstrap_valid_fraction, bootstrap_samples: analysisReproductionSummaryValue.bootstrap_samples, robustness_profile_version: "0.2-R1", censoring_bound_lower: analysisReproductionSummaryValue.censoring_bound_lower, censoring_bound_upper: analysisReproductionSummaryValue.censoring_bound_upper, censoring_bound_width: analysisReproductionSummaryValue.censoring_bound_width, loo_max_absolute_shift: analysisReproductionSummaryValue.loo_max_absolute_shift, loo_unidentifiable_exclusions: analysisReproductionSummaryValue.loo_unidentifiable_exclusions, support_at_10000: analysisReproductionSummaryValue.support_at_10000, early_exit_count: analysisReproductionSummaryValue.early_exit_count },
  human_measures: humanMeasuresAuditSummary("WANTED_WILD"),
  learning_generalization: learningGeneralizationAuditSummary("WANTED_WILD"),
  assistance_integrity: assistanceIntegritySummaryValue,
  policy_evolution_integrity: policyEvolutionSummaryValue,
  privacy_integrity: privacyIntegritySummaryValue,
  service_continuity: serviceContinuitySummaryValue,
  diagnostics: diagnosticsWithIntegrity(assistanceIntegritySummaryValue, serviceContinuitySummaryValue),
  safety: { profile_version: "0.2-S1", gate_status: "passed", manifest_uri: "https://example.org/wanted-safety-case.json", manifest_sha256: hash("7"), robot_description_sha256: safetyTemplate.deployment_scope.robot_description_sha256, policy_artifact_sha256: safetyTemplate.deployment_scope.policy_artifact_sha256, ...safetySummary, incident_counts: { L0: 2841, L1: 72, L2: 9, L3: 1, L4: 0 }, qualified_assessor: safetyTemplate.assessor.name, assessor_attested: true, assessment_uri: safetyTemplate.assessor.assessment_uri, assessment_sha256: safetyTemplate.assessor.assessment_sha256, applicable_rules: safetyTemplate.applicable_requirements.rules },
  telemetry: { profile_version: "0.2-T1", schema_version: "0.2", conformance_status: "passed", signature_algorithm: "Ed25519", canonicalization: "RFC8785_JCS", signature_scope: "current_event_without_signature", total_events: 2400000, verified_signatures: 2400000, invalid_signatures: 0, unknown_key_ids: 0, expired_key_events: 0, revoked_key_events: 0, hash_chain_mismatches: 0, deployment_streams: 24, key_manifest_uri: "https://example.org/wanted-telemetry-keys.json", key_manifest_sha256: hash("9a"), verification_report_uri: "https://example.org/wanted-telemetry-authenticity.json", verification_report_sha256: hash("9b"), root_commitments_uri: "https://example.org/wanted-roots.json", root_commitments_sha256: hash("d") },
  adjudication: endpointAdjudicationSummaryValue,
  withdrawal: withdrawalAuditSummary("WANTED_WILD"),
  evidence: [
    { role: "preregistration_integrity_report", uri: "https://example.org/wanted-preregistration-amendments.json", sha256: hash("f1"), public: true },
    { role: "sampling_stopping_report", uri: "https://example.org/wanted-sampling-stop-plan.json", sha256: hash("95"), public: true },
    { role: "protocol_deviation_report", uri: "https://example.org/wanted-protocol-deviations.json", sha256: hash("e3"), public: true },
    { role: "simulation_report", uri: "https://example.org/wanted-preflight-report.json", sha256: hash("6"), public: true },
    { role: "cohort_summary", uri: "https://example.org/wanted-cohort.json", sha256: hash("f"), public: true },
    { role: "cohort_integrity_report", uri: "https://example.org/wanted-cohort-integrity.json", sha256: hash("ca"), public: true },
    { role: "exposure_integrity_report", uri: "https://example.org/wanted-exposure-integrity.json", sha256: hash("eb"), public: true },
    { role: "analysis_reproduction_report", uri: "https://example.org/wanted-analysis-reproduction.json", sha256: hash("aa"), public: true },
    { role: "analysis_code", uri: "https://example.org/wanted-analysis.tar.gz", sha256: hash("1"), public: true },
    { role: "endpoint_adjudication_report", uri: "https://example.org/wanted-endpoint-decisions.json", sha256: hash("e1"), public: true },
    { role: "human_measures_report", uri: "https://example.org/wanted-human-measures-register.json", sha256: hash("52"), public: true },
    { role: "learning_generalization_report", uri: "https://example.org/wanted-learning-trials.json", sha256: hash("b2"), public: true },
    { role: "assistance_integrity_report", uri: "https://example.org/wanted-intervention-register.json", sha256: hash("c4"), public: true },
    { role: "policy_evolution_report", uri: "https://example.org/wanted-policy-register.json", sha256: hash("e1"), public: true },
    { role: "privacy_integrity_report", uri: "https://example.org/wanted-privacy-register.json", sha256: hash("72"), public: true },
    { role: "service_continuity_report", uri: "https://example.org/wanted-service-register.json", sha256: hash("a7"), public: true },
    { role: "telemetry_authenticity_report", uri: "https://example.org/wanted-telemetry-authenticity.json", sha256: hash("9b"), public: true },
    { role: "incident_register", uri: "https://example.org/wanted-incidents.json", sha256: hash("2"), public: true },
    { role: "safety_case", uri: "https://example.org/wanted-safety-case.json", sha256: hash("7"), public: true },
    { role: "security_assessment", uri: "https://example.org/wanted-security.pdf", sha256: hash("8"), public: true },
    { role: "intervention_register", uri: "https://example.org/wanted-interventions.json", sha256: hash("3"), public: true },
    { role: "version_history", uri: "https://example.org/wanted-versions.json", sha256: hash("4"), public: true },
    { role: "withdrawal_results", uri: "https://example.org/wanted-withdrawal-register.json", sha256: hash("f1"), public: true },
  ],
  privacy: { participant_data_included: false, redaction_reviewed: true, public_pack_contains_aggregate_data_only: true },
  audit: { profile_version: "0.2-V1", auditor: "Synthetic Auditor", auditor_organization: "Independent Example Assurance", independence_statement: "Synthetic example: auditor is organizationally and financially independent of the sponsor.", scope: ["Preregistration freeze and amendment integrity", "Prospective sampling and stopping integrity", "Protocol deviation reconciliation", "Telemetry continuity", "Endpoint dispositions", "Safety evidence", "Score reproduction", "Withdrawal integrity", "Human measures integrity", "Learning and generalization integrity", "Assistance integrity", "Policy evolution integrity", "Privacy and consent integrity", "Service continuity integrity"], signed_at: "2026-08-28T18:00:00Z", signature_algorithm: "Ed25519", canonicalization: "RFC8785_JCS", signature_scope: "audit_manifest_without_audit.manifest_sha256_and_audit.auditor_signature", public_key_uri: "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/auditor-credential.template.json", public_key_base64url: "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo", public_key_sha256: "21fe31dfa154a261626bf854046fd2271b7bed4b6abe45aa58877ef47f9721b9", credential: auditorCredentialTemplate, manifest_sha256: hash("a1"), auditor_signature: "A".repeat(86) },
};

const na = (reason: string) => ({ applicable: false as const, reason });
const syntheticAuditSeals = {
  PREQUALIFIED: { manifest_sha256: "693ca267b0cfc94c76d8817977594d65c8a43b00643a6a0dd0c196b7abb1a65d", auditor_signature: "xUDA5ZFbkQBRUSJskReeqZSuTBfZ7OBn_0i3pE75gWjppTwEMZk3QEnmjhlFp6ue33SVuq8ySzIk4nWedInFAw" },
  WANTED_LAB: { manifest_sha256: "b5be8da2665ec6fdb32a90ce66f1f48aa2b30e9c850d56cefcd402e43ff4d2ba", auditor_signature: "DzbsU2gWn-BLAvQOF4jqEQbMHkG951pc-jvPl3AEj_Q_mBKSlFDPbndkOjAp58w04JoilPjlLROePVubTMy-BA" },
  WANTED_WILD: { manifest_sha256: "c32b746a4811ac8a0a3efc4509b990b5609ff8153f126e46a5822ab3353051ba", auditor_signature: "MBCZjmdT6spxFz3QPx7QJKCyTpxnPtP9cM-p9VV1RT3UuS5saM6b1-W2akmD5BHNaf2dfLXpnAxZ9ndugF_PCg" },
  WANTED_10K: { manifest_sha256: "47c792557194742cb8b2afb2f3c4a35791504fb273fca7d3c1bc4bb8ab8aa7d4", auditor_signature: "lGMHSW3MknoiBsFXPU-MO0pHzGMRnPDvhJY6HkgPvTpxgzL9TS5IKOeBnv6SNU5ENH0T_Rzd-etcmiTdU9nWBQ" },
};
const cloneTemplate = () => JSON.parse(JSON.stringify(auditManifestTemplateBase));
export function auditManifestTemplateFor(target: "PREQUALIFIED" | "WANTED_LAB" | "WANTED_WILD" | "WANTED_10K") {
  const value = cloneTemplate();
  value.submission.target_certification = target;
  value.preregistration_integrity = preregistrationIntegrityAuditSummary(target);
  value.sampling_stopping = samplingStoppingAuditSummary(target);
  value.protocol_deviations = protocolDeviationAuditSummary(target);
  if (target === "PREQUALIFIED") {
    value.cohort = { independent_environments: 0, total_resident_hours: 0, lifetime_completions: 0, voluntary_rejections: 0, unrelated_censors: 0, safety_terminations: 0, developer_withdrawals: 0, consent_privacy_withdrawals: 0 };
    value.cohort_integrity = na("Cohort integrity begins with real participant screening and activation.");
    value.exposure_integrity = na("The signed resident clock begins only with real deployment activation.");
    value.analysis_reproduction = na("Ranked primary-score reproduction applies only to a qualifying WANTED WILD cohort.");
    value.primary = na("No real-environment cohort score exists at simulation-only prequalification.");
    value.human_measures = na("The four-item human instrument begins only with real participant exposure.");
    value.learning_generalization = na("Matched learning and novelty trials begin only with real participant exposure.");
    value.assistance_integrity = na("Assistance integrity begins only with real resident exposure and signed intervention telemetry.");
    value.policy_evolution_integrity = na("Policy evolution integrity begins only with real resident exposure and signed deployment boundaries.");
    value.privacy_integrity = na("Privacy and consent integrity begins only with real participant exposure and observed processing flows.");
    value.service_continuity = na("Service continuity begins only with real resident exposure and observed field operations.");
    value.diagnostics = na("Longitudinal field diagnostics begin only after real resident exposure.");
    value.safety = na("Field safety profile 0.2-S1 begins before real resident exposure, not for simulation-only prequalification.");
    value.telemetry = na("Field event telemetry begins with a WANTED LAB deployment.");
    value.adjudication = na("No human-retention endpoint exists in simulation-only prequalification.");
    value.withdrawal = na("The seven-day withdrawal begins only after a verified 10,000-hour lifetime completion.");
    value.evidence = value.evidence.filter((item: { role: string }) => ["preregistration_integrity_report", "sampling_stopping_report", "protocol_deviation_report", "simulation_report", "version_history"].includes(item.role));
  }
  if (target === "WANTED_LAB") {
    value.cohort = { independent_environments: 1, total_resident_hours: 100, lifetime_completions: 0, voluntary_rejections: 0, unrelated_censors: 0, safety_terminations: 0, developer_withdrawals: 0, consent_privacy_withdrawals: 0 };
    value.cohort_integrity = cohortIntegrityAuditSummary("WANTED_LAB");
    value.exposure_integrity = exposureIntegrityAuditSummary("WANTED_LAB");
    value.analysis_reproduction = na("WANTED LAB has no rankable 10,000-hour cohort W to reproduce.");
    value.telemetry.deployment_streams = 1;
    value.primary = na("WANTED LAB reports field evidence and diagnostics but no rankable 10,000-hour cohort W.");
    value.human_measures = humanMeasuresAuditSummary("WANTED_LAB");
    value.learning_generalization = learningGeneralizationAuditSummary("WANTED_LAB");
    value.assistance_integrity = assistanceIntegrityAuditSummary("WANTED_LAB");
    value.policy_evolution_integrity = policyEvolutionAuditSummary("WANTED_LAB");
    value.privacy_integrity = privacyIntegrityAuditSummary("WANTED_LAB");
    value.service_continuity = serviceContinuityAuditSummary("WANTED_LAB");
    value.adjudication = endpointAdjudicationAuditSummary("WANTED_LAB");
    value.diagnostics = diagnosticsWithIntegrity(value.assistance_integrity, value.service_continuity);
    value.withdrawal = na("WANTED LAB ends before a 10,000-hour lifetime completion can enter withdrawal.");
    value.evidence = value.evidence.filter((item: { role: string }) => item.role !== "withdrawal_results");
    value.evidence.push({ role: "lab_report", uri: "https://example.org/wanted-lab-report.json", sha256: hash("9"), public: true });
  }
  if (target === "WANTED_10K") {
    value.cohort = { independent_environments: 1, total_resident_hours: 10000, lifetime_completions: 1, voluntary_rejections: 0, unrelated_censors: 0, safety_terminations: 0, developer_withdrawals: 0, consent_privacy_withdrawals: 0 };
    value.cohort_integrity = cohortIntegrityAuditSummary("WANTED_10K");
    value.exposure_integrity = exposureIntegrityAuditSummary("WANTED_10K");
    value.analysis_reproduction = na("WANTED 10K is a lifetime badge, not a ranked cohort W analysis.");
    value.telemetry.deployment_streams = 1;
    value.primary = na("WANTED 10K is a one-residence lifetime badge; only a separate qualifying WANTED WILD cohort produces a ranked W.");
    value.human_measures = humanMeasuresAuditSummary("WANTED_10K");
    value.learning_generalization = learningGeneralizationAuditSummary("WANTED_10K");
    value.assistance_integrity = assistanceIntegrityAuditSummary("WANTED_10K");
    value.policy_evolution_integrity = policyEvolutionAuditSummary("WANTED_10K");
    value.privacy_integrity = privacyIntegrityAuditSummary("WANTED_10K");
    value.service_continuity = serviceContinuityAuditSummary("WANTED_10K");
    value.adjudication = endpointAdjudicationAuditSummary("WANTED_10K");
    value.diagnostics = diagnosticsWithIntegrity(value.assistance_integrity, value.service_continuity);
    value.withdrawal = withdrawalAuditSummary("WANTED_10K");
  }
  Object.assign(value.audit, syntheticAuditSeals[target]);
  return value;
}

export const auditManifestTemplates = {
  PREQUALIFIED: auditManifestTemplateFor("PREQUALIFIED"),
  WANTED_LAB: auditManifestTemplateFor("WANTED_LAB"),
  WANTED_WILD: auditManifestTemplateFor("WANTED_WILD"),
  WANTED_10K: auditManifestTemplateFor("WANTED_10K"),
};
export const auditManifestTemplate = auditManifestTemplates.WANTED_WILD;

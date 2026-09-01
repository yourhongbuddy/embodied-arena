import { EXPERIMENT_PRESENTATION_FINGERPRINT,EXPERIMENT_PRESENTATION_IDENTITY,EXPERIMENT_PRESENTATION_NORMALIZATION,EXPERIMENT_PRESENTATION_PROFILE,EXPERIMENT_PRESENTATION_SOURCES } from "./presentation-integrity.ts";
import { EXPERIMENT_ROTATOR_CONFORMANCE_VECTORS,EXPERIMENT_ROTATOR_SDK_VERSION } from "./rotator-sdk-contract.ts";
import { EXPERIMENT_RESULTS_SNAPSHOT_CONFORMANCE_DIGEST,EXPERIMENT_RESULTS_SNAPSHOT_CONFORMANCE_INPUT,EXPERIMENT_RESULTS_SNAPSHOT_PROFILE,EXPERIMENT_SNAPSHOT_VERIFIER_VERSION } from "./snapshot-contract.ts";

export { EXPERIMENT_PRESENTATION_FINGERPRINT,EXPERIMENT_PRESENTATION_IDENTITY,EXPERIMENT_PRESENTATION_NORMALIZATION,EXPERIMENT_PRESENTATION_PROFILE,EXPERIMENT_PRESENTATION_SOURCES };

export const ROTATOR_VERSION = "0.36-R36";
export const EXPERIMENT_ANALYSIS_COHORT = "wanted_landing_v1-C8";
export const EXPERIMENT_ANALYSIS_COHORT_START_VERSION = "0.28-R28";
export const EXPERIMENT_ACTIVE_COHORT_EVENT_VERSIONS=["0.28-R28","0.29-R29","0.30-R30","0.31-R31","0.32-R32","0.33-R33","0.34-R34","0.35-R35","0.36-R36"] as const;
export const EXPERIMENT_ASSIGNMENT_RECEIPT_PROFILE="0.21-AR1";
export const EXPERIMENT_REPORTING_WINDOW_DAYS=30;
export const EXPERIMENT_ANALYSIS_SETTLING_LAG_SECONDS=1;
export const EXPERIMENT_EXPOSURE_RETRY_DELAYS_MS = [2_000,10_000,30_000] as const;
export const EXPERIMENT_GOAL_OUTBOX_MAX_ENTRIES=20;
export const EXPERIMENT_GOAL_OUTBOX_MAX_AGE_MS=86_400_000;

export function validActiveCohortEventVersion(value:unknown):value is typeof EXPERIMENT_ACTIVE_COHORT_EVENT_VERSIONS[number]{return typeof value==="string"&&(EXPERIMENT_ACTIVE_COHORT_EVENT_VERSIONS as readonly string[]).includes(value)}

export const WANTED_LANDING_EXPERIMENT = {
  id: "wanted_landing_v1",
  status: "active",
  audience: "new_and_returning_wanted_landing_visitors",
  assignment_unit: "experiment_scoped_anonymous_browser_unit",
  allocation_basis_points: 10_000,
  salt: "wanted-landing-v1-2026-08-31",
  variants: [
    { id: "control", label: "Retention question", weight_basis_points: 3_400, hypothesis: "The original human-choice framing produces the clearest benchmark understanding." },
    { id: "proof", label: "Evidence first", weight_basis_points: 3_300, hypothesis: "Leading with the single-score proof increases protocol exploration." },
    { id: "developer", label: "Integration first", weight_basis_points: 3_300, hypothesis: "Leading with the integration contract increases developer-kit exploration." },
  ],
  primary_goal: "primary_cta",
  guardrails: ["privacy_choice_checked_before_identifier_creation", "random_assignment_id_contains_no_user_attributes", "unit_id_scoped_to_this_experiment", "unit_id_not_shared_with_third_parties", "server_recomputes_assignment_and_token", "no_IP_storage", "no_fingerprinting", "no_benchmark_or_certification_effect", "preview_overrides_rejected_at_ingestion"],
} as const;

export type WantedVariant = typeof WANTED_LANDING_EXPERIMENT.variants[number]["id"];
export type AssignmentMode = "assigned" | "preview";
export type WantedAssignment = { experiment: typeof WANTED_LANDING_EXPERIMENT.id; variant: WantedVariant; bucket: number | null; mode: AssignmentMode };
export type WantedTreatment={eyebrow:string;headline:readonly[string,string];intro:string;primary:{label:string;href:string};proof:readonly(readonly[string,string])[];cardLabel:string};

export const WANTED_LANDING_TREATMENTS={
  control:{eyebrow:"OPEN TECHNICAL SPEC · VERSION 0.2",headline:["Still wanted","after 10,000 hours?"],intro:"Most benchmarks ask whether a robot can complete a task. WANTED-10K asks whether people continue choosing the robot after novelty fades, hardware ages, routines change, and mistakes accumulate.",primary:{label:"Open protocol kit",href:"/wanted-10k/protocol"},proof:[["10,000","RESIDENT HOURS"],["20+","INDEPENDENT ENVIRONMENTS"],["1","PRIMARY SCORE"],["0","SAFETY TRADE-OFFS"]],cardLabel:"RETENTION / KAPLAN–MEIER"},
  proof:{eyebrow:"ONE SCORE · NON-COMPENSATORY SAFETY · INDEPENDENT AUDIT",headline:["One score for","what happens after the demo."],intro:"WANTED turns continued coexistence into a survival endpoint: time until a person permanently and voluntarily rejects the robot. Every burden stays visible, every safety gate stays absolute, and unsupported tails stay unscored.",primary:{label:"Inspect the evidence chain",href:"/wanted-10k/protocol"},proof:[["W","NORMALIZED RMST"],["10K","FIXED HORIZON"],["95%","CLUSTER CI"],["L4=0","HARD SAFETY GATE"]],cardLabel:"PRIMARY ESTIMATOR / NORMALIZED RMST"},
  developer:{eyebrow:"VENDOR-NEUTRAL · SIX EVENTS · ZERO RUNTIME DEPENDENCIES",headline:["Ten thousand hours.","One integration contract."],intro:"Keep the robot's native stack. Add six signed event types, a continuous resident clock, and a reproducible endpoint table. WANTED supplies the schemas, reference adapter, local verifiers, and immutable audit handoff.",primary:{label:"Integrate a robot",href:"/wanted-10k/sdk"},proof:[["6","EVENT TYPES"],["1","ORDERED CHAIN"],["0","RUNTIME DEPENDENCIES"],["100%","AUDIT BINDING"]],cardLabel:"REFERENCE OUTPUT / RETENTION CURVE"},
} as const satisfies Record<WantedVariant,WantedTreatment>;

export const WANTED_LANDING_SECONDARY_ACTIONS=[
  ["Open HILO Realtime","/wanted-10k/realtime"],["Preflight a policy","/wanted-10k/preflight"],["Verify resident hours","/wanted-10k/exposure-ledger"],["Calculate a cohort","/wanted-10k/calculator"],["Reproduce a score","/wanted-10k/analysis-reproduction"],["Audited registry","/wanted-10k/leaderboard"],["Research basis","/wanted-10k/evidence"],
] as const;

export const WANTED_LANDING_TREATMENT_IDENTITY={
  experiment_id:WANTED_LANDING_EXPERIMENT.id,
  audience:WANTED_LANDING_EXPERIMENT.audience,
  assignment_unit:WANTED_LANDING_EXPERIMENT.assignment_unit,
  allocation_basis_points:WANTED_LANDING_EXPERIMENT.allocation_basis_points,
  salt:WANTED_LANDING_EXPERIMENT.salt,
  variants:WANTED_LANDING_EXPERIMENT.variants,
  primary_goal:WANTED_LANDING_EXPERIMENT.primary_goal,
  treatments:WANTED_LANDING_TREATMENTS,
  secondary_actions:WANTED_LANDING_SECONDARY_ACTIONS,
} as const;

export function canonicalTreatmentJson(value:unknown):string{
  if(value===null||typeof value!=="object")return JSON.stringify(value)??"null";
  if(Array.isArray(value))return`[${value.map(canonicalTreatmentJson).join(",")}]`;
  const record=value as Record<string,unknown>;
  return`{${Object.keys(record).sort().map(key=>`${JSON.stringify(key)}:${canonicalTreatmentJson(record[key])}`).join(",")}}`;
}

export const EXPERIMENT_TREATMENT_FINGERPRINT="sha256:7bce1b31ec607901f180fa99b4ccac6577b54baeee0140b8bb02e591305dda13";

export function fnv1a32(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function validWantedVariant(value: unknown): value is WantedVariant {
  return typeof value === "string" && WANTED_LANDING_EXPERIMENT.variants.some(variant => variant.id === value);
}

export function validExperimentUnitId(value:unknown):value is string{return typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)}

export function wantedVariantForBucket(bucket:number):WantedVariant|null{
  if(!Number.isInteger(bucket)||bucket<0||bucket>=WANTED_LANDING_EXPERIMENT.allocation_basis_points)return null;
  let boundary=0;
  for(const variant of WANTED_LANDING_EXPERIMENT.variants){boundary+=variant.weight_basis_points;if(bucket<boundary)return variant.id}
  return null;
}

export function validWantedSessionAssignment(value:unknown):value is WantedAssignment{
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const assignment=value as Partial<WantedAssignment>;
  return assignment.experiment===WANTED_LANDING_EXPERIMENT.id&&validWantedVariant(assignment.variant)&&assignment.mode==="assigned"&&typeof assignment.bucket==="number"&&wantedVariantForBucket(assignment.bucket)===assignment.variant;
}

export function validWantedSessionAssignmentForUnit(value:unknown,unitId:unknown):value is WantedAssignment{
  if(!validWantedSessionAssignment(value)||!validExperimentUnitId(unitId))return false;
  const canonical=assignWantedVariant(unitId);
  return value.variant===canonical.variant&&value.bucket===canonical.bucket;
}

export function assignWantedVariant(seed: string): WantedAssignment {
  if (typeof seed !== "string" || seed.length < 8 || seed.length > 200) throw new Error("A bounded anonymous assignment ID is required.");
  const bucket = fnv1a32(`${WANTED_LANDING_EXPERIMENT.id}|${WANTED_LANDING_EXPERIMENT.salt}|${seed}`) % WANTED_LANDING_EXPERIMENT.allocation_basis_points;
  const variant=wantedVariantForBucket(bucket);
  if(variant)return{experiment:WANTED_LANDING_EXPERIMENT.id,variant,bucket,mode:"assigned"};
  throw new Error("Experiment allocation does not cover every bucket.");
}

function hashHex(value:string){return fnv1a32(value).toString(16).padStart(8,"0")}

export function exposureTokenForAssignment(unitId:string,variant:WantedVariant){
  if(!validExperimentUnitId(unitId))throw new Error("A valid experiment unit ID is required.");
  const assignment=assignWantedVariant(unitId);
  if(assignment.variant!==variant)throw new Error("The variant does not match the experiment unit assignment.");
  const material=Array.from({length:4},(_,index)=>hashHex(`${WANTED_LANDING_EXPERIMENT.id}|${EXPERIMENT_ANALYSIS_COHORT}|${variant}|${unitId}|${index}`)).join("").split("");
  material[12]="4";material[16]=["8","9","a","b"][parseInt(material[16],16)%4];
  const hex=material.join("");
  return`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export function resolveWantedAssignment(seed: string, previewOverride?: string | null): WantedAssignment {
  if (validWantedVariant(previewOverride)) return { experiment: WANTED_LANDING_EXPERIMENT.id, variant: previewOverride, bucket: null, mode: "preview" };
  return assignWantedVariant(seed);
}

export const EXPERIMENT_DECISION_GATE={
  status:"descriptive_only",
  automatic_action:false,
  blocking_reasons:["rolling_window_continuously_monitored","no_repeated_look_adjustment","no_preregistered_stopping_rule","human_traffic_not_authenticated"],
  required_before_decision:["preregistered_fixed_or_sequential_design","valid_repeated_look_control","independent_edge_abuse_control","precommitted_decision_rule"],
} as const;

export const experimentRotatorContract = {
  version: ROTATOR_VERSION,
  rollout_authorization: { profile: "0.41-RAR1", lab: "/experiments/rollout-lab", module: "/experiments/wanted-rollout-authorization.mjs", contract: "/experiments/rollout-authorization.json", schema: "/experiments/rollout-authorization.schema.json", reference_bundle: "/experiments/rollout-authorization.reference.json", key_manifest: "/experiments/rollout-authorization-keys.json", target_rotator_version: "0.37-R37", target_analysis_cohort: "wanted_landing_v1-C9", runtime_dependencies: 0, performs_network_requests: false, private_key_input_supported: false, automatic_progression: false, changes_live_allocation: false, deploys: false },
  analysis_cohort: { id: EXPERIMENT_ANALYSIS_COHORT, starts_at_implementation_version: EXPERIMENT_ANALYSIS_COHORT_START_VERSION, legacy_versions_included: ["0.28-R28","0.29-R29","0.30-R30","0.31-R31","0.32-R32","0.33-R33","0.34-R34","0.35-R35"], active_event_versions: EXPERIMENT_ACTIVE_COHORT_EVENT_VERSIONS, treatment_fingerprint: EXPERIMENT_TREATMENT_FINGERPRINT, presentation_fingerprint: EXPERIMENT_PRESENTATION_FINGERPRINT, presentation_profile: EXPERIMENT_PRESENTATION_PROFILE, presentation_normalization: EXPERIMENT_PRESENTATION_NORMALIZATION, presentation_sources: EXPERIMENT_PRESENTATION_SOURCES, fingerprint_algorithm: "sha256_canonical_json", aggregation_keys: ["analysis_cohort","treatment_fingerprint","presentation_fingerprint"], implementation_revision_changes_reset_cohort: false, rendered_source_changes_require_new_cohort: true, assignment_or_treatment_change_requires_new_cohort: true, allocation_change_requires_new_cohort: true, measurement_contract_change_requires_new_cohort: true, previous_cohorts: [{id:"wanted_landing_v1-C1",starts_at_implementation_version:"0.14-R14",ends_at_implementation_version:"0.14-R14",current_aggregation:false,reason_closed:"treatment_fingerprint_measurement_contract_added"},{id:"wanted_landing_v1-C2",starts_at_implementation_version:"0.15-R15",ends_at_implementation_version:"0.17-R17",current_aggregation:false,reason_closed:"browser_privacy_choice_eligibility_contract_added"},{id:"wanted_landing_v1-C3",starts_at_implementation_version:"0.18-R18",ends_at_implementation_version:"0.18-R18",current_aggregation:false,reason_closed:"site_opt_out_unit_purge_changes_regeneration_contract"},{id:"wanted_landing_v1-C4",starts_at_implementation_version:"0.19-R19",ends_at_implementation_version:"0.19-R19",current_aggregation:false,reason_closed:"rendered_source_fingerprint_added"},{id:"wanted_landing_v1-C5",starts_at_implementation_version:"0.20-R20",ends_at_implementation_version:"0.20-R20",current_aggregation:false,reason_closed:"server_assignment_receipt_added"},{id:"wanted_landing_v1-C6",starts_at_implementation_version:"0.21-R21",ends_at_implementation_version:"0.26-R26",current_aggregation:false,reason_closed:"explicit_server_utc_analysis_window_boundaries_added"},{id:"wanted_landing_v1-C7",starts_at_implementation_version:"0.27-R27",ends_at_implementation_version:"0.27-R27",current_aggregation:false,reason_closed:"settled_d1_clock_snapshot_boundary_added"}] },
  privacy: { persistent_identifier: "experiment_scoped_random_assignment_id", transmitted_identifier: "experiment_unit_session_and_exposure_token", assignment_id_contains_user_attributes: false, separate_device_identifier: false, identifies_person: false, identifies_household: false, identifies_device: false, unit_id_scope: WANTED_LANDING_EXPERIMENT.id, unit_id_cross_experiment_linkage: false, browser_storage_partitioning_may_create_multiple_units: true, site_opt_out_control_path: "/experiments", site_opt_out_storage_key: "ea_analytics_opt_out", site_opt_out_clears_local_analytics_state: true, site_opt_out_preserves_unrelated_browser_state: true, browser_privacy_signals_honored: ["global_privacy_control","do_not_track"], privacy_exclusion_precedes_identifier_creation: true, privacy_excluded_general_analytics_sent: false, privacy_excluded_experiment_analytics_sent: false, IP_storage: false, fingerprinting: false, third_party_analytics: false, event_retention_days: 35, deletion_mechanism: "delete_before_each_accepted_insert_and_results_read", deletion_triggers: ["accepted_insert","analytics_summary_read","experiment_results_read"] },
  assignment: { unit: "experiment_scoped_anonymous_browser_unit", unit_represents: "one_first_party_browser_profile_storage_instance", assignment_material: "random_experiment_scoped_unit_id", eligibility_checked_before_identifier_creation: true, eligibility_exclusions: ["site_opt_out","global_privacy_control","do_not_track"], privacy_exclusion_behavior: "control_or_named_preview_excluded", persistence_storage: "first_party_local_storage", persistence_write_readback_required: true, storage_unavailable_behavior: "control_or_named_preview_excluded", server_recomputable: true, analysis_unit_matches_assignment_unit: true, algorithm: "FNV1a_32", modulus: 10_000, stable_per_device: false, stable_per_browser_profile_storage: true, stable_per_session: true, stable_after_storage_clear: false, stable_across_private_browsing_sessions: false, cross_browser_identity_resolution: false, cross_device_identity_resolution: false, human_identity_resolution: false, unit_regeneration_conditions: ["site_data_cleared","site_analytics_opt_out_then_reenabled","private_browsing_session_recreated","different_browser_profile","different_device"], session_lock_scope: "analysis_cohort_experiment", session_lock_revalidated_against_persistent_unit: true, invalid_session_lock_behavior: "replace_with_recomputed_assignment", one_assigned_variant_per_session: true, one_assigned_variant_per_unit: true, query_override: "wanted_variant", invalid_override: "ignored", pre_assignment_presentation: "neutral_noninteractive" },
  assignment_sdk: { version: EXPERIMENT_ROTATOR_SDK_VERSION, module: "/experiments/wanted-rotator.mjs", contract: "/experiments/rotator-sdk.json", lab: "/experiments/assignment-lab", lab_contract: "/experiments/assignment-lab.json", source_digest_field: "source_sha256", runtime_dependencies: 0, performs_network_requests: false, conformance_vectors: EXPERIMENT_ROTATOR_CONFORMANCE_VECTORS, changes_assignment: false, issues_server_receipt: false, authenticates_traffic: false, lab_uses_synthetic_units_only: true, lab_sends_general_analytics: false, lab_sends_experiment_analytics: false, lab_flushes_goal_outbox: false, lab_counts_exposures: false, lab_supports_version_selection: false },
  decision_design_lab: { profile: "0.34-DL1", route: "/experiments/design-lab", contract: "/experiments/design-lab.json", plan_schema: "/experiments/design-plan.schema.json", reference_plan: "/experiments/design-plan.reference.json", verifier: { profile: "0.35-DPV1", module: "/experiments/wanted-design-plan.mjs", contract: "/experiments/design-plan-verifier.json", runtime_dependencies: 0, performs_network_requests: false }, registration_verifier: { profile: "0.36-DPR1", lab: "/experiments/registration-lab", module: "/experiments/wanted-design-registration.mjs", contract: "/experiments/design-registration.json", schema: "/experiments/design-registration.schema.json", reference_bundle: "/experiments/design-registration.reference.json", runtime_dependencies: 0, performs_network_requests: false }, decision_policy: { profile: "0.37-DSP1", lab: "/experiments/decision-lab", module: "/experiments/wanted-decision-policy.mjs", contract: "/experiments/decision-policy.json", schema: "/experiments/decision-policy.schema.json", reference_bundle: "/experiments/decision-policy.reference.json", runtime_dependencies: 0, performs_network_requests: false, uses_rolling_dashboard: false, automatic_deployment: false, human_approval_required: true }, decision_evidence_seal: { profile: "0.38-DEA1", lab: "/experiments/evidence-seal-lab", module: "/experiments/wanted-decision-evidence.mjs", contract: "/experiments/decision-evidence.json", schema: "/experiments/decision-evidence.schema.json", reference_bundle: "/experiments/decision-evidence.reference.json", key_manifest: "/experiments/decision-evidence-keys.json", runtime_dependencies: 0, performs_network_requests: false, automatic_deployment: false, human_approval_required: true }, decision_approval: { profile: "0.39-DAR1", lab: "/experiments/approval-lab", module: "/experiments/wanted-decision-approval.mjs", contract: "/experiments/decision-approval.json", schema: "/experiments/decision-approval.schema.json", reference_bundle: "/experiments/decision-approval.reference.json", key_manifest: "/experiments/decision-approval-keys.json", runtime_dependencies: 0, performs_network_requests: false, private_key_input_supported: false, automatic_deployment: false, changes_live_allocation: false }, rollout_package: { profile: "0.40-RP1", lab: "/experiments/rollout-lab", module: "/experiments/wanted-rollout-package.mjs", contract: "/experiments/rollout-package.json", schema: "/experiments/rollout-package.schema.json", reference_package: "/experiments/rollout-package.reference.json", target_rotator_version: "0.37-R37", target_analysis_cohort: "wanted_landing_v1-C9", runtime_dependencies: 0, performs_network_requests: false, automatic_progression: false, changes_live_allocation: false, deploys: false }, design: "fixed_horizon_two_independent_proportions", comparison_count: 2, multiplicity: "bonferroni_two_sided_familywise", sample_size_method: "normal_approximation_unequal_allocation", canonicalization: "sorted_key_recursive_json", digest: "SHA-256", sends_analytics: false, changes_live_allocation: false, changes_live_assignment: false, changes_decision_gate: false, preregisters_plan: false, selects_version: false },
  delivery: { assignment_receipt_profile: EXPERIMENT_ASSIGNMENT_RECEIPT_PROFILE, assignment_receipt_transport: "same_origin_json_POST", assignment_receipt_scope: "analytics_session_unit_cohort_and_presentation", assignment_receipt_required_before_counted_delivery: true, assignment_receipt_failure_behavior: "render_normally_but_send_no_counted_experiment_event", exposure_transport: "acknowledged_fetch_keepalive", exposure_token: "deterministic_unit_variant_analysis_cohort_binding", exposure_token_server_recomputable: true, exposure_token_implementation_revision_bound: false, compatible_revision_delivery_within_cohort: true, compatibility_grace_bound_by_assignment_receipt_expiry: true, acknowledgement: "x-analytics-status=accepted", retry_delays_ms: EXPERIMENT_EXPOSURE_RETRY_DELAYS_MS, retry_when_online: true, session_marker_after_acknowledgement: true, session_marker_scope: "analysis_cohort_experiment_variant", goal_transport: "acknowledged_fetch_keepalive_with_session_outbox", goal_outbox_scope: "session_only", goal_outbox_max_entries: EXPERIMENT_GOAL_OUTBOX_MAX_ENTRIES, goal_outbox_max_age_ms: EXPERIMENT_GOAL_OUTBOX_MAX_AGE_MS, goal_retry_on_route_change: true, goal_retry_when_online: true, rejected_goal_events_discarded: true },
  counting: { unit: "experiment_scoped_anonymous_browser_unit", unit_label: "anonymous_browser_profile_units", exposure: "one_unique_exposure_token_per_experiment_unit", goal: "distinct_exposed_units_with_matching_exposure_token_primary_cta", reported_as_unique_users: false, human_deduplication: false, household_deduplication: false, device_deduplication: false, one_person_may_contribute_multiple_units: true, shared_browser_profile_may_combine_people: true, privacy_excluded_units_included: false, storage_unavailable_units_included: false, event_path: "/wanted-10k", query_path_required: true, duplicate_sessions_and_receipts_with_same_unit_token_deduplicated: true, one_exposure_token_per_counted_unit: true, receipt_order_dependency: false, cross_variant_units_excluded: true, multi_token_units_excluded: true, integrity_exclusions_disclosed: true, preview_mode_included: false, operator_mode_included: false, reporting_window_days: EXPERIMENT_REPORTING_WINDOW_DAYS, reporting_window: { profile: "0.28-AW2", clock: "d1_database_utc", timestamp_source: "d1_clock_query_minus_settling_lag", timestamp_precision: "whole_seconds_matching_d1_current_timestamp", settling_lag_seconds: EXPERIMENT_ANALYSIS_SETTLING_LAG_SECONDS, start_inclusive: true, end_inclusive: true, api_field: "analysis_window", api_status_field: "analysis_window_status", unavailable_value: null, all_event_queries_share_boundaries: true, event_queries_use_sqlite_now_functions: false, clock_query_uses_sqlite_now: true } },
  inference: { monitoring_window: "rolling_30_day_continuously_viewed", conversion_interval: "wilson_score_95_percent", effect_measure: "absolute_conversion_rate_difference_vs_control", effect_interval: "newcombe_wilson", multiple_comparison_control: "bonferroni_two_comparisons_familywise_95_percent", repeated_look_adjustment: "none", confidence_intervals_support_stopping: false, preregistered_stopping_rule: false, interval_labels_are_directional_decisions: false, decision_gate: EXPERIMENT_DECISION_GATE, automatic_decision: false, sample_ratio_mismatch: "pearson_chi_square_df_2", sample_ratio_alert_p_below: 0.001, winner_declaration: false },
  ingestion: { maximum_body_bytes: 8192, content_type: "application/json", experiment_id_required: true, experiment_unit_id_required: true, analysis_cohort_required: true, treatment_fingerprint_required: true, presentation_fingerprint_required: true, assignment_receipt_required: true, assignment_receipt_same_session_required: true, assignment_receipt_expiry_required: true, current_rotator_version_required: false, accepted_rotator_versions: EXPERIMENT_ACTIVE_COHORT_EVENT_VERSIONS, compatible_version_requires_current_cohort: true, compatible_version_requires_current_fingerprints: true, compatible_version_requires_live_assignment_receipt: true, assigned_mode_only: true, server_recomputes_variant: true, server_recomputes_exposure_token: true, same_variant_goal_required: true, matching_exposure_token_required: true, direct_event_fabrication_resistance: "server_issued_same_session_receipt", traffic_authentication: "none", automated_fabrication_resistance: false, decision_use_without_edge_abuse_control: false },
  receipt_diagnostics: { profile: "0.28-RD7", route: "/api/experiments", window_days: EXPERIMENT_REPORTING_WINDOW_DAYS, analysis_window: "shared_top_level_settled_d1_utc_window", receipt_followup_hours: 24, receipt_cutoff_basis: "expires_at_index_with_29_day_cutoff_for_24_hour_receipts", grouping: "assigned_version", unit_receipt_basis: "first_retained_receipt_per_unit", maturity_rule: "first_retained_receipt_expires_at_lte_analysis_window_end", delivery_balance_basis: "matured_browser_units_only", matured_unit_delivery_interval: "wilson_score_95_percent_marginal", delivery_rate_comparison: { baseline: "control", effect_measure: "absolute_matured_unit_delivery_rate_difference", effect_interval: "newcombe_wilson", multiple_comparison_control: "bonferroni_two_comparisons_familywise_95_percent" }, intervals_support_version_selection: false, metrics: ["issued_receipts","issued_units","exposed_receipts","exposed_units","matured_units","matured_exposed_units","pending_maturity_units","unexposed_receipts","active_unexposed_receipts","expired_unexposed_receipts","duplicate_session_unit_receipts","receipt_to_exposure_rate","unit_to_exposure_rate","matured_unit_delivery_rate","matured_unit_delivery_interval_95","delivery_rate_comparisons"], issuance_sample_ratio_mismatch: { method: "pearson_chi_square_df_2", alert_p_below: .001 }, unit_delivery_balance: { method: "pearson_chi_square_homogeneity_df_2", alert_p_below: .001 }, thresholds_are_operational_alerts_only: true, decision_effect: "none", counts_rejected_requests: false, proves_human_traffic: false },
  results_snapshot: { profile: EXPERIMENT_RESULTS_SNAPSHOT_PROFILE, route: "/api/experiments", status_field: "analysis_snapshot_status", field: "analysis_snapshot", digest_field: "analysis_snapshot.digest", response_header: "x-experiment-snapshot-digest", algorithm: "SHA-256", canonicalization: "RFC8785_JCS", scope: "complete_ready_response_without_analysis_snapshot", conformance_vector: { input: EXPERIMENT_RESULTS_SNAPSHOT_CONFORMANCE_INPUT, digest: EXPERIMENT_RESULTS_SNAPSHOT_CONFORMANCE_DIGEST }, verifier: { version: EXPERIMENT_SNAPSHOT_VERIFIER_VERSION, module: "/experiments/wanted-result-snapshot.mjs", contract: "/experiments/snapshot-verifier.json", source_digest_field: "source_sha256", runtime_dependencies: 0, performs_network_requests: false }, ready_responses_only: true, unavailable_value: null, signed: false, proves_authenticity: false },
  safety_boundary: { changes_benchmark_content: false, changes_score: false, changes_certification: false, changes_registry_rank: false, presentation_only: true },
  experiments: [WANTED_LANDING_EXPERIMENT],
} as const;

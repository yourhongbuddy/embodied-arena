export const ROTATOR_VERSION = "0.14-R14";
export const EXPERIMENT_ANALYSIS_COHORT = "wanted_landing_v1-C1";
export const EXPERIMENT_ANALYSIS_COHORT_START_VERSION = "0.14-R14";
export const EXPERIMENT_EXPOSURE_RETRY_DELAYS_MS = [2_000,10_000,30_000] as const;
export const EXPERIMENT_GOAL_OUTBOX_MAX_ENTRIES=20;
export const EXPERIMENT_GOAL_OUTBOX_MAX_AGE_MS=86_400_000;

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
  guardrails: ["random_assignment_id_contains_no_user_attributes", "unit_id_scoped_to_this_experiment", "unit_id_not_shared_with_third_parties", "server_recomputes_assignment_and_token", "no_IP_storage", "no_fingerprinting", "no_benchmark_or_certification_effect", "preview_overrides_rejected_at_ingestion"],
} as const;

export type WantedVariant = typeof WANTED_LANDING_EXPERIMENT.variants[number]["id"];
export type AssignmentMode = "assigned" | "preview";
export type WantedAssignment = { experiment: typeof WANTED_LANDING_EXPERIMENT.id; variant: WantedVariant; bucket: number | null; mode: AssignmentMode };

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
  analysis_cohort: { id: EXPERIMENT_ANALYSIS_COHORT, starts_at_implementation_version: EXPERIMENT_ANALYSIS_COHORT_START_VERSION, legacy_versions_included: [], aggregation_key: "analysis_cohort", implementation_revision_changes_reset_cohort: false, assignment_or_treatment_change_requires_new_cohort: true, allocation_change_requires_new_cohort: true },
  privacy: { persistent_identifier: "experiment_scoped_random_assignment_id", transmitted_identifier: "experiment_unit_session_and_exposure_token", assignment_id_contains_user_attributes: false, separate_device_identifier: false, unit_id_scope: WANTED_LANDING_EXPERIMENT.id, unit_id_cross_experiment_linkage: false, IP_storage: false, fingerprinting: false, third_party_analytics: false, event_retention_days: 35, deletion_mechanism: "delete_before_each_accepted_insert_and_results_read", deletion_triggers: ["accepted_insert","analytics_summary_read","experiment_results_read"] },
  assignment: { unit: "experiment_scoped_anonymous_browser_unit", assignment_material: "random_experiment_scoped_unit_id", server_recomputable: true, analysis_unit_matches_assignment_unit: true, algorithm: "FNV1a_32", modulus: 10_000, stable_per_device: true, stable_per_session: true, session_lock_scope: "analysis_cohort_experiment", one_assigned_variant_per_session: true, one_assigned_variant_per_unit: true, query_override: "wanted_variant", invalid_override: "ignored", pre_assignment_presentation: "neutral_noninteractive" },
  delivery: { exposure_transport: "acknowledged_fetch_keepalive", exposure_token: "deterministic_unit_variant_analysis_cohort_binding", exposure_token_server_recomputable: true, exposure_token_implementation_revision_bound: false, acknowledgement: "x-analytics-status=accepted", retry_delays_ms: EXPERIMENT_EXPOSURE_RETRY_DELAYS_MS, retry_when_online: true, session_marker_after_acknowledgement: true, session_marker_scope: "analysis_cohort_experiment_variant", goal_transport: "acknowledged_fetch_keepalive_with_session_outbox", goal_outbox_scope: "session_only", goal_outbox_max_entries: EXPERIMENT_GOAL_OUTBOX_MAX_ENTRIES, goal_outbox_max_age_ms: EXPERIMENT_GOAL_OUTBOX_MAX_AGE_MS, goal_retry_on_route_change: true, goal_retry_when_online: true, rejected_goal_events_discarded: true },
  counting: { unit: "experiment_scoped_anonymous_browser_unit", exposure: "one_unique_exposure_token_per_experiment_unit", goal: "distinct_exposed_units_with_matching_exposure_token_primary_cta", event_path: "/wanted-10k", query_path_required: true, duplicate_sessions_and_receipts_with_same_unit_token_deduplicated: true, one_exposure_token_per_counted_unit: true, receipt_order_dependency: false, cross_variant_units_excluded: true, multi_token_units_excluded: true, integrity_exclusions_disclosed: true, preview_mode_included: false, operator_mode_included: false, reporting_window_days: 30 },
  inference: { monitoring_window: "rolling_30_day_continuously_viewed", conversion_interval: "wilson_score_95_percent", effect_measure: "absolute_conversion_rate_difference_vs_control", effect_interval: "newcombe_wilson", multiple_comparison_control: "bonferroni_two_comparisons_familywise_95_percent", repeated_look_adjustment: "none", confidence_intervals_support_stopping: false, preregistered_stopping_rule: false, interval_labels_are_directional_decisions: false, decision_gate: EXPERIMENT_DECISION_GATE, automatic_decision: false, sample_ratio_mismatch: "pearson_chi_square_df_2", sample_ratio_alert_p_below: 0.001, winner_declaration: false },
  ingestion: { maximum_body_bytes: 8192, content_type: "application/json", experiment_id_required: true, experiment_unit_id_required: true, analysis_cohort_required: true, current_rotator_version_required: true, assigned_mode_only: true, server_recomputes_variant: true, server_recomputes_exposure_token: true, same_variant_goal_required: true, matching_exposure_token_required: true, traffic_authentication: "none", automated_fabrication_resistance: false, decision_use_without_edge_abuse_control: false },
  safety_boundary: { changes_benchmark_content: false, changes_score: false, changes_certification: false, changes_registry_rank: false, presentation_only: true },
  experiments: [WANTED_LANDING_EXPERIMENT],
} as const;

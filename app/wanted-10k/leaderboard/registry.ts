export const LEADERBOARD_VERSION = "0.2-L1";
export const CERTIFICATIONS = ["PREQUALIFIED", "WANTED_LAB", "WANTED_WILD", "WANTED_10K"] as const;

export type RegistryEntry = {
  registry_profile_version: typeof LEADERBOARD_VERSION;
  submission_id: string;
  study_id: string;
  cohort_id: string;
  public_label: string;
  manufacturer: string;
  model: string;
  hardware_version: string;
  policy_version: string;
  policy_artifact_sha256: string;
  certifications: Array<typeof CERTIFICATIONS[number]>;
  registry_status: "active" | "superseded" | "revoked";
  wanted_score: number;
  ci95_lower: number;
  ci95_upper: number;
  survival_at_10000: number;
  independent_environments: number;
  total_resident_hours: number;
  support_at_10000: number;
  censoring_bound_width: number;
  assistance_minutes_per_100_hours: number;
  assistance_integrity_verified: true;
  assistance_ci95_lower: number;
  assistance_ci95_upper: number;
  assisted_exposure_fraction: number;
  participant_labor_minutes_per_100_hours: number;
  teleoperation_minutes_per_100_hours: number;
  maintenance_minutes_per_100_hours: number;
  researcher_contact_minutes_per_100_hours: number;
  human_rescue_events: number;
  policy_evolution_integrity_verified: true;
  policy_artifact_count: number;
  policy_change_event_count: number;
  policy_changed_exposure_fraction: number;
  policy_safety_hotfix_count: number;
  policy_rollback_count: number;
  policy_longest_rollout_lag_hours: number;
  policy_material_update_count: 0;
  policy_revision_intact: true;
  privacy_integrity_verified: true;
  privacy_raw_export_count: 0;
  privacy_guest_notice_coverage: 1;
  privacy_rights_completion_rate: 1;
  privacy_sensor_indicator_uptime: 1;
  privacy_unauthorized_access_count: 0;
  privacy_unresolved_material_incidents: 0;
  service_continuity_verified: true;
  service_autonomous_available_fraction: number;
  service_degraded_fraction: number;
  service_unavailable_fraction: number;
  service_unplanned_downtime_hours: number;
  service_unplanned_outage_count: number;
  service_longest_unplanned_outage_hours: number;
  service_participant_maintenance_minutes_per_100_hours: number;
  service_technician_minutes_per_100_hours: number;
  service_technician_visit_count: number;
  service_replacement_part_count: number;
  service_consumable_unit_count: number;
  service_cloud_dependency_downtime_hours: number;
  endpoint_adjudication_verified: true;
  endpoint_voluntary_rejections: number;
  endpoint_administrative_completions: number;
  endpoint_censors: number;
  endpoint_terminal_competing_causes: 0;
  endpoint_unresolved_decisions: 0;
  preregistration_integrity_verified: true;
  preregistration_amendment_count: number;
  preregistration_post_activity_amendments: number;
  preregistration_outcome_informed_amendments: 0;
  preregistration_retroactive_amendments: 0;
  preregistration_material_amendments_in_same_claim: 0;
  preregistration_chain_breaks: 0;
  protocol_deviation_integrity_verified: true;
  protocol_deviation_count: number;
  protocol_deviation_important_count: number;
  protocol_deviation_unresolved_important: 0;
  protocol_deviation_suppressed: 0;
  protocol_deviation_primary_exclusions: 0;
  protocol_deviation_resident_seconds_deducted: 0;
  protocol_deviation_endpoint_reclassifications: 0;
  protocol_deviation_outcome_informed: 0;
  human_measure_completion_rate: number;
  human_keep_rate: number | null;
  human_value_median: number | null;
  human_burden_median: number | null;
  human_trust_median: number | null;
  learning_generalization_verified: true;
  learning_paired_environments: number;
  learning_trial_completion_rate: number;
  learning_delta_familiar: number;
  learning_delta_ci95_lower: number;
  learning_delta_ci95_upper: number;
  late_generalization_ratio: number | null;
  revealed_preference: { status: "not_run" } | { status: "passed"; profile_version: "0.2-RP1"; currency: string; unit_amount: number; completed_choices_at_10000: number; reservation_median_lower_units: number | null; reservation_median_upper_units: number | null; manifest_uri: string; manifest_sha256: string };
  mean_time_between_human_rescue_hours: number | null;
  mean_time_between_human_rescue_lower_bound_hours: number | null;
  l4_incidents: number;
  safety_gate_status: "passed";
  audit_manifest_uri: string;
  audit_manifest_sha256: string;
  audit_signed_at: string;
  published_at: string;
  supersedes_submission_id: string | null;
};

export type RankedEntry = RegistryEntry & { rank: number; displayed_wanted_score: number; tied: boolean };
export type RegistryRanking = { ranked: RankedEntry[]; excluded: Array<{ submission_id: string; reasons: string[] }> };

const digest = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value) && !/^([a-f0-9])\1{63}$/.test(value);
const numeric = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const round1 = (value: number) => Math.round((value + Number.EPSILON) * 10) / 10;

export function validateRegistryEntry(entry: RegistryEntry) {
  const errors: string[] = [];
  if (entry.registry_profile_version !== LEADERBOARD_VERSION) errors.push(`registry_profile_version must be ${LEADERBOARD_VERSION}.`);
  for (const [label, value] of [["submission_id", entry.submission_id], ["study_id", entry.study_id], ["cohort_id", entry.cohort_id], ["public_label", entry.public_label], ["manufacturer", entry.manufacturer], ["model", entry.model], ["hardware_version", entry.hardware_version], ["policy_version", entry.policy_version]] as const) if (typeof value !== "string" || !value.trim()) errors.push(`${label} is required.`);
  if (!digest(entry.policy_artifact_sha256) || !digest(entry.audit_manifest_sha256)) errors.push("Policy and audit manifest require non-placeholder SHA-256 digests.");
  if (!Array.isArray(entry.certifications) || !entry.certifications.every(value => CERTIFICATIONS.includes(value))) errors.push("certifications contains an unknown level.");
  if (!numeric(entry.wanted_score) || entry.wanted_score < 0 || entry.wanted_score > 100) errors.push("wanted_score must be between 0 and 100.");
  if (!numeric(entry.ci95_lower) || !numeric(entry.ci95_upper) || entry.ci95_lower < 0 || entry.ci95_upper > 100 || entry.ci95_lower > entry.wanted_score || entry.wanted_score > entry.ci95_upper) errors.push("95% CI must enclose W within [0,100].");
  if (!numeric(entry.survival_at_10000) || entry.survival_at_10000 < 0 || entry.survival_at_10000 > 1) errors.push("survival_at_10000 must be within [0,1].");
  if (!Number.isInteger(entry.independent_environments) || entry.independent_environments < 20 || !numeric(entry.total_resident_hours) || entry.total_resident_hours < 10000) errors.push("Ranked cohorts require at least 20 environments and 10,000 resident hours.");
  if (!Number.isInteger(entry.support_at_10000) || entry.support_at_10000 < 1) errors.push("At least one environment must support the 10,000-hour horizon.");
  if (!numeric(entry.censoring_bound_width) || entry.censoring_bound_width < 0 || entry.censoring_bound_width > 100) errors.push("censoring_bound_width must be within [0,100].");
  if (!numeric(entry.assistance_minutes_per_100_hours) || entry.assistance_minutes_per_100_hours < 0) errors.push("Assistance burden must be disclosed and non-negative.");
  const assistanceDisclosure = entry.assistance_integrity_verified === true && numeric(entry.assistance_ci95_lower) && numeric(entry.assistance_ci95_upper) && entry.assistance_ci95_lower >= 0 && entry.assistance_ci95_lower <= entry.assistance_minutes_per_100_hours && entry.assistance_minutes_per_100_hours <= entry.assistance_ci95_upper && numeric(entry.assisted_exposure_fraction) && entry.assisted_exposure_fraction >= 0 && entry.assisted_exposure_fraction <= 1 && [entry.participant_labor_minutes_per_100_hours,entry.teleoperation_minutes_per_100_hours,entry.maintenance_minutes_per_100_hours,entry.researcher_contact_minutes_per_100_hours].every(value=>numeric(value)&&value>=0) && Number.isInteger(entry.human_rescue_events) && entry.human_rescue_events >= 0;
  if (!assistanceDisclosure) errors.push("A ranked row requires a coherent passing 0.2-I1 assistance-integrity disclosure.");
  const policyEvolutionDisclosure = entry.policy_evolution_integrity_verified === true && Number.isInteger(entry.policy_artifact_count) && entry.policy_artifact_count >= 1 && Number.isInteger(entry.policy_change_event_count) && entry.policy_change_event_count >= 0 && numeric(entry.policy_changed_exposure_fraction) && entry.policy_changed_exposure_fraction >= 0 && entry.policy_changed_exposure_fraction <= 1 && Number.isInteger(entry.policy_safety_hotfix_count) && entry.policy_safety_hotfix_count >= 0 && Number.isInteger(entry.policy_rollback_count) && entry.policy_rollback_count >= 0 && numeric(entry.policy_longest_rollout_lag_hours) && entry.policy_longest_rollout_lag_hours >= 0 && entry.policy_longest_rollout_lag_hours <= 168 && entry.policy_material_update_count === 0 && entry.policy_revision_intact === true;
  if (!policyEvolutionDisclosure) errors.push("A ranked row requires a coherent passing 0.2-U1 policy-evolution disclosure with an intact claim revision.");
  if (entry.privacy_integrity_verified !== true || entry.privacy_raw_export_count !== 0 || entry.privacy_guest_notice_coverage !== 1 || entry.privacy_rights_completion_rate !== 1 || entry.privacy_sensor_indicator_uptime !== 1 || entry.privacy_unauthorized_access_count !== 0 || entry.privacy_unresolved_material_incidents !== 0) errors.push("A ranked row requires a passing 0.2-PV1 privacy-integrity disclosure with complete coverage and zero forbidden events.");
  const serviceFractions = entry.service_autonomous_available_fraction + entry.service_degraded_fraction + entry.service_unavailable_fraction;
  const serviceDisclosure = entry.service_continuity_verified === true && [entry.service_autonomous_available_fraction,entry.service_degraded_fraction,entry.service_unavailable_fraction].every(value=>numeric(value)&&value>=0&&value<=1) && Math.abs(serviceFractions-1)<.000001 && numeric(entry.service_unplanned_downtime_hours) && entry.service_unplanned_downtime_hours>=0 && entry.service_unplanned_downtime_hours<=entry.total_resident_hours && Number.isInteger(entry.service_unplanned_outage_count) && entry.service_unplanned_outage_count>=0 && numeric(entry.service_longest_unplanned_outage_hours) && entry.service_longest_unplanned_outage_hours>=0 && entry.service_longest_unplanned_outage_hours<=entry.service_unplanned_downtime_hours && [entry.service_participant_maintenance_minutes_per_100_hours,entry.service_technician_minutes_per_100_hours,entry.service_cloud_dependency_downtime_hours].every(value=>numeric(value)&&value>=0) && [entry.service_technician_visit_count,entry.service_replacement_part_count,entry.service_consumable_unit_count].every(value=>Number.isInteger(value)&&value>=0);
  if (!serviceDisclosure) errors.push("A ranked row requires a coherent passing 0.2-SC1 service-continuity disclosure with a complete state partition and non-negative burden metrics.");
  const endpointDisclosure = entry.endpoint_adjudication_verified === true && [entry.endpoint_voluntary_rejections,entry.endpoint_administrative_completions,entry.endpoint_censors].every(value=>Number.isInteger(value)&&value>=0) && entry.endpoint_voluntary_rejections + entry.endpoint_administrative_completions + entry.endpoint_censors === entry.independent_environments && entry.endpoint_administrative_completions === entry.support_at_10000 && entry.endpoint_terminal_competing_causes === 0 && entry.endpoint_unresolved_decisions === 0;
  if (!endpointDisclosure) errors.push("A ranked row requires a passing 0.2-J1 endpoint disclosure with one resolved decision per environment and zero terminal competing causes.");
  const preregistrationDisclosure = entry.preregistration_integrity_verified === true && Number.isInteger(entry.preregistration_amendment_count) && entry.preregistration_amendment_count >= 0 && Number.isInteger(entry.preregistration_post_activity_amendments) && entry.preregistration_post_activity_amendments >= 0 && entry.preregistration_post_activity_amendments <= entry.preregistration_amendment_count && entry.preregistration_outcome_informed_amendments === 0 && entry.preregistration_retroactive_amendments === 0 && entry.preregistration_material_amendments_in_same_claim === 0 && entry.preregistration_chain_breaks === 0;
  if (!preregistrationDisclosure) errors.push("A ranked row requires a passing 0.2-PR1 preregistration history with zero outcome-informed, retroactive, same-claim material, or chain-break events.");
  const deviationDisclosure = entry.protocol_deviation_integrity_verified === true && Number.isInteger(entry.protocol_deviation_count) && entry.protocol_deviation_count >= 0 && Number.isInteger(entry.protocol_deviation_important_count) && entry.protocol_deviation_important_count >= 0 && entry.protocol_deviation_important_count <= entry.protocol_deviation_count && entry.protocol_deviation_unresolved_important === 0 && entry.protocol_deviation_suppressed === 0 && entry.protocol_deviation_primary_exclusions === 0 && entry.protocol_deviation_resident_seconds_deducted === 0 && entry.protocol_deviation_endpoint_reclassifications === 0 && entry.protocol_deviation_outcome_informed === 0;
  if (!deviationDisclosure) errors.push("A ranked row requires a passing 0.2-DV1 deviation history with zero unresolved, suppressed, excluded, deducted, recoded, or outcome-informed events.");
  if (!numeric(entry.human_measure_completion_rate) || entry.human_measure_completion_rate < 0 || entry.human_measure_completion_rate > 1) errors.push("Human-measure completion rate must be disclosed within [0,1].");
  const humanNull = entry.human_keep_rate === null && entry.human_value_median === null && entry.human_burden_median === null && entry.human_trust_median === null;
  const humanObserved = numeric(entry.human_keep_rate) && entry.human_keep_rate >= 0 && entry.human_keep_rate <= 1 && numeric(entry.human_value_median) && entry.human_value_median >= -2 && entry.human_value_median <= 2 && numeric(entry.human_burden_median) && entry.human_burden_median >= 0 && entry.human_burden_median <= 4 && numeric(entry.human_trust_median) && entry.human_trust_median >= 0 && entry.human_trust_median <= 4;
  if (!((entry.human_measure_completion_rate === 0 && humanNull) || (entry.human_measure_completion_rate > 0 && humanObserved))) errors.push("Human keep, value, burden, and trust summaries must be complete when any prompt was answered and null only at zero completion.");
  if (entry.learning_generalization_verified !== true || !Number.isInteger(entry.learning_paired_environments) || entry.learning_paired_environments < 1 || entry.learning_paired_environments > entry.independent_environments || !numeric(entry.learning_trial_completion_rate) || entry.learning_trial_completion_rate < 0 || entry.learning_trial_completion_rate > 1 || !numeric(entry.learning_delta_familiar) || entry.learning_delta_familiar < -1 || entry.learning_delta_familiar > 1 || !numeric(entry.learning_delta_ci95_lower) || !numeric(entry.learning_delta_ci95_upper) || entry.learning_delta_ci95_lower < -1 || entry.learning_delta_ci95_lower > entry.learning_delta_familiar || entry.learning_delta_familiar > entry.learning_delta_ci95_upper || entry.learning_delta_ci95_upper > 1 || !(entry.late_generalization_ratio === null || (numeric(entry.late_generalization_ratio) && entry.late_generalization_ratio >= 0))) errors.push("A ranked row requires a coherent passing 0.2-LG1 matched learning disclosure.");
  const preference=entry.revealed_preference;
  if (!preference || (preference.status!=="not_run"&&preference.status!=="passed")) errors.push("Revealed-preference status must be disclosed as not_run or passed.");
  if (preference?.status==="passed") {
    const noCompleted=preference.completed_choices_at_10000===0&&preference.reservation_median_lower_units===null&&preference.reservation_median_upper_units===null;
    const bounded=preference.completed_choices_at_10000>0&&numeric(preference.reservation_median_lower_units)&&preference.reservation_median_lower_units>=0&&(preference.reservation_median_upper_units===null||(numeric(preference.reservation_median_upper_units)&&preference.reservation_median_upper_units>=preference.reservation_median_lower_units));
    if(preference.profile_version!=="0.2-RP1"||!/^([A-Z]{3})$/.test(preference.currency)||!numeric(preference.unit_amount)||preference.unit_amount<=0||!Number.isInteger(preference.completed_choices_at_10000)||preference.completed_choices_at_10000<0||!(noCompleted||bounded)||typeof preference.manifest_uri!=="string"||!/^https:\/\//.test(preference.manifest_uri)||!digest(preference.manifest_sha256)) errors.push("A passed 0.2-RP1 disclosure requires coherent 10K set bounds and a bound manifest.");
  }
  const mtbhrEstimate = entry.mean_time_between_human_rescue_hours;
  const mtbhrBound = entry.mean_time_between_human_rescue_lower_bound_hours;
  if (!((numeric(mtbhrEstimate) && mtbhrEstimate >= 0 && mtbhrBound === null) || (mtbhrEstimate === null && numeric(mtbhrBound) && mtbhrBound >= 0))) errors.push("MTBHR must be an estimate or a zero-event lower bound, never infinity.");
  if (entry.human_rescue_events > 0 ? !(numeric(mtbhrEstimate) && mtbhrBound === null && Math.abs(mtbhrEstimate-entry.total_resident_hours/entry.human_rescue_events)<.01) : !(mtbhrEstimate===null && numeric(mtbhrBound) && Math.abs(mtbhrBound-entry.total_resident_hours)<.01)) errors.push("MTBHR must reproduce exactly from 0.2-I1 rescue events and resident exposure.");
  if (entry.l4_incidents !== 0 || entry.safety_gate_status !== "passed") errors.push("Ranked rows require a passed safety gate and L4=0.");
  if (typeof entry.audit_manifest_uri !== "string" || !/^https:\/\//.test(entry.audit_manifest_uri)) errors.push("audit_manifest_uri must use HTTPS.");
  if (!Number.isFinite(Date.parse(entry.audit_signed_at)) || !Number.isFinite(Date.parse(entry.published_at)) || Date.parse(entry.audit_signed_at) > Date.parse(entry.published_at)) errors.push("Audit must be signed no later than publication.");
  return errors;
}

export function rankRegistry(entries: RegistryEntry[]): RegistryRanking {
  const activeKeys = new Map<string, number>();
  for (const entry of entries) if (entry.registry_status === "active") activeKeys.set(`${entry.study_id}:${entry.cohort_id}`, (activeKeys.get(`${entry.study_id}:${entry.cohort_id}`) || 0) + 1);
  const excluded: RegistryRanking["excluded"] = [];
  const eligible = entries.filter(entry => {
    const reasons = validateRegistryEntry(entry);
    if (entry.registry_status !== "active") reasons.push(`registry_status is ${entry.registry_status}.`);
    if (!entry.certifications.includes("WANTED_WILD")) reasons.push("WANTED_WILD certification is required for ranking.");
    if ((activeKeys.get(`${entry.study_id}:${entry.cohort_id}`) || 0) > 1) reasons.push("Multiple active revisions exist for the same study cohort.");
    if (reasons.length) excluded.push({ submission_id: entry.submission_id || "unknown", reasons });
    return reasons.length === 0;
  }).sort((a,b) => round1(b.wanted_score) - round1(a.wanted_score) || a.public_label.localeCompare(b.public_label) || a.submission_id.localeCompare(b.submission_id));
  const ranked = eligible.map(entry => {
    const displayed = round1(entry.wanted_score);
    const firstIndex = eligible.findIndex(candidate => round1(candidate.wanted_score) === displayed);
    const tied = eligible.filter(candidate => round1(candidate.wanted_score) === displayed).length > 1;
    return { ...entry, rank: firstIndex + 1, displayed_wanted_score: displayed, tied };
  });
  return { ranked, excluded };
}

const digestSchema = { type: "string", pattern: "^[a-f0-9]{64}$" };
const stringSchema = { type: "string", minLength: 1 };
const serviceRegistryRequired = ["service_continuity_verified", "service_autonomous_available_fraction", "service_degraded_fraction", "service_unavailable_fraction", "service_unplanned_downtime_hours", "service_unplanned_outage_count", "service_longest_unplanned_outage_hours", "service_participant_maintenance_minutes_per_100_hours", "service_technician_minutes_per_100_hours", "service_technician_visit_count", "service_replacement_part_count", "service_consumable_unit_count", "service_cloud_dependency_downtime_hours"];
const endpointRegistryRequired = ["endpoint_adjudication_verified","endpoint_voluntary_rejections","endpoint_administrative_completions","endpoint_censors","endpoint_terminal_competing_causes","endpoint_unresolved_decisions"];
const preregistrationRegistryRequired = ["preregistration_integrity_verified","preregistration_amendment_count","preregistration_post_activity_amendments","preregistration_outcome_informed_amendments","preregistration_retroactive_amendments","preregistration_material_amendments_in_same_claim","preregistration_chain_breaks"];
const protocolDeviationRegistryRequired = ["protocol_deviation_integrity_verified","protocol_deviation_count","protocol_deviation_important_count","protocol_deviation_unresolved_important","protocol_deviation_suppressed","protocol_deviation_primary_exclusions","protocol_deviation_resident_seconds_deducted","protocol_deviation_endpoint_reclassifications","protocol_deviation_outcome_informed"];
export const leaderboardEntrySchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/leaderboard-entry.schema.json",
  title: "WANTED-10K Audited Registry Entry",
  "$comment": "Cross-field rules (CI encloses W, audit precedes publication, exactly one MTBHR representation, active-revision uniqueness) are enforced by registry profile 0.2-L1 semantic validation.",
  type: "object",
  additionalProperties: false,
  required: ["registry_profile_version", "submission_id", "study_id", "cohort_id", "public_label", "manufacturer", "model", "hardware_version", "policy_version", "policy_artifact_sha256", "certifications", "registry_status", "wanted_score", "ci95_lower", "ci95_upper", "survival_at_10000", "independent_environments", "total_resident_hours", "support_at_10000", "censoring_bound_width", "assistance_minutes_per_100_hours", "assistance_integrity_verified", "assistance_ci95_lower", "assistance_ci95_upper", "assisted_exposure_fraction", "participant_labor_minutes_per_100_hours", "teleoperation_minutes_per_100_hours", "maintenance_minutes_per_100_hours", "researcher_contact_minutes_per_100_hours", "human_rescue_events", "policy_evolution_integrity_verified", "policy_artifact_count", "policy_change_event_count", "policy_changed_exposure_fraction", "policy_safety_hotfix_count", "policy_rollback_count", "policy_longest_rollout_lag_hours", "policy_material_update_count", "policy_revision_intact", "privacy_integrity_verified", "privacy_raw_export_count", "privacy_guest_notice_coverage", "privacy_rights_completion_rate", "privacy_sensor_indicator_uptime", "privacy_unauthorized_access_count", "privacy_unresolved_material_incidents", "human_measure_completion_rate", "human_keep_rate", "human_value_median", "human_burden_median", "human_trust_median", "learning_generalization_verified", "learning_paired_environments", "learning_trial_completion_rate", "learning_delta_familiar", "learning_delta_ci95_lower", "learning_delta_ci95_upper", "late_generalization_ratio", "revealed_preference", "mean_time_between_human_rescue_hours", "mean_time_between_human_rescue_lower_bound_hours", "l4_incidents", "safety_gate_status", "audit_manifest_uri", "audit_manifest_sha256", "audit_signed_at", "published_at", "supersedes_submission_id"],
  properties: {
    registry_profile_version: { const: LEADERBOARD_VERSION }, submission_id: stringSchema, study_id: stringSchema, cohort_id: stringSchema, public_label: stringSchema, manufacturer: stringSchema, model: stringSchema, hardware_version: stringSchema, policy_version: stringSchema, policy_artifact_sha256: digestSchema,
    certifications: { type: "array", minItems: 1, uniqueItems: true, items: { enum: CERTIFICATIONS } }, registry_status: { enum: ["active", "superseded", "revoked"] },
    wanted_score: { type: "number", minimum: 0, maximum: 100 }, ci95_lower: { type: "number", minimum: 0, maximum: 100 }, ci95_upper: { type: "number", minimum: 0, maximum: 100 }, survival_at_10000: { type: "number", minimum: 0, maximum: 1 }, independent_environments: { type: "integer", minimum: 20 }, total_resident_hours: { type: "number", minimum: 10000 }, support_at_10000: { type: "integer", minimum: 1 }, censoring_bound_width: { type: "number", minimum: 0, maximum: 100 }, assistance_minutes_per_100_hours: { type: "number", minimum: 0 }, assistance_integrity_verified: { const: true }, assistance_ci95_lower: { type: "number", minimum: 0 }, assistance_ci95_upper: { type: "number", minimum: 0 }, assisted_exposure_fraction: { type: "number", minimum: 0, maximum: 1 }, participant_labor_minutes_per_100_hours: { type: "number", minimum: 0 }, teleoperation_minutes_per_100_hours: { type: "number", minimum: 0 }, maintenance_minutes_per_100_hours: { type: "number", minimum: 0 }, researcher_contact_minutes_per_100_hours: { type: "number", minimum: 0 }, human_rescue_events: { type: "integer", minimum: 0 }, policy_evolution_integrity_verified: { const: true }, policy_artifact_count: { type: "integer", minimum: 1 }, policy_change_event_count: { type: "integer", minimum: 0 }, policy_changed_exposure_fraction: { type: "number", minimum: 0, maximum: 1 }, policy_safety_hotfix_count: { type: "integer", minimum: 0 }, policy_rollback_count: { type: "integer", minimum: 0 }, policy_longest_rollout_lag_hours: { type: "number", minimum: 0, maximum: 168 }, policy_material_update_count: { const: 0 }, policy_revision_intact: { const: true }, privacy_integrity_verified: { const: true }, privacy_raw_export_count: { const: 0 }, privacy_guest_notice_coverage: { const: 1 }, privacy_rights_completion_rate: { const: 1 }, privacy_sensor_indicator_uptime: { const: 1 }, privacy_unauthorized_access_count: { const: 0 }, privacy_unresolved_material_incidents: { const: 0 }, human_measure_completion_rate: { type: "number", minimum: 0, maximum: 1 }, human_keep_rate: { type: ["number", "null"], minimum: 0, maximum: 1 }, human_value_median: { type: ["number", "null"], minimum: -2, maximum: 2 }, human_burden_median: { type: ["number", "null"], minimum: 0, maximum: 4 }, human_trust_median: { type: ["number", "null"], minimum: 0, maximum: 4 }, learning_generalization_verified: { const: true }, learning_paired_environments: { type: "integer", minimum: 1 }, learning_trial_completion_rate: { type: "number", minimum: 0, maximum: 1 }, learning_delta_familiar: { type: "number", minimum: -1, maximum: 1 }, learning_delta_ci95_lower: { type: "number", minimum: -1, maximum: 1 }, learning_delta_ci95_upper: { type: "number", minimum: -1, maximum: 1 }, late_generalization_ratio: { type: ["number", "null"], minimum: 0 }, revealed_preference: { oneOf: [{ type: "object", additionalProperties: false, required: ["status"], properties: { status: { const: "not_run" } } }, { type: "object", additionalProperties: false, required: ["status","profile_version","currency","unit_amount","completed_choices_at_10000","reservation_median_lower_units","reservation_median_upper_units","manifest_uri","manifest_sha256"], properties: { status: { const: "passed" }, profile_version: { const: "0.2-RP1" }, currency: { type: "string", pattern: "^[A-Z]{3}$" }, unit_amount: { type: "number", exclusiveMinimum: 0 }, completed_choices_at_10000: { type: "integer", minimum: 0 }, reservation_median_lower_units: { type: ["number","null"], minimum: 0 }, reservation_median_upper_units: { type: ["number","null"], minimum: 0 }, manifest_uri: { type: "string", format: "uri", pattern: "^https://" }, manifest_sha256: digestSchema } }] }, mean_time_between_human_rescue_hours: { type: ["number", "null"], minimum: 0 }, mean_time_between_human_rescue_lower_bound_hours: { type: ["number", "null"], minimum: 0 },
    service_continuity_verified: { const: true }, service_autonomous_available_fraction: { type: "number", minimum: 0, maximum: 1 }, service_degraded_fraction: { type: "number", minimum: 0, maximum: 1 }, service_unavailable_fraction: { type: "number", minimum: 0, maximum: 1 }, service_unplanned_downtime_hours: { type: "number", minimum: 0 }, service_unplanned_outage_count: { type: "integer", minimum: 0 }, service_longest_unplanned_outage_hours: { type: "number", minimum: 0 }, service_participant_maintenance_minutes_per_100_hours: { type: "number", minimum: 0 }, service_technician_minutes_per_100_hours: { type: "number", minimum: 0 }, service_technician_visit_count: { type: "integer", minimum: 0 }, service_replacement_part_count: { type: "integer", minimum: 0 }, service_consumable_unit_count: { type: "integer", minimum: 0 }, service_cloud_dependency_downtime_hours: { type: "number", minimum: 0 },
    endpoint_adjudication_verified:{const:true},endpoint_voluntary_rejections:{type:"integer",minimum:0},endpoint_administrative_completions:{type:"integer",minimum:0},endpoint_censors:{type:"integer",minimum:0},endpoint_terminal_competing_causes:{const:0},endpoint_unresolved_decisions:{const:0},
    preregistration_integrity_verified:{const:true},preregistration_amendment_count:{type:"integer",minimum:0},preregistration_post_activity_amendments:{type:"integer",minimum:0},preregistration_outcome_informed_amendments:{const:0},preregistration_retroactive_amendments:{const:0},preregistration_material_amendments_in_same_claim:{const:0},preregistration_chain_breaks:{const:0},
    protocol_deviation_integrity_verified:{const:true},protocol_deviation_count:{type:"integer",minimum:0},protocol_deviation_important_count:{type:"integer",minimum:0},protocol_deviation_unresolved_important:{const:0},protocol_deviation_suppressed:{const:0},protocol_deviation_primary_exclusions:{const:0},protocol_deviation_resident_seconds_deducted:{const:0},protocol_deviation_endpoint_reclassifications:{const:0},protocol_deviation_outcome_informed:{const:0},
    l4_incidents: { const: 0 }, safety_gate_status: { const: "passed" }, audit_manifest_uri: { type: "string", format: "uri", pattern: "^https://" }, audit_manifest_sha256: digestSchema, audit_signed_at: { type: "string", format: "date-time" }, published_at: { type: "string", format: "date-time" }, supersedes_submission_id: { type: ["string", "null"] },
  },
};
leaderboardEntrySchema.required.push(...serviceRegistryRequired);
leaderboardEntrySchema.required.push(...endpointRegistryRequired);
leaderboardEntrySchema.required.push(...preregistrationRegistryRequired);
leaderboardEntrySchema.required.push(...protocolDeviationRegistryRequired);

const publicRegistryEntries: RegistryEntry[] = [];
const publicRanking = rankRegistry(publicRegistryEntries);
export const leaderboardContract = {
  benchmark: "WANTED-10K",
  version: LEADERBOARD_VERSION,
  generated_at: "2026-08-28T20:50:00Z",
  status: "open_registry_no_audited_entries",
  ranking: {
    eligible_certification: "WANTED_WILD",
    sort: "descending_normalized_RMST_W_rounded_to_one_decimal",
    displayed_precision: 1,
    tie_rule: "equal_displayed_W_receives_equal_competition_rank_then_alphabetical_display_order",
    next_rank_after_tie: "competition_ranking_1_1_3",
    forbidden_tiebreakers: ["confidence_interval_width", "safety_incidents", "preregistration_amendment_count", "protocol_deviation_count", "assistance_burden", "participant_labor", "teleoperation", "maintenance", "availability", "service_continuity_metrics", "endpoint_review_metrics", "MTBHR", "human_keep_value_burden_trust", "learning_delta", "generalization_ratio", "policy_update_count", "policy_changed_exposure", "rollout_lag", "privacy_metrics", "reservation_value", "reacquisition", "certification_badges"],
    statistical_claim: "rank_order_is_descriptive_and_does_not_imply_pairwise_significance",
    derived_fields: ["rank", "displayed_wanted_score", "tied"],
  },
  admission: ["audit_manifest_passes_all_six_gates", "WANTED_WILD_certification_awarded", "preregistration_integrity_profile_0.2-PR1_passes", "protocol_deviation_integrity_profile_0.2-DV1_passes", "cohort_integrity_profile_0.2-E1_passes", "exposure_ledger_profile_0.2-X1_passes", "endpoint_adjudication_profile_0.2-J1_passes", "analysis_reproduction_profile_0.2-A1_passes", "human_measures_profile_0.2-H1_passes", "learning_generalization_profile_0.2-LG1_passes", "assistance_integrity_profile_0.2-I1_passes", "policy_evolution_integrity_profile_0.2-U1_passes", "privacy_integrity_profile_0.2-PV1_passes", "service_continuity_profile_0.2-SC1_passes", "withdrawal_profile_0.2-W1_when_lifetime_completions_exist", "telemetry_authenticity_profile_0.2-T1_passes", "independent_audit_seal_profile_0.2-V1_passes", "auditor_credential_profile_0.2-V2_passes", "horizon_identifiable", "bootstrap_valid_fraction_at_least_0.95", "preflight_profile_0.2-P1_passes", "safety_profile_0.2-S1_passes", "L4_equals_zero", "public_aggregate_evidence_pack"],
  lifecycle: { entries_are_immutable: true, correction_method: "publish_new_entry_with_supersedes_submission_id", revoked_rows_remain_in_history: true, multiple_active_revisions_per_study_cohort: "reject_all_until_resolved" },
  disclosure: ["W_and_95_percent_CI", "S_at_10000", "environment_count", "resident_hours", "support_at_10000", "censoring_bound_width", "preregistration_0.2-PR1_amendments_post_activity_and_zero_contamination_counts", "protocol_deviations_0.2-DV1_total_important_and_zero_manipulation_counts", "endpoint_adjudication_0.2-J1_rejections_completions_censors_and_terminal_causes", "assistance_0.2-I1_mean_CI_assisted_fraction_mode_rates_and_rescues", "policy_evolution_0.2-U1_artifacts_changes_exposure_rollout_and_revision_integrity", "privacy_0.2-PV1_raw_export_notice_rights_indicator_access_and_incident_integrity", "service_continuity_0.2-SC1_state_partition_downtime_recovery_labor_parts_and_cloud_dependency", "human_measure_completion_keep_value_burden_trust", "matched_learning_delta_CI_generalization_and_completion", "revealed_preference_0.2-RP1_status_and_10K_interval_when_run", "MTBHR_or_zero_event_lower_bound", "safety_gate_and_L4_count", "robot_and_policy_versions", "audit_manifest_hash"],
  certification_lanes: { PREQUALIFIED: "registry_only_not_ranked", WANTED_LAB: "registry_only_not_ranked", WANTED_WILD: "ranked_when_active", WANTED_10K: "lifetime_badge_never_a_tiebreaker" },
  entries: publicRanking.ranked,
  excluded_entries: publicRanking.excluded,
};

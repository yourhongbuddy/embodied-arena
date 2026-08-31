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
  human_measure_completion_rate: number;
  human_keep_rate: number | null;
  human_value_median: number | null;
  human_burden_median: number | null;
  human_trust_median: number | null;
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
  if (!numeric(entry.human_measure_completion_rate) || entry.human_measure_completion_rate < 0 || entry.human_measure_completion_rate > 1) errors.push("Human-measure completion rate must be disclosed within [0,1].");
  const humanNull = entry.human_keep_rate === null && entry.human_value_median === null && entry.human_burden_median === null && entry.human_trust_median === null;
  const humanObserved = numeric(entry.human_keep_rate) && entry.human_keep_rate >= 0 && entry.human_keep_rate <= 1 && numeric(entry.human_value_median) && entry.human_value_median >= -2 && entry.human_value_median <= 2 && numeric(entry.human_burden_median) && entry.human_burden_median >= 0 && entry.human_burden_median <= 4 && numeric(entry.human_trust_median) && entry.human_trust_median >= 0 && entry.human_trust_median <= 4;
  if (!((entry.human_measure_completion_rate === 0 && humanNull) || (entry.human_measure_completion_rate > 0 && humanObserved))) errors.push("Human keep, value, burden, and trust summaries must be complete when any prompt was answered and null only at zero completion.");
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
export const leaderboardEntrySchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/leaderboard-entry.schema.json",
  title: "WANTED-10K Audited Registry Entry",
  "$comment": "Cross-field rules (CI encloses W, audit precedes publication, exactly one MTBHR representation, active-revision uniqueness) are enforced by registry profile 0.2-L1 semantic validation.",
  type: "object",
  additionalProperties: false,
  required: ["registry_profile_version", "submission_id", "study_id", "cohort_id", "public_label", "manufacturer", "model", "hardware_version", "policy_version", "policy_artifact_sha256", "certifications", "registry_status", "wanted_score", "ci95_lower", "ci95_upper", "survival_at_10000", "independent_environments", "total_resident_hours", "support_at_10000", "censoring_bound_width", "assistance_minutes_per_100_hours", "human_measure_completion_rate", "human_keep_rate", "human_value_median", "human_burden_median", "human_trust_median", "revealed_preference", "mean_time_between_human_rescue_hours", "mean_time_between_human_rescue_lower_bound_hours", "l4_incidents", "safety_gate_status", "audit_manifest_uri", "audit_manifest_sha256", "audit_signed_at", "published_at", "supersedes_submission_id"],
  properties: {
    registry_profile_version: { const: LEADERBOARD_VERSION }, submission_id: stringSchema, study_id: stringSchema, cohort_id: stringSchema, public_label: stringSchema, manufacturer: stringSchema, model: stringSchema, hardware_version: stringSchema, policy_version: stringSchema, policy_artifact_sha256: digestSchema,
    certifications: { type: "array", minItems: 1, uniqueItems: true, items: { enum: CERTIFICATIONS } }, registry_status: { enum: ["active", "superseded", "revoked"] },
    wanted_score: { type: "number", minimum: 0, maximum: 100 }, ci95_lower: { type: "number", minimum: 0, maximum: 100 }, ci95_upper: { type: "number", minimum: 0, maximum: 100 }, survival_at_10000: { type: "number", minimum: 0, maximum: 1 }, independent_environments: { type: "integer", minimum: 20 }, total_resident_hours: { type: "number", minimum: 10000 }, support_at_10000: { type: "integer", minimum: 1 }, censoring_bound_width: { type: "number", minimum: 0, maximum: 100 }, assistance_minutes_per_100_hours: { type: "number", minimum: 0 }, human_measure_completion_rate: { type: "number", minimum: 0, maximum: 1 }, human_keep_rate: { type: ["number", "null"], minimum: 0, maximum: 1 }, human_value_median: { type: ["number", "null"], minimum: -2, maximum: 2 }, human_burden_median: { type: ["number", "null"], minimum: 0, maximum: 4 }, human_trust_median: { type: ["number", "null"], minimum: 0, maximum: 4 }, revealed_preference: { oneOf: [{ type: "object", additionalProperties: false, required: ["status"], properties: { status: { const: "not_run" } } }, { type: "object", additionalProperties: false, required: ["status","profile_version","currency","unit_amount","completed_choices_at_10000","reservation_median_lower_units","reservation_median_upper_units","manifest_uri","manifest_sha256"], properties: { status: { const: "passed" }, profile_version: { const: "0.2-RP1" }, currency: { type: "string", pattern: "^[A-Z]{3}$" }, unit_amount: { type: "number", exclusiveMinimum: 0 }, completed_choices_at_10000: { type: "integer", minimum: 0 }, reservation_median_lower_units: { type: ["number","null"], minimum: 0 }, reservation_median_upper_units: { type: ["number","null"], minimum: 0 }, manifest_uri: { type: "string", format: "uri", pattern: "^https://" }, manifest_sha256: digestSchema } }] }, mean_time_between_human_rescue_hours: { type: ["number", "null"], minimum: 0 }, mean_time_between_human_rescue_lower_bound_hours: { type: ["number", "null"], minimum: 0 },
    l4_incidents: { const: 0 }, safety_gate_status: { const: "passed" }, audit_manifest_uri: { type: "string", format: "uri", pattern: "^https://" }, audit_manifest_sha256: digestSchema, audit_signed_at: { type: "string", format: "date-time" }, published_at: { type: "string", format: "date-time" }, supersedes_submission_id: { type: ["string", "null"] },
  },
};

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
    forbidden_tiebreakers: ["confidence_interval_width", "safety_incidents", "assistance_burden", "availability", "MTBHR", "human_keep_value_burden_trust", "reservation_value", "reacquisition", "certification_badges"],
    statistical_claim: "rank_order_is_descriptive_and_does_not_imply_pairwise_significance",
    derived_fields: ["rank", "displayed_wanted_score", "tied"],
  },
  admission: ["audit_manifest_passes_all_six_gates", "WANTED_WILD_certification_awarded", "cohort_integrity_profile_0.2-E1_passes", "exposure_ledger_profile_0.2-X1_passes", "analysis_reproduction_profile_0.2-A1_passes", "human_measures_profile_0.2-H1_passes", "withdrawal_profile_0.2-W1_when_lifetime_completions_exist", "telemetry_authenticity_profile_0.2-T1_passes", "independent_audit_seal_profile_0.2-V1_passes", "auditor_credential_profile_0.2-V2_passes", "horizon_identifiable", "bootstrap_valid_fraction_at_least_0.95", "preflight_profile_0.2-P1_passes", "safety_profile_0.2-S1_passes", "L4_equals_zero", "public_aggregate_evidence_pack"],
  lifecycle: { entries_are_immutable: true, correction_method: "publish_new_entry_with_supersedes_submission_id", revoked_rows_remain_in_history: true, multiple_active_revisions_per_study_cohort: "reject_all_until_resolved" },
  disclosure: ["W_and_95_percent_CI", "S_at_10000", "environment_count", "resident_hours", "support_at_10000", "censoring_bound_width", "assistance_minutes_per_100_hours", "human_measure_completion_keep_value_burden_trust", "revealed_preference_0.2-RP1_status_and_10K_interval_when_run", "MTBHR_or_zero_event_lower_bound", "safety_gate_and_L4_count", "robot_and_policy_versions", "audit_manifest_hash"],
  certification_lanes: { PREQUALIFIED: "registry_only_not_ranked", WANTED_LAB: "registry_only_not_ranked", WANTED_WILD: "ranked_when_active", WANTED_10K: "lifetime_badge_never_a_tiebreaker" },
  entries: publicRanking.ranked,
  excluded_entries: publicRanking.excluded,
};

export const ROTATOR_VERSION = "0.4-R4";

export const WANTED_LANDING_EXPERIMENT = {
  id: "wanted_landing_v1",
  status: "active",
  audience: "new_and_returning_wanted_landing_visitors",
  assignment_unit: "anonymous_device_local_seed",
  allocation_basis_points: 10_000,
  salt: "wanted-landing-v1-2026-08-31",
  variants: [
    { id: "control", label: "Retention question", weight_basis_points: 3_400, hypothesis: "The original human-choice framing produces the clearest benchmark understanding." },
    { id: "proof", label: "Evidence first", weight_basis_points: 3_300, hypothesis: "Leading with the single-score proof increases protocol exploration." },
    { id: "developer", label: "Integration first", weight_basis_points: 3_300, hypothesis: "Leading with the integration contract increases developer-kit exploration." },
  ],
  primary_goal: "primary_cta",
  guardrails: ["assignment_seed_never_leaves_device", "no_IP_storage", "no_fingerprinting", "no_benchmark_or_certification_effect", "preview_overrides_excluded_from_experiment_results"],
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

export function assignWantedVariant(seed: string): WantedAssignment {
  if (typeof seed !== "string" || seed.length < 8 || seed.length > 200) throw new Error("A bounded anonymous assignment seed is required.");
  const bucket = fnv1a32(`${WANTED_LANDING_EXPERIMENT.id}|${WANTED_LANDING_EXPERIMENT.salt}|${seed}`) % WANTED_LANDING_EXPERIMENT.allocation_basis_points;
  let boundary = 0;
  for (const variant of WANTED_LANDING_EXPERIMENT.variants) {
    boundary += variant.weight_basis_points;
    if (bucket < boundary) return { experiment: WANTED_LANDING_EXPERIMENT.id, variant: variant.id, bucket, mode: "assigned" };
  }
  throw new Error("Experiment allocation does not cover every bucket.");
}

export function resolveWantedAssignment(seed: string, previewOverride?: string | null): WantedAssignment {
  if (validWantedVariant(previewOverride)) return { experiment: WANTED_LANDING_EXPERIMENT.id, variant: previewOverride, bucket: null, mode: "preview" };
  return assignWantedVariant(seed);
}

export const experimentRotatorContract = {
  version: ROTATOR_VERSION,
  privacy: { persistent_identifier: "device_local_only", transmitted_identifier: "ephemeral_session_only", IP_storage: false, fingerprinting: false, third_party_analytics: false, event_retention_days: 35, deletion_mechanism: "delete_before_each_accepted_insert" },
  assignment: { algorithm: "FNV1a_32", modulus: 10_000, stable_per_device: true, query_override: "wanted_variant", invalid_override: "ignored", pre_assignment_presentation: "neutral_noninteractive" },
  counting: { exposure: "once_per_session_per_experiment_variant", goal: "distinct_exposed_sessions_with_later_matching_primary_cta", preview_mode_included: false, operator_mode_included: false, reporting_window_days: 30 },
  inference: { conversion_interval: "wilson_score_95_percent", sample_ratio_mismatch: "pearson_chi_square_df_2", sample_ratio_alert_p_below: 0.001, winner_declaration: false },
  ingestion: { maximum_body_bytes: 8192, content_type: "application/json", experiment_id_required: true, current_rotator_version_required: true, same_variant_goal_required: true },
  safety_boundary: { changes_benchmark_content: false, changes_score: false, changes_certification: false, changes_registry_rank: false, presentation_only: true },
  experiments: [WANTED_LANDING_EXPERIMENT],
} as const;

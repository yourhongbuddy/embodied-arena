import { score, validateRows, type Outcome, type Row } from "../calculator/scoring.ts";

export const SITE_HETEROGENEITY_VERSION = "0.2-SH1";
const TOLERANCE = 1e-6;
const digest = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const https = (value: unknown) => typeof value === "string" && /^https:\/\//.test(value);
const utc = (value: unknown) => typeof value === "string" && value.endsWith("Z") && Number.isFinite(Date.parse(value));
const close = (left: number | null, right: number | null) => left === null || right === null ? left === right : Math.abs(left - right) <= TOLERANCE;
const round = (value: number) => Math.round(value * 1e9) / 1e9;

export type SiteHeterogeneityRecord = {
  environment: string;
  site_id: string;
  resident_hours: number;
  disposition: Outcome;
};

export type SiteProfile = {
  site_id: string;
  environment_count: number;
  environment_share: number;
  wanted_score: number | null;
  survival_at_10000: number | null;
  horizon_identifiable: boolean;
};

export type LeaveOneSiteOut = {
  excluded_site_id: string;
  remaining_environment_count: number;
  wanted_score: number | null;
  shift_from_pooled: number | null;
};

export type SiteHeterogeneityReproduction = {
  environment_count: number;
  site_count: number;
  smallest_site_n: number;
  maximum_site_share: number;
  pooled_wanted_score: number;
  pooled_survival_at_10000: number;
  identifiable_site_count: number;
  site_wanted_min: number | null;
  site_wanted_max: number | null;
  site_wanted_range: number | null;
  leave_one_site_out_maximum_absolute_shift: number | null;
  leave_one_site_out_unidentifiable: number;
  site_profiles: SiteProfile[];
  leave_one_site_out: LeaveOneSiteOut[];
};

export type SiteHeterogeneityInput = {
  profile_version: typeof SITE_HETEROGENEITY_VERSION;
  target_certification: "WANTED_WILD";
  analysis_profile_version: "0.2-A2";
  design: {
    frozen_at: string;
    first_benchmark_activity_at: string;
    site_definition: string;
    minimum_sites: 3;
    minimum_environments_per_site: 3;
    maximum_site_share: 0.5;
    opaque_public_site_ids: true;
    pooled_score_unchanged: true;
  };
  records: SiteHeterogeneityRecord[];
  claimed: SiteHeterogeneityReproduction;
  bindings: {
    cohort_integrity_sha256: string;
    endpoint_table_sha256: string;
    analysis_reproduction_sha256: string;
    preregistration_sha256: string;
  };
  evidence: {
    site_assignment_register_uri: string;
    site_assignment_register_sha256: string;
    reproduction_log_uri: string;
    reproduction_log_sha256: string;
    public_aggregate_only: true;
  };
  assessor: { name: string; organization: string; independent_of_sponsor: true; attested: true; signed_at: string };
};

const rows = (records: SiteHeterogeneityRecord[]): Row[] => records.map((record, index) => ({ id: index + 1, environment: record.environment, hours: record.resident_hours, outcome: record.disposition }));

export function reproduceSiteHeterogeneity(records: SiteHeterogeneityRecord[]): SiteHeterogeneityReproduction {
  const pooled = score(rows(records));
  if (pooled.errors.length || pooled.wanted === null || pooled.survival10k === null) throw new Error(pooled.errors[0] || "pooled 10,000-hour score is unsupported");
  const siteIds = [...new Set(records.map(record => record.site_id))].sort();
  const siteProfiles = siteIds.map(siteId => {
    const siteRows = records.filter(record => record.site_id === siteId);
    const estimate = score(rows(siteRows));
    return {
      site_id: siteId,
      environment_count: siteRows.length,
      environment_share: round(siteRows.length / records.length),
      wanted_score: estimate.wanted === null ? null : round(estimate.wanted),
      survival_at_10000: estimate.survival10k === null ? null : round(estimate.survival10k),
      horizon_identifiable: estimate.wanted !== null,
    };
  });
  const leaveOneSiteOut = siteIds.map(siteId => {
    const remaining = records.filter(record => record.site_id !== siteId);
    const estimate = score(rows(remaining));
    return {
      excluded_site_id: siteId,
      remaining_environment_count: remaining.length,
      wanted_score: estimate.wanted === null ? null : round(estimate.wanted),
      shift_from_pooled: estimate.wanted === null ? null : round(estimate.wanted - pooled.wanted),
    };
  });
  const identifiableSiteScores = siteProfiles.flatMap(profile => profile.wanted_score === null ? [] : [profile.wanted_score]);
  const identifiableShifts = leaveOneSiteOut.flatMap(profile => profile.shift_from_pooled === null ? [] : [Math.abs(profile.shift_from_pooled)]);
  const siteMin = identifiableSiteScores.length ? Math.min(...identifiableSiteScores) : null;
  const siteMax = identifiableSiteScores.length ? Math.max(...identifiableSiteScores) : null;
  return {
    environment_count: records.length,
    site_count: siteIds.length,
    smallest_site_n: Math.min(...siteProfiles.map(profile => profile.environment_count)),
    maximum_site_share: Math.max(...siteProfiles.map(profile => profile.environment_share)),
    pooled_wanted_score: round(pooled.wanted),
    pooled_survival_at_10000: round(pooled.survival10k),
    identifiable_site_count: identifiableSiteScores.length,
    site_wanted_min: siteMin,
    site_wanted_max: siteMax,
    site_wanted_range: siteMin === null || siteMax === null ? null : round(siteMax - siteMin),
    leave_one_site_out_maximum_absolute_shift: identifiableShifts.length ? round(Math.max(...identifiableShifts)) : null,
    leave_one_site_out_unidentifiable: leaveOneSiteOut.length - identifiableShifts.length,
    site_profiles: siteProfiles,
    leave_one_site_out: leaveOneSiteOut,
  };
}

const equalProfile = (actual: SiteProfile, claimed: SiteProfile) => actual.site_id === claimed.site_id && actual.environment_count === claimed.environment_count && close(actual.environment_share, claimed.environment_share) && close(actual.wanted_score, claimed.wanted_score) && close(actual.survival_at_10000, claimed.survival_at_10000) && actual.horizon_identifiable === claimed.horizon_identifiable;
const equalLeaveOneOut = (actual: LeaveOneSiteOut, claimed: LeaveOneSiteOut) => actual.excluded_site_id === claimed.excluded_site_id && actual.remaining_environment_count === claimed.remaining_environment_count && close(actual.wanted_score, claimed.wanted_score) && close(actual.shift_from_pooled, claimed.shift_from_pooled);
const gate = (id: string, label: string, passed: boolean, detail: string, remediation: string) => ({ id, label, passed, detail, remediation });

export function assessSiteHeterogeneity(value: unknown) {
  const input = value as SiteHeterogeneityInput;
  if (!input || typeof input !== "object" || Array.isArray(input)) return { status: "invalid", errors: ["Manifest must be an object."], gates: [], summary: null };
  const errors: string[] = [];
  if (input.profile_version !== SITE_HETEROGENEITY_VERSION) errors.push(`profile_version must be ${SITE_HETEROGENEITY_VERSION}.`);
  if (input.target_certification !== "WANTED_WILD") errors.push("Site heterogeneity profile applies to WANTED_WILD.");
  if (input.analysis_profile_version !== "0.2-A2") errors.push("analysis_profile_version must be 0.2-A2.");
  if (!Array.isArray(input.records) || input.records.length < 1) errors.push("records must contain endpoint rows.");
  if (!input.design || !input.claimed || !input.bindings || !input.evidence || !input.assessor) errors.push("design, claimed, bindings, evidence, and assessor are required.");
  if (errors.length) return { status: "invalid", errors, gates: [], summary: null };

  const recordErrors = validateRows(rows(input.records));
  const siteIdsValid = input.records.every(record => typeof record.site_id === "string" && /^site_[a-z0-9_-]{2,40}$/.test(record.site_id));
  const terminalCauses = input.records.filter(record => ["safety_termination", "developer_withdrawal", "consent_privacy_withdrawal"].includes(record.disposition)).length;
  let reproduced: SiteHeterogeneityReproduction | null = null;
  try { reproduced = reproduceSiteHeterogeneity(input.records); } catch (error) { errors.push(error instanceof Error ? error.message : "Unable to reproduce site heterogeneity."); }
  if (!reproduced) return { status: "failed", errors, gates: [], summary: null };

  const design = input.design;
  const designPass = utc(design.frozen_at) && utc(design.first_benchmark_activity_at) && Date.parse(design.frozen_at) < Date.parse(design.first_benchmark_activity_at) && typeof design.site_definition === "string" && design.site_definition.length >= 20 && design.minimum_sites === 3 && design.minimum_environments_per_site === 3 && design.maximum_site_share === .5 && design.opaque_public_site_ids === true && design.pooled_score_unchanged === true;
  const topologyPass = reproduced.environment_count >= 20 && reproduced.site_count >= design.minimum_sites && reproduced.smallest_site_n >= design.minimum_environments_per_site && reproduced.maximum_site_share <= design.maximum_site_share;
  const recordsPass = recordErrors.length === 0 && siteIdsValid && terminalCauses === 0;
  const claimed = input.claimed;
  const pooledPass = claimed.environment_count === reproduced.environment_count && claimed.site_count === reproduced.site_count && claimed.smallest_site_n === reproduced.smallest_site_n && close(claimed.maximum_site_share, reproduced.maximum_site_share) && close(claimed.pooled_wanted_score, reproduced.pooled_wanted_score) && close(claimed.pooled_survival_at_10000, reproduced.pooled_survival_at_10000);
  const sitePass = claimed.identifiable_site_count === reproduced.identifiable_site_count && close(claimed.site_wanted_min, reproduced.site_wanted_min) && close(claimed.site_wanted_max, reproduced.site_wanted_max) && close(claimed.site_wanted_range, reproduced.site_wanted_range) && Array.isArray(claimed.site_profiles) && claimed.site_profiles.length === reproduced.site_profiles.length && reproduced.site_profiles.every((profile, index) => equalProfile(profile, [...claimed.site_profiles].sort((a, b) => a.site_id.localeCompare(b.site_id))[index]));
  const looPass = close(claimed.leave_one_site_out_maximum_absolute_shift, reproduced.leave_one_site_out_maximum_absolute_shift) && claimed.leave_one_site_out_unidentifiable === reproduced.leave_one_site_out_unidentifiable && Array.isArray(claimed.leave_one_site_out) && claimed.leave_one_site_out.length === reproduced.leave_one_site_out.length && reproduced.leave_one_site_out.every((profile, index) => equalLeaveOneOut(profile, [...claimed.leave_one_site_out].sort((a, b) => a.excluded_site_id.localeCompare(b.excluded_site_id))[index]));
  const bindingsPass = Object.values(input.bindings).every(digest);
  const evidencePass = bindingsPass && https(input.evidence.site_assignment_register_uri) && digest(input.evidence.site_assignment_register_sha256) && https(input.evidence.reproduction_log_uri) && digest(input.evidence.reproduction_log_sha256) && input.evidence.public_aggregate_only === true && typeof input.assessor.name === "string" && input.assessor.name.length > 0 && typeof input.assessor.organization === "string" && input.assessor.organization.length > 0 && input.assessor.independent_of_sponsor === true && input.assessor.attested === true && utc(input.assessor.signed_at);
  const gates = [
    gate("SH1", "FROZEN SITE DESIGN", Boolean(designPass), "Site definition and dominance limits were frozen before benchmark activity.", "Freeze the exact site definition, topology limits, and opaque-ID publication rule prospectively."),
    gate("SH2", "MULTI-SITE SUPPORT", topologyPass, "At least three substantive sites contribute without one site exceeding half the cohort.", "Add independent environments or rebalance sites until N≥20, sites≥3, each site N≥3, and maximum share≤0.50."),
    gate("SH3", "BOUND ENDPOINT ROWS", recordsPass, "Every unique environment maps to one opaque site and a rankable A2 endpoint.", "Remove duplicate units, invalid site identifiers, invalid endpoints, and terminal competing causes."),
    gate("SH4", "POOLED SCORE IDENTITY", pooledPass, "The pooled W and S(10K) reproduce without reweighting or score substitution.", "Recompute pooled outputs from the bound endpoint table under profile 0.2-A2."),
    gate("SH5", "SITE-SPECIFIC DISCLOSURE", sitePass, "Every site-specific W is reported when identifiable and null otherwise.", "Publish exact site counts, shares, identifiable estimates, and null unsupported tails."),
    gate("SH6", "LEAVE-ONE-SITE-OUT", looPass, "Every site exclusion is recomputed and maximum pooled-score sensitivity is disclosed.", "Recompute the complete leave-one-site-out table without dropping an inconvenient site."),
    gate("SH7", "BOUND INDEPENDENT AUDIT", Boolean(evidencePass), "Controlled site assignments and the reproduction log are digest-bound and independently attested.", "Bind all upstream digests, HTTPS evidence, aggregate-only publication, and an independent assessor."),
  ];
  return { status: gates.every(item => item.passed) ? "passed" : "failed", errors: [...recordErrors, ...errors], gates, summary: reproduced };
}

const hash = (prefix: string) => `${prefix}${"0123456789abcdef".repeat(4)}`.slice(0, 64);
const makeRecords = (site: string, completed: number, rejected: number, censored: number): SiteHeterogeneityRecord[] => [
  ...Array.from({ length: completed }, (_, index) => ({ environment: `${site}_complete_${index + 1}`, site_id: site, resident_hours: 10_000, disposition: "completed" as const })),
  ...Array.from({ length: rejected }, (_, index) => ({ environment: `${site}_reject_${index + 1}`, site_id: site, resident_hours: 2_500, disposition: "rejected" as const })),
  ...Array.from({ length: censored }, (_, index) => ({ environment: `${site}_censor_${index + 1}`, site_id: site, resident_hours: 2_500, disposition: "unrelated_censor" as const })),
];
const templateRecords = [
  ...makeRecords("site_alpha", 4, 1, 3),
  ...makeRecords("site_beta", 3, 1, 4),
  ...makeRecords("site_gamma", 1, 2, 5),
];
export const siteHeterogeneityTemplate: SiteHeterogeneityInput = {
  profile_version: SITE_HETEROGENEITY_VERSION,
  target_certification: "WANTED_WILD",
  analysis_profile_version: "0.2-A2",
  design: { frozen_at: "2025-12-15T00:00:00Z", first_benchmark_activity_at: "2026-01-01T00:00:00Z", site_definition: "One independently managed recruitment and field-operations unit.", minimum_sites: 3, minimum_environments_per_site: 3, maximum_site_share: .5, opaque_public_site_ids: true, pooled_score_unchanged: true },
  records: templateRecords,
  claimed: reproduceSiteHeterogeneity(templateRecords),
  bindings: { cohort_integrity_sha256: hash("c1"), endpoint_table_sha256: hash("e2"), analysis_reproduction_sha256: hash("a3"), preregistration_sha256: hash("b4") },
  evidence: { site_assignment_register_uri: "https://example.org/wanted-site-assignments.json", site_assignment_register_sha256: hash("c5"), reproduction_log_uri: "https://example.org/wanted-site-heterogeneity.json", reproduction_log_sha256: hash("d6"), public_aggregate_only: true },
  assessor: { name: "Synthetic Multi-Site Auditor", organization: "Independent Example Assurance", independent_of_sponsor: true, attested: true, signed_at: "2026-08-28T18:00:00Z" },
};

const numberOrNull = (minimum = 0, maximum = 100) => ({ type: ["number", "null"], minimum, maximum });
const siteProfileSchema = { type: "object", additionalProperties: false, required: ["site_id", "environment_count", "environment_share", "wanted_score", "survival_at_10000", "horizon_identifiable"], properties: { site_id: { type: "string", pattern: "^site_[a-z0-9_-]{2,40}$" }, environment_count: { type: "integer", minimum: 1 }, environment_share: { type: "number", exclusiveMinimum: 0, maximum: .5 }, wanted_score: numberOrNull(), survival_at_10000: numberOrNull(0, 1), horizon_identifiable: { type: "boolean" } } };
const looSchema = { type: "object", additionalProperties: false, required: ["excluded_site_id", "remaining_environment_count", "wanted_score", "shift_from_pooled"], properties: { excluded_site_id: { type: "string", pattern: "^site_[a-z0-9_-]{2,40}$" }, remaining_environment_count: { type: "integer", minimum: 1 }, wanted_score: numberOrNull(), shift_from_pooled: { type: ["number", "null"], minimum: -100, maximum: 100 } } };
const reproductionProperties = { environment_count: { type: "integer", minimum: 20 }, site_count: { type: "integer", minimum: 3 }, smallest_site_n: { type: "integer", minimum: 3 }, maximum_site_share: { type: "number", exclusiveMinimum: 0, maximum: .5 }, pooled_wanted_score: { type: "number", minimum: 0, maximum: 100 }, pooled_survival_at_10000: { type: "number", minimum: 0, maximum: 1 }, identifiable_site_count: { type: "integer", minimum: 0 }, site_wanted_min: numberOrNull(), site_wanted_max: numberOrNull(), site_wanted_range: numberOrNull(), leave_one_site_out_maximum_absolute_shift: numberOrNull(), leave_one_site_out_unidentifiable: { type: "integer", minimum: 0 }, site_profiles: { type: "array", minItems: 3, items: siteProfileSchema }, leave_one_site_out: { type: "array", minItems: 3, items: looSchema } };
export const siteHeterogeneitySchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/site-heterogeneity.schema.json", title: "WANTED Site Heterogeneity Manifest", type: "object", additionalProperties: false,
  required: ["profile_version", "target_certification", "analysis_profile_version", "design", "records", "claimed", "bindings", "evidence", "assessor"],
  properties: {
    profile_version: { const: SITE_HETEROGENEITY_VERSION }, target_certification: { const: "WANTED_WILD" }, analysis_profile_version: { const: "0.2-A2" },
    design: { type: "object", additionalProperties: false, required: ["frozen_at", "first_benchmark_activity_at", "site_definition", "minimum_sites", "minimum_environments_per_site", "maximum_site_share", "opaque_public_site_ids", "pooled_score_unchanged"], properties: { frozen_at: { type: "string", format: "date-time" }, first_benchmark_activity_at: { type: "string", format: "date-time" }, site_definition: { type: "string", minLength: 20 }, minimum_sites: { const: 3 }, minimum_environments_per_site: { const: 3 }, maximum_site_share: { const: .5 }, opaque_public_site_ids: { const: true }, pooled_score_unchanged: { const: true } } },
    records: { type: "array", minItems: 20, items: { type: "object", additionalProperties: false, required: ["environment", "site_id", "resident_hours", "disposition"], properties: { environment: { type: "string", minLength: 1 }, site_id: { type: "string", pattern: "^site_[a-z0-9_-]{2,40}$" }, resident_hours: { type: "number", minimum: 0, maximum: 10_000 }, disposition: { enum: ["completed", "unrelated_censor", "rejected"] } } } },
    claimed: { type: "object", additionalProperties: false, required: Object.keys(reproductionProperties), properties: reproductionProperties },
    bindings: { type: "object", additionalProperties: false, required: ["cohort_integrity_sha256", "endpoint_table_sha256", "analysis_reproduction_sha256", "preregistration_sha256"], properties: { cohort_integrity_sha256: { type: "string", pattern: "^[a-f0-9]{64}$" }, endpoint_table_sha256: { type: "string", pattern: "^[a-f0-9]{64}$" }, analysis_reproduction_sha256: { type: "string", pattern: "^[a-f0-9]{64}$" }, preregistration_sha256: { type: "string", pattern: "^[a-f0-9]{64}$" } } },
    evidence: { type: "object", additionalProperties: false, required: ["site_assignment_register_uri", "site_assignment_register_sha256", "reproduction_log_uri", "reproduction_log_sha256", "public_aggregate_only"], properties: { site_assignment_register_uri: { type: "string", format: "uri" }, site_assignment_register_sha256: { type: "string", pattern: "^[a-f0-9]{64}$" }, reproduction_log_uri: { type: "string", format: "uri" }, reproduction_log_sha256: { type: "string", pattern: "^[a-f0-9]{64}$" }, public_aggregate_only: { const: true } } },
    assessor: { type: "object", additionalProperties: false, required: ["name", "organization", "independent_of_sponsor", "attested", "signed_at"], properties: { name: { type: "string", minLength: 1 }, organization: { type: "string", minLength: 1 }, independent_of_sponsor: { const: true }, attested: { const: true }, signed_at: { type: "string", format: "date-time" } } },
  },
} as const;

export const siteHeterogeneityContract = {
  name: "WANTED Site Heterogeneity Profile", version: SITE_HETEROGENEITY_VERSION, applies_to: "WANTED_WILD", ranking_effect: "eligibility_gate_and_public_diagnostic_not_score_or_tiebreaker",
  topology: { minimum_sites: 3, minimum_environments_per_site: 3, maximum_site_share: .5, minimum_total_environments: 20 },
  estimator: "same_unweighted_environment_level_0.2-A2_estimator_with_no_site_reweighting",
  required_reproductions: ["pooled_W", "pooled_S_at_10000", "site_specific_W_or_null", "site_specific_S_at_10000_or_null", "leave_one_site_out_W_or_null", "maximum_absolute_site_exclusion_shift"],
  unsupported_site_tail: "report_null_never_extrapolate", privacy: "opaque_public_site_ids_and_aggregate_outputs_only", generalization_boundary: "passing_does_not_license_inference_beyond_observed_sites_or_sampling_frame",
  forbidden_uses: ["site_metric_as_rank_score", "site_metric_as_tiebreaker", "dropping_low_performing_site", "post_outcome_site_redefinition", "participant_or_address_disclosure"],
} as const;

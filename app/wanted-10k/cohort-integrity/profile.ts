export const COHORT_INTEGRITY_VERSION = "0.2-E1";
export type FieldTarget = "WANTED_LAB" | "WANTED_WILD" | "WANTED_10K";

export type CohortIntegrityInput = {
  profile_version: typeof COHORT_INTEGRITY_VERSION;
  target_certification: FieldTarget;
  study: { study_id: string; preregistration_sha256: string; eligibility_frozen_at: string; screening_opened_at: string };
  sampling: {
    frame_description: string;
    recruitment_channels: string[];
    geographic_scope: string[];
    inclusion_rule_count: number;
    exclusion_rule_count: number;
    base_compensation_independent_of_retention: boolean;
    no_removal_penalty: boolean;
    no_persuasion_after_removal_request: boolean;
  };
  flow: {
    screened: number;
    eligible: number;
    consented: number;
    activated: number;
    analysis_set: number;
    pre_activation_exclusions: number;
    post_activation_exclusions: number;
    replacements_after_activation: number;
    original_runs_retained: boolean;
  };
  independence: {
    independent_environments: number;
    unique_environment_ids: number;
    unique_primary_decision_makers: number;
    duplicate_environment_ids: number;
    duplicate_primary_decision_makers: number;
    maximum_environments_per_primary_decision_maker: number;
    sponsor_controlled_environments: number;
    developer_employee_environments: number;
    related_environment_clusters: number;
    hardware_units: number;
    reused_hardware_units: number;
    reset_between_assignments_attested: boolean;
  };
  evidence: {
    participant_flow_uri: string;
    participant_flow_sha256: string;
    hashed_linkage_register_uri: string;
    hashed_linkage_register_sha256: string;
    public_aggregate_only: boolean;
  };
  assessor: { name: string; organization: string; independent_of_sponsor: boolean; attested: boolean; signed_at: string };
};

export type CohortIntegrityGate = { id: string; label: string; passed: boolean; detail: string };
export type CohortIntegritySummary = {
  profile_version: typeof COHORT_INTEGRITY_VERSION;
  target_certification: FieldTarget;
  screened: number;
  eligible: number;
  consented: number;
  activated: number;
  analysis_set: number;
  independent_environments: number;
  unique_primary_decision_makers: number;
  post_activation_exclusions: number;
  duplicate_environment_ids: number;
  duplicate_primary_decision_makers: number;
  sponsor_controlled_environments: number;
  developer_employee_environments: number;
  related_environment_clusters: number;
  replacements_after_activation: number;
  original_runs_retained: boolean;
  selection_rate: number;
};
export type CohortIntegrityResult = { status: "passed" | "failed" | "invalid"; errors: string[]; gates: CohortIntegrityGate[]; summary: CohortIntegritySummary | null };

const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const integer = (value: unknown) => Number.isInteger(value) && Number(value) >= 0;
const digest = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value) && !/^([a-f0-9])\1{63}$/.test(value);
const https = (value: unknown) => typeof value === "string" && /^https:\/\//.test(value);
const gate = (id: string, label: string, passed: boolean, pass: string, fail: string): CohortIntegrityGate => ({ id, label, passed, detail: passed ? pass : fail });
const round = (value: number) => Number(value.toFixed(6));

export function assessCohortIntegrity(value: unknown): CohortIntegrityResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { status: "invalid", errors: ["Cohort-integrity manifest must be one JSON object."], gates: [], summary: null };
  const input = value as Partial<CohortIntegrityInput>;
  const study = object(input.study), sampling = object(input.sampling), flow = object(input.flow), independence = object(input.independence), evidence = object(input.evidence), assessor = object(input.assessor);
  const errors: string[] = [];
  if (input.profile_version !== COHORT_INTEGRITY_VERSION) errors.push(`profile_version must be ${COHORT_INTEGRITY_VERSION}.`);
  if (!["WANTED_LAB", "WANTED_WILD", "WANTED_10K"].includes(String(input.target_certification))) errors.push("target_certification must be a field target.");
  for (const key of ["inclusion_rule_count", "exclusion_rule_count"]) if (!integer(sampling[key])) errors.push(`sampling.${key} must be a non-negative integer.`);
  for (const key of ["screened", "eligible", "consented", "activated", "analysis_set", "pre_activation_exclusions", "post_activation_exclusions", "replacements_after_activation"]) if (!integer(flow[key])) errors.push(`flow.${key} must be a non-negative integer.`);
  for (const key of ["independent_environments", "unique_environment_ids", "unique_primary_decision_makers", "duplicate_environment_ids", "duplicate_primary_decision_makers", "maximum_environments_per_primary_decision_maker", "sponsor_controlled_environments", "developer_employee_environments", "related_environment_clusters", "hardware_units", "reused_hardware_units"]) if (!integer(independence[key])) errors.push(`independence.${key} must be a non-negative integer.`);
  if (errors.length) return { status: "invalid", errors, gates: [], summary: null };

  const target = input.target_certification as FieldTarget;
  const frozen = digest(study.preregistration_sha256) && typeof study.study_id === "string" && study.study_id.length > 0 && Number.isFinite(Date.parse(String(study.eligibility_frozen_at))) && Date.parse(String(study.eligibility_frozen_at)) < Date.parse(String(study.screening_opened_at));
  const frame = typeof sampling.frame_description === "string" && sampling.frame_description.length >= 20 && Array.isArray(sampling.recruitment_channels) && sampling.recruitment_channels.length > 0 && sampling.recruitment_channels.every(item => typeof item === "string" && item.length > 0) && Array.isArray(sampling.geographic_scope) && sampling.geographic_scope.length > 0 && Number(sampling.inclusion_rule_count) >= 1 && Number(sampling.exclusion_rule_count) >= 1;
  const choice = sampling.base_compensation_independent_of_retention === true && sampling.no_removal_penalty === true && sampling.no_persuasion_after_removal_request === true && Number(independence.developer_employee_environments) === 0;
  const flowPass = Number(flow.screened) >= Number(flow.eligible) && Number(flow.eligible) >= Number(flow.consented) && Number(flow.consented) >= Number(flow.activated) && Number(flow.pre_activation_exclusions) === Number(flow.consented) - Number(flow.activated) && Number(flow.analysis_set) === Number(flow.activated) && Number(flow.post_activation_exclusions) === 0 && (Number(flow.replacements_after_activation) === 0 || flow.original_runs_retained === true);
  const unitPass = Number(independence.independent_environments) === Number(flow.analysis_set) && Number(independence.unique_environment_ids) === Number(independence.independent_environments) && Number(independence.unique_primary_decision_makers) === Number(independence.independent_environments) && Number(independence.duplicate_environment_ids) === 0 && Number(independence.duplicate_primary_decision_makers) === 0 && Number(independence.maximum_environments_per_primary_decision_maker) === 1 && Number(independence.related_environment_clusters) === 0;
  const minimum = target === "WANTED_WILD" ? 20 : 1;
  const targetPass = Number(independence.independent_environments) >= minimum && (target === "WANTED_LAB" || Number(independence.sponsor_controlled_environments) === 0) && Number(independence.hardware_units) >= 1 && Number(independence.reused_hardware_units) <= Number(independence.hardware_units) && (Number(independence.reused_hardware_units) === 0 || independence.reset_between_assignments_attested === true);
  const evidencePass = https(evidence.participant_flow_uri) && digest(evidence.participant_flow_sha256) && https(evidence.hashed_linkage_register_uri) && digest(evidence.hashed_linkage_register_sha256) && evidence.public_aggregate_only === true && typeof assessor.name === "string" && assessor.name.length > 0 && typeof assessor.organization === "string" && assessor.organization.length > 0 && assessor.independent_of_sponsor === true && assessor.attested === true && Number.isFinite(Date.parse(String(assessor.signed_at)));
  const gates = [
    gate("E1", "FROZEN ELIGIBILITY", Boolean(frozen), "Eligibility and recruitment rules were frozen before screening opened.", "Bind a non-placeholder preregistration digest and freeze eligibility before the first screening decision."),
    gate("E2", "DISCLOSED SAMPLING FRAME", frame, "Recruitment channels, geography, and inclusion and exclusion rules are disclosed.", "Describe the sampling frame, geography, recruitment channels, and at least one inclusion and exclusion rule."),
    gate("E3", "VOLUNTARY CHOICE", choice, "Compensation and removal rights do not reward retention; developer employees are excluded.", "Make compensation independent of retention, remove penalties and persuasion, and exclude developer-employee environments."),
    gate("E4", "PROSPECTIVE FLOW", flowPass, "Every activated environment remains in the analysis set, including replaced runs.", "Reconcile screened-to-analysis counts, permit no post-activation exclusion, and retain every original run after replacement."),
    gate("E5", "INDEPENDENT DECISION UNITS", unitPass, "Every analysis environment has one unique ID and one unique primary decision-maker.", "Remove duplicate IDs, shared decision-makers, related clusters, and mismatches between activated and analyzed environments."),
    gate("E6", "TARGET + CARRYOVER", targetPass, `${target} meets its environment threshold and physical carryover rule.`, target === "WANTED_WILD" ? "Provide at least 20 non-sponsor-controlled environments and attest reset for every reused hardware unit." : "Provide at least one qualifying environment and attest reset for every reused hardware unit."),
    gate("E7", "BOUND INDEPENDENT AUDIT", Boolean(evidencePass), "Participant flow and hashed linkage evidence are bound and independently attested.", "Provide HTTPS evidence with non-placeholder digests, aggregate-only publication, and an independent assessor attestation."),
  ];
  const summary: CohortIntegritySummary = {
    profile_version: COHORT_INTEGRITY_VERSION, target_certification: target,
    screened: Number(flow.screened), eligible: Number(flow.eligible), consented: Number(flow.consented), activated: Number(flow.activated), analysis_set: Number(flow.analysis_set),
    independent_environments: Number(independence.independent_environments), unique_primary_decision_makers: Number(independence.unique_primary_decision_makers), post_activation_exclusions: Number(flow.post_activation_exclusions), duplicate_environment_ids: Number(independence.duplicate_environment_ids), duplicate_primary_decision_makers: Number(independence.duplicate_primary_decision_makers), sponsor_controlled_environments: Number(independence.sponsor_controlled_environments), developer_employee_environments: Number(independence.developer_employee_environments), related_environment_clusters: Number(independence.related_environment_clusters), replacements_after_activation: Number(flow.replacements_after_activation), original_runs_retained: Boolean(flow.original_runs_retained), selection_rate: Number(flow.screened) > 0 ? round(Number(flow.activated) / Number(flow.screened)) : 0,
  };
  return { status: gates.every(item => item.passed) ? "passed" : "failed", errors: [], gates, summary };
}

const hash = (prefix: string) => `${prefix}${"0123456789abcdef".repeat(4)}`.slice(0, 64);
export function cohortIntegrityTemplateFor(target: FieldTarget): CohortIntegrityInput {
  const environments = target === "WANTED_WILD" ? 24 : 1;
  const screened = target === "WANTED_WILD" ? 70 : 4;
  const eligible = target === "WANTED_WILD" ? 56 : 3;
  const consented = target === "WANTED_WILD" ? 50 : 2;
  return {
    profile_version: COHORT_INTEGRITY_VERSION,
    target_certification: target,
    study: { study_id: "SYNTHETIC-STUDY-001", preregistration_sha256: hash("b1"), eligibility_frozen_at: "2025-12-15T00:00:00Z", screening_opened_at: "2026-01-01T00:00:00Z" },
    sampling: { frame_description: "Synthetic probability-informed community recruitment frame across declared operating geographies.", recruitment_channels: ["community_registry", "public_call"], geographic_scope: ["US-CA"], inclusion_rule_count: 4, exclusion_rule_count: 3, base_compensation_independent_of_retention: true, no_removal_penalty: true, no_persuasion_after_removal_request: true },
    flow: { screened, eligible, consented, activated: environments, analysis_set: environments, pre_activation_exclusions: consented - environments, post_activation_exclusions: 0, replacements_after_activation: target === "WANTED_WILD" ? 2 : 0, original_runs_retained: true },
    independence: { independent_environments: environments, unique_environment_ids: environments, unique_primary_decision_makers: environments, duplicate_environment_ids: 0, duplicate_primary_decision_makers: 0, maximum_environments_per_primary_decision_maker: 1, sponsor_controlled_environments: target === "WANTED_LAB" ? 1 : 0, developer_employee_environments: 0, related_environment_clusters: 0, hardware_units: target === "WANTED_WILD" ? 12 : 1, reused_hardware_units: target === "WANTED_WILD" ? 12 : 0, reset_between_assignments_attested: true },
    evidence: { participant_flow_uri: "https://example.org/wanted-participant-flow.json", participant_flow_sha256: hash("c2"), hashed_linkage_register_uri: "https://example.org/wanted-hashed-linkage-register.json", hashed_linkage_register_sha256: hash("d3"), public_aggregate_only: true },
    assessor: { name: "Synthetic Cohort Auditor", organization: "Independent Example Assurance", independent_of_sponsor: true, attested: true, signed_at: "2026-08-28T18:00:00Z" },
  };
}
export const cohortIntegrityTemplate = cohortIntegrityTemplateFor("WANTED_WILD");

const nonnegativeInteger = { type: "integer", minimum: 0 };
const digestSchema = { type: "string", pattern: "^[a-f0-9]{64}$" };
const uri = { type: "string", format: "uri" };
export const cohortIntegritySchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/cohort-integrity.schema.json",
  title: "WANTED-10K Cohort Integrity Manifest",
  type: "object", additionalProperties: false,
  required: ["profile_version", "target_certification", "study", "sampling", "flow", "independence", "evidence", "assessor"],
  properties: {
    profile_version: { const: COHORT_INTEGRITY_VERSION }, target_certification: { enum: ["WANTED_LAB", "WANTED_WILD", "WANTED_10K"] },
    study: { type: "object", additionalProperties: false, required: ["study_id", "preregistration_sha256", "eligibility_frozen_at", "screening_opened_at"], properties: { study_id: { type: "string", minLength: 1 }, preregistration_sha256: digestSchema, eligibility_frozen_at: { type: "string", format: "date-time" }, screening_opened_at: { type: "string", format: "date-time" } } },
    sampling: { type: "object", additionalProperties: false, required: ["frame_description", "recruitment_channels", "geographic_scope", "inclusion_rule_count", "exclusion_rule_count", "base_compensation_independent_of_retention", "no_removal_penalty", "no_persuasion_after_removal_request"], properties: { frame_description: { type: "string", minLength: 20 }, recruitment_channels: { type: "array", minItems: 1, uniqueItems: true, items: { type: "string", minLength: 1 } }, geographic_scope: { type: "array", minItems: 1, uniqueItems: true, items: { type: "string", minLength: 1 } }, inclusion_rule_count: { type: "integer", minimum: 1 }, exclusion_rule_count: { type: "integer", minimum: 1 }, base_compensation_independent_of_retention: { const: true }, no_removal_penalty: { const: true }, no_persuasion_after_removal_request: { const: true } } },
    flow: { type: "object", additionalProperties: false, required: ["screened", "eligible", "consented", "activated", "analysis_set", "pre_activation_exclusions", "post_activation_exclusions", "replacements_after_activation", "original_runs_retained"], properties: { screened: nonnegativeInteger, eligible: nonnegativeInteger, consented: nonnegativeInteger, activated: nonnegativeInteger, analysis_set: nonnegativeInteger, pre_activation_exclusions: nonnegativeInteger, post_activation_exclusions: { const: 0 }, replacements_after_activation: nonnegativeInteger, original_runs_retained: { const: true } } },
    independence: { type: "object", additionalProperties: false, required: ["independent_environments", "unique_environment_ids", "unique_primary_decision_makers", "duplicate_environment_ids", "duplicate_primary_decision_makers", "maximum_environments_per_primary_decision_maker", "sponsor_controlled_environments", "developer_employee_environments", "related_environment_clusters", "hardware_units", "reused_hardware_units", "reset_between_assignments_attested"], properties: { independent_environments: { type: "integer", minimum: 1 }, unique_environment_ids: { type: "integer", minimum: 1 }, unique_primary_decision_makers: { type: "integer", minimum: 1 }, duplicate_environment_ids: { const: 0 }, duplicate_primary_decision_makers: { const: 0 }, maximum_environments_per_primary_decision_maker: { const: 1 }, sponsor_controlled_environments: nonnegativeInteger, developer_employee_environments: { const: 0 }, related_environment_clusters: { const: 0 }, hardware_units: { type: "integer", minimum: 1 }, reused_hardware_units: nonnegativeInteger, reset_between_assignments_attested: { const: true } } },
    evidence: { type: "object", additionalProperties: false, required: ["participant_flow_uri", "participant_flow_sha256", "hashed_linkage_register_uri", "hashed_linkage_register_sha256", "public_aggregate_only"], properties: { participant_flow_uri: uri, participant_flow_sha256: digestSchema, hashed_linkage_register_uri: uri, hashed_linkage_register_sha256: digestSchema, public_aggregate_only: { const: true } } },
    assessor: { type: "object", additionalProperties: false, required: ["name", "organization", "independent_of_sponsor", "attested", "signed_at"], properties: { name: { type: "string", minLength: 1 }, organization: { type: "string", minLength: 1 }, independent_of_sponsor: { const: true }, attested: { const: true }, signed_at: { type: "string", format: "date-time" } } },
  },
};

export const cohortIntegrityContract = {
  name: "WANTED Cohort Integrity Profile", version: COHORT_INTEGRITY_VERSION, ranking_effect: "eligibility_gate_not_score",
  purpose: "Prevent pseudo-replication, post-activation cherry-picking, coerced retention, and undisclosed sponsor control.",
  analysis_principle: "intention_to_observe_all_activated_environments",
  independence_unit: "one_residence_plus_one_unique_primary_decision_maker",
  hard_failures: ["eligibility_not_frozen_before_screening", "retention_linked_compensation", "developer_employee_environment", "post_activation_exclusion", "duplicate_environment_id", "duplicate_primary_decision_maker", "related_environment_cluster", "unretained_replaced_run", "unbound_linkage_evidence"],
  target_rules: { WANTED_LAB: { minimum_environments: 1, sponsor_controlled_permitted_if_disclosed: true }, WANTED_WILD: { minimum_environments: 20, sponsor_controlled_environments: 0 }, WANTED_10K: { minimum_environments: 1, sponsor_controlled_environments: 0 } },
  representativeness_claim: false,
  privacy: "public aggregate flow; hashed linkage register remains controlled evidence",
} as const;


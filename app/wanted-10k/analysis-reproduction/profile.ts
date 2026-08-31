import { BOOTSTRAP_PRNG, bootstrap, HORIZON, robustness, score, validateRows, type Outcome, type Row } from "../calculator/scoring.ts";

export const ANALYSIS_REPRODUCTION_VERSION = "0.2-A1";
export const ANALYSIS_ESTIMATOR = "kaplan_meier_normalized_rmst_no_unsupported_extrapolation";
export const ANALYSIS_TIE_RULE = "endpoint_events_before_censoring_at_identical_time";
const acceptedOutcomes: Outcome[] = ["completed", "unrelated_censor", "rejected", "safety_termination", "developer_withdrawal", "consent_privacy_withdrawal"];

export type AnalysisRecord = { environment_id_sha256: string; resident_hours: number; disposition: Outcome; endpoint_decision_sha256: string; exposure_record_sha256: string };
export type AnalysisClaim = { wanted_score: number; ci95_lower: number; ci95_upper: number; survival_at_10000: number; horizon_identifiable: true; bootstrap_valid_fraction: number; censoring_bound_lower: number; censoring_bound_upper: number; censoring_bound_width: number; loo_max_absolute_shift: number | null; loo_unidentifiable_exclusions: number; support_at_10000: number; early_exit_count: number };
export type AnalysisReproductionInput = {
  profile_version: typeof ANALYSIS_REPRODUCTION_VERSION;
  target_certification: "WANTED_WILD";
  estimator: { name: typeof ANALYSIS_ESTIMATOR; horizon_hours: 10000; event: "permanent_voluntary_rejection"; tie_rule: typeof ANALYSIS_TIE_RULE };
  bootstrap: { unit: "independent_environment"; method: "nonparametric_percentile_95"; samples: number; seed: number; prng: typeof BOOTSTRAP_PRNG; minimum_valid_fraction: 0.95 };
  records: AnalysisRecord[];
  upstream_bindings: { cohort_integrity_sha256: string; exposure_integrity_sha256: string; endpoint_decisions_sha256: string; analysis_code_sha256: string };
  claimed: AnalysisClaim;
  evidence: { endpoint_table_uri: string; endpoint_table_sha256: string; reproduction_log_uri: string; reproduction_log_sha256: string; public_aggregate_only: boolean };
  assessor: { name: string; organization: string; independent_of_sponsor: boolean; attested: boolean; signed_at: string };
};
export type AnalysisGate = { id: string; label: string; passed: boolean; detail: string };
export type AnalysisSummary = AnalysisClaim & { profile_version: typeof ANALYSIS_REPRODUCTION_VERSION; environment_count: number; total_resident_hours: number; voluntary_rejections: number; unrelated_censors: number; lifetime_completions: number; terminal_competing_causes: number; bootstrap_samples: number; bootstrap_seed: number; bootstrap_prng: typeof BOOTSTRAP_PRNG };
export type AnalysisResult = { status: "passed" | "failed" | "invalid"; errors: string[]; gates: AnalysisGate[]; summary: AnalysisSummary | null };

const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const digest = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value) && !/^([a-f0-9])\1{63}$/.test(value);
const https = (value: unknown) => typeof value === "string" && /^https:\/\//.test(value);
const utc = (value: unknown) => typeof value === "string" && value.endsWith("Z") && Number.isFinite(Date.parse(value));
const numeric = (value: unknown) => typeof value === "number" && Number.isFinite(value);
const close = (left: unknown, right: unknown, tolerance = 1e-6) => numeric(left) && numeric(right) && Math.abs(Number(left) - Number(right)) <= tolerance;
const gate = (id: string, label: string, passed: boolean, pass: string, fail: string): AnalysisGate => ({ id, label, passed, detail: passed ? pass : fail });
const rowsFor = (records: AnalysisRecord[]): Row[] => records.map((record, index) => ({ id: index + 1, environment: record.environment_id_sha256, hours: record.resident_hours, outcome: record.disposition }));

export function reproduceAnalysis(records: AnalysisRecord[], samples: number, seed: number) {
  const rows = rowsFor(records);
  const primary = score(rows), uncertainty = bootstrap(rows, samples, seed), robust = robustness(rows);
  if (primary.wanted === null || primary.survival10k === null || !primary.identifiable || !uncertainty.interval || !robust.bounds || !robust.influence || !robust.support) return null;
  return {
    wanted_score: primary.wanted, ci95_lower: uncertainty.interval[0], ci95_upper: uncertainty.interval[1], survival_at_10000: primary.survival10k, horizon_identifiable: true as const, bootstrap_valid_fraction: uncertainty.validFraction,
    censoring_bound_lower: Number(robust.bounds.lower), censoring_bound_upper: Number(robust.bounds.upper), censoring_bound_width: Number(robust.bounds.width), loo_max_absolute_shift: robust.influence.maximum_absolute_shift, loo_unidentifiable_exclusions: robust.influence.unidentifiable_exclusions, support_at_10000: robust.support.at_risk_10000, early_exit_count: robust.bounds.early_exits,
  };
}

export function assessAnalysisReproduction(value: unknown): AnalysisResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { status: "invalid", errors: ["Analysis manifest must be one JSON object."], gates: [], summary: null };
  const input = value as Partial<AnalysisReproductionInput>, estimator = object(input.estimator), boot = object(input.bootstrap), claimed = object(input.claimed), bindings = object(input.upstream_bindings), evidence = object(input.evidence), assessor = object(input.assessor);
  const errors: string[] = [];
  if (input.profile_version !== ANALYSIS_REPRODUCTION_VERSION) errors.push(`profile_version must be ${ANALYSIS_REPRODUCTION_VERSION}.`);
  if (input.target_certification !== "WANTED_WILD") errors.push("target_certification must be WANTED_WILD.");
  if (!Array.isArray(input.records) || input.records.length < 1) errors.push("records must contain at least one environment.");
  if (!Number.isInteger(boot.samples) || Number(boot.samples) < 10000) errors.push("bootstrap.samples must be at least 10,000.");
  if (!Number.isInteger(boot.seed) || Number(boot.seed) < 0) errors.push("bootstrap.seed must be a non-negative integer.");
  if (errors.length) return { status: "invalid", errors, gates: [], summary: null };

  const records = input.records as AnalysisRecord[], rows = rowsFor(records), rowErrors = validateRows(rows);
  const exactEstimator = estimator.name === ANALYSIS_ESTIMATOR && estimator.horizon_hours === HORIZON && estimator.event === "permanent_voluntary_rejection" && estimator.tie_rule === ANALYSIS_TIE_RULE && boot.unit === "independent_environment" && boot.method === "nonparametric_percentile_95" && boot.prng === BOOTSTRAP_PRNG && boot.minimum_valid_fraction === .95;
  const endpointPass = rowErrors.length === 0 && records.every(record => digest(record.endpoint_decision_sha256) && digest(record.exposure_record_sha256) && acceptedOutcomes.includes(record.disposition)) && !records.some(record => ["safety_termination", "developer_withdrawal", "consent_privacy_withdrawal"].includes(record.disposition));
  const ids = records.map(record => record.environment_id_sha256), uniquePass = ids.every(digest) && new Set(ids).size === records.length;
  const totalHours = records.reduce((sum, record) => sum + Number(record.resident_hours || 0), 0), targetPass = records.length >= 20 && totalHours >= 10000;
  const reproduced = endpointPass && uniquePass ? reproduceAnalysis(records, Number(boot.samples), Number(boot.seed)) : null;
  const primaryPass = Boolean(reproduced && close(claimed.wanted_score, reproduced.wanted_score) && close(claimed.survival_at_10000, reproduced.survival_at_10000) && claimed.horizon_identifiable === true);
  const uncertaintyPass = Boolean(reproduced && close(claimed.ci95_lower, reproduced.ci95_lower) && close(claimed.ci95_upper, reproduced.ci95_upper) && close(claimed.bootstrap_valid_fraction, reproduced.bootstrap_valid_fraction) && close(claimed.censoring_bound_lower, reproduced.censoring_bound_lower) && close(claimed.censoring_bound_upper, reproduced.censoring_bound_upper) && close(claimed.censoring_bound_width, reproduced.censoring_bound_width) && ((claimed.loo_max_absolute_shift === null && reproduced.loo_max_absolute_shift === null) || close(claimed.loo_max_absolute_shift, reproduced.loo_max_absolute_shift)) && claimed.loo_unidentifiable_exclusions === reproduced.loo_unidentifiable_exclusions && claimed.support_at_10000 === reproduced.support_at_10000 && claimed.early_exit_count === reproduced.early_exit_count && reproduced.bootstrap_valid_fraction >= .95);
  const bindingPass = [bindings.cohort_integrity_sha256, bindings.exposure_integrity_sha256, bindings.endpoint_decisions_sha256, bindings.analysis_code_sha256].every(digest);
  const assurancePass = bindingPass && https(evidence.endpoint_table_uri) && digest(evidence.endpoint_table_sha256) && https(evidence.reproduction_log_uri) && digest(evidence.reproduction_log_sha256) && evidence.public_aggregate_only === true && typeof assessor.name === "string" && assessor.name.length > 0 && typeof assessor.organization === "string" && assessor.organization.length > 0 && assessor.independent_of_sponsor === true && assessor.attested === true && utc(assessor.signed_at);
  const gates = [
    gate("A1", "FROZEN ESTIMAND", exactEstimator, "Estimator, horizon, event, tie rule, bootstrap unit, PRNG, and support threshold are canonical.", "Use the exact 0.2-A1 estimator and deterministic environment-bootstrap contract."),
    gate("A2", "ENDPOINT MAPPING", endpointPass, "Every disposition maps to a valid WILD event or censor with no terminal competing cause.", rowErrors[0] || "Resolve invalid dispositions, incomplete record bindings, or terminal competing causes before ranking."),
    gate("A3", "UNIQUE ANALYSIS UNITS", uniquePass, "Every row has one unique hashed environment identifier.", "Bind every row to a unique non-placeholder environment hash."),
    gate("A4", "WILD SUPPORT", targetPass, "The endpoint table contains at least 20 environments and 10,000 aggregate resident hours.", "Provide N≥20 and at least 10,000 reconciled resident hours."),
    gate("A5", "PRIMARY REPRODUCTION", primaryPass, "W and S(10K) reproduce from the endpoint table without extrapolation.", reproduced ? "Replace the claimed W or S(10K) with the reproduced result." : "The 10,000-hour estimand is not identifiable from the supplied records."),
    gate("A6", "UNCERTAINTY + ROBUSTNESS", uncertaintyPass, "The deterministic 95% CI, censoring bounds, influence, and tail support reproduce exactly.", "Recompute the bootstrap and 0.2-R1 disclosures with the frozen seed, PRNG, and environment rows."),
    gate("A7", "BOUND INDEPENDENT AUDIT", assurancePass, "Endpoint table, upstream profiles, code, reproduction log, and independent assessor are bound.", "Provide non-placeholder upstream and evidence digests plus independent attestation."),
  ];
  const summary: AnalysisSummary | null = reproduced ? { profile_version: ANALYSIS_REPRODUCTION_VERSION, ...reproduced, environment_count: records.length, total_resident_hours: totalHours, voluntary_rejections: records.filter(record => record.disposition === "rejected").length, unrelated_censors: records.filter(record => record.disposition === "unrelated_censor").length, lifetime_completions: records.filter(record => record.disposition === "completed").length, terminal_competing_causes: records.filter(record => ["safety_termination", "developer_withdrawal", "consent_privacy_withdrawal"].includes(record.disposition)).length, bootstrap_samples: Number(boot.samples), bootstrap_seed: Number(boot.seed), bootstrap_prng: BOOTSTRAP_PRNG } : null;
  return { status: gates.every(item => item.passed) ? "passed" : "failed", errors: [], gates, summary };
}

const hash = (prefix: string) => `${prefix}${"0123456789abcdef".repeat(4)}`.slice(0, 64);
const records: AnalysisRecord[] = [
  ...Array.from({ length: 8 }, (_, index) => ({ environment_id_sha256: hash(`${(index + 10).toString(16)}a`), resident_hours: 10000, disposition: "completed" as const, endpoint_decision_sha256: hash(`${(index + 40).toString(16)}b`), exposure_record_sha256: hash(`${(index + 70).toString(16)}c`) })),
  ...Array.from({ length: 4 }, (_, index) => ({ environment_id_sha256: hash(`${(index + 18).toString(16)}a`), resident_hours: 2500, disposition: "rejected" as const, endpoint_decision_sha256: hash(`${(index + 48).toString(16)}b`), exposure_record_sha256: hash(`${(index + 78).toString(16)}c`) })),
  ...Array.from({ length: 12 }, (_, index) => ({ environment_id_sha256: hash(`${(index + 22).toString(16)}a`), resident_hours: 2500, disposition: "unrelated_censor" as const, endpoint_decision_sha256: hash(`${(index + 52).toString(16)}b`), exposure_record_sha256: hash(`${(index + 82).toString(16)}c`) })),
];
const claimed: AnalysisClaim = { wanted_score: 87.5, ci95_lower: 75, ci95_upper: 96.875, survival_at_10000: 0.8333333333333334, horizon_identifiable: true, bootstrap_valid_fraction: 1, censoring_bound_lower: 50, censoring_bound_upper: 87.5, censoring_bound_width: 37.5, loo_max_absolute_shift: 2.7173913043478137, loo_unidentifiable_exclusions: 0, support_at_10000: 8, early_exit_count: 12 };
export const analysisReproductionTemplate: AnalysisReproductionInput = { profile_version: ANALYSIS_REPRODUCTION_VERSION, target_certification: "WANTED_WILD", estimator: { name: ANALYSIS_ESTIMATOR, horizon_hours: 10000, event: "permanent_voluntary_rejection", tie_rule: ANALYSIS_TIE_RULE }, bootstrap: { unit: "independent_environment", method: "nonparametric_percentile_95", samples: 10000, seed: 10000, prng: BOOTSTRAP_PRNG, minimum_valid_fraction: .95 }, records, upstream_bindings: { cohort_integrity_sha256: hash("ca"), exposure_integrity_sha256: hash("eb"), endpoint_decisions_sha256: hash("e"), analysis_code_sha256: hash("1") }, claimed, evidence: { endpoint_table_uri: "https://example.org/wanted-endpoint-table.json", endpoint_table_sha256: hash("e7"), reproduction_log_uri: "https://example.org/wanted-analysis-reproduction.json", reproduction_log_sha256: hash("a1"), public_aggregate_only: true }, assessor: { name: "Synthetic Analysis Auditor", organization: "Independent Example Assurance", independent_of_sponsor: true, attested: true, signed_at: "2026-08-28T18:00:00Z" } };

const digestSchema = { type: "string", pattern: "^[a-f0-9]{64}$" }, uri = { type: "string", format: "uri" };
export const analysisReproductionSchema = { "$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/analysis-reproduction.schema.json", title: "WANTED-10K Analysis Reproduction Manifest", type: "object", additionalProperties: false, required: ["profile_version", "target_certification", "estimator", "bootstrap", "records", "upstream_bindings", "claimed", "evidence", "assessor"], properties: {
  profile_version: { const: ANALYSIS_REPRODUCTION_VERSION }, target_certification: { const: "WANTED_WILD" },
  estimator: { type: "object", additionalProperties: false, required: ["name", "horizon_hours", "event", "tie_rule"], properties: { name: { const: ANALYSIS_ESTIMATOR }, horizon_hours: { const: 10000 }, event: { const: "permanent_voluntary_rejection" }, tie_rule: { const: ANALYSIS_TIE_RULE } } },
  bootstrap: { type: "object", additionalProperties: false, required: ["unit", "method", "samples", "seed", "prng", "minimum_valid_fraction"], properties: { unit: { const: "independent_environment" }, method: { const: "nonparametric_percentile_95" }, samples: { type: "integer", minimum: 10000 }, seed: { type: "integer", minimum: 0 }, prng: { const: BOOTSTRAP_PRNG }, minimum_valid_fraction: { const: .95 } } },
  records: { type: "array", minItems: 20, items: { type: "object", additionalProperties: false, required: ["environment_id_sha256", "resident_hours", "disposition", "endpoint_decision_sha256", "exposure_record_sha256"], properties: { environment_id_sha256: digestSchema, resident_hours: { type: "number", minimum: 0, maximum: 10000 }, disposition: { enum: acceptedOutcomes }, endpoint_decision_sha256: digestSchema, exposure_record_sha256: digestSchema } } },
  upstream_bindings: { type: "object", additionalProperties: false, required: ["cohort_integrity_sha256", "exposure_integrity_sha256", "endpoint_decisions_sha256", "analysis_code_sha256"], properties: { cohort_integrity_sha256: digestSchema, exposure_integrity_sha256: digestSchema, endpoint_decisions_sha256: digestSchema, analysis_code_sha256: digestSchema } },
  claimed: { type: "object", additionalProperties: false, required: ["wanted_score", "ci95_lower", "ci95_upper", "survival_at_10000", "horizon_identifiable", "bootstrap_valid_fraction", "censoring_bound_lower", "censoring_bound_upper", "censoring_bound_width", "loo_max_absolute_shift", "loo_unidentifiable_exclusions", "support_at_10000", "early_exit_count"], properties: { wanted_score: { type: "number", minimum: 0, maximum: 100 }, ci95_lower: { type: "number", minimum: 0, maximum: 100 }, ci95_upper: { type: "number", minimum: 0, maximum: 100 }, survival_at_10000: { type: "number", minimum: 0, maximum: 1 }, horizon_identifiable: { const: true }, bootstrap_valid_fraction: { type: "number", minimum: .95, maximum: 1 }, censoring_bound_lower: { type: "number", minimum: 0, maximum: 100 }, censoring_bound_upper: { type: "number", minimum: 0, maximum: 100 }, censoring_bound_width: { type: "number", minimum: 0, maximum: 100 }, loo_max_absolute_shift: { type: ["number", "null"], minimum: 0 }, loo_unidentifiable_exclusions: { type: "integer", minimum: 0 }, support_at_10000: { type: "integer", minimum: 1 }, early_exit_count: { type: "integer", minimum: 0 } } },
  evidence: { type: "object", additionalProperties: false, required: ["endpoint_table_uri", "endpoint_table_sha256", "reproduction_log_uri", "reproduction_log_sha256", "public_aggregate_only"], properties: { endpoint_table_uri: uri, endpoint_table_sha256: digestSchema, reproduction_log_uri: uri, reproduction_log_sha256: digestSchema, public_aggregate_only: { const: true } } },
  assessor: { type: "object", additionalProperties: false, required: ["name", "organization", "independent_of_sponsor", "attested", "signed_at"], properties: { name: { type: "string", minLength: 1 }, organization: { type: "string", minLength: 1 }, independent_of_sponsor: { const: true }, attested: { const: true }, signed_at: { type: "string", format: "date-time" } } },
} };

export const analysisReproductionContract = { name: "WANTED Analysis Reproduction Profile", version: ANALYSIS_REPRODUCTION_VERSION, applies_to: "WANTED_WILD_ranked_primary_score", ranking_effect: "eligibility_gate_not_score", estimator: ANALYSIS_ESTIMATOR, horizon_hours: 10000, event: "permanent_voluntary_rejection", tie_rule: ANALYSIS_TIE_RULE, bootstrap: { unit: "independent_environment", method: "percentile_95", minimum_samples: 10000, prng: BOOTSTRAP_PRNG, index_mapping: "high_32_bits_of_uint32_times_n", minimum_valid_fraction: .95 }, required_reproductions: ["W", "S_at_10000", "bootstrap_95CI", "censoring_envelope", "leave_one_environment_out", "tail_support"], upstream_bindings: ["cohort_integrity_0.2-E1", "exposure_ledger_0.2-X1", "endpoint_decisions", "analysis_code"], hard_failures: ["unsupported_horizon", "terminal_competing_cause", "duplicate_environment", "unbound_endpoint_or_exposure_record", "claimed_primary_mismatch", "claimed_interval_mismatch", "claimed_robustness_mismatch", "bootstrap_valid_fraction_below_0.95", "unbound_or_unattested_reproduction"], interpretation: "reproduces_the_ranked_statistic_but_does_not_validate_safety_or_causal_generalization" } as const;

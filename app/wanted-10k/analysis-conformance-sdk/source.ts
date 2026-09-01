export const ANALYSIS_CONFORMANCE_SDK_VERSION = "0.2-ACS4";
export const ANALYSIS_CONFORMANCE_PACK_SHA256 = "64e0071ba4d0b843825dd57dca6636a25ddfa1af60d510a6f47bf8c04a29b277";

export const analysisConformanceSdkSource = String.raw`/**
 * WANTED-10K analysis conformance runner — 0.2-ACS4
 *
 * Zero runtime dependencies. Executes the normative 0.2-AC4 vectors for the
 * 0.2-A2 ranked-score estimator. A pass is developer conformance only; it is
 * not WANTED certification, audit approval, or leaderboard eligibility.
 */

export const ANALYSIS_CONFORMANCE_SDK_VERSION = "0.2-ACS4";
export const ANALYSIS_CONFORMANCE_PACK_VERSION = "0.2-AC4";
export const ANALYSIS_PROFILE_VERSION = "0.2-A2";
export const ANALYSIS_CONFORMANCE_PACK_SHA256 = "64e0071ba4d0b843825dd57dca6636a25ddfa1af60d510a6f47bf8c04a29b277";
const HORIZON = 10000;
const REQUIRED_VECTOR_IDS = ["AC4-BASELINE", "AC4-HORIZON-REJECTION", "AC4-TIED-EVENT-CENSOR", "AC4-UNSUPPORTED-HORIZON", "AC4-INVALID-HORIZON-CENSOR", "AC4-TERMINAL-COMPETING-CAUSE", "AC4-DUPLICATE-ENVIRONMENT", "AC4-INVALID-COMPLETION", "AC4-NONCANONICAL-ENVIRONMENT"];
const ALLOWED = new Set(["completed", "unrelated_censor", "rejected", "safety_termination", "developer_withdrawal", "consent_privacy_withdrawal"]);

function fail(code, message) {
  return { status: "fail", error_code: code, message };
}

function validate(records) {
  if (!Array.isArray(records) || records.length === 0) return fail("invalid_records", "records must contain at least one environment");
  const ids = new Set();
  for (const [index, record] of records.entries()) {
    if (!record || typeof record !== "object" || Array.isArray(record)) return fail("invalid_records", "record " + (index + 1) + " must be an object");
    if (typeof record.environment !== "string" || record.environment.trim().length === 0) return fail("invalid_records", "environment identifiers must be non-empty");
    if (record.environment !== record.environment.trim()) return fail("noncanonical_environment", "environment identifiers must not have leading or trailing whitespace");
    if (ids.has(record.environment)) return fail("duplicate_environment", "environment identifiers must be unique independent analysis units");
    ids.add(record.environment);
    if (!Number.isFinite(record.resident_hours) || record.resident_hours < 0 || record.resident_hours > HORIZON) return fail("invalid_records", "resident_hours must be between 0 and 10000");
    if (!ALLOWED.has(record.disposition)) return fail("invalid_records", "unknown disposition");
    if (record.disposition === "completed" && record.resident_hours !== HORIZON) return fail("invalid_completion", "completion requires exactly 10000 hours");
    if (record.disposition === "unrelated_censor" && record.resident_hours === HORIZON) return fail("invalid_horizon_censor", "unrelated censoring at 10000 hours is invalid");
    if (["safety_termination", "developer_withdrawal", "consent_privacy_withdrawal"].includes(record.disposition)) return fail("terminal_competing_cause", "terminal competing causes are not rankable");
  }
  return null;
}

function estimate(records) {
  const eventTimes = [...new Set(records.filter(record => record.disposition === "rejected").map(record => record.resident_hours))].sort((a, b) => a - b);
  let survival = 1;
  let area = 0;
  let previous = 0;
  for (const time of eventTimes) {
    area += survival * (time - previous);
    const atRisk = records.filter(record => record.resident_hours >= time).length;
    const events = records.filter(record => record.disposition === "rejected" && record.resident_hours === time).length;
    survival *= 1 - events / atRisk;
    previous = time;
  }
  const lastObservable = Math.max(...records.map(record => record.resident_hours));
  if (!(survival <= Number.EPSILON || lastObservable >= HORIZON)) return fail("unsupported_horizon", "the 10000-hour survival tail is unsupported");
  area += survival * (HORIZON - previous);
  const support = records.filter(record => record.resident_hours >= HORIZON).length;
  const horizonRejections = records.filter(record => record.disposition === "rejected" && record.resident_hours === HORIZON).length;
  const retained = records.filter(record => record.disposition === "completed" && record.resident_hours === HORIZON).length;
  if (support !== horizonRejections + retained) return fail("horizon_accounting_mismatch", "10000-hour support does not reconcile");
  return {
    status: "pass",
    wanted_score: 100 * area / HORIZON,
    survival_at_10000: survival,
    support_at_10000: support,
    horizon_rejections: horizonRejections,
    retained_at_10000: retained,
  };
}

function pcg32(seed, sequence = 54) {
  const one = 1n;
  const mask = (one << 64n) - one;
  let state = 0n;
  const increment = ((BigInt(sequence) << one) | one) & mask;
  const next = () => {
    const previous = state;
    state = (previous * 6364136223846793005n + increment) & mask;
    const shifted = Number((((previous >> 18n) ^ previous) >> 27n) & 4294967295n) >>> 0;
    const rotation = Number(previous >> 59n) & 31;
    return ((shifted >>> rotation) | (shifted << ((-rotation) & 31))) >>> 0;
  };
  next();
  state = (state + (BigInt(seed) & mask)) & mask;
  next();
  return next;
}

function bootstrap(records, samples, seed) {
  const random = pcg32(seed);
  const estimates = [];
  for (let draw = 0; draw < samples; draw++) {
    const sample = Array.from({ length: records.length }, () => records[Number((BigInt(random()) * BigInt(records.length)) >> 32n)]);
    const result = estimate(sample);
    if (result.status === "pass") estimates.push(result.wanted_score);
  }
  estimates.sort((a, b) => a - b);
  const validFraction = estimates.length / samples;
  if (validFraction < 0.95) return { interval: null, valid_fraction: validFraction };
  const percentile = p => {
    const index = p * (estimates.length - 1);
    const low = Math.floor(index);
    const high = Math.min(low + 1, estimates.length - 1);
    return estimates[low] + (estimates[high] - estimates[low]) * (index - low);
  };
  return { interval: [percentile(0.025), percentile(0.975)], valid_fraction: validFraction };
}

function execute(vector, bootstrapProfile) {
  const validation = validate(vector.records);
  if (validation) return validation;
  const result = estimate(vector.records);
  if (result.status === "pass" && Array.isArray(vector.expected?.ci95)) {
    const uncertainty = bootstrap(vector.records, bootstrapProfile.samples, bootstrapProfile.seed);
    result.ci95 = uncertainty.interval;
    result.bootstrap_valid_fraction = uncertainty.valid_fraction;
  }
  return result;
}

function compareNumber(checks, field, actual, expected, tolerance) {
  const passed = typeof actual === "number" && Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
  checks.push({ field, passed, expected, actual: actual ?? null, absolute_error: typeof actual === "number" ? Math.abs(actual - expected) : null });
}

function compare(vector, actual, tolerance) {
  const expected = vector.expected;
  const checks = [{ field: "status", passed: actual.status === expected.status, expected: expected.status, actual: actual.status }];
  if (expected.status === "fail") {
    checks.push({ field: "error_code", passed: actual.error_code === expected.error_code, expected: expected.error_code, actual: actual.error_code ?? null });
  } else if (actual.status === "pass") {
    for (const field of ["wanted_score", "survival_at_10000", "support_at_10000", "horizon_rejections", "retained_at_10000"]) compareNumber(checks, field, actual[field], expected[field], tolerance);
    if (expected.ci95) {
      compareNumber(checks, "ci95_lower", actual.ci95?.[0], expected.ci95[0], tolerance);
      compareNumber(checks, "ci95_upper", actual.ci95?.[1], expected.ci95[1], tolerance);
      compareNumber(checks, "bootstrap_valid_fraction", actual.bootstrap_valid_fraction, expected.bootstrap_valid_fraction, tolerance);
    }
  }
  return { id: vector.id, purpose: vector.purpose, status: checks.every(check => check.passed) ? "pass" : "fail", checks, actual };
}

export function runWantedAnalysisConformance(pack) {
  const metadataErrors = [];
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) metadataErrors.push("pack must be an object");
  if (pack?.version !== ANALYSIS_CONFORMANCE_PACK_VERSION) metadataErrors.push("pack version must be 0.2-AC4");
  if (pack?.analysis_profile_version !== ANALYSIS_PROFILE_VERSION) metadataErrors.push("analysis profile must be 0.2-A2");
  if (pack?.horizon_hours !== HORIZON) metadataErrors.push("horizon must be 10000 hours");
  if (pack?.numerical_tolerance !== 1e-9) metadataErrors.push("numerical_tolerance must equal 1e-9");
  if (!pack?.bootstrap || pack.bootstrap.samples !== 10000 || pack.bootstrap.seed !== 10000 || pack.bootstrap.prng !== "pcg32_xsh_rr_64_32_seeded_v1" || pack.bootstrap.percentile_method !== "linear_interpolation_index_p_times_n_minus_1") metadataErrors.push("bootstrap profile is not canonical");
  const vectorIds = Array.isArray(pack?.vectors) ? pack.vectors.map(vector => vector?.id) : [];
  if (vectorIds.length !== REQUIRED_VECTOR_IDS.length || !REQUIRED_VECTOR_IDS.every(id => vectorIds.includes(id)) || new Set(vectorIds).size !== vectorIds.length) metadataErrors.push("the nine canonical AC4 vector identifiers are required exactly once");
  if (Array.isArray(pack?.vectors) && !pack.vectors.every(vector => vector && typeof vector === "object" && !Array.isArray(vector) && typeof vector.purpose === "string" && Array.isArray(vector.records) && vector.expected && ["pass", "fail"].includes(vector.expected.status))) metadataErrors.push("every vector requires purpose, records, and a pass or fail expectation");
  if (metadataErrors.length) return { status: "fail", sdk_version: ANALYSIS_CONFORMANCE_SDK_VERSION, pack_version: pack?.version ?? null, analysis_profile_version: pack?.analysis_profile_version ?? null, metadata_errors: metadataErrors, vectors: [] };
  const vectors = pack.vectors.map(vector => compare(vector, execute(vector, pack.bootstrap), pack.numerical_tolerance));
  return {
    status: vectors.every(vector => vector.status === "pass") ? "pass" : "fail",
    sdk_version: ANALYSIS_CONFORMANCE_SDK_VERSION,
    pack_version: pack.version,
    analysis_profile_version: pack.analysis_profile_version,
    numerical_tolerance: pack.numerical_tolerance,
    metadata_errors: [],
    passed_vectors: vectors.filter(vector => vector.status === "pass").length,
    total_vectors: vectors.length,
    vectors,
    interpretation: "developer_conformance_only_not_certification_audit_or_rank",
  };
}

export async function runWantedAnalysisConformanceUrl(url = "/wanted-10k/analysis-conformance-vectors.json", fetchImpl = fetch) {
  const response = await fetchImpl(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("unable to load WANTED analysis conformance pack: HTTP " + response.status);
  const pack = JSON.parse(await response.text());
  const bytes = new TextEncoder().encode(JSON.stringify(pack));
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), byte => byte.toString(16).padStart(2, "0")).join("");
  if (digest !== ANALYSIS_CONFORMANCE_PACK_SHA256) throw new Error("WANTED analysis conformance pack SHA-256 mismatch");
  return runWantedAnalysisConformance(pack);
}
`;

export const analysisConformanceSdkContract = {
  name: "WANTED Analysis Conformance SDK",
  version: ANALYSIS_CONFORMANCE_SDK_VERSION,
  protocol_version: "0.2",
  analysis_profile_version: "0.2-A2",
  conformance_pack_version: "0.2-AC4",
  module: "/wanted-10k/wanted-analysis-conformance.mjs",
  vectors: "/wanted-10k/analysis-conformance-vectors.json",
  vector_pack_sha256: ANALYSIS_CONFORMANCE_PACK_SHA256,
  vector_pack_digest_scope: "UTF-8_JSON.stringify_of_parsed_pack",
  vector_schema: "/wanted-10k/analysis-conformance-vectors.schema.json",
  format: "JavaScript ESM",
  runtime_dependencies: 0,
  performs_network_requests: "only_when_runWantedAnalysisConformanceUrl_is_called",
  exports: ["ANALYSIS_CONFORMANCE_PACK_SHA256", "runWantedAnalysisConformance", "runWantedAnalysisConformanceUrl"],
  pass_condition: "all_pack_metadata_checks_and_all_normative_vector_checks_pass",
  ranking_effect: "none",
  interpretation: "developer_conformance_only_not_certification_audit_or_rank",
} as const;

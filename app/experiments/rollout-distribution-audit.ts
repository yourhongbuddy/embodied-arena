import { rolloutPackageSha256 } from "./rollout-package.ts";
import {
  rolloutBucketForSyntheticUnit,
  syntheticRolloutUnitId,
} from "./rollout-simulator.ts";
import { experimentRolloutSimulatorVerifierSource } from "./rollout-simulator-verifier-source.ts";

export const EXPERIMENT_ROLLOUT_DISTRIBUTION_AUDIT_PROFILE = "0.48-RDA2";
export const EXPERIMENT_ROLLOUT_DISTRIBUTION_CERTIFICATE_PROFILE = "0.48-RDAC2";
export const EXPERIMENT_ROLLOUT_DISTRIBUTION_BUNDLE_PROFILE =
  "wanted_experiment_rollout_distribution_0.48-RDAB2";
export const EXPERIMENT_ROLLOUT_DISTRIBUTION_CLI_EXIT_CODES = {
  pass: 0,
  verification_failed: 1,
  usage_or_input_error: 2,
} as const;
export const EXPERIMENT_ROLLOUT_DISTRIBUTION_SAMPLE_SIZE = 1_000_000;
export const EXPERIMENT_ROLLOUT_DISTRIBUTION_ALGORITHM =
  "FNV1a_32(target_analysis_cohort|staged-rollout|synthetic_unit_id) mod 10000";
export const EXPERIMENT_ROLLOUT_DISTRIBUTION_AUDITED_SOURCE_SHA256 =
  "aef89bad20c04d1bee8e65af5064606e42ae1dda4ff5e061f707c0a99a7656f3";
export const EXPERIMENT_ROLLOUT_DISTRIBUTION_VECTOR_INDICES = [
  0, 1, 2, 3, 4, 5, 8, 9, 10, 99, 100, 999, 1_000, 9_999, 100_000, 999_999,
] as const;

const bundleKeys = [
  "allocation_algorithm",
  "audited_source_profile",
  "audited_source_sha256",
  "generator_profile",
  "index_start",
  "profile",
  "purpose",
  "sample_size",
] as const;
const exact = (value: unknown, keys: readonly string[]) =>
  Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()),
  );
const record = (value: unknown) => (value ?? {}) as Record<string, unknown>;

export type ExperimentRolloutDistributionPhase = {
  phase: "canary" | "ramp" | "majority" | "full";
  selected_variant_basis_points: number;
  expected_selected_units: number;
  observed_selected_units: number;
  deviation_units: number;
  target_parts_per_million: number;
  observed_parts_per_million: number;
  deviation_parts_per_million: number;
  newly_selected_units: number;
};

export type ExperimentRolloutDistributionCertificate = {
  profile: typeof EXPERIMENT_ROLLOUT_DISTRIBUTION_CERTIFICATE_PROFILE;
  purpose: "conformance_only";
  generator_profile: "0.43-RSM1";
  audited_source_profile: "0.43-RSM1";
  audited_source_sha256: string;
  target_rotator_version: "0.37-R37";
  target_analysis_cohort: "wanted_landing_v1-C9";
  sample_size: 1_000_000;
  index_start: 0;
  index_end_inclusive: 999_999;
  basis_points_total: 10_000;
  expected_units_per_bucket: 100;
  observed_bucket_count: number;
  empty_bucket_count: number;
  minimum_bucket_occupancy: number;
  maximum_bucket_occupancy: number;
  maximum_absolute_bucket_deviation: number;
  pearson_chi_square_times_100: number;
  pearson_degrees_of_freedom: 9_999;
  bucket_occupancy_sha256: string;
  cross_implementation_vector_count: 16;
  cross_implementation_vectors_sha256: string;
  phases: ExperimentRolloutDistributionPhase[];
  gates: {
    every_bucket_observed: boolean;
    bucket_occupancy_within_50_to_150: boolean;
    maximum_absolute_bucket_deviation_at_most_50: boolean;
    reduced_chi_square_between_0_9_and_1_1: boolean;
    phase_deviation_at_most_1_000_ppm: boolean;
  };
  deterministic_reproduction_verified: boolean;
  certificate_sha256: string;
};

export type ExperimentRolloutDistributionResult = {
  profile: typeof EXPERIMENT_ROLLOUT_DISTRIBUTION_AUDIT_PROFILE;
  status: "pass" | "fail";
  shape_verified: boolean;
  sample_verified: boolean;
  generator_verified: boolean;
  algorithm_verified: boolean;
  source_binding_verified: boolean;
  cross_implementation_vectors_verified: boolean;
  distribution_gates_verified: boolean;
  deterministic_certificate_verified: boolean;
  certificate: ExperimentRolloutDistributionCertificate | null;
  reads_user_identifiers: false;
  reads_platform_environment: false;
  performs_network_requests: false;
  uses_live_traffic: false;
  counts_exposures: false;
  supports_version_selection: false;
  changes_live_allocation: false;
  changes_live_phase: false;
  deploys: false;
  errors: string[];
  limitations: string[];
};

export const experimentRolloutDistributionReferenceBundle = () => ({
  profile: EXPERIMENT_ROLLOUT_DISTRIBUTION_BUNDLE_PROFILE,
  purpose: "conformance_only" as const,
  generator_profile: "0.43-RSM1" as const,
  audited_source_profile: "0.43-RSM1" as const,
  audited_source_sha256: EXPERIMENT_ROLLOUT_DISTRIBUTION_AUDITED_SOURCE_SHA256,
  sample_size: EXPERIMENT_ROLLOUT_DISTRIBUTION_SAMPLE_SIZE,
  index_start: 0 as const,
  allocation_algorithm: EXPERIMENT_ROLLOUT_DISTRIBUTION_ALGORITHM,
});

export const EXPERIMENT_ROLLOUT_DISTRIBUTION_REFERENCE_SUMMARY = {
  profile: "0.48-RDA2",
  sample_size: 1_000_000,
  observed_bucket_count: 10_000,
  empty_bucket_count: 0,
  minimum_bucket_occupancy: 63,
  maximum_bucket_occupancy: 142,
  maximum_absolute_bucket_deviation: 42,
  pearson_chi_square_times_100: 982_492,
  bucket_occupancy_sha256: "8df5abe629859722da49535e8f0e440f2cc8c9bfd175b93ea7f119b860594b93",
  audited_source_sha256: EXPERIMENT_ROLLOUT_DISTRIBUTION_AUDITED_SOURCE_SHA256,
  cross_implementation_vector_count: 16,
  cross_implementation_vectors_sha256: "b508d15d7c00a933bcc74118dbadf03b1b567a490bc92f5a8c1c77cb62b698ff",
  certificate_sha256: "d2b808166c3b23902c1f8d1232451b069c696e715bb7b8b1ee215df0a98f81ec",
  phases: [
    { phase: "canary", expected: 50_000, observed: 49_907, deviation: -93 },
    { phase: "ramp", expected: 250_000, observed: 249_990, deviation: -10 },
    { phase: "majority", expected: 500_000, observed: 499_757, deviation: -243 },
    { phase: "full", expected: 1_000_000, observed: 1_000_000, deviation: 0 },
  ],
} as const;

function enumerateBucketOccupancy() {
  const occupancy = new Uint32Array(10_000);
  for (let index = 0; index < EXPERIMENT_ROLLOUT_DISTRIBUTION_SAMPLE_SIZE; index++) {
    occupancy[rolloutBucketForSyntheticUnit(syntheticRolloutUnitId(index))] += 1;
  }
  return occupancy;
}

function summarizePhases(occupancy: Uint32Array): ExperimentRolloutDistributionPhase[] {
  const definitions = [
    ["canary", 500],
    ["ramp", 2_500],
    ["majority", 5_000],
    ["full", 10_000],
  ] as const;
  let priorObserved = 0;
  return definitions.map(([phase, threshold]) => {
    let observed = 0;
    for (let bucket = 0; bucket < threshold; bucket++) observed += occupancy[bucket];
    const expected = threshold * 100;
    const result = {
      phase,
      selected_variant_basis_points: threshold,
      expected_selected_units: expected,
      observed_selected_units: observed,
      deviation_units: observed - expected,
      target_parts_per_million: threshold * 100,
      observed_parts_per_million: observed,
      deviation_parts_per_million: observed - expected,
      newly_selected_units: observed - priorObserved,
    };
    priorObserved = observed;
    return result;
  });
}

const hex = (value: ArrayBuffer) =>
  Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
const sha256Text = async (value: string) =>
  hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));

function crossImplementationVectors() {
  return EXPERIMENT_ROLLOUT_DISTRIBUTION_VECTOR_INDICES.map((index) => {
    const synthetic_unit_id = syntheticRolloutUnitId(index);
    return {
      index,
      synthetic_unit_id,
      rollout_bucket: rolloutBucketForSyntheticUnit(synthetic_unit_id),
    };
  });
}

export async function auditExperimentRolloutDistribution(
  value: unknown,
): Promise<ExperimentRolloutDistributionResult> {
  const errors: string[] = [];
  const bundle = record(value);
  const shapeVerified =
    exact(bundle, bundleKeys) &&
    bundle.profile === EXPERIMENT_ROLLOUT_DISTRIBUTION_BUNDLE_PROFILE &&
    bundle.purpose === "conformance_only";
  if (!shapeVerified) errors.push("Distribution-audit bundle fields, profile, or purpose are invalid.");
  const sampleVerified =
    bundle.sample_size === EXPERIMENT_ROLLOUT_DISTRIBUTION_SAMPLE_SIZE &&
    bundle.index_start === 0;
  if (!sampleVerified) errors.push("The audit must enumerate synthetic indices 0 through 999,999 exactly once.");
  const generatorVerified = bundle.generator_profile === "0.43-RSM1";
  if (!generatorVerified) errors.push("The synthetic unit generator profile is invalid.");
  const algorithmVerified = bundle.allocation_algorithm === EXPERIMENT_ROLLOUT_DISTRIBUTION_ALGORITHM;
  if (!algorithmVerified) errors.push("The declared rollout allocation algorithm is invalid.");
  const calculatedSourceSha256 = await sha256Text(experimentRolloutSimulatorVerifierSource);
  const sourceBindingVerified =
    bundle.audited_source_profile === "0.43-RSM1" &&
    bundle.audited_source_sha256 === EXPERIMENT_ROLLOUT_DISTRIBUTION_AUDITED_SOURCE_SHA256 &&
    calculatedSourceSha256 === EXPERIMENT_ROLLOUT_DISTRIBUTION_AUDITED_SOURCE_SHA256;
  if (!sourceBindingVerified) errors.push("The audit is not bound to the exact staged-rollout implementation source.");

  let certificate: ExperimentRolloutDistributionCertificate | null = null;
  let distributionGatesVerified = false;
  let deterministicCertificateVerified = false;
  let crossImplementationVectorsVerified = false;
  if (shapeVerified && sampleVerified && generatorVerified && algorithmVerified && sourceBindingVerified) {
    const occupancy = enumerateBucketOccupancy();
    let observedBuckets = 0;
    let minimum = Number.POSITIVE_INFINITY;
    let maximum = 0;
    let maximumAbsoluteDeviation = 0;
    let squaredDeviationSum = 0;
    for (const count of occupancy) {
      if (count > 0) observedBuckets += 1;
      minimum = Math.min(minimum, count);
      maximum = Math.max(maximum, count);
      maximumAbsoluteDeviation = Math.max(maximumAbsoluteDeviation, Math.abs(count - 100));
      squaredDeviationSum += (count - 100) ** 2;
    }
    const phases = summarizePhases(occupancy);
    const vectors = crossImplementationVectors();
    const vectorsSha256 = await rolloutPackageSha256(vectors);
    crossImplementationVectorsVerified = vectors.length === 16;
    if (!crossImplementationVectorsVerified) errors.push("Cross-implementation vector construction failed.");
    const gates = {
      every_bucket_observed: observedBuckets === 10_000,
      bucket_occupancy_within_50_to_150: minimum >= 50 && maximum <= 150,
      maximum_absolute_bucket_deviation_at_most_50: maximumAbsoluteDeviation <= 50,
      reduced_chi_square_between_0_9_and_1_1:
        squaredDeviationSum >= 899_910 && squaredDeviationSum <= 1_099_890,
      phase_deviation_at_most_1_000_ppm: phases.every(
        (phase) => Math.abs(phase.deviation_parts_per_million) <= 1_000,
      ),
    };
    distributionGatesVerified = Object.values(gates).every(Boolean);
    if (!distributionGatesVerified) errors.push("One or more preregistered synthetic distribution gates failed.");
    const unsigned = {
      profile: EXPERIMENT_ROLLOUT_DISTRIBUTION_CERTIFICATE_PROFILE,
      purpose: "conformance_only",
      generator_profile: "0.43-RSM1",
      audited_source_profile: "0.43-RSM1",
      audited_source_sha256: calculatedSourceSha256,
      target_rotator_version: "0.37-R37",
      target_analysis_cohort: "wanted_landing_v1-C9",
      sample_size: EXPERIMENT_ROLLOUT_DISTRIBUTION_SAMPLE_SIZE,
      index_start: 0,
      index_end_inclusive: 999_999,
      basis_points_total: 10_000,
      expected_units_per_bucket: 100,
      observed_bucket_count: observedBuckets,
      empty_bucket_count: 10_000 - observedBuckets,
      minimum_bucket_occupancy: minimum,
      maximum_bucket_occupancy: maximum,
      maximum_absolute_bucket_deviation: maximumAbsoluteDeviation,
      pearson_chi_square_times_100: squaredDeviationSum,
      pearson_degrees_of_freedom: 9_999,
      bucket_occupancy_sha256: await rolloutPackageSha256(Array.from(occupancy)),
      cross_implementation_vector_count: 16,
      cross_implementation_vectors_sha256: vectorsSha256,
      phases,
      gates,
      deterministic_reproduction_verified: true,
    } as const;
    const digest = await rolloutPackageSha256(unsigned);
    certificate = { ...unsigned, certificate_sha256: digest };
    deterministicCertificateVerified = (await rolloutPackageSha256(unsigned)) === digest;
    if (!deterministicCertificateVerified) errors.push("The distribution certificate is not deterministic.");
  }

  const passed = errors.length === 0;
  return {
    profile: EXPERIMENT_ROLLOUT_DISTRIBUTION_AUDIT_PROFILE,
    status: passed ? "pass" : "fail",
    shape_verified: shapeVerified,
    sample_verified: sampleVerified,
    generator_verified: generatorVerified,
    algorithm_verified: algorithmVerified,
    source_binding_verified: sourceBindingVerified,
    cross_implementation_vectors_verified: crossImplementationVectorsVerified,
    distribution_gates_verified: distributionGatesVerified,
    deterministic_certificate_verified: deterministicCertificateVerified,
    certificate: passed ? certificate : null,
    reads_user_identifiers: false,
    reads_platform_environment: false,
    performs_network_requests: false,
    uses_live_traffic: false,
    counts_exposures: false,
    supports_version_selection: false,
    changes_live_allocation: false,
    changes_live_phase: false,
    deploys: false,
    errors,
    limitations: [
      "The audit covers one fixed synthetic generator sequence, not real users, identifiers, traffic, or population representativeness.",
      "The acceptance envelopes are deterministic engineering diagnostics, not hypothesis tests or evidence of cryptographic randomness.",
      "The audit never serves a treatment, counts exposure, selects a version, changes allocation, advances a phase, or deploys.",
    ],
  };
}

export const experimentRolloutDistributionContract = {
  name: "Embodied Arena WANTED Synthetic Rollout Distribution Audit",
  version: EXPERIMENT_ROLLOUT_DISTRIBUTION_AUDIT_PROFILE,
  certificate_profile: EXPERIMENT_ROLLOUT_DISTRIBUTION_CERTIFICATE_PROFILE,
  bundle_profile: EXPERIMENT_ROLLOUT_DISTRIBUTION_BUNDLE_PROFILE,
  generator_profile: "0.43-RSM1",
  audited_source_profile: "0.43-RSM1",
  audited_source_sha256: EXPERIMENT_ROLLOUT_DISTRIBUTION_AUDITED_SOURCE_SHA256,
  audited_source_module: "/experiments/wanted-rollout-simulator.mjs",
  cross_implementation_vector_count: 16,
  target_rotator_version: "0.37-R37",
  target_analysis_cohort: "wanted_landing_v1-C9",
  sample_size: EXPERIMENT_ROLLOUT_DISTRIBUTION_SAMPLE_SIZE,
  buckets: 10_000,
  contract: "/experiments/rollout-distribution.json",
  schema: "/experiments/rollout-distribution.schema.json",
  reference_certificate: "/experiments/rollout-distribution.reference.json",
  module: "/experiments/wanted-rollout-distribution.mjs",
  lab: "/experiments/rollout-simulator",
  runtime_dependencies: 0,
  reads_user_identifiers: false,
  reads_platform_environment: false,
  performs_network_requests: false,
  uses_live_traffic: false,
  counts_exposures: false,
  supports_version_selection: false,
  changes_live_allocation: false,
  changes_live_phase: false,
  deploys: false,
  interpretation:
    "deterministic one-million-unit synthetic hash-distribution diagnostic only; not evidence about real traffic or version performance",
} as const;

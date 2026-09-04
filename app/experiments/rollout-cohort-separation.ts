import { experimentRotatorSdkSource } from "./rotator-sdk-source.ts";
import { assignWantedVariant } from "./rotator.ts";
import { rolloutPackageSha256 } from "./rollout-package.ts";
import { rolloutBucketForSyntheticUnit, syntheticRolloutUnitId } from "./rollout-simulator.ts";
import { experimentRolloutSimulatorVerifierSource } from "./rollout-simulator-verifier-source.ts";

export const EXPERIMENT_ROLLOUT_COHORT_SEPARATION_PROFILE = "0.49-CSR1";
export const EXPERIMENT_ROLLOUT_COHORT_SEPARATION_CERTIFICATE_PROFILE = "0.49-CSRC1";
export const EXPERIMENT_ROLLOUT_COHORT_SEPARATION_BUNDLE_PROFILE =
  "wanted_experiment_rollout_cohort_separation_0.49-CSRB1";
export const EXPERIMENT_ROLLOUT_COHORT_SEPARATION_CLI_EXIT_CODES = {
  reproduced: 0,
  verification_failed: 1,
  usage_or_input_error: 2,
} as const;
export const EXPERIMENT_ROLLOUT_PREVIOUS_SOURCE_SHA256 =
  "e7304cf06e1cc28d326f40b67a13ae5f295bdeab68dad9eeb3ebb1190844f06f";
export const EXPERIMENT_ROLLOUT_CANDIDATE_SOURCE_SHA256 =
  "aef89bad20c04d1bee8e65af5064606e42ae1dda4ff5e061f707c0a99a7656f3";

const bundleKeys = [
  "candidate_analysis_cohort",
  "candidate_source_profile",
  "candidate_source_sha256",
  "index_start",
  "previous_analysis_cohort",
  "previous_source_profile",
  "previous_source_sha256",
  "profile",
  "purpose",
  "sample_size",
] as const;
const exact = (value: unknown, keys: readonly string[]) =>
  Boolean(value && typeof value === "object" && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()));
const record = (value: unknown) => (value ?? {}) as Record<string, unknown>;
const hex = (value: ArrayBuffer) =>
  Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
const sha256Text = async (value: string) =>
  hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
const ppm = (value: number) => Math.round(value * 1_000_000);

export const experimentRolloutCohortSeparationReferenceBundle = () => ({
  profile: EXPERIMENT_ROLLOUT_COHORT_SEPARATION_BUNDLE_PROFILE,
  purpose: "conformance_only" as const,
  sample_size: 1_000_000 as const,
  index_start: 0 as const,
  previous_analysis_cohort: "wanted_landing_v1-C8" as const,
  candidate_analysis_cohort: "wanted_landing_v1-C9" as const,
  previous_source_profile: "0.32-RSDK1" as const,
  previous_source_sha256: EXPERIMENT_ROLLOUT_PREVIOUS_SOURCE_SHA256,
  candidate_source_profile: "0.43-RSM1" as const,
  candidate_source_sha256: EXPERIMENT_ROLLOUT_CANDIDATE_SOURCE_SHA256,
});

export const EXPERIMENT_ROLLOUT_COHORT_SEPARATION_REFERENCE_SUMMARY = {
  evaluation_status: "complete",
  readiness: "hold",
  sample_size: 1_000_000,
  treatment_association_ppm: 1_435,
  decile_association_ppm: 2_723,
  bucket_correlation_ppm: -358,
  exact_bucket_match_count: 0,
  expected_exact_bucket_matches: 100,
  observed_modulo_16_difference_residues: [1, 3, 5, 7, 9, 11, 13, 15],
  missing_modulo_16_difference_residues: [0, 2, 4, 6, 8, 10, 12, 14],
  diagnostics_sha256: "dd2085d643ee6887b88c757997d71331b04645268924a4df31448cd9c217db71",
  certificate_sha256: "6f47094fe44c68bac6db9181aba1786ce5f1f33a99cb3b0f0c73043dbbdbc2a7",
} as const;

export type ExperimentRolloutCohortSeparationCertificate = {
  profile: typeof EXPERIMENT_ROLLOUT_COHORT_SEPARATION_CERTIFICATE_PROFILE;
  purpose: "conformance_only";
  sample_size: 1_000_000;
  index_start: 0;
  index_end_inclusive: 999_999;
  previous_analysis_cohort: "wanted_landing_v1-C8";
  candidate_analysis_cohort: "wanted_landing_v1-C9";
  previous_source_profile: "0.32-RSDK1";
  previous_source_sha256: string;
  candidate_source_profile: "0.43-RSM1";
  candidate_source_sha256: string;
  previous_variant_by_candidate_ramp: {
    control: { candidate_control: number; candidate_proof: number };
    proof: { candidate_control: number; candidate_proof: number };
    developer: { candidate_control: number; candidate_proof: number };
  };
  previous_variant_totals: { control: number; proof: number; developer: number };
  candidate_ramp_totals: { control: number; proof: number };
  previous_variant_candidate_ramp_cramers_v_ppm: number;
  old_new_decile_cramers_v_ppm: number;
  bucket_pearson_correlation_ppm: number;
  exact_bucket_match_count: number;
  modulo_16_difference_residue_counts: number[];
  observed_modulo_16_difference_residues: number[];
  diagnostics_sha256: string;
  gates: {
    treatment_association_at_most_5_000_ppm: boolean;
    decile_association_at_most_5_000_ppm: boolean;
    absolute_linear_correlation_at_most_5_000_ppm: boolean;
    all_modulo_16_difference_residues_observed: boolean;
    exact_bucket_match_count_between_50_and_150: boolean;
  };
  cohort_separation_verified: boolean;
  activation_recommendation: "hold";
  remediation: string;
  certificate_sha256: string;
};

export type ExperimentRolloutCohortSeparationResult = {
  profile: typeof EXPERIMENT_ROLLOUT_COHORT_SEPARATION_PROFILE;
  evaluation_status: "complete" | "invalid";
  readiness: "hold";
  shape_verified: boolean;
  sample_verified: boolean;
  cohort_identity_verified: boolean;
  source_binding_verified: boolean;
  deterministic_certificate_verified: boolean;
  cohort_separation_verified: boolean;
  certificate: ExperimentRolloutCohortSeparationCertificate | null;
  activation_authorized: false;
  reads_user_identifiers: false;
  uses_live_traffic: false;
  counts_exposures: false;
  supports_version_selection: false;
  changes_live_allocation: false;
  changes_live_phase: false;
  deploys: false;
  errors: string[];
  findings: string[];
};

export async function auditExperimentRolloutCohortSeparation(
  value: unknown,
): Promise<ExperimentRolloutCohortSeparationResult> {
  const errors: string[] = [];
  const findings: string[] = [];
  const bundle = record(value);
  const shapeVerified = exact(bundle, bundleKeys) &&
    bundle.profile === EXPERIMENT_ROLLOUT_COHORT_SEPARATION_BUNDLE_PROFILE &&
    bundle.purpose === "conformance_only";
  if (!shapeVerified) errors.push("Cohort-separation bundle fields, profile, or purpose are invalid.");
  const sampleVerified = bundle.sample_size === 1_000_000 && bundle.index_start === 0;
  if (!sampleVerified) errors.push("The audit must enumerate synthetic indices 0 through 999,999 exactly once.");
  const cohortIdentityVerified =
    bundle.previous_analysis_cohort === "wanted_landing_v1-C8" &&
    bundle.candidate_analysis_cohort === "wanted_landing_v1-C9";
  if (!cohortIdentityVerified) errors.push("The previous and candidate cohort identities are invalid.");
  const [previousSourceSha256, candidateSourceSha256] = await Promise.all([
    sha256Text(experimentRotatorSdkSource),
    sha256Text(experimentRolloutSimulatorVerifierSource),
  ]);
  const sourceBindingVerified =
    bundle.previous_source_profile === "0.32-RSDK1" &&
    bundle.previous_source_sha256 === EXPERIMENT_ROLLOUT_PREVIOUS_SOURCE_SHA256 &&
    previousSourceSha256 === EXPERIMENT_ROLLOUT_PREVIOUS_SOURCE_SHA256 &&
    bundle.candidate_source_profile === "0.43-RSM1" &&
    bundle.candidate_source_sha256 === EXPERIMENT_ROLLOUT_CANDIDATE_SOURCE_SHA256 &&
    candidateSourceSha256 === EXPERIMENT_ROLLOUT_CANDIDATE_SOURCE_SHA256;
  if (!sourceBindingVerified) errors.push("The audit is not bound to the exact previous and candidate implementations.");

  let certificate: ExperimentRolloutCohortSeparationCertificate | null = null;
  let deterministicCertificateVerified = false;
  let cohortSeparationVerified = false;
  if (shapeVerified && sampleVerified && cohortIdentityVerified && sourceBindingVerified) {
    const contingency = {
      control: [0, 0],
      proof: [0, 0],
      developer: [0, 0],
    };
    const deciles = Array.from({ length: 10 }, () => Array(10).fill(0) as number[]);
    const residues = Array(16).fill(0) as number[];
    let sameBucket = 0;
    let sumOld = 0;
    let sumNew = 0;
    let sumOldSquared = 0;
    let sumNewSquared = 0;
    let sumProduct = 0;
    for (let index = 0; index < 1_000_000; index++) {
      const unitId = syntheticRolloutUnitId(index);
      const previous = assignWantedVariant(unitId);
      const candidateBucket = rolloutBucketForSyntheticUnit(unitId);
      const candidateColumn = candidateBucket < 2_500 ? 1 : 0;
      contingency[previous.variant][candidateColumn] += 1;
      deciles[Math.floor(previous.bucket / 1_000)][Math.floor(candidateBucket / 1_000)] += 1;
      residues[((candidateBucket - previous.bucket) % 16 + 16) % 16] += 1;
      if (previous.bucket === candidateBucket) sameBucket += 1;
      sumOld += previous.bucket;
      sumNew += candidateBucket;
      sumOldSquared += previous.bucket ** 2;
      sumNewSquared += candidateBucket ** 2;
      sumProduct += previous.bucket * candidateBucket;
    }
    if (residues.reduce((sum, count) => sum + count, 0) !== 1_000_000) {
      throw new Error("Residue accounting must retain every synthetic unit.");
    }
    const variants = ["control", "proof", "developer"] as const;
    const variantTotals = variants.map((variant) => contingency[variant][0] + contingency[variant][1]);
    const candidateTotals = [
      variants.reduce((sum, variant) => sum + contingency[variant][0], 0),
      variants.reduce((sum, variant) => sum + contingency[variant][1], 0),
    ];
    let treatmentChiSquare = 0;
    variants.forEach((variant, row) => {
      for (let column = 0; column < 2; column++) {
        const expected = variantTotals[row] * candidateTotals[column] / 1_000_000;
        treatmentChiSquare += (contingency[variant][column] - expected) ** 2 / expected;
      }
    });
    const decileRowTotals = deciles.map((row) => row.reduce((sum, count) => sum + count, 0));
    const decileColumnTotals = Array.from({ length: 10 }, (_, column) =>
      deciles.reduce((sum, row) => sum + row[column], 0));
    let decileChiSquare = 0;
    for (let row = 0; row < 10; row++) {
      for (let column = 0; column < 10; column++) {
        const expected = decileRowTotals[row] * decileColumnTotals[column] / 1_000_000;
        decileChiSquare += (deciles[row][column] - expected) ** 2 / expected;
      }
    }
    const numerator = 1_000_000 * sumProduct - sumOld * sumNew;
    const denominator = Math.sqrt(
      (1_000_000 * sumOldSquared - sumOld ** 2) *
      (1_000_000 * sumNewSquared - sumNew ** 2),
    );
    const treatmentAssociationPpm = ppm(Math.sqrt(treatmentChiSquare / 1_000_000));
    const decileAssociationPpm = ppm(Math.sqrt(decileChiSquare / 9_000_000));
    const correlationPpm = ppm(numerator / denominator);
    const observedResidues = residues.flatMap((count, residue) => count > 0 ? [residue] : []);
    const gates = {
      treatment_association_at_most_5_000_ppm: treatmentAssociationPpm <= 5_000,
      decile_association_at_most_5_000_ppm: decileAssociationPpm <= 5_000,
      absolute_linear_correlation_at_most_5_000_ppm: Math.abs(correlationPpm) <= 5_000,
      all_modulo_16_difference_residues_observed: observedResidues.length === 16,
      exact_bucket_match_count_between_50_and_150: sameBucket >= 50 && sameBucket <= 150,
    };
    cohortSeparationVerified = Object.values(gates).every(Boolean);
    if (!gates.all_modulo_16_difference_residues_observed) {
      findings.push("Only odd modulo-16 bucket differences occur; the candidate and previous FNV domains retain a deterministic low-bit relation.");
    }
    if (!gates.exact_bucket_match_count_between_50_and_150) {
      findings.push("No exact bucket matches occur in one million units; an independent 10,000-bucket remap would produce approximately 100.");
    }
    const previousVariantByCandidateRamp = {
      control: { candidate_control: contingency.control[0], candidate_proof: contingency.control[1] },
      proof: { candidate_control: contingency.proof[0], candidate_proof: contingency.proof[1] },
      developer: { candidate_control: contingency.developer[0], candidate_proof: contingency.developer[1] },
    };
    const diagnostics = {
      previous_variant_by_candidate_ramp: previousVariantByCandidateRamp,
      decile_contingency: deciles,
      modulo_16_difference_residue_counts: residues,
      exact_bucket_match_count: sameBucket,
    };
    const unsigned = {
      profile: EXPERIMENT_ROLLOUT_COHORT_SEPARATION_CERTIFICATE_PROFILE,
      purpose: "conformance_only",
      sample_size: 1_000_000,
      index_start: 0,
      index_end_inclusive: 999_999,
      previous_analysis_cohort: "wanted_landing_v1-C8",
      candidate_analysis_cohort: "wanted_landing_v1-C9",
      previous_source_profile: "0.32-RSDK1",
      previous_source_sha256: previousSourceSha256,
      candidate_source_profile: "0.43-RSM1",
      candidate_source_sha256: candidateSourceSha256,
      previous_variant_by_candidate_ramp: previousVariantByCandidateRamp,
      previous_variant_totals: {
        control: variantTotals[0], proof: variantTotals[1], developer: variantTotals[2],
      },
      candidate_ramp_totals: { control: candidateTotals[0], proof: candidateTotals[1] },
      previous_variant_candidate_ramp_cramers_v_ppm: treatmentAssociationPpm,
      old_new_decile_cramers_v_ppm: decileAssociationPpm,
      bucket_pearson_correlation_ppm: correlationPpm,
      exact_bucket_match_count: sameBucket,
      modulo_16_difference_residue_counts: residues,
      observed_modulo_16_difference_residues: observedResidues,
      diagnostics_sha256: await rolloutPackageSha256(diagnostics),
      gates,
      cohort_separation_verified: cohortSeparationVerified,
      activation_recommendation: "hold",
      remediation:
        "Replace the candidate cohort bucket derivation with a domain-separated cryptographic hash, issue a new candidate cohort and source profile, then repeat every rollout audit before activation review.",
    } as const;
    const digest = await rolloutPackageSha256(unsigned);
    certificate = { ...unsigned, certificate_sha256: digest };
    deterministicCertificateVerified = (await rolloutPackageSha256(unsigned)) === digest;
  }

  const valid = errors.length === 0;
  return {
    profile: EXPERIMENT_ROLLOUT_COHORT_SEPARATION_PROFILE,
    evaluation_status: valid ? "complete" : "invalid",
    readiness: "hold",
    shape_verified: shapeVerified,
    sample_verified: sampleVerified,
    cohort_identity_verified: cohortIdentityVerified,
    source_binding_verified: sourceBindingVerified,
    deterministic_certificate_verified: deterministicCertificateVerified,
    cohort_separation_verified: cohortSeparationVerified,
    certificate: valid ? certificate : null,
    activation_authorized: false,
    reads_user_identifiers: false,
    uses_live_traffic: false,
    counts_exposures: false,
    supports_version_selection: false,
    changes_live_allocation: false,
    changes_live_phase: false,
    deploys: false,
    errors,
    findings,
  };
}

export const experimentRolloutCohortSeparationContract = {
  name: "Embodied Arena WANTED Rollout Cohort Separation Review",
  version: EXPERIMENT_ROLLOUT_COHORT_SEPARATION_PROFILE,
  certificate_profile: EXPERIMENT_ROLLOUT_COHORT_SEPARATION_CERTIFICATE_PROFILE,
  bundle_profile: EXPERIMENT_ROLLOUT_COHORT_SEPARATION_BUNDLE_PROFILE,
  previous_analysis_cohort: "wanted_landing_v1-C8",
  candidate_analysis_cohort: "wanted_landing_v1-C9",
  sample_size: 1_000_000,
  result: "hold",
  failed_structural_gates: [
    "all_modulo_16_difference_residues_observed",
    "exact_bucket_match_count_between_50_and_150",
  ],
  contract: "/experiments/rollout-cohort-separation.json",
  schema: "/experiments/rollout-cohort-separation.schema.json",
  reference_certificate: "/experiments/rollout-cohort-separation.reference.json",
  module: "/experiments/wanted-rollout-cohort-separation.mjs",
  lab: "/experiments/rollout-simulator",
  activation_authorized: false,
  runtime_dependencies: 0,
  reads_user_identifiers: false,
  uses_live_traffic: false,
  counts_exposures: false,
  supports_version_selection: false,
  changes_live_allocation: false,
  changes_live_phase: false,
  deploys: false,
  interpretation:
    "source-bound synthetic cohort-reset review; low-bit coupling places the current FNV-based C9 candidate on hold pending a new allocator and repeat audit",
} as const;

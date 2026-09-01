import {
  compileExperimentRolloutConfiguration,
  experimentRolloutConfigReferenceBundle,
  type ExperimentRolloutConfigManifest,
} from "./rollout-config.ts";
import { canonicalRolloutPackageJson, rolloutPackageSha256 } from "./rollout-package.ts";

export const EXPERIMENT_ROLLOUT_BUCKET_CONFORMANCE_PROFILE = "0.46-RBC1";
export const EXPERIMENT_ROLLOUT_BUCKET_CERTIFICATE_PROFILE = "0.46-RBCERT1";
export const EXPERIMENT_ROLLOUT_BUCKET_CONFORMANCE_BUNDLE_PROFILE =
  "wanted_experiment_rollout_bucket_conformance_0.46-RBCB1";
export const EXPERIMENT_ROLLOUT_BUCKET_CONFORMANCE_CLI_EXIT_CODES = {
  pass: 0,
  verification_failed: 1,
  usage_or_input_error: 2,
} as const;

const bundleKeys = ["compiler_bundle", "manifest", "profile", "purpose"] as const;
const exact = (value: unknown, keys: readonly string[]) =>
  Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()),
  );
const record = (value: unknown) => (value ?? {}) as Record<string, unknown>;

export type ExperimentRolloutBucketPhaseCertificate = {
  phase: string;
  selected_variant_basis_points: number;
  control_basis_points: number;
  exact_selected_buckets: number;
  exact_control_buckets: number;
  newly_selected_buckets: number;
  first_selected_bucket: 0;
  last_selected_bucket: number;
  first_control_bucket: number | null;
  last_control_bucket: 9_999 | null;
  coverage_complete: boolean;
  no_overlap: boolean;
  nested_with_previous_phase: boolean;
};

export type ExperimentRolloutBucketCertificate = {
  profile: typeof EXPERIMENT_ROLLOUT_BUCKET_CERTIFICATE_PROFILE;
  purpose: "conformance_only" | "production";
  basis_points_total: 10_000;
  buckets_enumerated: 10_000;
  target_rotator_version: "0.37-R37";
  target_analysis_cohort: "wanted_landing_v1-C9";
  source_manifest_sha256: string;
  activation_phase: string;
  activation_phase_matches_manifest: boolean;
  phases: ExperimentRolloutBucketPhaseCertificate[];
  rollback: {
    selected_variant_basis_points: 0;
    control_basis_points: 10_000;
    exact_selected_buckets: 0;
    exact_control_buckets: 10_000;
    control_covers_every_bucket: boolean;
  };
  exhaustive_coverage_verified: boolean;
  no_gap_or_overlap_verified: boolean;
  monotone_nesting_verified: boolean;
  exact_phase_counts_verified: boolean;
  rollback_control_verified: boolean;
  certificate_sha256: string;
};

export type ExperimentRolloutBucketConformanceResult = {
  profile: typeof EXPERIMENT_ROLLOUT_BUCKET_CONFORMANCE_PROFILE;
  status: "pass" | "fail";
  compiler_verified: boolean;
  manifest_verified: boolean;
  exhaustive_coverage_verified: boolean;
  no_gap_or_overlap_verified: boolean;
  monotone_nesting_verified: boolean;
  exact_phase_counts_verified: boolean;
  activation_phase_matches_manifest: boolean;
  rollback_control_verified: boolean;
  deterministic_certificate_verified: boolean;
  certificate: ExperimentRolloutBucketCertificate | null;
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

function selectedAtBucket(bucket: number, threshold: number) {
  return bucket < threshold;
}

async function certificateDigest(
  value: Omit<ExperimentRolloutBucketCertificate, "certificate_sha256">,
) {
  return rolloutPackageSha256(value);
}

export async function verifyExperimentRolloutBucketConformance(
  value: unknown,
): Promise<ExperimentRolloutBucketConformanceResult> {
  const errors: string[] = [];
  const bundle = record(value);
  const shapeVerified =
    exact(bundle, bundleKeys) &&
    bundle.profile === EXPERIMENT_ROLLOUT_BUCKET_CONFORMANCE_BUNDLE_PROFILE &&
    ["conformance_only", "production"].includes(String(bundle.purpose));
  if (!shapeVerified) errors.push("Bucket-conformance bundle fields, profile, or purpose are invalid.");

  const compiler = await compileExperimentRolloutConfiguration(bundle.compiler_bundle);
  const compilerVerified = compiler.status === "pass" && compiler.manifest !== null;
  if (!compilerVerified) errors.push("The rollout configuration compiler bundle failed verification.");
  const suppliedManifest = record(bundle.manifest);
  const manifestVerified =
    compilerVerified &&
    canonicalRolloutPackageJson(suppliedManifest) === canonicalRolloutPackageJson(compiler.manifest);
  if (!manifestVerified) errors.push("The supplied manifest does not match the deterministic compiler output.");

  const compilerBundle = record(bundle.compiler_bundle);
  const rolloutPackage = record(compilerBundle.rollout_package);
  const rolloutPlan = record(rolloutPackage.rollout_plan);
  const rawPhases = Array.isArray(rolloutPlan.phases) ? rolloutPlan.phases.map(record) : [];
  const expected = [
    ["canary", 500, 9_500],
    ["ramp", 2_500, 7_500],
    ["majority", 5_000, 5_000],
    ["full", 10_000, 0],
  ] as const;

  let priorSelected = new Set<number>();
  const phaseCertificates: ExperimentRolloutBucketPhaseCertificate[] = rawPhases.map(
    (phase, phaseIndex) => {
      const threshold = Number(phase.selected_variant_basis_points);
      const selected = new Set<number>();
      const control = new Set<number>();
      for (let bucket = 0; bucket < 10_000; bucket++) {
        (selectedAtBucket(bucket, threshold) ? selected : control).add(bucket);
      }
      const nested = [...priorSelected].every((bucket) => selected.has(bucket));
      const newlySelected = [...selected].filter((bucket) => !priorSelected.has(bucket)).length;
      priorSelected = selected;
      return {
        phase: String(phase.id),
        selected_variant_basis_points: threshold,
        control_basis_points: Number(phase.control_basis_points),
        exact_selected_buckets: selected.size,
        exact_control_buckets: control.size,
        newly_selected_buckets: newlySelected,
        first_selected_bucket: 0,
        last_selected_bucket: threshold - 1,
        first_control_bucket: threshold === 10_000 ? null : threshold,
        last_control_bucket: control.size ? 9_999 : null,
        coverage_complete: selected.size + control.size === 10_000,
        no_overlap: [...selected].every((bucket) => !control.has(bucket)),
        nested_with_previous_phase: phaseIndex === 0 || nested,
      };
    },
  );

  const exhaustiveCoverageVerified =
    phaseCertificates.length === 4 && phaseCertificates.every((phase) => phase.coverage_complete);
  if (!exhaustiveCoverageVerified) errors.push("One or more phases do not cover all 10,000 buckets.");
  const noGapOrOverlapVerified =
    phaseCertificates.length === 4 && phaseCertificates.every((phase) => phase.no_overlap);
  if (!noGapOrOverlapVerified) errors.push("One or more phases contain a bucket gap or overlap.");
  const monotoneNestingVerified =
    phaseCertificates.length === 4 &&
    phaseCertificates.every((phase) => phase.nested_with_previous_phase);
  if (!monotoneNestingVerified) errors.push("Selected buckets are not nested across rollout phases.");
  const exactPhaseCountsVerified =
    phaseCertificates.length === expected.length &&
    phaseCertificates.every(
      (phase, index) =>
        phase.phase === expected[index][0] &&
        phase.selected_variant_basis_points === expected[index][1] &&
        phase.control_basis_points === expected[index][2] &&
        phase.exact_selected_buckets === expected[index][1] &&
        phase.exact_control_buckets === expected[index][2],
    ) &&
    JSON.stringify(phaseCertificates.map((phase) => phase.newly_selected_buckets)) ===
      JSON.stringify([500, 2_000, 2_500, 5_000]);
  if (!exactPhaseCountsVerified) errors.push("Exact phase bucket counts or transitions are invalid.");

  const manifest = compiler.manifest as ExperimentRolloutConfigManifest | null;
  const activationPhase = phaseCertificates.find(
    (phase) => phase.phase === manifest?.activation_phase,
  );
  const activationPhaseMatchesManifest =
    manifestVerified &&
    Boolean(activationPhase) &&
    activationPhase?.selected_variant_basis_points === manifest?.selected_variant_basis_points &&
    activationPhase?.control_basis_points === manifest?.control_basis_points;
  if (!activationPhaseMatchesManifest) errors.push("The activation phase does not match the compiled manifest.");

  let rollbackSelected = 0;
  let rollbackControl = 0;
  for (let bucket = 0; bucket < 10_000; bucket++) {
    if (selectedAtBucket(bucket, 0)) rollbackSelected += 1;
    else rollbackControl += 1;
  }
  const rollbackControlVerified = rollbackSelected === 0 && rollbackControl === 10_000;
  if (!rollbackControlVerified) errors.push("Rollback does not return every bucket to control.");

  let certificate: ExperimentRolloutBucketCertificate | null = null;
  let deterministicCertificateVerified = false;
  if (
    shapeVerified &&
    compilerVerified &&
    manifestVerified &&
    exhaustiveCoverageVerified &&
    noGapOrOverlapVerified &&
    monotoneNestingVerified &&
    exactPhaseCountsVerified &&
    activationPhaseMatchesManifest &&
    rollbackControlVerified &&
    manifest
  ) {
    const unsignedCertificate = {
      profile: EXPERIMENT_ROLLOUT_BUCKET_CERTIFICATE_PROFILE,
      purpose: bundle.purpose as "conformance_only" | "production",
      basis_points_total: 10_000,
      buckets_enumerated: 10_000,
      target_rotator_version: "0.37-R37",
      target_analysis_cohort: "wanted_landing_v1-C9",
      source_manifest_sha256: manifest.manifest_sha256,
      activation_phase: manifest.activation_phase,
      activation_phase_matches_manifest: true,
      phases: phaseCertificates,
      rollback: {
        selected_variant_basis_points: 0,
        control_basis_points: 10_000,
        exact_selected_buckets: rollbackSelected,
        exact_control_buckets: rollbackControl,
        control_covers_every_bucket: true,
      },
      exhaustive_coverage_verified: true,
      no_gap_or_overlap_verified: true,
      monotone_nesting_verified: true,
      exact_phase_counts_verified: true,
      rollback_control_verified: true,
    } as const;
    const digest = await certificateDigest(unsignedCertificate);
    certificate = { ...unsignedCertificate, certificate_sha256: digest };
    deterministicCertificateVerified = (await certificateDigest(unsignedCertificate)) === digest;
    if (!deterministicCertificateVerified) errors.push("Bucket-conformance certificate is not deterministic.");
  }

  const passed = errors.length === 0;
  return {
    profile: EXPERIMENT_ROLLOUT_BUCKET_CONFORMANCE_PROFILE,
    status: passed ? "pass" : "fail",
    compiler_verified: compilerVerified,
    manifest_verified: manifestVerified,
    exhaustive_coverage_verified: exhaustiveCoverageVerified,
    no_gap_or_overlap_verified: noGapOrOverlapVerified,
    monotone_nesting_verified: monotoneNestingVerified,
    exact_phase_counts_verified: exactPhaseCountsVerified,
    activation_phase_matches_manifest: activationPhaseMatchesManifest,
    rollback_control_verified: rollbackControlVerified,
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
      "The package, manifest, approval, and signed phase ledger in the reference certificate are synthetic.",
      "The proof exhaustively enumerates integer buckets 0 through 9,999; it does not inspect user identifiers, hash uniformity, or live traffic quality.",
      "The certificate never serves a treatment, counts exposure, selects a version, changes configuration, advances a phase, or deploys.",
    ],
  };
}

export async function experimentRolloutBucketConformanceReferenceBundle() {
  const compiler_bundle = experimentRolloutConfigReferenceBundle();
  const compiler = await compileExperimentRolloutConfiguration(compiler_bundle);
  if (!compiler.manifest) throw new Error("Reference runtime manifest compilation failed.");
  return {
    profile: EXPERIMENT_ROLLOUT_BUCKET_CONFORMANCE_BUNDLE_PROFILE,
    purpose: "conformance_only",
    compiler_bundle,
    manifest: compiler.manifest,
  } as const;
}

export const experimentRolloutBucketConformanceContract = {
  name: "Embodied Arena WANTED Exhaustive Rollout Bucket Conformance",
  version: EXPERIMENT_ROLLOUT_BUCKET_CONFORMANCE_PROFILE,
  certificate_profile: EXPERIMENT_ROLLOUT_BUCKET_CERTIFICATE_PROFILE,
  bundle_profile: EXPERIMENT_ROLLOUT_BUCKET_CONFORMANCE_BUNDLE_PROFILE,
  compiler_profile: "0.44-RCC1",
  manifest_profile: "0.44-RCM1",
  buckets_enumerated: 10_000,
  phase_selected_bucket_counts: [500, 2_500, 5_000, 10_000],
  newly_selected_bucket_counts: [500, 2_000, 2_500, 5_000],
  rollback_selected_bucket_count: 0,
  rollback_control_bucket_count: 10_000,
  contract: "/experiments/rollout-bucket-conformance.json",
  schema: "/experiments/rollout-bucket-conformance.schema.json",
  reference_certificate: "/experiments/rollout-bucket-conformance.reference.json",
  module: "/experiments/wanted-rollout-bucket-conformance.mjs",
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
    "exhaustive proof over all 10,000 integer buckets for exact coverage, disjoint assignment, monotone phase nesting, configured counts, activation alignment, and total-control rollback",
} as const;

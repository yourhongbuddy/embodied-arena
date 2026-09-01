import { canonicalRolloutPackageJson } from "./rollout-package.ts";
import {
  compileExperimentRolloutConfiguration,
  experimentRolloutConfigReferenceBundle,
} from "./rollout-config.ts";
import {
  EXPERIMENT_ROLLOUT_SIMULATOR_ANALYSIS_USE,
  rolloutBucketForSyntheticUnit,
  syntheticRolloutUnitId,
} from "./rollout-simulator.ts";
import { validExperimentUnitId } from "./rotator.ts";

export const EXPERIMENT_ROLLOUT_RUNTIME_PROFILE = "0.45-RRR1";
export const EXPERIMENT_ROLLOUT_RUNTIME_BUNDLE_PROFILE =
  "wanted_experiment_rollout_runtime_resolution_0.45-RRRB1";
export const EXPERIMENT_ROLLOUT_RUNTIME_CLI_EXIT_CODES = {
  pass: 0,
  verification_failed: 1,
  usage_or_input_error: 2,
} as const;

const bundleKeys = [
  "analysis_use",
  "compiler_bundle",
  "manifest",
  "profile",
  "runtime_environment",
  "synthetic",
  "synthetic_unit_id",
] as const;
const environmentKeys = [
  "WANTED_ANALYSIS_COHORT",
  "WANTED_AUTOMATIC_PROGRESSION",
  "WANTED_CONTROL_BASIS_POINTS",
  "WANTED_FALLBACK_VARIANT",
  "WANTED_OPERATIONAL_ANALYSIS_USE",
  "WANTED_ROLLOUT_ASSIGNMENT_SALT",
  "WANTED_ROLLOUT_MODE",
  "WANTED_ROLLOUT_PHASE",
  "WANTED_ROLLOUT_PHASE_EPOCH",
  "WANTED_ROTATOR_VERSION",
  "WANTED_SELECTED_BASIS_POINTS",
  "WANTED_SELECTED_VARIANT",
] as const;
const exact = (value: unknown, keys: readonly string[]) =>
  Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()),
  );
const record = (value: unknown) => (value ?? {}) as Record<string, unknown>;

export type ExperimentRolloutRuntimeResult = {
  profile: typeof EXPERIMENT_ROLLOUT_RUNTIME_PROFILE;
  status: "pass" | "fail";
  synthetic_unit_id: string | null;
  rollout_bucket: number | null;
  resolved_variant: "proof" | "control";
  fallback_reason: string | null;
  phase: string | null;
  phase_epoch: string | null;
  selected_variant_basis_points: number;
  control_basis_points: number;
  compiler_verified: boolean;
  manifest_verified: boolean;
  environment_shape_verified: boolean;
  environment_matches_manifest: boolean;
  unit_id_verified: boolean;
  analysis_boundary_verified: boolean;
  deterministic_resolution_verified: boolean;
  fail_closed_verified: boolean;
  assignment_mode: "synthetic_preview";
  live_use_eligible: false;
  treatment_served: false;
  exposure_counted: false;
  writes_browser_storage: false;
  reads_platform_environment: false;
  performs_network_requests: false;
  changes_live_allocation: false;
  changes_live_phase: false;
  deploys: false;
  errors: string[];
  limitations: string[];
};

function resolveVariant(bucket: number, selectedBasisPoints: number): "proof" | "control" {
  return bucket < selectedBasisPoints ? "proof" : "control";
}

export async function resolveExperimentRolloutRuntime(
  value: unknown,
): Promise<ExperimentRolloutRuntimeResult> {
  const errors: string[] = [];
  const bundle = record(value);
  const inputShapeVerified =
    exact(bundle, bundleKeys) &&
    bundle.profile === EXPERIMENT_ROLLOUT_RUNTIME_BUNDLE_PROFILE &&
    bundle.synthetic === true;
  if (!inputShapeVerified) errors.push("Runtime-resolution bundle fields, profile, or synthetic marker are invalid.");

  const compilerResult = await compileExperimentRolloutConfiguration(bundle.compiler_bundle);
  const compilerVerified = compilerResult.status === "pass" && compilerResult.manifest !== null;
  if (!compilerVerified) errors.push("The rollout configuration compiler bundle failed verification.");

  const suppliedManifest = record(bundle.manifest);
  const manifestVerified =
    compilerVerified &&
    canonicalRolloutPackageJson(suppliedManifest) ===
      canonicalRolloutPackageJson(compilerResult.manifest);
  if (!manifestVerified) errors.push("The supplied runtime manifest does not match the deterministic compiler output.");

  const runtimeEnvironment = record(bundle.runtime_environment);
  const environmentShapeVerified =
    exact(runtimeEnvironment, environmentKeys) &&
    Object.values(runtimeEnvironment).every((entry) => typeof entry === "string");
  if (!environmentShapeVerified) errors.push("Runtime environment fields are incomplete or not strings.");
  const environmentMatchesManifest =
    manifestVerified &&
    environmentShapeVerified &&
    canonicalRolloutPackageJson(runtimeEnvironment) ===
      canonicalRolloutPackageJson(record(compilerResult.manifest?.environment));
  if (!environmentMatchesManifest) errors.push("Runtime environment does not exactly match the compiled manifest.");

  const unitIdVerified = validExperimentUnitId(bundle.synthetic_unit_id);
  if (!unitIdVerified) errors.push("A valid synthetic UUID v4 unit ID is required.");
  const analysisBoundaryVerified =
    bundle.analysis_use === EXPERIMENT_ROLLOUT_SIMULATOR_ANALYSIS_USE;
  if (!analysisBoundaryVerified) {
    errors.push("Runtime preview is not explicitly excluded from exposure and version-selection inference.");
  }

  const manifest = compilerResult.manifest;
  let bucket: number | null = null;
  let resolved: "proof" | "control" = "control";
  let deterministic = false;
  if (
    inputShapeVerified &&
    compilerVerified &&
    manifestVerified &&
    environmentMatchesManifest &&
    unitIdVerified &&
    analysisBoundaryVerified &&
    manifest
  ) {
    bucket = rolloutBucketForSyntheticUnit(String(bundle.synthetic_unit_id));
    resolved = resolveVariant(bucket, manifest.selected_variant_basis_points);
    deterministic =
      rolloutBucketForSyntheticUnit(String(bundle.synthetic_unit_id)) === bucket &&
      resolveVariant(bucket, manifest.selected_variant_basis_points) === resolved;
    if (!deterministic) errors.push("Runtime assignment did not reproduce deterministically.");
  }

  const passed = errors.length === 0;
  const fallbackReason = passed ? null : "configuration_or_unit_verification_failed_control_fallback";
  const failClosedVerified = passed || (resolved === "control" && bucket === null);
  return {
    profile: EXPERIMENT_ROLLOUT_RUNTIME_PROFILE,
    status: passed ? "pass" : "fail",
    synthetic_unit_id: unitIdVerified ? String(bundle.synthetic_unit_id) : null,
    rollout_bucket: passed ? bucket : null,
    resolved_variant: passed ? resolved : "control",
    fallback_reason: fallbackReason,
    phase: passed ? manifest?.activation_phase ?? null : null,
    phase_epoch: passed ? manifest?.activation_phase_epoch ?? null : null,
    selected_variant_basis_points: passed ? manifest?.selected_variant_basis_points ?? 0 : 0,
    control_basis_points: passed ? manifest?.control_basis_points ?? 10_000 : 10_000,
    compiler_verified: compilerVerified,
    manifest_verified: manifestVerified,
    environment_shape_verified: environmentShapeVerified,
    environment_matches_manifest: environmentMatchesManifest,
    unit_id_verified: unitIdVerified,
    analysis_boundary_verified: analysisBoundaryVerified,
    deterministic_resolution_verified: deterministic,
    fail_closed_verified: failClosedVerified,
    assignment_mode: "synthetic_preview",
    live_use_eligible: false,
    treatment_served: false,
    exposure_counted: false,
    writes_browser_storage: false,
    reads_platform_environment: false,
    performs_network_requests: false,
    changes_live_allocation: false,
    changes_live_phase: false,
    deploys: false,
    errors,
    limitations: [
      "The manifest, runtime environment, unit ID, approval, package, and phase ledger in the reference vectors are synthetic.",
      "The resolver receives an explicit environment object and never reads process.env, browser storage, secrets, or network resources.",
      "A passing result is a local preview assignment only; it never serves a treatment, counts exposure, changes allocation, advances a phase, or deploys.",
    ],
  };
}

export async function experimentRolloutRuntimeReferenceBundle(index = 0) {
  const compiler_bundle = experimentRolloutConfigReferenceBundle();
  const compiler = await compileExperimentRolloutConfiguration(compiler_bundle);
  if (!compiler.manifest) throw new Error("Reference runtime manifest compilation failed.");
  return {
    profile: EXPERIMENT_ROLLOUT_RUNTIME_BUNDLE_PROFILE,
    synthetic: true,
    analysis_use: EXPERIMENT_ROLLOUT_SIMULATOR_ANALYSIS_USE,
    compiler_bundle,
    manifest: compiler.manifest,
    runtime_environment: compiler.manifest.environment,
    synthetic_unit_id: syntheticRolloutUnitId(index),
  } as const;
}

export const experimentRolloutRuntimeContract = {
  name: "Embodied Arena WANTED Fail-Closed Rollout Runtime Resolver",
  version: EXPERIMENT_ROLLOUT_RUNTIME_PROFILE,
  bundle_profile: EXPERIMENT_ROLLOUT_RUNTIME_BUNDLE_PROFILE,
  compiler_profile: "0.44-RCC1",
  manifest_profile: "0.44-RCM1",
  target_rotator_version: "0.37-R37",
  target_analysis_cohort: "wanted_landing_v1-C9",
  allocation_algorithm:
    "FNV1a_32(target_analysis_cohort|staged-rollout|synthetic_unit_id) mod 10000",
  invalid_configuration_behavior: "control_fallback_with_no_bucket_or_phase",
  contract: "/experiments/rollout-runtime.json",
  schema: "/experiments/rollout-runtime.schema.json",
  reference_vectors: "/experiments/rollout-runtime.reference.json",
  module: "/experiments/wanted-rollout-runtime.mjs",
  lab: "/experiments/rollout-simulator",
  analysis_use: EXPERIMENT_ROLLOUT_SIMULATOR_ANALYSIS_USE,
  assignment_mode: "synthetic_preview",
  runtime_dependencies: 0,
  reads_platform_environment: false,
  writes_browser_storage: false,
  performs_network_requests: false,
  live_use_eligible: false,
  treatment_served: false,
  exposure_counted: false,
  changes_live_allocation: false,
  changes_live_phase: false,
  deploys: false,
  interpretation:
    "pure fail-closed reproduction of one synthetic staged assignment from an exact compiled manifest and explicit environment object; never a live serving path",
} as const;

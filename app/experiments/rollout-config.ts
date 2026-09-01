import {
  EXPERIMENT_ROLLOUT_TARGET_COHORT,
  EXPERIMENT_ROLLOUT_TARGET_VERSION,
  experimentRolloutReferencePackage,
  rolloutPackageSha256,
  verifyExperimentRolloutPackage,
} from "./rollout-package.ts";
import {
  experimentRolloutPhaseLedgerReferenceBundle,
  verifyExperimentRolloutPhaseLedger,
} from "./rollout-phase-ledger.ts";
import { EXPERIMENT_ROLLOUT_SIMULATOR_ANALYSIS_USE } from "./rollout-simulator.ts";

export const EXPERIMENT_ROLLOUT_CONFIG_COMPILER_PROFILE = "0.44-RCC1";
export const EXPERIMENT_ROLLOUT_CONFIG_MANIFEST_PROFILE = "0.44-RCM1";
export const EXPERIMENT_ROLLOUT_CONFIG_BUNDLE_PROFILE =
  "wanted_experiment_rollout_config_compiler_0.44-RCCB1";
export const EXPERIMENT_ROLLOUT_CONFIG_CLI_EXIT_CODES = {
  pass: 0,
  verification_failed: 1,
  usage_or_input_error: 2,
} as const;

const bundleKeys = ["phase_ledger", "profile", "purpose", "rollout_package"] as const;
const exact = (value: unknown, keys: readonly string[]) =>
  Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()),
  );
const record = (value: unknown) => (value ?? {}) as Record<string, unknown>;

export type ExperimentRolloutRuntimeEnvironment = {
  WANTED_ROLLOUT_MODE: "manual_staged_rollout";
  WANTED_ROTATOR_VERSION: typeof EXPERIMENT_ROLLOUT_TARGET_VERSION;
  WANTED_ANALYSIS_COHORT: typeof EXPERIMENT_ROLLOUT_TARGET_COHORT;
  WANTED_ROLLOUT_PHASE: string;
  WANTED_ROLLOUT_PHASE_EPOCH: string;
  WANTED_SELECTED_VARIANT: "proof";
  WANTED_FALLBACK_VARIANT: "control";
  WANTED_SELECTED_BASIS_POINTS: string;
  WANTED_CONTROL_BASIS_POINTS: string;
  WANTED_ROLLOUT_ASSIGNMENT_SALT: "wanted_landing_v1-C9|staged-rollout";
  WANTED_OPERATIONAL_ANALYSIS_USE: "operational_safety_only_excluded_from_version_selection";
  WANTED_AUTOMATIC_PROGRESSION: "false";
};

export type ExperimentRolloutConfigManifest = {
  profile: typeof EXPERIMENT_ROLLOUT_CONFIG_MANIFEST_PROFILE;
  status: "ready_for_manual_activation_review";
  purpose: "conformance_only" | "production";
  target_rotator_version: typeof EXPERIMENT_ROLLOUT_TARGET_VERSION;
  target_analysis_cohort: typeof EXPERIMENT_ROLLOUT_TARGET_COHORT;
  source_rollout_package_sha256: string;
  source_phase_ledger_sha256: string;
  source_latest_phase_receipt_sha256: string;
  reviewed_phase: string;
  activation_phase: string;
  activation_phase_epoch: string;
  selected_variant: "proof";
  fallback_variant: "control";
  selected_variant_basis_points: number;
  control_basis_points: number;
  allocation_algorithm: "FNV1a_32(target_analysis_cohort|staged-rollout|unit_id) mod 10000";
  analysis_use: "operational_safety_only_excluded_from_version_selection";
  simulation_analysis_use: typeof EXPERIMENT_ROLLOUT_SIMULATOR_ANALYSIS_USE;
  environment: ExperimentRolloutRuntimeEnvironment;
  rollback_environment: ExperimentRolloutRuntimeEnvironment;
  rollback_maximum_minutes: 15;
  manual_confirmation_required: true;
  automatic_application: false;
  contains_secrets: false;
  manifest_sha256: string;
};

export type ExperimentRolloutConfigCompilerResult = {
  profile: typeof EXPERIMENT_ROLLOUT_CONFIG_COMPILER_PROFILE;
  status: "pass" | "fail";
  package_verified: boolean;
  phase_ledger_verified: boolean;
  source_binding_verified: boolean;
  next_phase_verified: boolean;
  environment_complete: boolean;
  rollback_environment_complete: boolean;
  deterministic_manifest_verified: boolean;
  inference_isolation_verified: boolean;
  manifest: ExperimentRolloutConfigManifest | null;
  applies_configuration: false;
  changes_live_allocation: false;
  changes_live_phase: false;
  reads_or_writes_secrets: false;
  performs_network_requests: false;
  deploys: false;
  errors: string[];
  limitations: string[];
};

const PHASE_EPOCHS = {
  canary: "wanted_landing_v1-C9-P1",
  ramp: "wanted_landing_v1-C9-P2",
  majority: "wanted_landing_v1-C9-P3",
  full: "wanted_landing_v1-C9-P4",
} as const;

function environmentForPhase(
  phase: { id: string; selected_variant_basis_points: number; control_basis_points: number },
): ExperimentRolloutRuntimeEnvironment {
  return {
    WANTED_ROLLOUT_MODE: "manual_staged_rollout",
    WANTED_ROTATOR_VERSION: EXPERIMENT_ROLLOUT_TARGET_VERSION,
    WANTED_ANALYSIS_COHORT: EXPERIMENT_ROLLOUT_TARGET_COHORT,
    WANTED_ROLLOUT_PHASE: phase.id,
    WANTED_ROLLOUT_PHASE_EPOCH: PHASE_EPOCHS[phase.id as keyof typeof PHASE_EPOCHS],
    WANTED_SELECTED_VARIANT: "proof",
    WANTED_FALLBACK_VARIANT: "control",
    WANTED_SELECTED_BASIS_POINTS: String(phase.selected_variant_basis_points),
    WANTED_CONTROL_BASIS_POINTS: String(phase.control_basis_points),
    WANTED_ROLLOUT_ASSIGNMENT_SALT: "wanted_landing_v1-C9|staged-rollout",
    WANTED_OPERATIONAL_ANALYSIS_USE: "operational_safety_only_excluded_from_version_selection",
    WANTED_AUTOMATIC_PROGRESSION: "false",
  };
}

async function manifestDigest(value: Omit<ExperimentRolloutConfigManifest, "manifest_sha256">) {
  return rolloutPackageSha256(value);
}

export async function compileExperimentRolloutConfiguration(
  value: unknown,
): Promise<ExperimentRolloutConfigCompilerResult> {
  const errors: string[] = [];
  const bundle = record(value);
  const shapeVerified =
    exact(bundle, bundleKeys) &&
    bundle.profile === EXPERIMENT_ROLLOUT_CONFIG_BUNDLE_PROFILE &&
    ["conformance_only", "production"].includes(String(bundle.purpose));
  if (!shapeVerified) errors.push("Compiler bundle fields, profile, or purpose are invalid.");

  const packageResult = await verifyExperimentRolloutPackage(bundle.rollout_package);
  const packageVerified = packageResult.status === "pass";
  if (!packageVerified) errors.push("The staged-rollout package failed verification.");
  const ledgerResult = await verifyExperimentRolloutPhaseLedger(bundle.phase_ledger);
  const ledgerVerified = ledgerResult.status === "pass";
  if (!ledgerVerified) errors.push("The signed phase-review ledger failed verification.");

  let packageDigest: string | null = null;
  let ledgerDigest: string | null = null;
  let latestReceiptDigest: string | null = null;
  const ledger = record(bundle.phase_ledger);
  const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
  const latestEntry = record(entries.at(-1));
  const latestReceipt = record(latestEntry.phase_receipt);
  try {
    packageDigest = await rolloutPackageSha256(bundle.rollout_package);
    ledgerDigest = await rolloutPackageSha256(bundle.phase_ledger);
    latestReceiptDigest = await rolloutPackageSha256(latestReceipt);
  } catch {
    errors.push("Compiler source digests could not be calculated.");
  }

  const sourceBindingVerified =
    packageVerified &&
    ledgerVerified &&
    packageDigest !== null &&
    packageDigest === latestReceipt.rollout_package_sha256 &&
    packageResult.target_rotator_version === EXPERIMENT_ROLLOUT_TARGET_VERSION &&
    packageResult.target_analysis_cohort === EXPERIMENT_ROLLOUT_TARGET_COHORT &&
    latestReceipt.target_rotator_version === EXPERIMENT_ROLLOUT_TARGET_VERSION &&
    latestReceipt.target_analysis_cohort === EXPERIMENT_ROLLOUT_TARGET_COHORT;
  if (!sourceBindingVerified) errors.push("The ledger does not bind the exact verified rollout package and target.");

  const packageRecord = record(bundle.rollout_package);
  const plan = record(packageRecord.rollout_plan);
  const phases = Array.isArray(plan.phases) ? plan.phases.map(record) : [];
  const nextPhase = phases.find((phase) => phase.id === ledgerResult.next_phase);
  const nextPhaseVerified =
    ledgerVerified &&
    !ledgerResult.rollout_complete &&
    Boolean(nextPhase) &&
    typeof nextPhase?.id === "string" &&
    Number.isInteger(nextPhase?.selected_variant_basis_points) &&
    Number.isInteger(nextPhase?.control_basis_points) &&
    Number(nextPhase?.selected_variant_basis_points) + Number(nextPhase?.control_basis_points) === 10_000 &&
    nextPhase?.id in PHASE_EPOCHS;
  if (!nextPhaseVerified) errors.push("The ledger does not identify one valid next rollout phase.");

  let manifest: ExperimentRolloutConfigManifest | null = null;
  let environmentComplete = false;
  let rollbackEnvironmentComplete = false;
  let deterministicManifestVerified = false;
  let inferenceIsolationVerified = false;
  if (
    shapeVerified &&
    sourceBindingVerified &&
    nextPhaseVerified &&
    packageDigest &&
    ledgerDigest &&
    latestReceiptDigest &&
    nextPhase
  ) {
    const phase = {
      id: String(nextPhase.id),
      selected_variant_basis_points: Number(nextPhase.selected_variant_basis_points),
      control_basis_points: Number(nextPhase.control_basis_points),
    };
    const environment = environmentForPhase(phase);
    const rollback_environment = environmentForPhase({
      id: phase.id,
      selected_variant_basis_points: 0,
      control_basis_points: 10_000,
    });
    const unsignedManifest = {
      profile: EXPERIMENT_ROLLOUT_CONFIG_MANIFEST_PROFILE,
      status: "ready_for_manual_activation_review",
      purpose: bundle.purpose as "conformance_only" | "production",
      target_rotator_version: EXPERIMENT_ROLLOUT_TARGET_VERSION,
      target_analysis_cohort: EXPERIMENT_ROLLOUT_TARGET_COHORT,
      source_rollout_package_sha256: packageDigest,
      source_phase_ledger_sha256: ledgerDigest,
      source_latest_phase_receipt_sha256: latestReceiptDigest,
      reviewed_phase: String(ledgerResult.current_phase),
      activation_phase: phase.id,
      activation_phase_epoch: PHASE_EPOCHS[phase.id as keyof typeof PHASE_EPOCHS],
      selected_variant: "proof",
      fallback_variant: "control",
      selected_variant_basis_points: phase.selected_variant_basis_points,
      control_basis_points: phase.control_basis_points,
      allocation_algorithm:
        "FNV1a_32(target_analysis_cohort|staged-rollout|unit_id) mod 10000",
      analysis_use: "operational_safety_only_excluded_from_version_selection",
      simulation_analysis_use: EXPERIMENT_ROLLOUT_SIMULATOR_ANALYSIS_USE,
      environment,
      rollback_environment,
      rollback_maximum_minutes: 15,
      manual_confirmation_required: true,
      automatic_application: false,
      contains_secrets: false,
    } as const;
    const digest = await manifestDigest(unsignedManifest);
    manifest = { ...unsignedManifest, manifest_sha256: digest };
    environmentComplete = Object.keys(environment).length === 12;
    rollbackEnvironmentComplete =
      Object.keys(rollback_environment).length === 12 &&
      rollback_environment.WANTED_SELECTED_BASIS_POINTS === "0" &&
      rollback_environment.WANTED_CONTROL_BASIS_POINTS === "10000";
    deterministicManifestVerified = (await manifestDigest(unsignedManifest)) === digest;
    inferenceIsolationVerified =
      environment.WANTED_OPERATIONAL_ANALYSIS_USE ===
        "operational_safety_only_excluded_from_version_selection" &&
      unsignedManifest.simulation_analysis_use === EXPERIMENT_ROLLOUT_SIMULATOR_ANALYSIS_USE;
    if (!environmentComplete) errors.push("The activation environment is incomplete.");
    if (!rollbackEnvironmentComplete) errors.push("The rollback environment is incomplete.");
    if (!deterministicManifestVerified) errors.push("The runtime manifest is not deterministic.");
    if (!inferenceIsolationVerified) errors.push("Operational and simulation analysis boundaries are invalid.");
  }

  const passed = errors.length === 0;
  return {
    profile: EXPERIMENT_ROLLOUT_CONFIG_COMPILER_PROFILE,
    status: passed ? "pass" : "fail",
    package_verified: packageVerified,
    phase_ledger_verified: ledgerVerified,
    source_binding_verified: sourceBindingVerified,
    next_phase_verified: nextPhaseVerified,
    environment_complete: environmentComplete,
    rollback_environment_complete: rollbackEnvironmentComplete,
    deterministic_manifest_verified: deterministicManifestVerified,
    inference_isolation_verified: inferenceIsolationVerified,
    manifest: passed ? manifest : null,
    applies_configuration: false,
    changes_live_allocation: false,
    changes_live_phase: false,
    reads_or_writes_secrets: false,
    performs_network_requests: false,
    deploys: false,
    errors,
    limitations: [
      "The reference approval, package, phase ledger, observations, and compiled configuration are synthetic.",
      "The compiler emits inert environment values and digests; it never reads secrets, applies configuration, advances phases, publishes, or deploys.",
      "Production activation still requires a real authorized artifact, accountable manual confirmation, atomic platform configuration, and deployment audit evidence.",
    ],
  };
}

export function experimentRolloutConfigReferenceBundle() {
  return {
    profile: EXPERIMENT_ROLLOUT_CONFIG_BUNDLE_PROFILE,
    purpose: "conformance_only",
    rollout_package: experimentRolloutReferencePackage(),
    phase_ledger: experimentRolloutPhaseLedgerReferenceBundle(),
  } as const;
}

export const experimentRolloutConfigContract = {
  name: "Embodied Arena WANTED Rollout Runtime Configuration Compiler",
  version: EXPERIMENT_ROLLOUT_CONFIG_COMPILER_PROFILE,
  manifest_profile: EXPERIMENT_ROLLOUT_CONFIG_MANIFEST_PROFILE,
  bundle_profile: EXPERIMENT_ROLLOUT_CONFIG_BUNDLE_PROFILE,
  rollout_package_profile: "0.40-RP1",
  phase_ledger_profile: "0.42-RPL1",
  target_rotator_version: EXPERIMENT_ROLLOUT_TARGET_VERSION,
  target_analysis_cohort: EXPERIMENT_ROLLOUT_TARGET_COHORT,
  contract: "/experiments/rollout-config.json",
  schema: "/experiments/rollout-config.schema.json",
  reference_bundle: "/experiments/rollout-config.reference.json",
  module: "/experiments/wanted-rollout-config.mjs",
  lab: "/experiments/rollout-simulator",
  deterministic_manifest: true,
  environment_values_are_strings: true,
  rollback_selected_variant_basis_points: 0,
  rollback_control_basis_points: 10_000,
  rollback_maximum_minutes: 15,
  manual_confirmation_required: true,
  automatic_application: false,
  contains_secrets: false,
  runtime_dependencies: 0,
  performs_network_requests: false,
  applies_configuration: false,
  changes_live_allocation: false,
  changes_live_phase: false,
  deploys: false,
  interpretation:
    "deterministically compiles a verified rollout package and signed phase-ledger prefix into inert activation and rollback environment manifests; never applies configuration",
} as const;

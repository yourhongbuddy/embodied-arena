import { fnv1a32, validExperimentUnitId } from "./rotator.ts";
import {
  EXPERIMENT_ROLLOUT_TARGET_COHORT,
  EXPERIMENT_ROLLOUT_TARGET_VERSION,
  experimentRolloutReferencePackage,
  rolloutPackageSha256,
  verifyExperimentRolloutPackage,
} from "./rollout-package.ts";

export const EXPERIMENT_ROLLOUT_SIMULATOR_PROFILE = "0.43-RSM1";
export const EXPERIMENT_ROLLOUT_SIMULATOR_BUNDLE_PROFILE =
  "wanted_experiment_rollout_simulation_0.43-RSMB1";
export const EXPERIMENT_ROLLOUT_SIMULATOR_ANALYSIS_USE =
  "synthetic_preproduction_only_excluded_from_exposure_and_version_selection";
export const EXPERIMENT_ROLLOUT_SIMULATOR_SAMPLE_SIZES = [100, 1_000, 10_000] as const;

const bundleKeys = [
  "analysis_use",
  "profile",
  "rollout_package",
  "synthetic",
  "synthetic_unit_ids",
] as const;

const exact = (value: unknown, keys: readonly string[]) =>
  Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()),
  );

export type RolloutSimulationVariant = "control" | "proof";
export type RolloutSimulationPhase = {
  id: string;
  selected_variant_basis_points: number;
  control_basis_points: number;
};
export type RolloutSimulationPhaseSummary = RolloutSimulationPhase & {
  selected_units: number;
  control_units: number;
  observed_selected_share: number;
  configured_selected_share: number;
  absolute_share_delta: number;
};
export type RolloutSimulationUnit = {
  unit_id: string;
  rollout_bucket: number;
  phases: Record<string, RolloutSimulationVariant>;
};
export type ExperimentRolloutSimulationResult = {
  profile: typeof EXPERIMENT_ROLLOUT_SIMULATOR_PROFILE;
  status: "pass" | "fail";
  target_rotator_version: string | null;
  target_analysis_cohort: string | null;
  calculated_rollout_package_sha256: string | null;
  synthetic_units: number;
  package_verified: boolean;
  input_shape_verified: boolean;
  unit_ids_verified: boolean;
  unique_units_verified: boolean;
  deterministic_replay_verified: boolean;
  monotone_membership_verified: boolean;
  phase_allocation_verified: boolean;
  inference_isolation_verified: boolean;
  phase_summaries: RolloutSimulationPhaseSummary[];
  sample_units: RolloutSimulationUnit[];
  changes_live_allocation: false;
  creates_identifiers: false;
  stores_identifiers: false;
  sends_analytics: false;
  counts_exposures: false;
  supports_version_selection: false;
  deploys: false;
  errors: string[];
  limitations: string[];
};

export function rolloutBucketForSyntheticUnit(unitId: string) {
  if (!validExperimentUnitId(unitId)) throw new TypeError("A valid synthetic UUID v4 is required.");
  return fnv1a32(`${EXPERIMENT_ROLLOUT_TARGET_COHORT}|staged-rollout|${unitId}`) % 10_000;
}

export function syntheticRolloutUnitId(index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= 1_000_000) {
    throw new TypeError("Synthetic unit index must be an integer from 0 through 999,999.");
  }
  const material = Array.from({ length: 4 }, (_, part) =>
    fnv1a32(`wanted-rollout-simulator|${index}|${part}`).toString(16).padStart(8, "0"),
  )
    .join("")
    .split("");
  material[12] = "4";
  material[16] = ["8", "9", "a", "b"][parseInt(material[16], 16) % 4];
  const hex = material.join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function syntheticRolloutUnitIds(sampleSize: number) {
  if (!EXPERIMENT_ROLLOUT_SIMULATOR_SAMPLE_SIZES.includes(sampleSize as 100 | 1_000 | 10_000)) {
    throw new TypeError("Sample size must be 100, 1,000, or 10,000 synthetic units.");
  }
  return Array.from({ length: sampleSize }, (_, index) => syntheticRolloutUnitId(index));
}

export function rolloutSimulationAssignment(
  unitId: string,
  phases: readonly RolloutSimulationPhase[],
): RolloutSimulationUnit {
  const rollout_bucket = rolloutBucketForSyntheticUnit(unitId);
  return {
    unit_id: unitId,
    rollout_bucket,
    phases: Object.fromEntries(
      phases.map((phase) => [
        phase.id,
        rollout_bucket < phase.selected_variant_basis_points ? "proof" : "control",
      ]),
    ),
  };
}

export async function simulateExperimentRollout(value: unknown): Promise<ExperimentRolloutSimulationResult> {
  const errors: string[] = [];
  const bundle = (value ?? {}) as Record<string, unknown>;
  const inputShapeVerified =
    exact(bundle, bundleKeys) &&
    bundle.profile === EXPERIMENT_ROLLOUT_SIMULATOR_BUNDLE_PROFILE &&
    bundle.synthetic === true;
  if (!inputShapeVerified) errors.push("Simulation bundle fields, profile, or synthetic marker are invalid.");

  const packageResult = await verifyExperimentRolloutPackage(bundle.rollout_package);
  const packageVerified = packageResult.status === "pass";
  if (!packageVerified) errors.push("The staged-rollout package failed verification.");

  const unitIds = Array.isArray(bundle.synthetic_unit_ids) ? bundle.synthetic_unit_ids : [];
  const unitIdsVerified =
    unitIds.length >= 1 &&
    unitIds.length <= 10_000 &&
    unitIds.every((unitId) => validExperimentUnitId(unitId));
  if (!unitIdsVerified) errors.push("Supply 1 through 10,000 valid synthetic UUID v4 unit IDs.");
  const uniqueUnitsVerified = unitIdsVerified && new Set(unitIds).size === unitIds.length;
  if (!uniqueUnitsVerified) errors.push("Synthetic unit IDs must be unique.");

  const inferenceIsolationVerified =
    bundle.analysis_use === EXPERIMENT_ROLLOUT_SIMULATOR_ANALYSIS_USE;
  if (!inferenceIsolationVerified) {
    errors.push("Simulation output is not explicitly excluded from exposures and version selection.");
  }

  const packageRecord = (bundle.rollout_package ?? {}) as Record<string, unknown>;
  const plan = (packageRecord.rollout_plan ?? {}) as Record<string, unknown>;
  const rawPhases = Array.isArray(plan.phases) ? plan.phases : [];
  const phases = rawPhases.map((phase) => phase as RolloutSimulationPhase);
  const phaseAllocationVerified =
    packageVerified &&
    phases.length === 4 &&
    phases.every(
      (phase, index) =>
        typeof phase.id === "string" &&
        Number.isInteger(phase.selected_variant_basis_points) &&
        Number.isInteger(phase.control_basis_points) &&
        phase.selected_variant_basis_points + phase.control_basis_points === 10_000 &&
        (index === 0 ||
          phase.selected_variant_basis_points > phases[index - 1].selected_variant_basis_points),
    );
  if (!phaseAllocationVerified) errors.push("Rollout phases do not define a strictly increasing allocation.");

  const assignments =
    unitIdsVerified && uniqueUnitsVerified && phaseAllocationVerified
      ? (unitIds as string[]).map((unitId) => rolloutSimulationAssignment(unitId, phases))
      : [];
  const replay = assignments.map((row) => rolloutSimulationAssignment(row.unit_id, phases));
  const deterministicReplayVerified =
    assignments.length > 0 && JSON.stringify(assignments) === JSON.stringify(replay);
  if (!deterministicReplayVerified) errors.push("Deterministic rollout replay failed.");

  const monotoneMembershipVerified =
    assignments.length > 0 &&
    assignments.every((row) => {
      let selected = false;
      return phases.every((phase) => {
        const assignment = row.phases[phase.id];
        if (assignment === "proof") selected = true;
        return !selected || assignment === "proof";
      });
    });
  if (!monotoneMembershipVerified) errors.push("A selected unit returned to control in a later phase.");

  const phaseSummaries = phases.map((phase) => {
    const selected_units = assignments.filter((row) => row.phases[phase.id] === "proof").length;
    const observed_selected_share = assignments.length ? selected_units / assignments.length : 0;
    const configured_selected_share = phase.selected_variant_basis_points / 10_000;
    return {
      id: phase.id,
      selected_variant_basis_points: phase.selected_variant_basis_points,
      control_basis_points: phase.control_basis_points,
      selected_units,
      control_units: assignments.length - selected_units,
      observed_selected_share,
      configured_selected_share,
      absolute_share_delta: Math.abs(observed_selected_share - configured_selected_share),
    };
  });

  let calculatedPackageDigest: string | null = null;
  try {
    calculatedPackageDigest = await rolloutPackageSha256(bundle.rollout_package);
  } catch {
    errors.push("The rollout package digest could not be calculated.");
  }

  const passed = errors.length === 0;
  return {
    profile: EXPERIMENT_ROLLOUT_SIMULATOR_PROFILE,
    status: passed ? "pass" : "fail",
    target_rotator_version: packageResult.target_rotator_version,
    target_analysis_cohort: packageResult.target_analysis_cohort,
    calculated_rollout_package_sha256: calculatedPackageDigest,
    synthetic_units: assignments.length,
    package_verified: packageVerified,
    input_shape_verified: inputShapeVerified,
    unit_ids_verified: unitIdsVerified,
    unique_units_verified: uniqueUnitsVerified,
    deterministic_replay_verified: deterministicReplayVerified,
    monotone_membership_verified: monotoneMembershipVerified,
    phase_allocation_verified: phaseAllocationVerified,
    inference_isolation_verified: inferenceIsolationVerified,
    phase_summaries: phaseSummaries,
    sample_units: assignments.slice(0, 12),
    changes_live_allocation: false,
    creates_identifiers: false,
    stores_identifiers: false,
    sends_analytics: false,
    counts_exposures: false,
    supports_version_selection: false,
    deploys: false,
    errors,
    limitations: [
      "The package, candidate, approval, and unit IDs in the reference vector are synthetic.",
      "This is a deterministic allocation dry run, not traffic-quality evidence or randomization inference.",
      "The simulator creates no browser identifiers, sends no analytics, counts no exposures, and never changes live allocation.",
    ],
  };
}

export function experimentRolloutSimulatorReferenceBundle(sampleSize: number = 1_000) {
  return {
    profile: EXPERIMENT_ROLLOUT_SIMULATOR_BUNDLE_PROFILE,
    synthetic: true,
    analysis_use: EXPERIMENT_ROLLOUT_SIMULATOR_ANALYSIS_USE,
    rollout_package: experimentRolloutReferencePackage(),
    synthetic_unit_ids: syntheticRolloutUnitIds(sampleSize),
  } as const;
}

export const experimentRolloutSimulatorContract = {
  name: "Embodied Arena WANTED Staged Rollout Population Simulator",
  version: EXPERIMENT_ROLLOUT_SIMULATOR_PROFILE,
  bundle_profile: EXPERIMENT_ROLLOUT_SIMULATOR_BUNDLE_PROFILE,
  rollout_package_profile: "0.40-RP1",
  target_rotator_version: EXPERIMENT_ROLLOUT_TARGET_VERSION,
  target_analysis_cohort: EXPERIMENT_ROLLOUT_TARGET_COHORT,
  allocation_algorithm: "FNV1a_32(target_analysis_cohort|staged-rollout|synthetic_unit_id) mod 10000",
  phase_selected_variant_basis_points: [500, 2_500, 5_000, 10_000],
  monotone_membership_required: true,
  sample_sizes: EXPERIMENT_ROLLOUT_SIMULATOR_SAMPLE_SIZES,
  analysis_use: EXPERIMENT_ROLLOUT_SIMULATOR_ANALYSIS_USE,
  contract: "/experiments/rollout-simulator.json",
  schema: "/experiments/rollout-simulator.schema.json",
  reference_bundle: "/experiments/rollout-simulator.reference.json",
  lab: "/experiments/rollout-simulator",
  runtime_dependencies: 0,
  performs_network_requests: false,
  creates_identifiers: false,
  stores_identifiers: false,
  sends_analytics: false,
  counts_exposures: false,
  supports_version_selection: false,
  changes_live_allocation: false,
  deploys: false,
  interpretation:
    "deterministic synthetic population replay proving sticky monotone membership across the signed staged-allocation thresholds; never production execution or experiment inference",
} as const;

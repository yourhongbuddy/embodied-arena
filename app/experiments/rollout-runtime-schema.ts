import { experimentRolloutConfigSchema } from "./rollout-config-schema.ts";
import {
  EXPERIMENT_ROLLOUT_CONFIG_MANIFEST_PROFILE,
} from "./rollout-config.ts";
import {
  EXPERIMENT_ROLLOUT_RUNTIME_BUNDLE_PROFILE,
} from "./rollout-runtime.ts";
import { EXPERIMENT_ROLLOUT_SIMULATOR_ANALYSIS_USE } from "./rollout-simulator.ts";

const digest = { type: "string", pattern: "^[0-9a-f]{64}$" } as const;
const environmentProperties = {
  WANTED_ROLLOUT_MODE: { const: "manual_staged_rollout" },
  WANTED_ROTATOR_VERSION: { const: "0.37-R37" },
  WANTED_ANALYSIS_COHORT: { const: "wanted_landing_v1-C9" },
  WANTED_ROLLOUT_PHASE: { enum: ["canary", "ramp", "majority", "full"] },
  WANTED_ROLLOUT_PHASE_EPOCH: {
    enum: [
      "wanted_landing_v1-C9-P1",
      "wanted_landing_v1-C9-P2",
      "wanted_landing_v1-C9-P3",
      "wanted_landing_v1-C9-P4",
    ],
  },
  WANTED_SELECTED_VARIANT: { const: "proof" },
  WANTED_FALLBACK_VARIANT: { const: "control" },
  WANTED_SELECTED_BASIS_POINTS: { pattern: "^(0|500|2500|5000|10000)$" },
  WANTED_CONTROL_BASIS_POINTS: { pattern: "^(0|5000|7500|9500|10000)$" },
  WANTED_ROLLOUT_ASSIGNMENT_SALT: { const: "wanted_landing_v1-C9|staged-rollout" },
  WANTED_OPERATIONAL_ANALYSIS_USE: {
    const: "operational_safety_only_excluded_from_version_selection",
  },
  WANTED_AUTOMATIC_PROGRESSION: { const: "false" },
} as const;
const environmentRequired = Object.keys(environmentProperties);

export const experimentRolloutRuntimeSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://embodied-arena.chrishongap.chatgpt.site/experiments/rollout-runtime.schema.json",
  title: "WANTED fail-closed synthetic rollout runtime resolution",
  type: "object",
  additionalProperties: false,
  required: [
    "profile",
    "synthetic",
    "analysis_use",
    "compiler_bundle",
    "manifest",
    "runtime_environment",
    "synthetic_unit_id",
  ],
  properties: {
    profile: { const: EXPERIMENT_ROLLOUT_RUNTIME_BUNDLE_PROFILE },
    synthetic: { const: true },
    analysis_use: { const: EXPERIMENT_ROLLOUT_SIMULATOR_ANALYSIS_USE },
    compiler_bundle: experimentRolloutConfigSchema,
    manifest: { $ref: "#/$defs/manifest" },
    runtime_environment: { $ref: "#/$defs/environment" },
    synthetic_unit_id: {
      type: "string",
      pattern:
        "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
    },
  },
  $defs: {
    environment: {
      type: "object",
      additionalProperties: false,
      required: environmentRequired,
      properties: environmentProperties,
    },
    manifest: {
      type: "object",
      additionalProperties: false,
      required: [
        "profile",
        "status",
        "purpose",
        "target_rotator_version",
        "target_analysis_cohort",
        "source_rollout_package_sha256",
        "source_phase_ledger_sha256",
        "source_latest_phase_receipt_sha256",
        "reviewed_phase",
        "activation_phase",
        "activation_phase_epoch",
        "selected_variant",
        "fallback_variant",
        "selected_variant_basis_points",
        "control_basis_points",
        "allocation_algorithm",
        "analysis_use",
        "simulation_analysis_use",
        "environment",
        "rollback_environment",
        "rollback_maximum_minutes",
        "manual_confirmation_required",
        "automatic_application",
        "contains_secrets",
        "manifest_sha256",
      ],
      properties: {
        profile: { const: EXPERIMENT_ROLLOUT_CONFIG_MANIFEST_PROFILE },
        status: { const: "ready_for_manual_activation_review" },
        purpose: { enum: ["production", "conformance_only"] },
        target_rotator_version: { const: "0.37-R37" },
        target_analysis_cohort: { const: "wanted_landing_v1-C9" },
        source_rollout_package_sha256: digest,
        source_phase_ledger_sha256: digest,
        source_latest_phase_receipt_sha256: digest,
        reviewed_phase: { enum: ["canary", "ramp", "majority"] },
        activation_phase: { enum: ["ramp", "majority", "full"] },
        activation_phase_epoch: {
          enum: ["wanted_landing_v1-C9-P2", "wanted_landing_v1-C9-P3", "wanted_landing_v1-C9-P4"],
        },
        selected_variant: { const: "proof" },
        fallback_variant: { const: "control" },
        selected_variant_basis_points: { enum: [2_500, 5_000, 10_000] },
        control_basis_points: { enum: [7_500, 5_000, 0] },
        allocation_algorithm: {
          const: "FNV1a_32(target_analysis_cohort|staged-rollout|unit_id) mod 10000",
        },
        analysis_use: { const: "operational_safety_only_excluded_from_version_selection" },
        simulation_analysis_use: { const: EXPERIMENT_ROLLOUT_SIMULATOR_ANALYSIS_USE },
        environment: { $ref: "#/$defs/environment" },
        rollback_environment: { $ref: "#/$defs/environment" },
        rollback_maximum_minutes: { const: 15 },
        manual_confirmation_required: { const: true },
        automatic_application: { const: false },
        contains_secrets: { const: false },
        manifest_sha256: digest,
      },
    },
  },
} as const;

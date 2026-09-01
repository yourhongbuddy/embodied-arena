import { experimentRolloutPackageSchema } from "./rollout-package-schema.ts";
import {
  EXPERIMENT_ROLLOUT_SIMULATOR_ANALYSIS_USE,
  EXPERIMENT_ROLLOUT_SIMULATOR_BUNDLE_PROFILE,
} from "./rollout-simulator.ts";

export const experimentRolloutSimulatorSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://embodied-arena.chrishongap.chatgpt.site/experiments/rollout-simulator.schema.json",
  title: "WANTED staged rollout synthetic population simulation",
  type: "object",
  additionalProperties: false,
  required: ["profile", "synthetic", "analysis_use", "rollout_package", "synthetic_unit_ids"],
  properties: {
    profile: { const: EXPERIMENT_ROLLOUT_SIMULATOR_BUNDLE_PROFILE },
    synthetic: { const: true },
    analysis_use: { const: EXPERIMENT_ROLLOUT_SIMULATOR_ANALYSIS_USE },
    rollout_package: experimentRolloutPackageSchema,
    synthetic_unit_ids: {
      type: "array",
      minItems: 1,
      maxItems: 10_000,
      uniqueItems: true,
      items: {
        type: "string",
        pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
      },
    },
  },
} as const;

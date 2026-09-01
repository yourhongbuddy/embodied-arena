import { experimentRolloutPackageSchema } from "./rollout-package-schema.ts";
import { experimentRolloutPhaseLedgerSchema } from "./rollout-phase-ledger-schema.ts";
import { EXPERIMENT_ROLLOUT_CONFIG_BUNDLE_PROFILE } from "./rollout-config.ts";

export const experimentRolloutConfigSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://embodied-arena.chrishongap.chatgpt.site/experiments/rollout-config.schema.json",
  title: "WANTED rollout runtime configuration compiler input",
  type: "object",
  additionalProperties: false,
  required: ["profile", "purpose", "rollout_package", "phase_ledger"],
  properties: {
    profile: { const: EXPERIMENT_ROLLOUT_CONFIG_BUNDLE_PROFILE },
    purpose: { enum: ["production", "conformance_only"] },
    rollout_package: experimentRolloutPackageSchema,
    phase_ledger: experimentRolloutPhaseLedgerSchema,
  },
} as const;

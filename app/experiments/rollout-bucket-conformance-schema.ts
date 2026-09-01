import { experimentRolloutConfigSchema } from "./rollout-config-schema.ts";
import { experimentRolloutRuntimeSchema } from "./rollout-runtime-schema.ts";
import { EXPERIMENT_ROLLOUT_BUCKET_CONFORMANCE_BUNDLE_PROFILE } from "./rollout-bucket-conformance.ts";

export const experimentRolloutBucketConformanceSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://embodied-arena.chrishongap.chatgpt.site/experiments/rollout-bucket-conformance.schema.json",
  title: "WANTED exhaustive 10,000-bucket rollout conformance input",
  type: "object",
  additionalProperties: false,
  required: ["profile", "purpose", "compiler_bundle", "manifest"],
  properties: {
    profile: { const: EXPERIMENT_ROLLOUT_BUCKET_CONFORMANCE_BUNDLE_PROFILE },
    purpose: { enum: ["production", "conformance_only"] },
    compiler_bundle: experimentRolloutConfigSchema,
    manifest: experimentRolloutRuntimeSchema.$defs.manifest,
  },
  $defs: {
    environment: experimentRolloutRuntimeSchema.$defs.environment,
  },
} as const;

import {
  EXPERIMENT_ROLLOUT_DISTRIBUTION_ALGORITHM,
  EXPERIMENT_ROLLOUT_DISTRIBUTION_AUDITED_SOURCE_SHA256,
  EXPERIMENT_ROLLOUT_DISTRIBUTION_BUNDLE_PROFILE,
  EXPERIMENT_ROLLOUT_DISTRIBUTION_SAMPLE_SIZE,
} from "./rollout-distribution-audit.ts";

export const experimentRolloutDistributionAuditSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://embodied-arena.chrishongap.chatgpt.site/experiments/rollout-distribution.schema.json",
  title: "WANTED deterministic one-million-unit rollout distribution audit input",
  type: "object",
  additionalProperties: false,
  required: [
    "profile",
    "purpose",
    "generator_profile",
    "audited_source_profile",
    "audited_source_sha256",
    "sample_size",
    "index_start",
    "allocation_algorithm",
  ],
  properties: {
    profile: { const: EXPERIMENT_ROLLOUT_DISTRIBUTION_BUNDLE_PROFILE },
    purpose: { const: "conformance_only" },
    generator_profile: { const: "0.43-RSM1" },
    audited_source_profile: { const: "0.43-RSM1" },
    audited_source_sha256: { const: EXPERIMENT_ROLLOUT_DISTRIBUTION_AUDITED_SOURCE_SHA256 },
    sample_size: { const: EXPERIMENT_ROLLOUT_DISTRIBUTION_SAMPLE_SIZE },
    index_start: { const: 0 },
    allocation_algorithm: { const: EXPERIMENT_ROLLOUT_DISTRIBUTION_ALGORITHM },
  },
} as const;

import {
  EXPERIMENT_ROLLOUT_CANDIDATE_SOURCE_SHA256,
  EXPERIMENT_ROLLOUT_COHORT_SEPARATION_BUNDLE_PROFILE,
  EXPERIMENT_ROLLOUT_PREVIOUS_SOURCE_SHA256,
} from "./rollout-cohort-separation.ts";

export const experimentRolloutCohortSeparationSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://embodied-arena.chrishongap.chatgpt.site/experiments/rollout-cohort-separation.schema.json",
  title: "WANTED source-bound C8-to-C9 cohort separation review input",
  type: "object",
  additionalProperties: false,
  required: [
    "profile", "purpose", "sample_size", "index_start",
    "previous_analysis_cohort", "candidate_analysis_cohort",
    "previous_source_profile", "previous_source_sha256",
    "candidate_source_profile", "candidate_source_sha256",
  ],
  properties: {
    profile: { const: EXPERIMENT_ROLLOUT_COHORT_SEPARATION_BUNDLE_PROFILE },
    purpose: { const: "conformance_only" },
    sample_size: { const: 1_000_000 },
    index_start: { const: 0 },
    previous_analysis_cohort: { const: "wanted_landing_v1-C8" },
    candidate_analysis_cohort: { const: "wanted_landing_v1-C9" },
    previous_source_profile: { const: "0.32-RSDK1" },
    previous_source_sha256: { const: EXPERIMENT_ROLLOUT_PREVIOUS_SOURCE_SHA256 },
    candidate_source_profile: { const: "0.43-RSM1" },
    candidate_source_sha256: { const: EXPERIMENT_ROLLOUT_CANDIDATE_SOURCE_SHA256 },
  },
} as const;

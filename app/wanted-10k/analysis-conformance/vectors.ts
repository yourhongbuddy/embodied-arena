import type { Outcome } from "../calculator/scoring.ts";

export const ANALYSIS_CONFORMANCE_VERSION = "0.2-AC1";

export type AnalysisConformanceRecord = {
  environment: string;
  resident_hours: number;
  disposition: Outcome;
};

export type AnalysisConformanceVector = {
  id: string;
  purpose: string;
  records: AnalysisConformanceRecord[];
  expected:
    | {
        status: "pass";
        wanted_score: number;
        survival_at_10000: number;
        support_at_10000: number;
        horizon_rejections: number;
        retained_at_10000: number;
        ci95?: [number, number];
        bootstrap_valid_fraction?: number;
      }
    | { status: "fail"; error_code: "unsupported_horizon" | "invalid_horizon_censor" };
};

const records = (
  count: number,
  prefix: string,
  resident_hours: number,
  disposition: Outcome,
): AnalysisConformanceRecord[] =>
  Array.from({ length: count }, (_, index) => ({
    environment: `${prefix}-${String(index + 1).padStart(2, "0")}`,
    resident_hours,
    disposition,
  }));

const baselineRecords = [
  ...records(8, "BASE-COMPLETE", 10_000, "completed"),
  ...records(4, "BASE-REJECT", 2_500, "rejected"),
  ...records(12, "BASE-CENSOR", 2_500, "unrelated_censor"),
];

export const analysisConformanceVectors: readonly AnalysisConformanceVector[] = [
  {
    id: "AC1-BASELINE",
    purpose: "Canonical 24-environment WILD example including the deterministic bootstrap interval.",
    records: baselineRecords,
    expected: {
      status: "pass",
      wanted_score: 87.5,
      survival_at_10000: 5 / 6,
      support_at_10000: 8,
      horizon_rejections: 0,
      retained_at_10000: 8,
      ci95: [75, 96.875],
      bootstrap_valid_fraction: 1,
    },
  },
  {
    id: "AC1-HORIZON-REJECTION",
    purpose: "A rejection exactly at 10,000 hours changes post-event S(10K), but not integrated W.",
    records: baselineRecords.map((record, index) =>
      index === 0 ? { ...record, disposition: "rejected" } : { ...record },
    ),
    expected: {
      status: "pass",
      wanted_score: 87.5,
      survival_at_10000: 35 / 48,
      support_at_10000: 8,
      horizon_rejections: 1,
      retained_at_10000: 7,
    },
  },
  {
    id: "AC1-TIED-EVENT-CENSOR",
    purpose: "Events are applied before unrelated censoring at an identical pre-horizon time.",
    records: [
      ...records(5, "TIE-COMPLETE", 10_000, "completed"),
      ...records(5, "TIE-REJECT-EARLY", 2_500, "rejected"),
      ...records(5, "TIE-REJECT", 5_000, "rejected"),
      ...records(5, "TIE-CENSOR", 5_000, "unrelated_censor"),
    ],
    expected: {
      status: "pass",
      wanted_score: 68.75,
      survival_at_10000: 0.5,
      support_at_10000: 5,
      horizon_rejections: 0,
      retained_at_10000: 5,
    },
  },
  {
    id: "AC1-UNSUPPORTED-HORIZON",
    purpose: "Follow-up ends before 10,000 hours while survival remains above zero; extrapolation is forbidden.",
    records: records(20, "UNSUPPORTED", 5_000, "unrelated_censor"),
    expected: { status: "fail", error_code: "unsupported_horizon" },
  },
  {
    id: "AC1-INVALID-HORIZON-CENSOR",
    purpose: "An environment observed through 10,000 hours cannot be encoded as an unrelated censor.",
    records: [
      ...records(19, "INVALID-COMPLETE", 10_000, "completed"),
      ...records(1, "INVALID-CENSOR", 10_000, "unrelated_censor"),
    ],
    expected: { status: "fail", error_code: "invalid_horizon_censor" },
  },
] as const;

export const analysisConformancePack = {
  name: "WANTED Analysis Conformance Vectors",
  version: ANALYSIS_CONFORMANCE_VERSION,
  protocol_version: "0.2",
  analysis_profile_version: "0.2-A2",
  horizon_hours: 10_000,
  numerical_tolerance: 1e-9,
  bootstrap: {
    samples: 10_000,
    seed: 10_000,
    prng: "pcg32_xsh_rr_64_32_seeded_v1",
    percentile_method: "linear_interpolation_index_p_times_n_minus_1",
  },
  pass_condition: "every_vector_matches_expected_status_and_every_numeric_output_within_tolerance",
  vectors: analysisConformanceVectors,
} as const;

const recordSchema = {
  type: "object",
  additionalProperties: false,
  required: ["environment", "resident_hours", "disposition"],
  properties: {
    environment: { type: "string", minLength: 1 },
    resident_hours: { type: "number", minimum: 0, maximum: 10_000 },
    disposition: {
      enum: [
        "completed",
        "unrelated_censor",
        "rejected",
        "safety_termination",
        "developer_withdrawal",
        "consent_privacy_withdrawal",
      ],
    },
  },
};

export const analysisConformanceSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/analysis-conformance-vectors.schema.json",
  title: "WANTED Analysis Conformance Vector Pack",
  type: "object",
  additionalProperties: false,
  required: [
    "name",
    "version",
    "protocol_version",
    "analysis_profile_version",
    "horizon_hours",
    "numerical_tolerance",
    "bootstrap",
    "pass_condition",
    "vectors",
  ],
  properties: {
    name: { const: "WANTED Analysis Conformance Vectors" },
    version: { const: ANALYSIS_CONFORMANCE_VERSION },
    protocol_version: { const: "0.2" },
    analysis_profile_version: { const: "0.2-A2" },
    horizon_hours: { const: 10_000 },
    numerical_tolerance: { const: 1e-9 },
    bootstrap: {
      type: "object",
      additionalProperties: false,
      required: ["samples", "seed", "prng", "percentile_method"],
      properties: {
        samples: { const: 10_000 },
        seed: { const: 10_000 },
        prng: { const: "pcg32_xsh_rr_64_32_seeded_v1" },
        percentile_method: { const: "linear_interpolation_index_p_times_n_minus_1" },
      },
    },
    pass_condition: { type: "string", minLength: 20 },
    vectors: {
      type: "array",
      minItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "purpose", "records", "expected"],
        properties: {
          id: { type: "string", pattern: "^AC1-[A-Z0-9-]+$" },
          purpose: { type: "string", minLength: 20 },
          records: { type: "array", minItems: 1, items: recordSchema },
          expected: {
            oneOf: [
              {
                type: "object",
                additionalProperties: false,
                required: [
                  "status",
                  "wanted_score",
                  "survival_at_10000",
                  "support_at_10000",
                  "horizon_rejections",
                  "retained_at_10000",
                ],
                properties: {
                  status: { const: "pass" },
                  wanted_score: { type: "number", minimum: 0, maximum: 100 },
                  survival_at_10000: { type: "number", minimum: 0, maximum: 1 },
                  support_at_10000: { type: "integer", minimum: 1 },
                  horizon_rejections: { type: "integer", minimum: 0 },
                  retained_at_10000: { type: "integer", minimum: 0 },
                  ci95: {
                    type: "array",
                    minItems: 2,
                    maxItems: 2,
                    prefixItems: [
                      { type: "number", minimum: 0, maximum: 100 },
                      { type: "number", minimum: 0, maximum: 100 },
                    ],
                  },
                  bootstrap_valid_fraction: { type: "number", minimum: 0.95, maximum: 1 },
                },
              },
              {
                type: "object",
                additionalProperties: false,
                required: ["status", "error_code"],
                properties: {
                  status: { const: "fail" },
                  error_code: { enum: ["unsupported_horizon", "invalid_horizon_censor"] },
                },
              },
            ],
          },
        },
      },
    },
  },
} as const;

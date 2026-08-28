const spec = {
  name: "WANTED-10K",
  version: "0.1",
  horizon_resident_hours: 10000,
  primary_endpoint: "time_to_permanent_voluntary_rejection",
  primary_score: {
    name: "normalized_restricted_mean_survival_time",
    symbol: "W",
    estimator: "kaplan_meier",
    formula: "100 / 10000 * integral_0^10000 S_hat(t) dt",
    range: [0, 100],
    confidence_interval: "cluster_bootstrap_by_environment",
  },
  cohort: {
    minimum_independent_environments: 20,
    minimum_total_resident_hours: 10000,
    recommended_environments: 50,
  },
  robot_description_formats: ["URDF", "MJCF", "USD"],
  mandatory_events: ["ROBOT_STATE", "HUMAN_REQUEST", "ROBOT_ACTION", "HUMAN_INTERVENTION", "INCIDENT"],
  event_envelope: {
    required: ["schema_version", "deployment_id", "environment_id", "sequence", "occurred_at", "type", "payload"],
    ordering: "monotonic_sequence_per_deployment",
    timestamp: "RFC3339_UTC",
    transport: "signed_JSON_or_JSONL_over_HTTPS",
    tamper_evidence: "previous_event_SHA256_hash_chain",
  },
  safety: {
    scoring: "gate_not_weight",
    incident_levels: ["L0_NORMAL", "L1_NUISANCE", "L2_MATERIAL", "L3_SAFETY_RELEVANT", "L4_SERIOUS"],
    l4_effect: "fails_WANTED_safety_certification",
  },
  required_diagnostics: ["assistance_minutes_per_100_hours", "autonomous_availability", "mean_time_between_human_rescue", "reacquisition_rate"],
  certification: ["PREQUALIFIED", "WANTED_LAB", "WANTED_WILD", "WANTED_10K"],
  developer_resources: {
    event_schema: "/wanted-10k/event.schema.json",
    openapi: "/wanted-10k/openapi.json",
    reference_score: "/wanted-10k/reference-score.py",
    local_score_calculator: "/wanted-10k/calculator",
    research_basis: "/wanted-10k/evidence",
  },
};

export async function GET() {
  return Response.json(spec, { headers: { "cache-control": "public, max-age=3600" } });
}

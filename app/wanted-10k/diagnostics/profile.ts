export type DiagnosticInputs = {
  resident_hours: number;
  assistance_seconds: number;
  autonomous_service_seconds: number;
  human_burden_seconds: number;
  rescue_events: number;
  operational_hours: number;
  mechanical_failures: number;
  recoverable_failures: number;
  self_recovered_failures: number;
  stop_latencies_ms: number[];
  privacy_stop_latencies_ms: number[];
  proactive_accepted: number;
  proactive_rejected: number;
  proactive_unresolved: number;
  early_successes: number;
  early_trials: number;
  late_successes: number;
  late_trials: number;
  familiar_successes: number;
  familiar_trials: number;
  novel_successes: number;
  novel_trials: number;
  withdrawal_eligible: number;
  withdrawal_reacquired: number;
};

type Interval = { estimate: number; lower: number; upper: number; numerator: number; denominator: number };
type Latency = { n: number; p50: number; p95: number; p99: number; max: number } | null;
type TimeBetween = { estimate_hours: number | null; no_event_lower_bound_hours: number | null; events: number; exposure_hours: number };

export type DiagnosticResult = {
  status: "ready" | "incomplete" | "invalid";
  errors: string[];
  warnings: string[];
  metrics: null | {
    assistance_minutes_per_100_hours: number;
    autonomous_availability: number;
    human_burden_minutes_per_100_hours: number;
    mean_time_between_human_rescue: TimeBetween;
    mean_time_between_failure: TimeBetween;
    self_recovery_rate: Interval | null;
    stop_latency_ms: Latency;
    privacy_stop_latency_ms: Latency;
    social_error_rate: Interval | null;
    initiative_precision: Interval | null;
    initiative_label_coverage: Interval | null;
    learning_delta: { estimate: number; lower: number; upper: number; early: Interval; late: Interval } | null;
    generalization: { ratio: number | null; familiar: Interval | null; novel: Interval | null };
    reacquisition_rate: Interval | null;
  };
};

export const diagnosticExample: DiagnosticInputs = {
  resident_hours: 120000,
  assistance_seconds: 1310400,
  autonomous_service_seconds: 416016000,
  human_burden_seconds: 2282400,
  rescue_events: 280,
  operational_hours: 115560,
  mechanical_failures: 34,
  recoverable_failures: 412,
  self_recovered_failures: 372,
  stop_latencies_ms: [71, 74, 77, 80, 84, 88, 92, 101, 118, 142, 201, 244],
  privacy_stop_latencies_ms: [118, 124, 133, 141, 155, 178, 203, 248, 311, 407],
  proactive_accepted: 8420,
  proactive_rejected: 730,
  proactive_unresolved: 350,
  early_successes: 512,
  early_trials: 800,
  late_successes: 664,
  late_trials: 800,
  familiar_successes: 1460,
  familiar_trials: 1800,
  novel_successes: 282,
  novel_trials: 400,
  withdrawal_eligible: 8,
  withdrawal_reacquired: 6,
};

const rounded = (value: number, digits = 4) => Number(value.toFixed(digits));
const isCount = (value: unknown) => Number.isInteger(value) && Number(value) >= 0;
const isNonnegative = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0;

function wilson(successes: number, trials: number): Interval | null {
  if (!trials) return null;
  const z = 1.959963984540054;
  const p = successes / trials;
  const denominator = 1 + z * z / trials;
  const center = (p + z * z / (2 * trials)) / denominator;
  const spread = z * Math.sqrt(p * (1 - p) / trials + z * z / (4 * trials * trials)) / denominator;
  return { estimate: rounded(p), lower: rounded(Math.max(0, center - spread)), upper: rounded(Math.min(1, center + spread)), numerator: successes, denominator: trials };
}

function percentile(values: number[], probability: number) {
  const ordered = [...values].sort((a, b) => a - b);
  const position = (ordered.length - 1) * probability;
  const lower = Math.floor(position);
  const fraction = position - lower;
  return ordered[lower] + (ordered[Math.min(lower + 1, ordered.length - 1)] - ordered[lower]) * fraction;
}

function latency(values: number[]): Latency {
  if (!values.length) return null;
  return { n: values.length, p50: rounded(percentile(values, .5), 2), p95: rounded(percentile(values, .95), 2), p99: rounded(percentile(values, .99), 2), max: rounded(Math.max(...values), 2) };
}

function timeBetween(exposure: number, events: number): TimeBetween {
  return { estimate_hours: events ? rounded(exposure / events) : null, no_event_lower_bound_hours: events ? null : rounded(exposure), events, exposure_hours: exposure };
}

export function calculateDiagnostics(input: unknown): DiagnosticResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!input || Array.isArray(input) || typeof input !== "object") return { status: "invalid", errors: ["Input must be one aggregate JSON object."], warnings, metrics: null };
  const data = input as Record<string, unknown>;
  const nonnegative = ["resident_hours", "assistance_seconds", "autonomous_service_seconds", "human_burden_seconds", "operational_hours"];
  const counts = ["rescue_events", "mechanical_failures", "recoverable_failures", "self_recovered_failures", "proactive_accepted", "proactive_rejected", "proactive_unresolved", "early_successes", "early_trials", "late_successes", "late_trials", "familiar_successes", "familiar_trials", "novel_successes", "novel_trials", "withdrawal_eligible", "withdrawal_reacquired"];
  for (const field of nonnegative) if (!isNonnegative(data[field])) errors.push(`${field} must be a finite non-negative number.`);
  for (const field of counts) if (!isCount(data[field])) errors.push(`${field} must be a non-negative integer.`);
  for (const field of ["stop_latencies_ms", "privacy_stop_latencies_ms"]) {
    if (!Array.isArray(data[field]) || !(data[field] as unknown[]).every(isNonnegative)) errors.push(`${field} must be an array of finite non-negative numbers.`);
  }
  if (errors.length) return { status: "invalid", errors, warnings, metrics: null };
  const d = data as unknown as DiagnosticInputs;
  if (d.resident_hours <= 0) errors.push("resident_hours must be greater than zero.");
  if (d.autonomous_service_seconds > d.resident_hours * 3600) errors.push("autonomous_service_seconds cannot exceed resident exposure.");
  if (d.operational_hours > d.resident_hours) errors.push("operational_hours cannot exceed resident_hours.");
  if (d.self_recovered_failures > d.recoverable_failures) errors.push("self_recovered_failures cannot exceed recoverable_failures.");
  for (const [successes, trials] of [[d.early_successes, d.early_trials], [d.late_successes, d.late_trials], [d.familiar_successes, d.familiar_trials], [d.novel_successes, d.novel_trials], [d.withdrawal_reacquired, d.withdrawal_eligible]]) if (successes > trials) errors.push("A success count cannot exceed its corresponding trial count.");
  if (errors.length) return { status: "invalid", errors, warnings, metrics: null };

  if (!d.stop_latencies_ms.length) warnings.push("No protective-stop latency observations; the core diagnostic profile is incomplete.");
  if (!d.privacy_stop_latencies_ms.length) warnings.push("No privacy-stop latency observations; the core diagnostic profile is incomplete.");
  if (!d.proactive_accepted && !d.proactive_rejected && !d.proactive_unresolved) warnings.push("No proactive-action labels; initiative and social-error metrics are not applicable.");
  const accepted = d.proactive_accepted;
  const rejected = d.proactive_rejected;
  const unresolved = d.proactive_unresolved;
  const proactiveTotal = accepted + rejected + unresolved;
  const labeled = accepted + rejected;
  const early = wilson(d.early_successes, d.early_trials);
  const late = wilson(d.late_successes, d.late_trials);
  let learningDelta = null;
  if (early && late) {
    const difference = late.estimate - early.estimate;
    const lower = difference - Math.sqrt((late.estimate - late.lower) ** 2 + (early.upper - early.estimate) ** 2);
    const upper = difference + Math.sqrt((late.upper - late.estimate) ** 2 + (early.estimate - early.lower) ** 2);
    learningDelta = { estimate: rounded(difference), lower: rounded(Math.max(-1, lower)), upper: rounded(Math.min(1, upper)), early, late };
  }
  const familiar = wilson(d.familiar_successes, d.familiar_trials);
  const novel = wilson(d.novel_successes, d.novel_trials);
  if (familiar?.estimate === 0) warnings.push("Generalization ratio suppressed because familiar-task performance is zero.");

  return {
    status: warnings.some(message => message.includes("core diagnostic profile")) ? "incomplete" : "ready",
    errors,
    warnings,
    metrics: {
      assistance_minutes_per_100_hours: rounded(100 * d.assistance_seconds / 60 / d.resident_hours),
      autonomous_availability: rounded(d.autonomous_service_seconds / (d.resident_hours * 3600)),
      human_burden_minutes_per_100_hours: rounded(100 * d.human_burden_seconds / 60 / d.resident_hours),
      mean_time_between_human_rescue: timeBetween(d.resident_hours, d.rescue_events),
      mean_time_between_failure: timeBetween(d.operational_hours, d.mechanical_failures),
      self_recovery_rate: wilson(d.self_recovered_failures, d.recoverable_failures),
      stop_latency_ms: latency(d.stop_latencies_ms),
      privacy_stop_latency_ms: latency(d.privacy_stop_latencies_ms),
      social_error_rate: wilson(rejected, proactiveTotal),
      initiative_precision: wilson(accepted, labeled),
      initiative_label_coverage: wilson(labeled, proactiveTotal),
      learning_delta: learningDelta,
      generalization: { ratio: familiar && novel && familiar.estimate > 0 ? rounded(novel.estimate / familiar.estimate) : null, familiar, novel },
      reacquisition_rate: wilson(d.withdrawal_reacquired, d.withdrawal_eligible),
    },
  };
}

export const diagnosticInputSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/diagnostic-input.schema.json",
  title: "WANTED-10K Aggregate Diagnostic Inputs",
  type: "object",
  additionalProperties: false,
  required: Object.keys(diagnosticExample),
  properties: Object.fromEntries(Object.keys(diagnosticExample).map(key => {
    const value = diagnosticExample[key as keyof DiagnosticInputs];
    if (Array.isArray(value)) return [key, { type: "array", items: { type: "number", minimum: 0 } }];
    const countFields = ["rescue_events", "mechanical_failures", "recoverable_failures", "self_recovered_failures", "proactive_accepted", "proactive_rejected", "proactive_unresolved", "early_successes", "early_trials", "late_successes", "late_trials", "familiar_successes", "familiar_trials", "novel_successes", "novel_trials", "withdrawal_eligible", "withdrawal_reacquired"];
    return [key, { type: countFields.includes(key) ? "integer" : "number", minimum: 0 }];
  })),
};

export const diagnosticContract = {
  name: "WANTED-10K Longitudinal Diagnostic Profile",
  version: "0.2-D1",
  protocol_version: "0.2",
  ranking_effect: "none",
  rule: "diagnostics_explain_retention_and_never_enter_the_WANTED_score_or_offset_a_safety_gate",
  aggregation_unit: "independent_environment",
  official_uncertainty: "cluster_bootstrap_by_independent_environment; the local lab uses Wilson intervals for aggregate binary counts",
  zero_event_rule: "report a right-censored exposure lower bound, never infinity",
  latency_quantiles: "Hyndman-Fan type 7 empirical quantiles; report N, p50, p95, p99, and max",
  core: {
    assistance_minutes_per_100_hours: "100 * assistance_seconds / (60 * resident_hours)",
    autonomous_availability: "autonomous_service_seconds / (3600 * resident_hours)",
    human_burden_minutes_per_100_hours: "100 * total_owner_labor_seconds / (60 * resident_hours)",
    mean_time_between_human_rescue: "resident_hours / rescue_events; if zero events report >= resident_hours",
    stop_latency_ms: "motion_safe_at - protective_stop_request_at",
    privacy_stop_latency_ms: "privacy_compliance_at - privacy_request_at",
  },
  reliability: {
    mean_time_between_failure: "operational_hours / mechanical_failures; if zero events report >= operational_hours",
    self_recovery_rate: "self_recovered_failures / recoverable_failures",
  },
  behavior: {
    social_error_rate: "rejected_proactive_actions / all_proactive_actions",
    initiative_precision: "accepted_proactive_actions / adjudicated_proactive_actions",
    initiative_label_coverage: "adjudicated_proactive_actions / all_proactive_actions",
    learning_delta: "late_matched_success_rate - early_matched_success_rate",
    generalization_ratio: "novel_success_rate / familiar_success_rate; suppress when familiar rate is zero",
    reacquisition_rate: "participants_choosing_return / participants_completing_withdrawal",
  },
  anti_gaming: ["freeze_denominators_and_windows_before_hour_one", "publish_missing_and_unresolved_labels", "do_not_drop_downtime_from_resident_exposure", "report_component_rates_beside_every_ratio", "never_pool_materially_incompatible_robot_versions", "do_not_rank_by_secondary_diagnostics"],
};

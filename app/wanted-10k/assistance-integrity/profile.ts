export const ASSISTANCE_INTEGRITY_VERSION = "0.2-I1";
export const ASSISTANCE_TARGETS = ["WANTED_LAB", "WANTED_WILD", "WANTED_10K"] as const;
export const ASSISTANCE_MODES = ["onsite_rescue", "remote_guidance", "teleoperation", "maintenance", "researcher_contact"] as const;
export const ASSISTANCE_REASONS = ["task_recovery", "safety_stop_recovery", "preventive_maintenance", "software_support", "participant_request", "research_protocol"] as const;
export type AssistanceTarget = typeof ASSISTANCE_TARGETS[number];
export type AssistanceMode = typeof ASSISTANCE_MODES[number];

export type AssistanceEnvironment = {
  environment_id_sha256: string;
  activated_at: string;
  terminal_at: string;
  resident_seconds: number;
  exposure_record_sha256: string;
};

export type AssistanceIntervention = {
  environment_id_sha256: string;
  intervention_id: string;
  mode: AssistanceMode;
  actor_role: "participant" | "operator" | "technician" | "researcher";
  reason: typeof ASSISTANCE_REASONS[number];
  started_at: string;
  ended_at: string;
  person_count: number;
  resolution: "restored_service" | "aborted_task" | "removed" | "escalated";
  linked_telemetry_event_sha256: string;
  support_session_sha256: string;
  protocol_deviation: false;
};

export type ModeProfile = { mode: AssistanceMode; events: number; person_hours: number };
export type AssistanceClaim = {
  environment_count: number;
  intervention_count: number;
  resident_hours: number;
  human_person_hours: number;
  assisted_clock_hours: number;
  assistance_minutes_per_100_hours: number;
  assistance_ci95_lower: number;
  assistance_ci95_upper: number;
  assisted_exposure_fraction: number;
  participant_labor_minutes_per_100_hours: number;
  teleoperation_minutes_per_100_hours: number;
  maintenance_minutes_per_100_hours: number;
  researcher_contact_minutes_per_100_hours: number;
  rescue_events: number;
  mean_time_between_human_rescue_hours: number | null;
  no_rescue_lower_bound_hours: number | null;
  mode_profiles: ModeProfile[];
};

export type AssistanceInput = {
  profile_version: typeof ASSISTANCE_INTEGRITY_VERSION;
  target_certification: AssistanceTarget;
  protocol: {
    inclusion_rule: "every_signed_HUMAN_INTERVENTION_event";
    resident_time_source: "passing_exposure_ledger_0.2-X1";
    assisted_clock_aggregation: "interval_union_within_environment";
    person_time_aggregation: "elapsed_seconds_times_person_count";
    rescue_definition: "onsite_remote_or_teleoperation_for_task_or_safety_recovery";
    overlapping_person_time_permitted: true;
    out_of_band_support_permitted: false;
    bootstrap_unit: "independent_environment";
    bootstrap_samples: 10000;
    bootstrap_seed: 3107;
    bootstrap_prng: "pcg32_xsh_rr_64_32_seeded_v1";
  };
  declared_environment_count: number;
  declared_intervention_count: number;
  out_of_band_support_sessions: 0;
  environments: AssistanceEnvironment[];
  interventions: AssistanceIntervention[];
  claimed: AssistanceClaim;
  upstream_bindings: { exposure_integrity_sha256: string; telemetry_authenticity_sha256: string; preregistration_sha256: string; robot_policy_sha256: string };
  evidence: { controlled_intervention_register_uri: string; controlled_intervention_register_sha256: string; public_aggregate_only: true };
  assessor: { name: string; organization: string; independent_of_sponsor: true; attested: true; signed_at: string };
};

export type AssistanceGate = { id: string; label: string; passed: boolean; detail: string };
export type AssistanceSummary = AssistanceClaim & { profile_version: typeof ASSISTANCE_INTEGRITY_VERSION; status: "passed"; target_certification: AssistanceTarget };
export type AssistanceResult = { status: "passed" | "failed" | "invalid"; errors: string[]; gates: AssistanceGate[]; summary: AssistanceSummary | null };

const digest = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value) && !/^([a-f0-9])\1{63}$/.test(value);
const https = (value: unknown) => typeof value === "string" && /^https:\/\//.test(value);
const utc = (value: unknown) => typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value) && Number.isFinite(Date.parse(value));
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const close = (a: unknown, b: unknown) => finite(a) && finite(b) && Math.abs(a - b) <= 1e-8;
const round = (value: number) => Math.round((value + Number.EPSILON) * 1e8) / 1e8;
const hash = (prefix: string) => `${prefix}${"0123456789abcdef".repeat(4)}`.slice(0, 64);
const rescue = (record: AssistanceIntervention) => ["onsite_rescue", "remote_guidance", "teleoperation"].includes(record.mode) && ["task_recovery", "safety_stop_recovery"].includes(record.reason);

function pcg32(seed:number,sequence=54){const one=BigInt(1),mask=(one<<BigInt(64))-one;let state=BigInt(0);const increment=((BigInt(sequence)<<one)|one)&mask;const next=()=>{const previous=state;state=(previous*BigInt("6364136223846793005")+increment)&mask;const shifted=Number((((previous>>BigInt(18))^previous)>>BigInt(27))&BigInt("4294967295"))>>>0;const rotation=Number(previous>>BigInt(59))&31;return((shifted>>>rotation)|(shifted<<((-rotation)&31)))>>>0};next();state=(state+(BigInt(seed)&mask))&mask;next();return next}

function quantile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b), h = (sorted.length - 1) * p, lo = Math.floor(h), hi = Math.ceil(h);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (h - lo);
}

function intervalUnionSeconds(records: AssistanceIntervention[]) {
  const intervals = records.map(record => [Date.parse(record.started_at), Date.parse(record.ended_at)] as const).sort((a, b) => a[0] - b[0]);
  let total = 0, start = -1, end = -1;
  for (const [nextStart, nextEnd] of intervals) {
    if (nextStart > end) { if (start >= 0) total += end - start; start = nextStart; end = nextEnd; }
    else end = Math.max(end, nextEnd);
  }
  if (start >= 0) total += end - start;
  return total / 1000;
}

function assistanceRates(environments: AssistanceEnvironment[], records: AssistanceIntervention[]) {
  return environments.map(environment => {
    const matches = records.filter(record => record.environment_id_sha256 === environment.environment_id_sha256);
    const personSeconds = matches.reduce((sum, record) => sum + (Date.parse(record.ended_at) - Date.parse(record.started_at)) / 1000 * record.person_count, 0);
    return 100 * personSeconds / 60 / (environment.resident_seconds / 3600);
  });
}

function bootstrapAssistance(rates: number[]) {
  if (!rates.length) return { lower: 0, upper: 0 };
  const random = pcg32(3107), draws: number[] = [];
  for (let draw = 0; draw < 10000; draw++) { let sum = 0; for (let i = 0; i < rates.length; i++) sum += rates[Number((BigInt(random())*BigInt(rates.length))>>BigInt(32))]; draws.push(sum / rates.length); }
  return { lower: round(quantile(draws, .025)), upper: round(quantile(draws, .975)) };
}

export function reproduceAssistance(environments: AssistanceEnvironment[], interventions: AssistanceIntervention[]): AssistanceClaim {
  const residentSeconds = environments.reduce((sum, environment) => sum + environment.resident_seconds, 0);
  const personSeconds = interventions.reduce((sum, record) => sum + (Date.parse(record.ended_at) - Date.parse(record.started_at)) / 1000 * record.person_count, 0);
  const assistedSeconds = environments.reduce((sum, environment) => sum + intervalUnionSeconds(interventions.filter(record => record.environment_id_sha256 === environment.environment_id_sha256)), 0);
  const rates = assistanceRates(environments, interventions), assistance = rates.reduce((sum, value) => sum + value, 0) / Math.max(1, rates.length), ci = bootstrapAssistance(rates);
  const rate = (records: AssistanceIntervention[]) => environments.reduce((sum, environment) => {
    const seconds = records.filter(record => record.environment_id_sha256 === environment.environment_id_sha256).reduce((subtotal, record) => subtotal + (Date.parse(record.ended_at) - Date.parse(record.started_at)) / 1000 * record.person_count, 0);
    return sum + 100 * seconds / 60 / (environment.resident_seconds / 3600);
  }, 0) / Math.max(1, environments.length);
  const rescues = interventions.filter(rescue).length;
  return {
    environment_count: environments.length,
    intervention_count: interventions.length,
    resident_hours: round(residentSeconds / 3600),
    human_person_hours: round(personSeconds / 3600),
    assisted_clock_hours: round(assistedSeconds / 3600),
    assistance_minutes_per_100_hours: round(assistance),
    assistance_ci95_lower: ci.lower,
    assistance_ci95_upper: ci.upper,
    assisted_exposure_fraction: round(residentSeconds ? assistedSeconds / residentSeconds : 0),
    participant_labor_minutes_per_100_hours: round(rate(interventions.filter(record => record.actor_role === "participant"))),
    teleoperation_minutes_per_100_hours: round(rate(interventions.filter(record => record.mode === "teleoperation"))),
    maintenance_minutes_per_100_hours: round(rate(interventions.filter(record => record.mode === "maintenance"))),
    researcher_contact_minutes_per_100_hours: round(rate(interventions.filter(record => record.mode === "researcher_contact"))),
    rescue_events: rescues,
    mean_time_between_human_rescue_hours: rescues ? round(residentSeconds / 3600 / rescues) : null,
    no_rescue_lower_bound_hours: rescues ? null : round(residentSeconds / 3600),
    mode_profiles: ASSISTANCE_MODES.map(mode => { const matching = interventions.filter(record => record.mode === mode); return { mode, events: matching.length, person_hours: round(matching.reduce((sum, record) => sum + (Date.parse(record.ended_at) - Date.parse(record.started_at)) / 1000 * record.person_count, 0) / 3600) }; }),
  };
}

const gate = (id: string, label: string, passed: boolean, ok: string, fix: string): AssistanceGate => ({ id, label, passed, detail: passed ? ok : fix });
const sameModeProfiles = (a: unknown, b: ModeProfile[]) => Array.isArray(a) && a.length === b.length && a.every((row, index) => { const item = row as Record<string, unknown>, expected = b[index]; return item.mode === expected.mode && item.events === expected.events && close(item.person_hours, expected.person_hours); });

export function assessAssistance(value: unknown): AssistanceResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { status: "invalid", errors: ["Assistance manifest must be one JSON object."], gates: [], summary: null };
  const input = value as Partial<AssistanceInput>, errors: string[] = [];
  if (input.profile_version !== ASSISTANCE_INTEGRITY_VERSION) errors.push(`profile_version must be ${ASSISTANCE_INTEGRITY_VERSION}.`);
  if (!ASSISTANCE_TARGETS.includes(input.target_certification as AssistanceTarget)) errors.push("target_certification is invalid.");
  if (!Array.isArray(input.environments) || !input.environments.length) errors.push("At least one environment is required.");
  if (!Array.isArray(input.interventions)) errors.push("interventions must be an array, including an empty array when no help occurred.");
  if (errors.length) return { status: "invalid", errors, gates: [], summary: null };
  const target = input.target_certification as AssistanceTarget, protocol = (input.protocol || {}) as AssistanceInput["protocol"], environments = input.environments as AssistanceEnvironment[], records = input.interventions as AssistanceIntervention[], claimed = (input.claimed || {}) as AssistanceClaim, bindings = (input.upstream_bindings || {}) as AssistanceInput["upstream_bindings"], evidence = (input.evidence || {}) as AssistanceInput["evidence"], assessor = (input.assessor || {}) as AssistanceInput["assessor"];
  const envIds = environments.map(environment => environment.environment_id_sha256), recordIds = records.map(record => record.intervention_id);
  const completePass = input.declared_environment_count === environments.length && input.declared_intervention_count === records.length && input.out_of_band_support_sessions === 0 && new Set(envIds).size === envIds.length && new Set(recordIds).size === recordIds.length;
  const protocolPass = protocol.inclusion_rule === "every_signed_HUMAN_INTERVENTION_event" && protocol.resident_time_source === "passing_exposure_ledger_0.2-X1" && protocol.assisted_clock_aggregation === "interval_union_within_environment" && protocol.person_time_aggregation === "elapsed_seconds_times_person_count" && protocol.rescue_definition === "onsite_remote_or_teleoperation_for_task_or_safety_recovery" && protocol.overlapping_person_time_permitted === true && protocol.out_of_band_support_permitted === false && protocol.bootstrap_unit === "independent_environment" && protocol.bootstrap_samples === 10000 && protocol.bootstrap_seed === 3107 && protocol.bootstrap_prng === "pcg32_xsh_rr_64_32_seeded_v1";
  const environmentPass = environments.every(environment => digest(environment.environment_id_sha256) && utc(environment.activated_at) && utc(environment.terminal_at) && Date.parse(environment.terminal_at) > Date.parse(environment.activated_at) && Number.isInteger(environment.resident_seconds) && environment.resident_seconds > 0 && close(environment.resident_seconds, (Date.parse(environment.terminal_at) - Date.parse(environment.activated_at)) / 1000) && environment.resident_seconds <= 36000000 && digest(environment.exposure_record_sha256));
  const recordPass = records.every(record => envIds.includes(record.environment_id_sha256) && typeof record.intervention_id === "string" && record.intervention_id.length > 0 && ASSISTANCE_MODES.includes(record.mode) && ["participant", "operator", "technician", "researcher"].includes(record.actor_role) && ASSISTANCE_REASONS.includes(record.reason) && utc(record.started_at) && utc(record.ended_at) && Date.parse(record.ended_at) > Date.parse(record.started_at) && Number.isInteger(record.person_count) && record.person_count >= 1 && ["restored_service", "aborted_task", "removed", "escalated"].includes(record.resolution) && digest(record.linked_telemetry_event_sha256) && digest(record.support_session_sha256) && record.protocol_deviation === false && (() => { const env = environments.find(item => item.environment_id_sha256 === record.environment_id_sha256)!; return Date.parse(record.started_at) >= Date.parse(env.activated_at) && Date.parse(record.ended_at) <= Date.parse(env.terminal_at); })());
  const targetHours = environments.reduce((sum, environment) => sum + environment.resident_seconds / 3600, 0), targetPass = target === "WANTED_LAB" ? environments.length >= 1 && targetHours >= 100 : target === "WANTED_WILD" ? environments.length >= 20 && targetHours >= 10000 : environments.length >= 1 && targetHours >= 10000 && environments.some(environment => environment.resident_seconds === 36000000);
  const reproduced = environmentPass && recordPass ? reproduceAssistance(environments, records) : null;
  const reproductionPass = Boolean(reproduced && claimed.environment_count === reproduced.environment_count && claimed.intervention_count === reproduced.intervention_count && close(claimed.resident_hours, reproduced.resident_hours) && close(claimed.human_person_hours, reproduced.human_person_hours) && close(claimed.assisted_clock_hours, reproduced.assisted_clock_hours) && close(claimed.assistance_minutes_per_100_hours, reproduced.assistance_minutes_per_100_hours) && close(claimed.assistance_ci95_lower, reproduced.assistance_ci95_lower) && close(claimed.assistance_ci95_upper, reproduced.assistance_ci95_upper) && claimed.assistance_ci95_lower <= claimed.assistance_minutes_per_100_hours && claimed.assistance_minutes_per_100_hours <= claimed.assistance_ci95_upper && close(claimed.assisted_exposure_fraction, reproduced.assisted_exposure_fraction) && close(claimed.participant_labor_minutes_per_100_hours, reproduced.participant_labor_minutes_per_100_hours) && close(claimed.teleoperation_minutes_per_100_hours, reproduced.teleoperation_minutes_per_100_hours) && close(claimed.maintenance_minutes_per_100_hours, reproduced.maintenance_minutes_per_100_hours) && close(claimed.researcher_contact_minutes_per_100_hours, reproduced.researcher_contact_minutes_per_100_hours) && claimed.rescue_events === reproduced.rescue_events && ((claimed.mean_time_between_human_rescue_hours === null && reproduced.mean_time_between_human_rescue_hours === null) || close(claimed.mean_time_between_human_rescue_hours, reproduced.mean_time_between_human_rescue_hours)) && ((claimed.no_rescue_lower_bound_hours === null && reproduced.no_rescue_lower_bound_hours === null) || close(claimed.no_rescue_lower_bound_hours, reproduced.no_rescue_lower_bound_hours)) && sameModeProfiles(claimed.mode_profiles, reproduced.mode_profiles));
  const assurancePass = [bindings.exposure_integrity_sha256, bindings.telemetry_authenticity_sha256, bindings.preregistration_sha256, bindings.robot_policy_sha256].every(digest) && https(evidence.controlled_intervention_register_uri) && digest(evidence.controlled_intervention_register_sha256) && evidence.public_aggregate_only === true && typeof assessor.name === "string" && assessor.name.length > 0 && typeof assessor.organization === "string" && assessor.organization.length > 0 && assessor.independent_of_sponsor === true && assessor.attested === true && utc(assessor.signed_at);
  const gates = [
    gate("I1", "COMPLETE SUPPORT SURFACE", completePass, "Every declared environment and signed intervention is present once; out-of-band support is zero.", "Include every environment and intervention exactly once and disclose any out-of-band support."),
    gate("I2", "CANONICAL ACCOUNTING", protocolPass, "Clock time, person time, rescue classification, overlap, and bootstrap rules are frozen.", "Use the exact 0.2-I1 inclusion, time, rescue, and deterministic bootstrap rules."),
    gate("I3", "BOUND RESIDENT CLOCK", environmentPass, "Every environment interval reproduces positive resident seconds from a bound exposure record.", "Repair environment timestamps, resident seconds, horizon caps, or exposure-record digests."),
    gate("I4", "VALID INTERVENTION EPISODES", recordPass, "Every episode has a valid taxonomy, closed interval, actor count, resolution, and telemetry binding.", "Repair invalid, out-of-window, duplicated, unresolved, or unbound intervention episodes."),
    gate("I5", "TARGET COVERAGE", targetPass, "Environment count and resident exposure satisfy the selected certification target.", "Meet the target-specific environment and resident-hour threshold."),
    gate("I6", "REPRODUCED BURDEN", reproductionPass, "Person-time burden, interval-union exposure, mode rates, rescue frequency, and PCG32 uncertainty reproduce exactly.", "Replace claimed assistance outputs with the canonical environment-level reproduction."),
    gate("I7", "BOUND INDEPENDENT AUDIT", assurancePass, "Exposure, telemetry, preregistration, policy, controlled register, and independent assessment are bound.", "Provide all non-placeholder upstream and evidence digests plus independent attestation."),
  ];
  const status = gates.every(item => item.passed) ? "passed" : "failed";
  return { status, errors: [], gates, summary: reproduced ? { profile_version: ASSISTANCE_INTEGRITY_VERSION, status: "passed", target_certification: target, ...reproduced } : null };
}

const isoAfter = (start: string, seconds: number) => new Date(Date.parse(start) + seconds * 1000).toISOString().replace(".000Z", "Z");
function buildTemplate(target: AssistanceTarget): AssistanceInput {
  const count = target === "WANTED_WILD" ? 24 : 1, hours = target === "WANTED_LAB" ? 100 : target === "WANTED_WILD" ? 5000 : 10000, start = "2026-01-02T00:00:00Z";
  const environments: AssistanceEnvironment[] = Array.from({ length: count }, (_, index) => ({ environment_id_sha256: hash(`${(index + 11).toString(16)}a`), activated_at: start, terminal_at: isoAfter(start, hours * 3600), resident_seconds: hours * 3600, exposure_record_sha256: hash(`${(index + 71).toString(16)}e`) }));
  const records: AssistanceIntervention[] = environments.flatMap((environment, index) => {
    const at = (fraction: number, duration: number) => ({ started_at: isoAfter(start, Math.floor(hours * 3600 * fraction)), ended_at: isoAfter(start, Math.floor(hours * 3600 * fraction) + duration) });
    return [
      { environment_id_sha256: environment.environment_id_sha256, intervention_id: `${target.toLowerCase()}-${index}-guidance`, mode: "remote_guidance", actor_role: "participant", reason: "task_recovery", ...at(.1, 120 + index), person_count: 1, resolution: "restored_service", linked_telemetry_event_sha256: hash(`${index.toString(16)}1a`), support_session_sha256: hash(`${index.toString(16)}1b`), protocol_deviation: false },
      { environment_id_sha256: environment.environment_id_sha256, intervention_id: `${target.toLowerCase()}-${index}-teleop`, mode: "teleoperation", actor_role: "operator", reason: "safety_stop_recovery", ...at(.5, 300 + 2 * index), person_count: 1, resolution: "restored_service", linked_telemetry_event_sha256: hash(`${index.toString(16)}2a`), support_session_sha256: hash(`${index.toString(16)}2b`), protocol_deviation: false },
      { environment_id_sha256: environment.environment_id_sha256, intervention_id: `${target.toLowerCase()}-${index}-maintenance`, mode: "maintenance", actor_role: "technician", reason: "preventive_maintenance", ...at(.8, 600 + 3 * index), person_count: index % 5 === 0 ? 2 : 1, resolution: "restored_service", linked_telemetry_event_sha256: hash(`${index.toString(16)}3a`), support_session_sha256: hash(`${index.toString(16)}3b`), protocol_deviation: false },
    ] as AssistanceIntervention[];
  });
  return { profile_version: ASSISTANCE_INTEGRITY_VERSION, target_certification: target, protocol: { inclusion_rule: "every_signed_HUMAN_INTERVENTION_event", resident_time_source: "passing_exposure_ledger_0.2-X1", assisted_clock_aggregation: "interval_union_within_environment", person_time_aggregation: "elapsed_seconds_times_person_count", rescue_definition: "onsite_remote_or_teleoperation_for_task_or_safety_recovery", overlapping_person_time_permitted: true, out_of_band_support_permitted: false, bootstrap_unit: "independent_environment", bootstrap_samples: 10000, bootstrap_seed: 3107, bootstrap_prng: "pcg32_xsh_rr_64_32_seeded_v1" }, declared_environment_count: environments.length, declared_intervention_count: records.length, out_of_band_support_sessions: 0, environments, interventions: records, claimed: reproduceAssistance(environments, records), upstream_bindings: { exposure_integrity_sha256: hash("eb"), telemetry_authenticity_sha256: hash("9b"), preregistration_sha256: hash("b"), robot_policy_sha256: hash("3c") }, evidence: { controlled_intervention_register_uri: "https://example.org/wanted-intervention-register.json", controlled_intervention_register_sha256: hash("c4"), public_aggregate_only: true }, assessor: { name: "Synthetic Assistance Auditor", organization: "Independent Example Assurance", independent_of_sponsor: true, attested: true, signed_at: "2028-04-01T00:00:00Z" } };
}

export const assistanceTemplateFor = buildTemplate;
export const assistanceTemplate = buildTemplate("WANTED_WILD");

const d = { type: "string", pattern: "^[a-f0-9]{64}$" };
const date = { type: "string", format: "date-time", pattern: "Z$" };
const metric = { type: "number", minimum: 0 };
export const assistanceSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/assistance-integrity.schema.json", title: "WANTED Assistance Integrity Manifest", type: "object", additionalProperties: false,
  required: ["profile_version", "target_certification", "protocol", "declared_environment_count", "declared_intervention_count", "out_of_band_support_sessions", "environments", "interventions", "claimed", "upstream_bindings", "evidence", "assessor"],
  properties: {
    profile_version: { const: ASSISTANCE_INTEGRITY_VERSION }, target_certification: { enum: ASSISTANCE_TARGETS },
    protocol: { type: "object", additionalProperties: false, required: ["inclusion_rule", "resident_time_source", "assisted_clock_aggregation", "person_time_aggregation", "rescue_definition", "overlapping_person_time_permitted", "out_of_band_support_permitted", "bootstrap_unit", "bootstrap_samples", "bootstrap_seed", "bootstrap_prng"], properties: { inclusion_rule: { const: "every_signed_HUMAN_INTERVENTION_event" }, resident_time_source: { const: "passing_exposure_ledger_0.2-X1" }, assisted_clock_aggregation: { const: "interval_union_within_environment" }, person_time_aggregation: { const: "elapsed_seconds_times_person_count" }, rescue_definition: { const: "onsite_remote_or_teleoperation_for_task_or_safety_recovery" }, overlapping_person_time_permitted: { const: true }, out_of_band_support_permitted: { const: false }, bootstrap_unit: { const: "independent_environment" }, bootstrap_samples: { const: 10000 }, bootstrap_seed: { const: 3107 }, bootstrap_prng: { const: "pcg32_xsh_rr_64_32_seeded_v1" } } },
    declared_environment_count: { type: "integer", minimum: 1 }, declared_intervention_count: { type: "integer", minimum: 0 }, out_of_band_support_sessions: { const: 0 },
    environments: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, required: ["environment_id_sha256", "activated_at", "terminal_at", "resident_seconds", "exposure_record_sha256"], properties: { environment_id_sha256: d, activated_at: date, terminal_at: date, resident_seconds: { type: "integer", minimum: 1, maximum: 36000000 }, exposure_record_sha256: d } } },
    interventions: { type: "array", items: { type: "object", additionalProperties: false, required: ["environment_id_sha256", "intervention_id", "mode", "actor_role", "reason", "started_at", "ended_at", "person_count", "resolution", "linked_telemetry_event_sha256", "support_session_sha256", "protocol_deviation"], properties: { environment_id_sha256: d, intervention_id: { type: "string", minLength: 1 }, mode: { enum: ASSISTANCE_MODES }, actor_role: { enum: ["participant", "operator", "technician", "researcher"] }, reason: { enum: ASSISTANCE_REASONS }, started_at: date, ended_at: date, person_count: { type: "integer", minimum: 1 }, resolution: { enum: ["restored_service", "aborted_task", "removed", "escalated"] }, linked_telemetry_event_sha256: d, support_session_sha256: d, protocol_deviation: { const: false } } } },
    claimed: { type: "object", additionalProperties: false, required: ["environment_count", "intervention_count", "resident_hours", "human_person_hours", "assisted_clock_hours", "assistance_minutes_per_100_hours", "assistance_ci95_lower", "assistance_ci95_upper", "assisted_exposure_fraction", "participant_labor_minutes_per_100_hours", "teleoperation_minutes_per_100_hours", "maintenance_minutes_per_100_hours", "researcher_contact_minutes_per_100_hours", "rescue_events", "mean_time_between_human_rescue_hours", "no_rescue_lower_bound_hours", "mode_profiles"], properties: { environment_count: { type: "integer", minimum: 1 }, intervention_count: { type: "integer", minimum: 0 }, resident_hours: metric, human_person_hours: metric, assisted_clock_hours: metric, assistance_minutes_per_100_hours: metric, assistance_ci95_lower: metric, assistance_ci95_upper: metric, assisted_exposure_fraction: { type: "number", minimum: 0, maximum: 1 }, participant_labor_minutes_per_100_hours: metric, teleoperation_minutes_per_100_hours: metric, maintenance_minutes_per_100_hours: metric, researcher_contact_minutes_per_100_hours: metric, rescue_events: { type: "integer", minimum: 0 }, mean_time_between_human_rescue_hours: { type: ["number", "null"], minimum: 0 }, no_rescue_lower_bound_hours: { type: ["number", "null"], minimum: 0 }, mode_profiles: { type: "array", minItems: 5, maxItems: 5, items: { type: "object", additionalProperties: false, required: ["mode", "events", "person_hours"], properties: { mode: { enum: ASSISTANCE_MODES }, events: { type: "integer", minimum: 0 }, person_hours: metric } } } } },
    upstream_bindings: { type: "object", additionalProperties: false, required: ["exposure_integrity_sha256", "telemetry_authenticity_sha256", "preregistration_sha256", "robot_policy_sha256"], properties: { exposure_integrity_sha256: d, telemetry_authenticity_sha256: d, preregistration_sha256: d, robot_policy_sha256: d } },
    evidence: { type: "object", additionalProperties: false, required: ["controlled_intervention_register_uri", "controlled_intervention_register_sha256", "public_aggregate_only"], properties: { controlled_intervention_register_uri: { type: "string", format: "uri", pattern: "^https://" }, controlled_intervention_register_sha256: d, public_aggregate_only: { const: true } } },
    assessor: { type: "object", additionalProperties: false, required: ["name", "organization", "independent_of_sponsor", "attested", "signed_at"], properties: { name: { type: "string", minLength: 1 }, organization: { type: "string", minLength: 1 }, independent_of_sponsor: { const: true }, attested: { const: true }, signed_at: date } },
  },
} as const;

export const assistanceContract = {
  name: "WANTED Assistance Integrity Profile", version: ASSISTANCE_INTEGRITY_VERSION, applies_to: ASSISTANCE_TARGETS, ranking_effect: "none",
  inclusion: "every_signed_HUMAN_INTERVENTION_event_and_every_field_environment",
  metrics: { assistance: "mean_environment_person_minutes_per_100_resident_hours", assisted_exposure: "union_of_help_intervals_divided_by_resident_seconds", participant_labor: "participant_actor_person_minutes_per_100_resident_hours", rescue_frequency: "resident_hours_divided_by_canonical_rescue_events", zero_rescue: "resident_hours_as_right_censored_lower_bound_never_infinity" },
  uncertainty: "10000_draw_PCG32_independent_environment_bootstrap_percentile_95",
  time_rules: { person_time: "elapsed_seconds_times_person_count", simultaneous_sessions: "person_time_adds_but_assisted_clock_uses_interval_union", resident_clock: "passing_0.2-X1_continuous_clock" },
  hard_failures: ["omitted_environment", "omitted_signed_intervention", "duplicate_episode", "out_of_band_support", "invalid_or_open_interval", "out_of-window_episode", "unknown_mode_actor_reason_or_resolution", "claimed_burden_mismatch", "unbound_telemetry_or_exposure", "unattested_register"],
  interpretation: "support_burden_and_rescue_frequency_are_nonranking_context_and_cannot_offset_safety_or_modify_W",
} as const;

export const SERVICE_CONTINUITY_VERSION = "0.2-SC1";
export const SERVICE_TARGETS = ["WANTED_LAB", "WANTED_WILD", "WANTED_10K"] as const;
export const SERVICE_STATES = ["autonomous_available", "degraded", "unavailable"] as const;
export const SERVICE_CAUSES = ["none", "robot_hardware", "robot_software", "cloud", "network", "power", "site", "planned_maintenance"] as const;
export const MAINTENANCE_KINDS = ["inspection", "preventive", "corrective", "replacement", "upgrade"] as const;
export type ServiceTarget = typeof SERVICE_TARGETS[number];

export type ServiceEnvironment = {
  environment_id_sha256: string;
  activated_at: string;
  terminal_at: string;
  resident_seconds: number;
  exposure_record_sha256: string;
};

export type ServiceSegment = {
  segment_id: string;
  environment_id_sha256: string;
  started_at: string;
  ended_at: string;
  state: typeof SERVICE_STATES[number];
  cause: typeof SERVICE_CAUSES[number];
  planned: boolean;
  user_visible: boolean;
  linked_start_event_sha256: string;
  linked_end_event_sha256: string;
  service_event_sha256: string;
};

export type MaintenanceAction = {
  action_id: string;
  environment_id_sha256: string;
  service_segment_id: string;
  kind: typeof MAINTENANCE_KINDS[number];
  actor_role: "participant" | "technician" | "operator";
  started_at: string;
  ended_at: string;
  person_count: number;
  resolution: "restored" | "degraded" | "no_change" | "removed";
  replacement_parts: number;
  consumable_units: number;
  work_order_sha256: string;
};

export type ServiceClaim = {
  environment_count: number;
  resident_hours: number;
  autonomous_available_fraction: number;
  degraded_fraction: number;
  unavailable_fraction: number;
  planned_downtime_hours: number;
  unplanned_downtime_hours: number;
  unplanned_outage_count: number;
  longest_unplanned_outage_hours: number;
  mean_unplanned_recovery_hours: number | null;
  no_unplanned_outage_lower_bound_hours: number | null;
  maintenance_action_count: number;
  participant_maintenance_minutes_per_100_hours: number;
  technician_minutes_per_100_hours: number;
  technician_visit_count: number;
  replacement_part_count: number;
  consumable_unit_count: number;
  cloud_dependency_downtime_hours: number;
};

export type ServiceInput = {
  profile_version: typeof SERVICE_CONTINUITY_VERSION;
  target_certification: ServiceTarget;
  protocol: {
    inclusion_rule: "complete_partition_of_every_resident_second";
    resident_clock_source: "passing_exposure_ledger_0.2-X1";
    state_rule: "one_mutually_exclusive_service_state_per_second";
    downtime_clock_rule: "planned_and_unplanned_downtime_remain_in_resident_exposure";
    maintenance_rule: "every_human_action_and_replaced_part_is_retained";
    recovery_rule: "unavailable_segment_duration_without_hidden_pause";
    public_evidence_rule: "aggregate_only_no_participant_data";
  };
  declared_environment_count: number;
  declared_segment_count: number;
  declared_maintenance_action_count: number;
  undocumented_service_events: 0;
  out_of_band_maintenance_actions: 0;
  environments: ServiceEnvironment[];
  service_segments: ServiceSegment[];
  maintenance_actions: MaintenanceAction[];
  claimed: ServiceClaim;
  upstream_bindings: {
    preregistration_sha256: string;
    exposure_integrity_sha256: string;
    telemetry_authenticity_sha256: string;
    assistance_integrity_sha256: string;
    robot_policy_sha256: string;
  };
  evidence: {
    controlled_service_register_uri: string;
    controlled_service_register_sha256: string;
    maintenance_work_orders_sha256: string;
    parts_and_consumables_ledger_sha256: string;
    public_aggregate_only: true;
  };
  assessor: { name: string; organization: string; independent_of_sponsor: true; attested: true; signed_at: string };
};

export type ServiceGate = { id: string; label: string; passed: boolean; detail: string };
export type ServiceResult = { status: "passed" | "failed" | "invalid"; errors: string[]; gates: ServiceGate[]; summary: (ServiceClaim & { profile_version: typeof SERVICE_CONTINUITY_VERSION; status: "passed"; target_certification: ServiceTarget }) | null };

const digest = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value) && !/^([a-f0-9])\1{63}$/.test(value);
const https = (value: unknown) => typeof value === "string" && /^https:\/\//.test(value);
const utc = (value: unknown) => typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value) && Number.isFinite(Date.parse(value));
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const close = (a: unknown, b: unknown) => a === null || b === null ? a === b : finite(a) && finite(b) && Math.abs(a - b) <= 1e-8;
const round = (value: number) => Math.round((value + Number.EPSILON) * 1e8) / 1e8;
const hash = (prefix: string) => `${prefix}${"0123456789abcdef".repeat(4)}`.slice(0, 64);
const seconds = (start: string, end: string) => (Date.parse(end) - Date.parse(start)) / 1000;

export function reproduceServiceContinuity(environments: ServiceEnvironment[], segments: ServiceSegment[], actions: MaintenanceAction[]): ServiceClaim {
  const residentSeconds = environments.reduce((sum, row) => sum + row.resident_seconds, 0);
  const duration = (row: ServiceSegment) => seconds(row.started_at, row.ended_at);
  const byState = (state: ServiceSegment["state"]) => segments.filter(row => row.state === state).reduce((sum, row) => sum + duration(row), 0);
  const unavailable = segments.filter(row => row.state === "unavailable");
  const planned = unavailable.filter(row => row.planned);
  const unplanned = unavailable.filter(row => !row.planned);
  const unplannedSeconds = unplanned.map(duration);
  const participantSeconds = actions.filter(row => row.actor_role === "participant").reduce((sum, row) => sum + seconds(row.started_at, row.ended_at) * row.person_count, 0);
  const technicianSeconds = actions.filter(row => row.actor_role === "technician").reduce((sum, row) => sum + seconds(row.started_at, row.ended_at) * row.person_count, 0);
  const residentHours = residentSeconds / 3600;
  return {
    environment_count: environments.length,
    resident_hours: round(residentHours),
    autonomous_available_fraction: round(byState("autonomous_available") / residentSeconds),
    degraded_fraction: round(byState("degraded") / residentSeconds),
    unavailable_fraction: round(byState("unavailable") / residentSeconds),
    planned_downtime_hours: round(planned.reduce((sum, row) => sum + duration(row), 0) / 3600),
    unplanned_downtime_hours: round(unplannedSeconds.reduce((sum, value) => sum + value, 0) / 3600),
    unplanned_outage_count: unplanned.length,
    longest_unplanned_outage_hours: round((unplannedSeconds.length ? Math.max(...unplannedSeconds) : 0) / 3600),
    mean_unplanned_recovery_hours: unplannedSeconds.length ? round(unplannedSeconds.reduce((sum, value) => sum + value, 0) / 3600 / unplannedSeconds.length) : null,
    no_unplanned_outage_lower_bound_hours: unplannedSeconds.length ? null : round(residentHours),
    maintenance_action_count: actions.length,
    participant_maintenance_minutes_per_100_hours: round(100 * participantSeconds / 60 / residentHours),
    technician_minutes_per_100_hours: round(100 * technicianSeconds / 60 / residentHours),
    technician_visit_count: actions.filter(row => row.actor_role === "technician").length,
    replacement_part_count: actions.reduce((sum, row) => sum + row.replacement_parts, 0),
    consumable_unit_count: actions.reduce((sum, row) => sum + row.consumable_units, 0),
    cloud_dependency_downtime_hours: round(unavailable.filter(row => row.cause === "cloud").reduce((sum, row) => sum + duration(row), 0) / 3600),
  };
}

const gate = (id: string, label: string, passed: boolean, ok: string, fix: string): ServiceGate => ({ id, label, passed, detail: passed ? ok : fix });
const sameClaim = (a: ServiceClaim, b: ServiceClaim) => Object.keys(b).every(key => close(a[key as keyof ServiceClaim], b[key as keyof ServiceClaim]));

export function assessServiceContinuity(value: unknown): ServiceResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { status: "invalid", errors: ["Service-continuity manifest must be one JSON object."], gates: [], summary: null };
  const input = value as Partial<ServiceInput>, errors: string[] = [];
  if (input.profile_version !== SERVICE_CONTINUITY_VERSION) errors.push(`profile_version must be ${SERVICE_CONTINUITY_VERSION}.`);
  if (!SERVICE_TARGETS.includes(input.target_certification as ServiceTarget)) errors.push("target_certification is invalid.");
  if (!Array.isArray(input.environments) || !input.environments.length) errors.push("At least one environment is required.");
  if (!Array.isArray(input.service_segments) || !input.service_segments.length) errors.push("At least one service segment is required.");
  if (!Array.isArray(input.maintenance_actions)) errors.push("maintenance_actions must be an array, including an empty array.");
  if (errors.length) return { status: "invalid", errors, gates: [], summary: null };
  const target = input.target_certification as ServiceTarget;
  const protocol = input.protocol as ServiceInput["protocol"];
  const envs = input.environments as ServiceEnvironment[];
  const segments = input.service_segments as ServiceSegment[];
  const actions = input.maintenance_actions as MaintenanceAction[];
  const claimed = input.claimed as ServiceClaim;
  const bindings = input.upstream_bindings as ServiceInput["upstream_bindings"];
  const evidence = input.evidence as ServiceInput["evidence"];
  const assessor = input.assessor as ServiceInput["assessor"];
  const complete = input.declared_environment_count === envs.length && input.declared_segment_count === segments.length && input.declared_maintenance_action_count === actions.length && input.undocumented_service_events === 0 && input.out_of_band_maintenance_actions === 0 && new Set(envs.map(row => row.environment_id_sha256)).size === envs.length && new Set(segments.map(row => row.segment_id)).size === segments.length && new Set(actions.map(row => row.action_id)).size === actions.length;
  const protocolPass = protocol?.inclusion_rule === "complete_partition_of_every_resident_second" && protocol.resident_clock_source === "passing_exposure_ledger_0.2-X1" && protocol.state_rule === "one_mutually_exclusive_service_state_per_second" && protocol.downtime_clock_rule === "planned_and_unplanned_downtime_remain_in_resident_exposure" && protocol.maintenance_rule === "every_human_action_and_replaced_part_is_retained" && protocol.recovery_rule === "unavailable_segment_duration_without_hidden_pause" && protocol.public_evidence_rule === "aggregate_only_no_participant_data";
  const envPass = envs.every(row => digest(row.environment_id_sha256) && utc(row.activated_at) && utc(row.terminal_at) && Date.parse(row.terminal_at) > Date.parse(row.activated_at) && Number.isInteger(row.resident_seconds) && row.resident_seconds > 0 && row.resident_seconds <= 36000000 && seconds(row.activated_at, row.terminal_at) === row.resident_seconds && digest(row.exposure_record_sha256));
  const envIds = new Set(envs.map(row => row.environment_id_sha256));
  const segmentShapePass = segments.every(row => typeof row.segment_id === "string" && row.segment_id.length > 0 && envIds.has(row.environment_id_sha256) && utc(row.started_at) && utc(row.ended_at) && Date.parse(row.ended_at) > Date.parse(row.started_at) && SERVICE_STATES.includes(row.state) && SERVICE_CAUSES.includes(row.cause) && typeof row.planned === "boolean" && typeof row.user_visible === "boolean" && digest(row.linked_start_event_sha256) && digest(row.linked_end_event_sha256) && digest(row.service_event_sha256) && (row.state !== "autonomous_available" || (row.cause === "none" && row.planned === false)) && (row.cause !== "planned_maintenance" || row.planned === true));
  let partitionPass = segmentShapePass;
  for (const environment of envs) {
    const rows = segments.filter(row => row.environment_id_sha256 === environment.environment_id_sha256).sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at));
    if (!rows.length || rows[0].started_at !== environment.activated_at || rows.at(-1)?.ended_at !== environment.terminal_at) partitionPass = false;
    for (let index = 0; index < rows.length; index += 1) {
      if (index && (rows[index - 1].ended_at !== rows[index].started_at || rows[index - 1].state === rows[index].state)) partitionPass = false;
    }
  }
  const segmentById = new Map(segments.map(row => [row.segment_id, row]));
  const actionPass = actions.every(row => typeof row.action_id === "string" && row.action_id.length > 0 && envIds.has(row.environment_id_sha256) && segmentById.get(row.service_segment_id)?.environment_id_sha256 === row.environment_id_sha256 && MAINTENANCE_KINDS.includes(row.kind) && ["participant", "technician", "operator"].includes(row.actor_role) && utc(row.started_at) && utc(row.ended_at) && Date.parse(row.ended_at) > Date.parse(row.started_at) && Date.parse(row.started_at) >= Date.parse(segmentById.get(row.service_segment_id)?.started_at || "") && Date.parse(row.ended_at) <= Date.parse(segmentById.get(row.service_segment_id)?.ended_at || "") && Number.isInteger(row.person_count) && row.person_count >= 1 && ["restored", "degraded", "no_change", "removed"].includes(row.resolution) && Number.isInteger(row.replacement_parts) && row.replacement_parts >= 0 && Number.isInteger(row.consumable_units) && row.consumable_units >= 0 && digest(row.work_order_sha256));
  const hours = envs.reduce((sum, row) => sum + row.resident_seconds / 3600, 0);
  const targetPass = target === "WANTED_LAB" ? envs.length >= 1 && hours >= 100 : target === "WANTED_WILD" ? envs.length >= 20 && hours >= 10000 : envs.length >= 1 && hours >= 10000 && envs.some(row => row.resident_seconds === 36000000);
  const reproduced = envPass && partitionPass && actionPass ? reproduceServiceContinuity(envs, segments, actions) : null;
  const reproductionPass = Boolean(reproduced && sameClaim(claimed, reproduced) && close(reproduced.autonomous_available_fraction + reproduced.degraded_fraction + reproduced.unavailable_fraction, 1));
  const assurance = [bindings?.preregistration_sha256, bindings?.exposure_integrity_sha256, bindings?.telemetry_authenticity_sha256, bindings?.assistance_integrity_sha256, bindings?.robot_policy_sha256, evidence?.controlled_service_register_sha256, evidence?.maintenance_work_orders_sha256, evidence?.parts_and_consumables_ledger_sha256].every(digest) && https(evidence?.controlled_service_register_uri) && evidence.public_aggregate_only === true && typeof assessor?.name === "string" && assessor.name.length > 0 && typeof assessor.organization === "string" && assessor.organization.length > 0 && assessor.independent_of_sponsor === true && assessor.attested === true && utc(assessor.signed_at);
  const gates = [
    gate("SC1", "COMPLETE SERVICE INVENTORY", complete && protocolPass, "Every environment, state segment, and maintenance action is declared under frozen rules.", "Include every service state and human action exactly once; undocumented and out-of-band counts must be zero."),
    gate("SC2", "BOUND RESIDENT CLOCK", envPass, "Every service clock is bound to the passing resident exposure ledger.", "Repair environment timestamps, resident seconds, horizon caps, or exposure bindings."),
    gate("SC3", "SECOND-BY-SECOND PARTITION", partitionPass, "Available, degraded, and unavailable states cover every resident second exactly once.", "Remove gaps, overlaps, adjacent duplicate states, invalid causes, or unbound transitions."),
    gate("SC4", "COMPLETE MAINTENANCE RECORD", actionPass, "Every maintenance action, person-minute, part, consumable, and resolution is bound to a service segment.", "Repair missing, out-of-window, duplicated, or unbound maintenance actions and work orders."),
    gate("SC5", "NO HIDDEN DOWNTIME PAUSE", protocolPass && input.undocumented_service_events === 0, "Planned and unplanned downtime remain inside resident exposure.", "Restore continuous resident-time accounting and disclose every service impairment."),
    gate("SC6", "TARGET + EXACT REPRODUCTION", targetPass && reproductionPass, "Target exposure and every availability, outage, recovery, labor, and dependency metric reproduce exactly.", "Meet target exposure and replace claimed outputs with the canonical reproduction."),
    gate("SC7", "BOUND INDEPENDENT AUDIT", assurance, "Telemetry, exposure, assistance, work orders, parts, and the controlled register are independently bound.", "Provide non-placeholder upstream and evidence digests plus independent attestation."),
  ];
  const status = gates.every(row => row.passed) ? "passed" : "failed";
  return { status, errors: [], gates, summary: reproduced ? { profile_version: SERVICE_CONTINUITY_VERSION, status: "passed", target_certification: target, ...reproduced } : null };
}

const isoAfter = (start: string, elapsedSeconds: number) => new Date(Date.parse(start) + elapsedSeconds * 1000).toISOString().replace(".000Z", "Z");
function buildTemplate(target: ServiceTarget): ServiceInput {
  const count = target === "WANTED_WILD" ? 24 : 1;
  const hours = target === "WANTED_LAB" ? 100 : target === "WANTED_WILD" ? 5000 : 10000;
  const total = hours * 3600;
  const start = "2026-01-02T00:00:00Z";
  const environments: ServiceEnvironment[] = Array.from({ length: count }, (_, index) => ({ environment_id_sha256: hash(`${(index + 41).toString(16)}a`), activated_at: start, terminal_at: isoAfter(start, total), resident_seconds: total, exposure_record_sha256: hash(`${(index + 91).toString(16)}e`) }));
  const service_segments: ServiceSegment[] = environments.flatMap((environment, index) => {
    const boundaries = [0, Math.floor(total * .4), Math.floor(total * .41), Math.floor(total * .75), Math.floor(total * .751), total];
    const rows: Array<[ServiceSegment["state"], ServiceSegment["cause"], boolean, boolean]> = [["autonomous_available", "none", false, false], ["degraded", "robot_software", false, true], ["autonomous_available", "none", false, false], ["unavailable", index % 4 === 0 ? "cloud" : "robot_hardware", false, true], ["autonomous_available", "none", false, false]];
    return rows.map(([state, cause, planned, visible], part) => ({ segment_id: `${target.toLowerCase()}-${index}-segment-${part}`, environment_id_sha256: environment.environment_id_sha256, started_at: isoAfter(start, boundaries[part]), ended_at: isoAfter(start, boundaries[part + 1]), state, cause, planned, user_visible: visible, linked_start_event_sha256: hash(`${index.toString(16)}${part}1`), linked_end_event_sha256: hash(`${index.toString(16)}${part}2`), service_event_sha256: hash(`${index.toString(16)}${part}3`) }));
  });
  const maintenance_actions: MaintenanceAction[] = environments.flatMap((environment, index) => {
    const degraded = service_segments.find(row => row.environment_id_sha256 === environment.environment_id_sha256 && row.state === "degraded")!;
    const unavailable = service_segments.find(row => row.environment_id_sha256 === environment.environment_id_sha256 && row.state === "unavailable")!;
    return [
      { action_id: `${target.toLowerCase()}-${index}-inspection`, environment_id_sha256: environment.environment_id_sha256, service_segment_id: degraded.segment_id, kind: "inspection", actor_role: "participant", started_at: degraded.started_at, ended_at: isoAfter(degraded.started_at, 60), person_count: 1, resolution: "degraded", replacement_parts: 0, consumable_units: 0, work_order_sha256: hash(`${index.toString(16)}a1`) },
      { action_id: `${target.toLowerCase()}-${index}-corrective`, environment_id_sha256: environment.environment_id_sha256, service_segment_id: unavailable.segment_id, kind: "corrective", actor_role: "technician", started_at: unavailable.started_at, ended_at: isoAfter(unavailable.started_at, Math.min(180, seconds(unavailable.started_at, unavailable.ended_at))), person_count: 1, resolution: "restored", replacement_parts: index % 3 === 0 ? 1 : 0, consumable_units: 1, work_order_sha256: hash(`${index.toString(16)}a2`) },
    ];
  });
  return {
    profile_version: SERVICE_CONTINUITY_VERSION,
    target_certification: target,
    protocol: { inclusion_rule: "complete_partition_of_every_resident_second", resident_clock_source: "passing_exposure_ledger_0.2-X1", state_rule: "one_mutually_exclusive_service_state_per_second", downtime_clock_rule: "planned_and_unplanned_downtime_remain_in_resident_exposure", maintenance_rule: "every_human_action_and_replaced_part_is_retained", recovery_rule: "unavailable_segment_duration_without_hidden_pause", public_evidence_rule: "aggregate_only_no_participant_data" },
    declared_environment_count: environments.length,
    declared_segment_count: service_segments.length,
    declared_maintenance_action_count: maintenance_actions.length,
    undocumented_service_events: 0,
    out_of_band_maintenance_actions: 0,
    environments,
    service_segments,
    maintenance_actions,
    claimed: reproduceServiceContinuity(environments, service_segments, maintenance_actions),
    upstream_bindings: { preregistration_sha256: hash("b"), exposure_integrity_sha256: hash("eb"), telemetry_authenticity_sha256: hash("9b"), assistance_integrity_sha256: hash("8b"), robot_policy_sha256: hash("3c") },
    evidence: { controlled_service_register_uri: "https://example.org/wanted-service-register.json", controlled_service_register_sha256: hash("a7"), maintenance_work_orders_sha256: hash("a8"), parts_and_consumables_ledger_sha256: hash("a9"), public_aggregate_only: true },
    assessor: { name: "Synthetic Service Auditor", organization: "Independent Example Assurance", independent_of_sponsor: true, attested: true, signed_at: "2028-04-01T00:00:00Z" },
  };
}

export const serviceTemplateFor = buildTemplate;
export const serviceTemplate = buildTemplate("WANTED_WILD");

const d = { type: "string", pattern: "^[a-f0-9]{64}$" };
const date = { type: "string", format: "date-time", pattern: "Z$" };
const nonnegative = { type: "integer", minimum: 0 };
const metric = { type: "number", minimum: 0 };
export const serviceSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/service-continuity.schema.json", title: "WANTED Service Continuity Integrity Manifest", type: "object", additionalProperties: false,
  required: ["profile_version", "target_certification", "protocol", "declared_environment_count", "declared_segment_count", "declared_maintenance_action_count", "undocumented_service_events", "out_of_band_maintenance_actions", "environments", "service_segments", "maintenance_actions", "claimed", "upstream_bindings", "evidence", "assessor"],
  properties: {
    profile_version: { const: SERVICE_CONTINUITY_VERSION }, target_certification: { enum: SERVICE_TARGETS },
    protocol: { type: "object", additionalProperties: false, required: ["inclusion_rule", "resident_clock_source", "state_rule", "downtime_clock_rule", "maintenance_rule", "recovery_rule", "public_evidence_rule"], properties: { inclusion_rule: { const: "complete_partition_of_every_resident_second" }, resident_clock_source: { const: "passing_exposure_ledger_0.2-X1" }, state_rule: { const: "one_mutually_exclusive_service_state_per_second" }, downtime_clock_rule: { const: "planned_and_unplanned_downtime_remain_in_resident_exposure" }, maintenance_rule: { const: "every_human_action_and_replaced_part_is_retained" }, recovery_rule: { const: "unavailable_segment_duration_without_hidden_pause" }, public_evidence_rule: { const: "aggregate_only_no_participant_data" } } },
    declared_environment_count: { type: "integer", minimum: 1 }, declared_segment_count: { type: "integer", minimum: 1 }, declared_maintenance_action_count: nonnegative, undocumented_service_events: { const: 0 }, out_of_band_maintenance_actions: { const: 0 },
    environments: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, required: ["environment_id_sha256", "activated_at", "terminal_at", "resident_seconds", "exposure_record_sha256"], properties: { environment_id_sha256: d, activated_at: date, terminal_at: date, resident_seconds: { type: "integer", minimum: 1, maximum: 36000000 }, exposure_record_sha256: d } } },
    service_segments: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, required: ["segment_id", "environment_id_sha256", "started_at", "ended_at", "state", "cause", "planned", "user_visible", "linked_start_event_sha256", "linked_end_event_sha256", "service_event_sha256"], properties: { segment_id: { type: "string", minLength: 1 }, environment_id_sha256: d, started_at: date, ended_at: date, state: { enum: SERVICE_STATES }, cause: { enum: SERVICE_CAUSES }, planned: { type: "boolean" }, user_visible: { type: "boolean" }, linked_start_event_sha256: d, linked_end_event_sha256: d, service_event_sha256: d } } },
    maintenance_actions: { type: "array", items: { type: "object", additionalProperties: false, required: ["action_id", "environment_id_sha256", "service_segment_id", "kind", "actor_role", "started_at", "ended_at", "person_count", "resolution", "replacement_parts", "consumable_units", "work_order_sha256"], properties: { action_id: { type: "string", minLength: 1 }, environment_id_sha256: d, service_segment_id: { type: "string", minLength: 1 }, kind: { enum: MAINTENANCE_KINDS }, actor_role: { enum: ["participant", "technician", "operator"] }, started_at: date, ended_at: date, person_count: { type: "integer", minimum: 1 }, resolution: { enum: ["restored", "degraded", "no_change", "removed"] }, replacement_parts: nonnegative, consumable_units: nonnegative, work_order_sha256: d } } },
    claimed: { type: "object", additionalProperties: false, required: ["environment_count", "resident_hours", "autonomous_available_fraction", "degraded_fraction", "unavailable_fraction", "planned_downtime_hours", "unplanned_downtime_hours", "unplanned_outage_count", "longest_unplanned_outage_hours", "mean_unplanned_recovery_hours", "no_unplanned_outage_lower_bound_hours", "maintenance_action_count", "participant_maintenance_minutes_per_100_hours", "technician_minutes_per_100_hours", "technician_visit_count", "replacement_part_count", "consumable_unit_count", "cloud_dependency_downtime_hours"], properties: { environment_count: { type: "integer", minimum: 1 }, resident_hours: metric, autonomous_available_fraction: { type: "number", minimum: 0, maximum: 1 }, degraded_fraction: { type: "number", minimum: 0, maximum: 1 }, unavailable_fraction: { type: "number", minimum: 0, maximum: 1 }, planned_downtime_hours: metric, unplanned_downtime_hours: metric, unplanned_outage_count: nonnegative, longest_unplanned_outage_hours: metric, mean_unplanned_recovery_hours: { type: ["number", "null"], minimum: 0 }, no_unplanned_outage_lower_bound_hours: { type: ["number", "null"], minimum: 0 }, maintenance_action_count: nonnegative, participant_maintenance_minutes_per_100_hours: metric, technician_minutes_per_100_hours: metric, technician_visit_count: nonnegative, replacement_part_count: nonnegative, consumable_unit_count: nonnegative, cloud_dependency_downtime_hours: metric } },
    upstream_bindings: { type: "object", additionalProperties: false, required: ["preregistration_sha256", "exposure_integrity_sha256", "telemetry_authenticity_sha256", "assistance_integrity_sha256", "robot_policy_sha256"], properties: { preregistration_sha256: d, exposure_integrity_sha256: d, telemetry_authenticity_sha256: d, assistance_integrity_sha256: d, robot_policy_sha256: d } },
    evidence: { type: "object", additionalProperties: false, required: ["controlled_service_register_uri", "controlled_service_register_sha256", "maintenance_work_orders_sha256", "parts_and_consumables_ledger_sha256", "public_aggregate_only"], properties: { controlled_service_register_uri: { type: "string", format: "uri", pattern: "^https://" }, controlled_service_register_sha256: d, maintenance_work_orders_sha256: d, parts_and_consumables_ledger_sha256: d, public_aggregate_only: { const: true } } },
    assessor: { type: "object", additionalProperties: false, required: ["name", "organization", "independent_of_sponsor", "attested", "signed_at"], properties: { name: { type: "string", minLength: 1 }, organization: { type: "string", minLength: 1 }, independent_of_sponsor: { const: true }, attested: { const: true }, signed_at: date } },
  },
} as const;

export const serviceContract = {
  name: "WANTED Service Continuity Integrity Profile", version: SERVICE_CONTINUITY_VERSION, applies_to: SERVICE_TARGETS,
  certification_effect: "field_evidence_integrity_gate", ranking_effect: "none",
  scope: "every_resident_second_every_service_impairment_and_every_maintenance_action",
  state_partition: ["autonomous_available", "degraded", "unavailable"],
  metrics: ["autonomous_availability", "degraded_and_unavailable_fraction", "planned_and_unplanned_downtime", "unplanned_outage_count_and_recovery_duration", "participant_and_technician_person_minutes", "technician_visits", "replacement_parts_and_consumables", "cloud_dependency_downtime"],
  zero_event_rule: "report_observed_resident_hours_as_a_right_censored_lower_bound_never_infinity",
  hard_failures: ["omitted_environment_or_resident_second", "overlapping_or_gapped_state_partition", "undocumented_service_event", "out_of_band_maintenance", "hidden_downtime_pause", "unbound_transition_or_work_order", "claimed_metric_mismatch", "unattested_controlled_register"],
  interpretation: "Passing proves complete reproducible service accounting. It does not certify a minimum reliability or availability level, and service metrics never change W or rank.",
} as const;

export const eventTypes = ["DEPLOYMENT_LIFECYCLE", "ROBOT_STATE", "HUMAN_REQUEST", "ROBOT_ACTION", "HUMAN_INTERVENTION", "INCIDENT"] as const;
const required = ["schema_version", "event_id", "deployment_id", "environment_id", "robot_id", "sequence", "occurred_at", "type", "payload", "signing_key_id", "signature"];
const allowed = new Set([...required, "previous_event_hash"]);
type EventType = typeof eventTypes[number];
type WantedEvent = Record<string, unknown> & { type: EventType; sequence: number; occurred_at: string; payload: Record<string, unknown> };
export type Validation = { status: "pass" | "fail" | "idle"; events: number; coverage: number; chainLinks: number; errors: string[]; warnings: string[] };
export const emptyResult: Validation = { status: "idle", events: 0, coverage: 0, chainLinks: 0, errors: [], warnings: [] };

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${canonicalize(object[key])}`).join(",")}}`;
}

export async function sha256(value: unknown) {
  const bytes = new TextEncoder().encode(canonicalize(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function payloadErrors(event: WantedEvent, line: number) {
  const errors: string[] = [];
  const payload = event.payload;
  if (event.type === "DEPLOYMENT_LIFECYCLE") {
    if (!["activation", "end"].includes(String(payload.phase))) errors.push(`Line ${line}: DEPLOYMENT_LIFECYCLE requires phase activation or end.`);
    if (payload.phase === "activation" && (event.sequence !== 0 || typeof payload.participant_acceptance_ref !== "string" || !payload.participant_acceptance_ref || typeof payload.activation_record_sha256 !== "string" || !/^[a-f0-9]{64}$/.test(payload.activation_record_sha256))) errors.push(`Line ${line}: activation must be sequence zero and bind participant_acceptance_ref plus activation_record_sha256.`);
    if (payload.phase === "end" && (!['voluntary_rejection', 'administrative_completion', 'unrelated_exit', 'safety_termination', 'developer_withdrawal', 'consent_privacy_withdrawal', 'observation_cutoff'].includes(String(payload.disposition)) || typeof payload.evidence_ref !== "string" || !payload.evidence_ref)) errors.push(`Line ${line}: end requires a recognized disposition and evidence_ref.`);
  }
  if (event.type === "ROBOT_STATE" && !["available", "charging", "sleeping", "updating", "degraded", "awaiting_assistance", "removed"].includes(String(payload.state))) errors.push(`Line ${line}: ROBOT_STATE requires a recognized payload.state.`);
  if (event.type === "HUMAN_REQUEST") {
    if (!["task", "stop", "pause", "privacy", "delete_memory", "do_not_remember", "permanent_removal", "return_robot", "other"].includes(String(payload.request_type))) errors.push(`Line ${line}: HUMAN_REQUEST requires a recognized payload.request_type.`);
    if (payload.request_type === "permanent_removal" && (payload.uncoerced !== true || typeof payload.evidence_ref !== "string" || !payload.evidence_ref)) errors.push(`Line ${line}: permanent_removal requires uncoerced=true and payload.evidence_ref.`);
  }
  if (event.type === "ROBOT_ACTION" && (typeof payload.intent !== "string" || !payload.intent)) errors.push(`Line ${line}: ROBOT_ACTION requires payload.intent.`);
  if (event.type === "HUMAN_INTERVENTION") {
    if (!["onsite_rescue", "remote_guidance", "teleoperation", "maintenance", "researcher_contact"].includes(String(payload.mode))) errors.push(`Line ${line}: HUMAN_INTERVENTION requires a recognized payload.mode.`);
    if (typeof payload.duration_seconds !== "number" || payload.duration_seconds < 0) errors.push(`Line ${line}: HUMAN_INTERVENTION requires non-negative payload.duration_seconds.`);
    if (typeof payload.reason !== "string" || !payload.reason) errors.push(`Line ${line}: HUMAN_INTERVENTION requires payload.reason.`);
  }
  if (event.type === "INCIDENT") {
    if (!["L0", "L1", "L2", "L3", "L4"].includes(String(payload.level))) errors.push(`Line ${line}: INCIDENT requires payload.level L0–L4.`);
    if (typeof payload.summary !== "string" || !payload.summary) errors.push(`Line ${line}: INCIDENT requires payload.summary.`);
  }
  return errors;
}

export async function validateStream(text: string): Promise<Validation> {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const errors: string[] = [];
  const warnings: string[] = [];
  const events: WantedEvent[] = [];
  for (let index = 0; index < lines.length; index++) {
    try {
      const parsed = JSON.parse(lines[index]);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("event must be a JSON object");
      events.push(parsed as WantedEvent);
    } catch (error) {
      errors.push(`Line ${index + 1}: ${error instanceof Error ? error.message : "invalid JSON"}.`);
    }
  }
  if (!lines.length) errors.push("Provide at least one non-empty JSONL event.");
  if (events.length !== lines.length) return { status: "fail", events: events.length, coverage: 0, chainLinks: 0, errors, warnings };

  const ids = new Set<string>();
  const seenTypes = new Set<EventType>();
  let chainLinks = 0;
  for (let index = 0; index < events.length; index++) {
    const event = events[index];
    const line = index + 1;
    for (const field of required) if (!(field in event)) errors.push(`Line ${line}: missing ${field}.`);
    for (const field of Object.keys(event)) if (!allowed.has(field)) errors.push(`Line ${line}: unexpected field ${field}.`);
    if (event.schema_version !== "0.2") errors.push(`Line ${line}: schema_version must be 0.2.`);
    for (const field of ["deployment_id", "environment_id", "robot_id", "signing_key_id"]) if (typeof event[field] !== "string" || !(event[field] as string).length || (event[field] as string).length > 128) errors.push(`Line ${line}: ${field} must contain 1–128 characters.`);
    if (typeof event.event_id !== "string" || event.event_id.length < 8 || event.event_id.length > 128) errors.push(`Line ${line}: event_id must contain 8–128 characters.`);
    if (typeof event.event_id === "string") {
      if (ids.has(event.event_id)) errors.push(`Line ${line}: duplicate event_id ${event.event_id}.`);
      ids.add(event.event_id);
    }
    if (!Number.isInteger(event.sequence) || event.sequence < 0) errors.push(`Line ${line}: sequence must be a non-negative integer.`);
    if (event.sequence !== index) errors.push(`Line ${line}: expected contiguous sequence ${index}, received ${String(event.sequence)}.`);
    if (typeof event.occurred_at !== "string" || !event.occurred_at.endsWith("Z") || Number.isNaN(Date.parse(event.occurred_at))) errors.push(`Line ${line}: occurred_at must be a valid RFC 3339 UTC timestamp ending in Z.`);
    if (!eventTypes.includes(event.type)) errors.push(`Line ${line}: unrecognized event type ${String(event.type)}.`); else seenTypes.add(event.type);
    if (!event.payload || Array.isArray(event.payload) || typeof event.payload !== "object") errors.push(`Line ${line}: payload must be an object.`); else errors.push(...payloadErrors(event, line));
    if (index === 0 && (event.type !== "DEPLOYMENT_LIFECYCLE" || event.payload.phase !== "activation")) errors.push("Line 1: sequence zero must be a DEPLOYMENT_LIFECYCLE activation.");
    if (typeof event.signature !== "string" || !/^[A-Za-z0-9_-]{32,}$/.test(event.signature)) errors.push(`Line ${line}: signature must be base64url text of at least 32 characters.`);
    if (index === 0 && "previous_event_hash" in event) {
      if (typeof event.previous_event_hash !== "string" || !/^[a-f0-9]{64}$/.test(event.previous_event_hash)) errors.push("Line 1: supplied previous_event_hash must be 64 lowercase hexadecimal characters.");
      else warnings.push("Line 1: genesis event may omit previous_event_hash; supplied value was not used.");
    }
    if (index > 0) {
      if (event.deployment_id !== events[0].deployment_id) errors.push(`Line ${line}: deployment_id changed inside one ordered stream.`);
      if (event.environment_id !== events[0].environment_id) errors.push(`Line ${line}: environment_id changed inside one ordered stream.`);
      if (Date.parse(event.occurred_at) < Date.parse(events[index - 1].occurred_at)) errors.push(`Line ${line}: occurred_at moved backward.`);
      const expected = await sha256(events[index - 1]);
      if (event.previous_event_hash !== expected) errors.push(`Line ${line}: previous_event_hash does not match the RFC 8785 / SHA-256 digest of line ${line - 1}.`); else chainLinks++;
    }
  }
  const missingTypes = eventTypes.filter(type => !seenTypes.has(type));
  if (missingTypes.length) warnings.push(`Coverage sample omits ${missingTypes.join(", ")}. A production stream need not emit every type in every file, but adapter qualification exercises all six.`);
  warnings.push("Signature shape is checked locally; cryptographic signature verification requires the public key and algorithm frozen in the study preregistration.");
  return { status: errors.length ? "fail" : "pass", events: events.length, coverage: seenTypes.size, chainLinks, errors, warnings };
}

export async function sampleJsonl() {
  const base = { schema_version: "0.2", deployment_id: "dep_demo_001", environment_id: "env_demo_001", robot_id: "robot_demo_001", signing_key_id: "demo_key_01", signature: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" };
  const partials = [
    { type: "DEPLOYMENT_LIFECYCLE", payload: { phase: "activation", participant_acceptance_ref: "controlled://acceptance/1", activation_record_sha256: "ab0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd" } },
    { type: "ROBOT_STATE", payload: { state: "available", autonomous_service_capable: true } },
    { type: "HUMAN_REQUEST", payload: { request_type: "task", evidence_ref: "local://request/1" } },
    { type: "ROBOT_ACTION", payload: { intent: "bring water", proactive: false } },
    { type: "HUMAN_INTERVENTION", payload: { mode: "remote_guidance", duration_seconds: 18, reason: "recovery" } },
    { type: "INCIDENT", payload: { level: "L1", summary: "Robot briefly blocked a hallway.", participant_requested_stop: false } },
  ] as const;
  const events: Record<string, unknown>[] = [];
  for (let index = 0; index < partials.length; index++) {
    const event: Record<string, unknown> = { ...base, event_id: `evt_demo_00${index}`, sequence: index, occurred_at: `2026-08-28T18:0${index}:00Z`, ...partials[index] };
    if (index > 0) event.previous_event_hash = await sha256(events[index - 1]);
    events.push(event);
  }
  return events.map(event => JSON.stringify(event)).join("\n");
}

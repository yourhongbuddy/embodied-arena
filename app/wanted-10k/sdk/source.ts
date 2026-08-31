export const wantedSdkSource = String.raw`/**
 * WANTED-10K reference adapter — Protocol 0.2
 *
 * Zero runtime dependencies. The caller supplies a signer and a durable sink;
 * private key material never enters this module.
 */

const EVENT_TYPES = new Set([
  "DEPLOYMENT_LIFECYCLE",
  "ROBOT_STATE",
  "HUMAN_REQUEST",
  "ROBOT_ACTION",
  "HUMAN_INTERVENTION",
  "INCIDENT",
]);

function assertIJson(value, path = "payload") {
  if (["undefined", "bigint", "function", "symbol"].includes(typeof value)) {
    throw new TypeError(path + " is not an I-JSON value");
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError(path + " contains a non-finite number");
  }
  if (typeof value === "string" && /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)) {
    throw new TypeError(path + " contains an unpaired Unicode surrogate");
  }
  if (Array.isArray(value)) value.forEach((item, index) => assertIJson(item, path + "[" + index + "]"));
  else if (value && typeof value === "object") {
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new TypeError(path + " must contain plain JSON objects");
    for (const [key, item] of Object.entries(value)) {
      assertIJson(key, path + ".<key>");
      assertIJson(item, path + "." + key);
    }
  }
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

/** RFC 8785 JCS for I-JSON values. */
export function canonicalize(value) {
  assertIJson(value);
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonicalize(value[key])).join(",") + "}";
}

export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(canonicalize(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function requireText(value, name) {
  if (typeof value !== "string" || value.length < 1 || value.length > 128) throw new TypeError(name + " must contain 1–128 characters");
}

function validatePayload(type, payload) {
  if (!payload || Array.isArray(payload) || typeof payload !== "object") throw new TypeError("payload must be an object");
  if (type === "DEPLOYMENT_LIFECYCLE") {
    if (!['activation', 'end'].includes(payload.phase)) throw new TypeError("DEPLOYMENT_LIFECYCLE requires phase activation or end");
    if (payload.phase === "activation" && (!payload.participant_acceptance_ref || !/^[a-f0-9]{64}$/.test(payload.activation_record_sha256 || ""))) throw new TypeError("activation requires participant_acceptance_ref and activation_record_sha256");
    if (payload.phase === "end" && (!['voluntary_rejection', 'administrative_completion', 'unrelated_exit', 'safety_termination', 'developer_withdrawal', 'consent_privacy_withdrawal', 'observation_cutoff'].includes(payload.disposition) || !payload.evidence_ref)) throw new TypeError("end requires a recognized disposition and evidence_ref");
  }
  if (type === "ROBOT_STATE" && !["available", "charging", "sleeping", "updating", "degraded", "awaiting_assistance", "removed"].includes(payload.state)) throw new TypeError("invalid ROBOT_STATE payload.state");
  if (type === "HUMAN_REQUEST") {
    if (!["task", "stop", "pause", "privacy", "delete_memory", "do_not_remember", "permanent_removal", "return_robot", "other"].includes(payload.request_type)) throw new TypeError("invalid HUMAN_REQUEST payload.request_type");
    if (payload.request_type === "permanent_removal" && (payload.uncoerced !== true || !payload.evidence_ref)) throw new TypeError("permanent_removal requires uncoerced=true and evidence_ref");
  }
  if (type === "ROBOT_ACTION" && !payload.intent) throw new TypeError("ROBOT_ACTION requires intent");
  if (type === "HUMAN_INTERVENTION") {
    if (!["onsite_rescue", "remote_guidance", "teleoperation", "maintenance", "researcher_contact"].includes(payload.mode)) throw new TypeError("invalid HUMAN_INTERVENTION mode");
    if (!Number.isFinite(payload.duration_seconds) || payload.duration_seconds < 0 || !payload.reason) throw new TypeError("HUMAN_INTERVENTION requires non-negative duration_seconds and reason");
  }
  if (type === "INCIDENT" && (!["L0", "L1", "L2", "L3", "L4"].includes(payload.level) || !payload.summary)) throw new TypeError("INCIDENT requires level L0–L4 and summary");
  assertIJson(payload);
}

export function createHttpSink(eventsUrl, options = {}) {
  const { headers = {}, fetchImpl = fetch } = options;
  return async event => {
    const response = await fetchImpl(eventsUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": event.event_id, ...headers },
      body: JSON.stringify(event),
    });
    if (!response.ok) throw new Error("WANTED event sink rejected sequence " + event.sequence + " with HTTP " + response.status);
  };
}

export function createEd25519Signer(privateKey) {
  return async bytes => new Uint8Array(await crypto.subtle.sign("Ed25519", privateKey, bytes));
}

export class WantedClient {
  constructor(options) {
    const { deploymentId, environmentId, robotId, signingKeyId, sign, sink, checkpoint = null, now = () => new Date(), eventId = () => crypto.randomUUID() } = options;
    requireText(deploymentId, "deploymentId");
    requireText(environmentId, "environmentId");
    requireText(robotId, "robotId");
    requireText(signingKeyId, "signingKeyId");
    if (typeof sign !== "function" || typeof sink !== "function") throw new TypeError("sign and sink callbacks are required");
    const nextSequence = checkpoint?.next_sequence ?? 0;
    const previousEventHash = checkpoint?.previous_event_hash ?? null;
    const lastOccurredAt = checkpoint?.last_occurred_at ?? null;
    if (!Number.isInteger(nextSequence) || nextSequence < 0) throw new TypeError("checkpoint.next_sequence must be a non-negative integer");
    if (nextSequence === 0 && (previousEventHash !== null || lastOccurredAt !== null)) throw new TypeError("a genesis checkpoint cannot contain tail state");
    if (nextSequence > 0 && !/^[a-f0-9]{64}$/.test(previousEventHash || "")) throw new TypeError("a resumed checkpoint requires previous_event_hash");
    if (nextSequence > 0 && (typeof lastOccurredAt !== "string" || !lastOccurredAt.endsWith("Z") || Number.isNaN(Date.parse(lastOccurredAt)))) throw new TypeError("a resumed checkpoint requires last_occurred_at");
    Object.assign(this, { deploymentId, environmentId, robotId, signingKeyId, sign, sink, now, eventId, nextSequence, previousEventHash, lastOccurredAt });
    this.queue = Promise.resolve();
  }

  emit(input) {
    const operation = this.queue.then(() => this._emit(input));
    this.queue = operation.catch(() => undefined);
    return operation;
  }

  async _emit({ type, payload, occurredAt }) {
    if (!EVENT_TYPES.has(type)) throw new TypeError("unknown WANTED event type");
    const safePayload = structuredClone(payload);
    validatePayload(type, safePayload);
    if (this.nextSequence === 0 && (type !== "DEPLOYMENT_LIFECYCLE" || safePayload.phase !== "activation")) throw new TypeError("sequence zero must be a DEPLOYMENT_LIFECYCLE activation");
    if (type === "DEPLOYMENT_LIFECYCLE" && safePayload.phase === "activation" && this.nextSequence !== 0) throw new TypeError("activation is permitted only at sequence zero");
    const timestamp = occurredAt ?? this.now().toISOString();
    if (typeof timestamp !== "string" || !timestamp.endsWith("Z") || Number.isNaN(Date.parse(timestamp))) throw new TypeError("occurredAt must be RFC 3339 UTC ending in Z");
    if (this.lastOccurredAt && Date.parse(timestamp) < Date.parse(this.lastOccurredAt)) throw new TypeError("occurredAt cannot move backward from the accepted checkpoint");
    const nextEventId = this.eventId();
    if (typeof nextEventId !== "string" || nextEventId.length < 8 || nextEventId.length > 128) throw new TypeError("eventId must return 8–128 characters");
    const unsigned = {
      schema_version: "0.2",
      event_id: nextEventId,
      deployment_id: this.deploymentId,
      environment_id: this.environmentId,
      robot_id: this.robotId,
      sequence: this.nextSequence,
      occurred_at: timestamp,
      type,
      payload: safePayload,
      ...(this.previousEventHash ? { previous_event_hash: this.previousEventHash } : {}),
      signing_key_id: this.signingKeyId,
    };
    const signed = await this.sign(new TextEncoder().encode(canonicalize(unsigned)), unsigned);
    const signature = typeof signed === "string" ? signed : base64url(signed);
    if (!/^[A-Za-z0-9_-]{86}$/.test(signature)) throw new TypeError("0.2-T1 sign must return one 64-byte Ed25519 signature as unpadded base64url");
    const event = deepFreeze({ ...unsigned, signature });
    const acceptedHash = await sha256Hex(event);
    await this.sink(event);
    this.previousEventHash = acceptedHash;
    this.lastOccurredAt = timestamp;
    this.nextSequence += 1;
    return event;
  }

  checkpoint() {
    return Object.freeze({ next_sequence: this.nextSequence, previous_event_hash: this.previousEventHash, last_occurred_at: this.lastOccurredAt });
  }

  lifecycle(phase, details = {}, occurredAt) { return this.emit({ type: "DEPLOYMENT_LIFECYCLE", occurredAt, payload: { phase, ...details } }); }
  state(state, details = {}, occurredAt) { return this.emit({ type: "ROBOT_STATE", occurredAt, payload: { state, ...details } }); }
  request(requestType, details = {}, occurredAt) { return this.emit({ type: "HUMAN_REQUEST", occurredAt, payload: { request_type: requestType, ...details } }); }
  action(intent, details = {}, occurredAt) { return this.emit({ type: "ROBOT_ACTION", occurredAt, payload: { intent, ...details } }); }
  intervention(mode, durationSeconds, reason, details = {}, occurredAt) { return this.emit({ type: "HUMAN_INTERVENTION", occurredAt, payload: { mode, duration_seconds: durationSeconds, reason, ...details } }); }
  incident(level, summary, details = {}, occurredAt) { return this.emit({ type: "INCIDENT", occurredAt, payload: { level, summary, ...details } }); }
}
`;

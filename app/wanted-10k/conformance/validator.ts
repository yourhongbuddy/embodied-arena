export const eventTypes = ["DEPLOYMENT_LIFECYCLE", "ROBOT_STATE", "HUMAN_REQUEST", "ROBOT_ACTION", "HUMAN_INTERVENTION", "INCIDENT"] as const;
export const TELEMETRY_AUTHENTICITY_VERSION = "0.2-T1";
const required = ["schema_version", "event_id", "deployment_id", "environment_id", "robot_id", "sequence", "occurred_at", "type", "payload", "signing_key_id", "signature"];
const allowed = new Set([...required, "previous_event_hash"]);
type EventType = typeof eventTypes[number];
type WantedEvent = Record<string, unknown> & { type: EventType; sequence: number; occurred_at: string; payload: Record<string, unknown> };
export type SigningKey = { key_id: string; public_key_base64url: string; valid_from: string; valid_until: string | null; revoked_at: string | null };
export type KeyManifest = { profile_version: string; protocol_version: string; algorithm: string; canonicalization: string; signature_scope: string; key_manifest_id: string; keys: SigningKey[] };
export type Validation = { status: "pass" | "fail" | "idle"; events: number; coverage: number; chainLinks: number; signaturesVerified: number; signatureFailures: number; invalidSignatures: number; unknownKeyIds: number; expiredKeyEvents: number; revokedKeyEvents: number; hashChainMismatches: number; keyManifestId: string | null; errors: string[]; warnings: string[] };
export const emptyResult: Validation = { status: "idle", events: 0, coverage: 0, chainLinks: 0, signaturesVerified: 0, signatureFailures: 0, invalidSignatures: 0, unknownKeyIds: 0, expiredKeyEvents: 0, revokedKeyEvents: 0, hashChainMismatches: 0, keyManifestId: null, errors: [], warnings: [] };

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

function decodeBase64url(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("not base64url");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
}

function encodeBase64url(value: ArrayBuffer) {
  const bytes = new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function signingBytes(event: Record<string, unknown>) {
  const unsigned = { ...event };
  delete unsigned.signature;
  return new TextEncoder().encode(canonicalize(unsigned));
}

export function validateKeyManifest(text: string) {
  const errors: string[] = [];
  let manifest: KeyManifest | null = null;
  try {
    const parsed = JSON.parse(text);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("key manifest must be a JSON object");
    manifest = parsed as KeyManifest;
  } catch (error) {
    errors.push(`Key manifest: ${error instanceof Error ? error.message : "invalid JSON"}.`);
    return { manifest, errors };
  }
  if (manifest.profile_version !== TELEMETRY_AUTHENTICITY_VERSION) errors.push(`Key manifest: profile_version must be ${TELEMETRY_AUTHENTICITY_VERSION}.`);
  if (manifest.protocol_version !== "0.2") errors.push("Key manifest: protocol_version must be 0.2.");
  if (manifest.algorithm !== "Ed25519") errors.push("Key manifest: algorithm must be Ed25519.");
  if (manifest.canonicalization !== "RFC8785_JCS") errors.push("Key manifest: canonicalization must be RFC8785_JCS.");
  if (manifest.signature_scope !== "current_event_without_signature") errors.push("Key manifest: signature_scope must be current_event_without_signature.");
  if (typeof manifest.key_manifest_id !== "string" || manifest.key_manifest_id.length < 8 || manifest.key_manifest_id.length > 128) errors.push("Key manifest: key_manifest_id must contain 8–128 characters.");
  if (!Array.isArray(manifest.keys) || !manifest.keys.length) errors.push("Key manifest: provide at least one signing key.");
  const identifiers = new Set<string>();
  for (const [index, key] of (Array.isArray(manifest.keys) ? manifest.keys : []).entries()) {
    const label = `Key ${index + 1}`;
    if (!key || typeof key !== "object") { errors.push(`${label}: key must be an object.`); continue; }
    if (typeof key.key_id !== "string" || !key.key_id.length || key.key_id.length > 128) errors.push(`${label}: key_id must contain 1–128 characters.`);
    else if (identifiers.has(key.key_id)) errors.push(`${label}: duplicate key_id ${key.key_id}.`);
    identifiers.add(key.key_id);
    try { if (decodeBase64url(key.public_key_base64url).length !== 32) errors.push(`${label}: Ed25519 public key must decode to 32 bytes.`); } catch { errors.push(`${label}: public_key_base64url must be unpadded base64url.`); }
    const from = Date.parse(key.valid_from);
    const until = key.valid_until === null ? null : Date.parse(key.valid_until);
    const revoked = key.revoked_at === null ? null : Date.parse(key.revoked_at);
    if (!key.valid_from?.endsWith("Z") || Number.isNaN(from)) errors.push(`${label}: valid_from must be a UTC timestamp ending in Z.`);
    if (key.valid_until !== null && (!key.valid_until?.endsWith("Z") || Number.isNaN(until) || Number(until) <= from)) errors.push(`${label}: valid_until must be null or later than valid_from.`);
    if (key.revoked_at !== null && (!key.revoked_at?.endsWith("Z") || Number.isNaN(revoked) || Number(revoked) < from)) errors.push(`${label}: revoked_at must be null or no earlier than valid_from.`);
  }
  return { manifest, errors };
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

export async function validateStream(text: string, keyManifestText = ""): Promise<Validation> {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const errors: string[] = [];
  const warnings: string[] = [];
  const events: WantedEvent[] = [];
  const keyResult = validateKeyManifest(keyManifestText);
  errors.push(...keyResult.errors);
  const keys = new Map((keyResult.manifest?.keys ?? []).map(key => [key.key_id, key]));
  const importedKeys = new Map<string, CryptoKey>();
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
  if (events.length !== lines.length) return { ...emptyResult, status: "fail", events: events.length, keyManifestId: keyResult.manifest?.key_manifest_id ?? null, errors, warnings };

  const ids = new Set<string>();
  const seenTypes = new Set<EventType>();
  let chainLinks = 0;
  let signaturesVerified = 0;
  let signatureFailures = 0;
  let invalidSignatures = 0;
  const unknownKeyIds = new Set<string>();
  let expiredKeyEvents = 0;
  let revokedKeyEvents = 0;
  let hashChainMismatches = 0;
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
    if (typeof event.signature !== "string" || !/^[A-Za-z0-9_-]+$/.test(event.signature)) {
      errors.push(`Line ${line}: signature must be unpadded base64url text.`);
      signatureFailures++;
      invalidSignatures++;
    } else {
      const key = keys.get(String(event.signing_key_id));
      const occurred = Date.parse(event.occurred_at);
      let eligible = true;
      if (!key) { errors.push(`Line ${line}: signing_key_id is absent from the frozen key manifest.`); unknownKeyIds.add(String(event.signing_key_id)); eligible = false; }
      if (key) {
        const from = Date.parse(key.valid_from), until = key.valid_until === null ? null : Date.parse(key.valid_until), revoked = key.revoked_at === null ? null : Date.parse(key.revoked_at);
        if (!Number.isNaN(occurred) && occurred < from) { errors.push(`Line ${line}: signing key was not yet valid.`); eligible = false; }
        if (!Number.isNaN(occurred) && until !== null && occurred >= until) { errors.push(`Line ${line}: signing key had expired.`); expiredKeyEvents++; eligible = false; }
        if (!Number.isNaN(occurred) && revoked !== null && occurred >= revoked) { errors.push(`Line ${line}: signing key was revoked.`); revokedKeyEvents++; eligible = false; }
      }
      try {
        const signature = decodeBase64url(event.signature);
        if (signature.length !== 64) throw new Error("Ed25519 signatures must decode to 64 bytes");
        if (key && eligible) {
          let imported = importedKeys.get(key.key_id);
          if (!imported) { imported = await crypto.subtle.importKey("raw", decodeBase64url(key.public_key_base64url), { name: "Ed25519" }, false, ["verify"]); importedKeys.set(key.key_id, imported); }
          if (await crypto.subtle.verify({ name: "Ed25519" }, imported, signature, signingBytes(event))) signaturesVerified++;
          else { errors.push(`Line ${line}: Ed25519 signature verification failed.`); signatureFailures++; invalidSignatures++; }
        } else signatureFailures++;
      } catch (error) {
        errors.push(`Line ${line}: ${error instanceof Error ? error.message : "signature verification failed"}.`);
        signatureFailures++;
        invalidSignatures++;
      }
    }
    if (index === 0 && "previous_event_hash" in event) {
      if (typeof event.previous_event_hash !== "string" || !/^[a-f0-9]{64}$/.test(event.previous_event_hash)) errors.push("Line 1: supplied previous_event_hash must be 64 lowercase hexadecimal characters.");
      else warnings.push("Line 1: genesis event may omit previous_event_hash; supplied value was not used.");
    }
    if (index > 0) {
      if (event.deployment_id !== events[0].deployment_id) errors.push(`Line ${line}: deployment_id changed inside one ordered stream.`);
      if (event.environment_id !== events[0].environment_id) errors.push(`Line ${line}: environment_id changed inside one ordered stream.`);
      if (Date.parse(event.occurred_at) < Date.parse(events[index - 1].occurred_at)) errors.push(`Line ${line}: occurred_at moved backward.`);
      const expected = await sha256(events[index - 1]);
      if (event.previous_event_hash !== expected) { errors.push(`Line ${line}: previous_event_hash does not match the RFC 8785 / SHA-256 digest of line ${line - 1}.`); hashChainMismatches++; } else chainLinks++;
    }
  }
  const missingTypes = eventTypes.filter(type => !seenTypes.has(type));
  if (missingTypes.length) warnings.push(`Coverage sample omits ${missingTypes.join(", ")}. A production stream need not emit every type in every file, but adapter qualification exercises all six.`);
  return { status: errors.length ? "fail" : "pass", events: events.length, coverage: seenTypes.size, chainLinks, signaturesVerified, signatureFailures, invalidSignatures, unknownKeyIds: unknownKeyIds.size, expiredKeyEvents, revokedKeyEvents, hashChainMismatches, keyManifestId: keyResult.manifest?.key_manifest_id ?? null, errors, warnings };
}

export const sampleKeyManifest: KeyManifest = {
  profile_version: TELEMETRY_AUTHENTICITY_VERSION,
  protocol_version: "0.2",
  algorithm: "Ed25519",
  canonicalization: "RFC8785_JCS",
  signature_scope: "current_event_without_signature",
  key_manifest_id: "synthetic-demo-key-manifest",
  keys: [{ key_id: "demo_ed25519_key_01", public_key_base64url: "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo", valid_from: "2026-01-01T00:00:00Z", valid_until: "2027-01-01T00:00:00Z", revoked_at: null }],
};

export async function sampleBundle(identity: Partial<{ deployment_id: string; environment_id: string; robot_id: string; include_end: boolean }> = {}) {
  const base = { schema_version: "0.2", deployment_id: identity.deployment_id ?? "dep_demo_001", environment_id: identity.environment_id ?? "env_demo_001", robot_id: identity.robot_id ?? "robot_demo_001", signing_key_id: "demo_ed25519_key_01" };
  const seed = Uint8Array.from("9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60".match(/../g) ?? [], value => Number.parseInt(value, 16));
  const prefix = Uint8Array.from("302e020100300506032b657004220420".match(/../g) ?? [], value => Number.parseInt(value, 16));
  const privateKey = await crypto.subtle.importKey("pkcs8", new Uint8Array([...prefix, ...seed]), { name: "Ed25519" }, false, ["sign"]);
  const partials = [
    { type: "DEPLOYMENT_LIFECYCLE", payload: { phase: "activation", participant_acceptance_ref: "controlled://acceptance/1", activation_record_sha256: "ab0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd" } },
    { type: "ROBOT_STATE", payload: { state: "available", autonomous_service_capable: true } },
    { type: "HUMAN_REQUEST", payload: { request_type: "task", evidence_ref: "local://request/1" } },
    { type: "ROBOT_ACTION", payload: { intent: "bring water", proactive: false } },
    { type: "HUMAN_INTERVENTION", payload: { mode: "remote_guidance", duration_seconds: 18, reason: "recovery" } },
    { type: "INCIDENT", payload: { level: "L1", summary: "Robot briefly blocked a hallway.", participant_requested_stop: false } },
    ...(identity.include_end ? [{ type: "DEPLOYMENT_LIFECYCLE" as const, payload: { phase: "end", disposition: "administrative_completion", evidence_ref: "controlled://disposition/1" } }] : []),
  ] as const;
  const events: Record<string, unknown>[] = [];
  for (let index = 0; index < partials.length; index++) {
    const event: Record<string, unknown> = { ...base, event_id: `evt_demo_00${index}`, sequence: index, occurred_at: `2026-08-28T18:0${index}:00Z`, ...partials[index] };
    if (index > 0) event.previous_event_hash = await sha256(events[index - 1]);
    event.signature = encodeBase64url(await crypto.subtle.sign({ name: "Ed25519" }, privateKey, signingBytes(event)));
    events.push(event);
  }
  return { jsonl: events.map(event => JSON.stringify(event)).join("\n"), keyManifest: JSON.stringify(sampleKeyManifest, null, 2) };
}

export async function sampleJsonl() { return (await sampleBundle()).jsonl; }

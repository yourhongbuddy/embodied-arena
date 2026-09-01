export const TELEMETRY_VERIFIER_SDK_VERSION = "0.2-TS1";

export const telemetryVerifierSdkSource = String.raw`/**
 * WANTED-10K telemetry verifier — Protocol 0.2-TS1 / authenticity 0.2-T1
 *
 * Zero runtime dependencies. Verification is local and performs no network
 * requests. Supply one JSONL event stream and its frozen key manifest.
 */

export const TELEMETRY_VERIFIER_SDK_VERSION = "0.2-TS1";
export const TELEMETRY_AUTHENTICITY_VERSION = "0.2-T1";
export const EVENT_TYPES = Object.freeze(["DEPLOYMENT_LIFECYCLE", "ROBOT_STATE", "HUMAN_REQUEST", "ROBOT_ACTION", "HUMAN_INTERVENTION", "INCIDENT"]);

const REQUIRED = Object.freeze(["schema_version", "event_id", "deployment_id", "environment_id", "robot_id", "sequence", "occurred_at", "type", "payload", "signing_key_id", "signature"]);
const ALLOWED = new Set([...REQUIRED, "previous_event_hash"]);

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function assertIJson(value, path = "value") {
  if (["undefined", "bigint", "function", "symbol"].includes(typeof value)) throw new TypeError(path + " is not an I-JSON value");
  if (typeof value === "number" && !Number.isFinite(value)) throw new TypeError(path + " contains a non-finite number");
  if (typeof value === "string" && /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)) throw new TypeError(path + " contains an unpaired Unicode surrogate");
  if (Array.isArray(value)) value.forEach((item, index) => assertIJson(item, path + "[" + index + "]"));
  else if (value && typeof value === "object") {
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new TypeError(path + " must contain plain JSON objects");
    for (const [key, item] of Object.entries(value)) {
      assertIJson(key, path + ".<key>");
      assertIJson(item, path + "." + key);
    }
  }
}

/** RFC 8785 JCS serialization for I-JSON values. */
export function canonicalize(value) {
  assertIJson(value);
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonicalize(value[key])).join(",") + "}";
}

function decodeBase64url(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("value is not unpadded base64url");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const decoded = atob(padded);
  return Uint8Array.from(decoded, character => character.charCodeAt(0));
}

function hex(value) {
  return Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(value) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalize(value))));
}

export function eventSigningBytes(event) {
  const unsigned = { ...event };
  delete unsigned.signature;
  return new TextEncoder().encode(canonicalize(unsigned));
}

function parseManifest(input) {
  if (typeof input === "string") return JSON.parse(input);
  if (!object(input)) throw new TypeError("key manifest must be a JSON object or JSON text");
  return structuredClone(input);
}

export function validateKeyManifest(input) {
  const errors = [];
  let manifest = null;
  try {
    manifest = parseManifest(input);
    assertIJson(manifest, "key manifest");
  } catch (error) {
    errors.push("Key manifest: " + (error instanceof Error ? error.message : "invalid JSON") + ".");
    return { manifest: null, errors };
  }
  if (manifest.profile_version !== TELEMETRY_AUTHENTICITY_VERSION) errors.push("Key manifest: profile_version must be 0.2-T1.");
  if (manifest.protocol_version !== "0.2") errors.push("Key manifest: protocol_version must be 0.2.");
  if (manifest.algorithm !== "Ed25519") errors.push("Key manifest: algorithm must be Ed25519.");
  if (manifest.canonicalization !== "RFC8785_JCS") errors.push("Key manifest: canonicalization must be RFC8785_JCS.");
  if (manifest.signature_scope !== "current_event_without_signature") errors.push("Key manifest: signature_scope must be current_event_without_signature.");
  const manifestFields = new Set(["profile_version", "protocol_version", "algorithm", "canonicalization", "signature_scope", "key_manifest_id", "keys"]);
  for (const field of Object.keys(manifest)) if (!manifestFields.has(field)) errors.push("Key manifest: unexpected field " + field + ".");
  if (typeof manifest.key_manifest_id !== "string" || manifest.key_manifest_id.length < 8 || manifest.key_manifest_id.length > 128) errors.push("Key manifest: key_manifest_id must contain 8–128 characters.");
  if (!Array.isArray(manifest.keys) || !manifest.keys.length) errors.push("Key manifest: provide at least one signing key.");
  const ids = new Set();
  for (const [index, key] of (Array.isArray(manifest.keys) ? manifest.keys : []).entries()) {
    const label = "Key " + (index + 1);
    if (!object(key)) { errors.push(label + ": key must be an object."); continue; }
    const allowed = new Set(["key_id", "public_key_base64url", "valid_from", "valid_until", "revoked_at"]);
    for (const field of allowed) if (!(field in key)) errors.push(label + ": missing " + field + ".");
    for (const field of Object.keys(key)) if (!allowed.has(field)) errors.push(label + ": unexpected field " + field + ".");
    if (typeof key.key_id !== "string" || key.key_id.length < 1 || key.key_id.length > 128) errors.push(label + ": key_id must contain 1–128 characters.");
    else if (ids.has(key.key_id)) errors.push(label + ": duplicate key_id " + key.key_id + ".");
    ids.add(key.key_id);
    try { if (decodeBase64url(key.public_key_base64url).length !== 32) throw new Error("Ed25519 public key must decode to 32 bytes"); }
    catch (error) { errors.push(label + ": " + (error instanceof Error ? error.message : "invalid public key") + "."); }
    const from = Date.parse(key.valid_from);
    const until = key.valid_until === null ? null : Date.parse(key.valid_until);
    const revoked = key.revoked_at === null ? null : Date.parse(key.revoked_at);
    if (typeof key.valid_from !== "string" || !key.valid_from.endsWith("Z") || Number.isNaN(from)) errors.push(label + ": valid_from must be a UTC timestamp ending in Z.");
    if (key.valid_until !== null && (typeof key.valid_until !== "string" || !key.valid_until.endsWith("Z") || Number.isNaN(until) || until <= from)) errors.push(label + ": valid_until must be null or later than valid_from.");
    if (key.revoked_at !== null && (typeof key.revoked_at !== "string" || !key.revoked_at.endsWith("Z") || Number.isNaN(revoked) || revoked < from)) errors.push(label + ": revoked_at must be null or no earlier than valid_from.");
  }
  return { manifest, errors };
}

function payloadErrors(event, line) {
  const errors = [], payload = event.payload;
  if (event.type === "DEPLOYMENT_LIFECYCLE") {
    if (!["activation", "end"].includes(payload.phase)) errors.push("Line " + line + ": DEPLOYMENT_LIFECYCLE requires phase activation or end.");
    if (payload.phase === "activation" && (event.sequence !== 0 || typeof payload.participant_acceptance_ref !== "string" || !payload.participant_acceptance_ref || typeof payload.activation_record_sha256 !== "string" || !/^[a-f0-9]{64}$/.test(payload.activation_record_sha256))) errors.push("Line " + line + ": activation must be sequence zero and bind participant_acceptance_ref plus activation_record_sha256.");
    if (payload.phase === "end" && (!['voluntary_rejection', 'administrative_completion', 'unrelated_exit', 'safety_termination', 'developer_withdrawal', 'consent_privacy_withdrawal', 'observation_cutoff'].includes(payload.disposition) || typeof payload.evidence_ref !== "string" || !payload.evidence_ref)) errors.push("Line " + line + ": end requires a recognized disposition and evidence_ref.");
  }
  if (event.type === "ROBOT_STATE" && !["available", "charging", "sleeping", "updating", "degraded", "awaiting_assistance", "removed"].includes(payload.state)) errors.push("Line " + line + ": ROBOT_STATE requires a recognized payload.state.");
  if (event.type === "HUMAN_REQUEST") {
    if (!["task", "stop", "pause", "privacy", "delete_memory", "do_not_remember", "permanent_removal", "return_robot", "other"].includes(payload.request_type)) errors.push("Line " + line + ": HUMAN_REQUEST requires a recognized payload.request_type.");
    if (payload.request_type === "permanent_removal" && (payload.uncoerced !== true || typeof payload.evidence_ref !== "string" || !payload.evidence_ref)) errors.push("Line " + line + ": permanent_removal requires uncoerced=true and payload.evidence_ref.");
  }
  if (event.type === "ROBOT_ACTION" && (typeof payload.intent !== "string" || !payload.intent)) errors.push("Line " + line + ": ROBOT_ACTION requires payload.intent.");
  if (event.type === "HUMAN_INTERVENTION") {
    if (!["onsite_rescue", "remote_guidance", "teleoperation", "maintenance", "researcher_contact"].includes(payload.mode)) errors.push("Line " + line + ": HUMAN_INTERVENTION requires a recognized payload.mode.");
    if (typeof payload.duration_seconds !== "number" || !Number.isFinite(payload.duration_seconds) || payload.duration_seconds < 0) errors.push("Line " + line + ": HUMAN_INTERVENTION requires finite non-negative payload.duration_seconds.");
    if (typeof payload.reason !== "string" || !payload.reason) errors.push("Line " + line + ": HUMAN_INTERVENTION requires payload.reason.");
  }
  if (event.type === "INCIDENT" && (!["L0", "L1", "L2", "L3", "L4"].includes(payload.level) || typeof payload.summary !== "string" || !payload.summary)) errors.push("Line " + line + ": INCIDENT requires level L0–L4 and summary.");
  return errors;
}

function emptyResult(errors = [], keyManifestId = null) {
  return { status: "fail", events: 0, coverage: 0, chainLinks: 0, signaturesVerified: 0, signatureFailures: 0, invalidSignatures: 0, unknownKeyIds: 0, expiredKeyEvents: 0, revokedKeyEvents: 0, hashChainMismatches: 0, keyManifestId, errors, warnings: [] };
}

export async function verifyTelemetryJsonl(jsonl, keyManifestInput) {
  if (typeof jsonl !== "string") throw new TypeError("telemetry must be JSONL text");
  const keyResult = validateKeyManifest(keyManifestInput);
  const errors = [...keyResult.errors], warnings = [];
  const lines = jsonl.split(/\r?\n/).map(line => line.trim()).filter(Boolean), events = [];
  for (let index = 0; index < lines.length; index++) {
    try {
      const parsed = JSON.parse(lines[index]);
      if (!object(parsed)) throw new Error("event must be a JSON object");
      assertIJson(parsed, "Line " + (index + 1));
      events.push(parsed);
    } catch (error) { errors.push("Line " + (index + 1) + ": " + (error instanceof Error ? error.message : "invalid JSON") + "."); }
  }
  if (!lines.length) errors.push("Provide at least one non-empty JSONL event.");
  if (events.length !== lines.length) return { ...emptyResult(errors, keyResult.manifest?.key_manifest_id ?? null), events: events.length };

  const manifestKeys = Array.isArray(keyResult.manifest?.keys) ? keyResult.manifest.keys : [];
  const keys = new Map(manifestKeys.map(key => [key.key_id, key]));
  const importedKeys = new Map(), eventIds = new Set(), seenTypes = new Set(), unknownKeyIds = new Set();
  let chainLinks = 0, signaturesVerified = 0, signatureFailures = 0, invalidSignatures = 0, expiredKeyEvents = 0, revokedKeyEvents = 0, hashChainMismatches = 0;
  for (let index = 0; index < events.length; index++) {
    const event = events[index], line = index + 1;
    for (const field of REQUIRED) if (!(field in event)) errors.push("Line " + line + ": missing " + field + ".");
    for (const field of Object.keys(event)) if (!ALLOWED.has(field)) errors.push("Line " + line + ": unexpected field " + field + ".");
    if (event.schema_version !== "0.2") errors.push("Line " + line + ": schema_version must be 0.2.");
    for (const field of ["deployment_id", "environment_id", "robot_id", "signing_key_id"]) if (typeof event[field] !== "string" || event[field].length < 1 || event[field].length > 128) errors.push("Line " + line + ": " + field + " must contain 1–128 characters.");
    if (typeof event.event_id !== "string" || event.event_id.length < 8 || event.event_id.length > 128) errors.push("Line " + line + ": event_id must contain 8–128 characters.");
    else if (eventIds.has(event.event_id)) errors.push("Line " + line + ": duplicate event_id " + event.event_id + ".");
    if (typeof event.event_id === "string") eventIds.add(event.event_id);
    if (!Number.isInteger(event.sequence) || event.sequence < 0) errors.push("Line " + line + ": sequence must be a non-negative integer.");
    if (event.sequence !== index) errors.push("Line " + line + ": expected contiguous sequence " + index + ", received " + String(event.sequence) + ".");
    if (typeof event.occurred_at !== "string" || !event.occurred_at.endsWith("Z") || Number.isNaN(Date.parse(event.occurred_at))) errors.push("Line " + line + ": occurred_at must be a valid UTC timestamp ending in Z.");
    if (!EVENT_TYPES.includes(event.type)) errors.push("Line " + line + ": unrecognized event type " + String(event.type) + "."); else seenTypes.add(event.type);
    if (!object(event.payload)) errors.push("Line " + line + ": payload must be an object."); else errors.push(...payloadErrors(event, line));
    if (index === 0 && (event.type !== "DEPLOYMENT_LIFECYCLE" || event.payload?.phase !== "activation")) errors.push("Line 1: sequence zero must be a DEPLOYMENT_LIFECYCLE activation.");

    const key = keys.get(String(event.signing_key_id));
    const occurred = Date.parse(event.occurred_at);
    let keyEligible = true;
    if (!key) { errors.push("Line " + line + ": signing_key_id is absent from the frozen key manifest."); unknownKeyIds.add(String(event.signing_key_id)); keyEligible = false; }
    if (key) {
      const from = Date.parse(key.valid_from), until = key.valid_until === null ? null : Date.parse(key.valid_until), revoked = key.revoked_at === null ? null : Date.parse(key.revoked_at);
      if (!Number.isNaN(occurred) && occurred < from) { errors.push("Line " + line + ": signing key was not yet valid."); keyEligible = false; }
      if (!Number.isNaN(occurred) && until !== null && occurred >= until) { errors.push("Line " + line + ": signing key had expired."); expiredKeyEvents++; keyEligible = false; }
      if (!Number.isNaN(occurred) && revoked !== null && occurred >= revoked) { errors.push("Line " + line + ": signing key was revoked."); revokedKeyEvents++; keyEligible = false; }
    }
    try {
      const signature = decodeBase64url(event.signature);
      if (signature.length !== 64) throw new Error("Ed25519 signature must decode to 64 bytes");
      if (key && keyEligible) {
        let imported = importedKeys.get(key.key_id);
        if (!imported) { imported = await crypto.subtle.importKey("raw", decodeBase64url(key.public_key_base64url), { name: "Ed25519" }, false, ["verify"]); importedKeys.set(key.key_id, imported); }
        if (await crypto.subtle.verify("Ed25519", imported, signature, eventSigningBytes(event))) signaturesVerified++;
        else { errors.push("Line " + line + ": Ed25519 signature verification failed."); signatureFailures++; invalidSignatures++; }
      } else signatureFailures++;
    } catch (error) {
      errors.push("Line " + line + ": " + (error instanceof Error ? error.message : "signature verification failed") + ".");
      signatureFailures++; invalidSignatures++;
    }
    if (index === 0 && "previous_event_hash" in event) {
      if (typeof event.previous_event_hash !== "string" || !/^[a-f0-9]{64}$/.test(event.previous_event_hash)) errors.push("Line 1: supplied previous_event_hash must be 64 lowercase hexadecimal characters.");
      else warnings.push("Line 1: genesis event may omit previous_event_hash; supplied value is ignored.");
    }
    if (index > 0) {
      if (event.deployment_id !== events[0].deployment_id) errors.push("Line " + line + ": deployment_id changed inside one stream.");
      if (event.environment_id !== events[0].environment_id) errors.push("Line " + line + ": environment_id changed inside one stream.");
      if (Date.parse(event.occurred_at) < Date.parse(events[index - 1].occurred_at)) errors.push("Line " + line + ": occurred_at moved backward.");
      const expected = await sha256Hex(events[index - 1]);
      if (event.previous_event_hash !== expected) { errors.push("Line " + line + ": previous_event_hash does not match the signed digest of line " + (line - 1) + "."); hashChainMismatches++; } else chainLinks++;
    }
  }
  const missingTypes = EVENT_TYPES.filter(type => !seenTypes.has(type));
  if (missingTypes.length) warnings.push("Coverage sample omits " + missingTypes.join(", ") + "; adapter qualification exercises all six types.");
  return { status: errors.length ? "fail" : "pass", events: events.length, coverage: seenTypes.size, chainLinks, signaturesVerified, signatureFailures, invalidSignatures, unknownKeyIds: unknownKeyIds.size, expiredKeyEvents, revokedKeyEvents, hashChainMismatches, keyManifestId: keyResult.manifest?.key_manifest_id ?? null, errors, warnings };
}

export async function verifyTelemetry(events, keyManifest) {
  if (!Array.isArray(events)) throw new TypeError("events must be an array");
  return verifyTelemetryJsonl(events.map(event => JSON.stringify(event)).join("\n"), keyManifest);
}
`;

export const telemetryVerifierSdkContract = {
  name: "WANTED Telemetry Verifier SDK",
  version: TELEMETRY_VERIFIER_SDK_VERSION,
  protocol_version: "0.2",
  authenticity_profile: "0.2-T1",
  module: "/wanted-10k/wanted-telemetry-verifier.mjs",
  format: "JavaScript ESM",
  runtime_dependencies: 0,
  runtime_requirements: ["Web Crypto Ed25519", "TextEncoder", "structuredClone", "atob"],
  performs_network_requests: false,
  input: ["JSONL signed event stream", "frozen telemetry key manifest"],
  exports: ["canonicalize", "sha256Hex", "eventSigningBytes", "validateKeyManifest", "verifyTelemetryJsonl", "verifyTelemetry"],
  verifies: ["strict_I-JSON", "event_shape", "payload_semantics", "contiguous_sequence", "single_deployment_environment", "monotonic_UTC", "event_id_uniqueness", "RFC8785_SHA256_hash_chain", "Ed25519_signatures", "key_manifest_resolution", "key_validity", "key_revocation"],
  result: "pass_only_when_every_event_and_chain_link_verifies",
  privacy: "local_only_no_event_uploads_or_network_requests",
  interpretation: "proves stream integrity and registered-key possession, not sensor truth, complete capture, participant consent, or certification",
} as const;

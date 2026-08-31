import { canonicalize } from "../conformance/validator.ts";

export const AUDIT_SEAL_VERSION = "0.2-V1";

export type AuditSealResult = {
  status: "idle" | "pass" | "fail";
  manifestSha256: string | null;
  publicKeySha256: string | null;
  signatureVerified: boolean;
  errors: string[];
  checks: { id: string; label: string; passed: boolean }[];
};

export const emptyAuditSealResult: AuditSealResult = { status: "idle", manifestSha256: null, publicKeySha256: null, signatureVerified: false, errors: [], checks: [] };

const decodeBase64url = (value: string) => {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("value is not unpadded base64url");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const decoded = atob(padded);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index++) bytes[index] = decoded.charCodeAt(index);
  return bytes;
};

const hex = (value: ArrayBuffer) => Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, "0")).join("");
const sha256Bytes = async (value: Uint8Array<ArrayBuffer>) => hex(await crypto.subtle.digest("SHA-256", value));

export function unsignedAuditManifest(manifest: Record<string, unknown>) {
  const unsigned = structuredClone(manifest);
  const audit = unsigned.audit && typeof unsigned.audit === "object" && !Array.isArray(unsigned.audit) ? unsigned.audit as Record<string, unknown> : {};
  delete audit.manifest_sha256;
  delete audit.auditor_signature;
  unsigned.audit = audit;
  return unsigned;
}

export function auditSigningBytes(manifest: Record<string, unknown>) {
  return new TextEncoder().encode(canonicalize(unsignedAuditManifest(manifest)));
}

export async function verifyAuditSeal(manifest: Record<string, unknown>): Promise<AuditSealResult> {
  const errors: string[] = [];
  const audit = manifest.audit && typeof manifest.audit === "object" && !Array.isArray(manifest.audit) ? manifest.audit as Record<string, unknown> : {};
  const metadataPass = audit.profile_version === AUDIT_SEAL_VERSION && audit.signature_algorithm === "Ed25519" && audit.canonicalization === "RFC8785_JCS" && audit.signature_scope === "audit_manifest_without_audit.manifest_sha256_and_audit.auditor_signature";
  if (!metadataPass) errors.push("Audit seal metadata must freeze profile 0.2-V1, Ed25519, RFC8785_JCS, and the exact non-recursive signature scope.");

  let publicKey: Uint8Array<ArrayBuffer> | null = null;
  try { publicKey = decodeBase64url(String(audit.public_key_base64url)); if (publicKey.length !== 32) throw new Error("Ed25519 public key must decode to 32 bytes"); }
  catch (error) { errors.push(`Auditor public key: ${error instanceof Error ? error.message : "invalid key"}.`); }
  const publicKeySha256 = publicKey ? await sha256Bytes(publicKey) : null;
  const publicKeyPass = publicKeySha256 !== null && publicKeySha256 === audit.public_key_sha256 && typeof audit.public_key_uri === "string" && /^https:\/\//.test(audit.public_key_uri);
  if (!publicKeyPass) errors.push("Auditor public key bytes, declared SHA-256 digest, and HTTPS registry URI must agree.");

  const signingBytes = auditSigningBytes(manifest);
  const manifestSha256 = await sha256Bytes(signingBytes);
  const digestPass = manifestSha256 === audit.manifest_sha256;
  if (!digestPass) errors.push("Declared manifest_sha256 does not match the canonical unsigned audit manifest.");

  let signatureVerified = false;
  try {
    const signature = decodeBase64url(String(audit.auditor_signature));
    if (signature.length !== 64) throw new Error("Ed25519 signature must decode to 64 bytes");
    if (publicKey) {
      const imported = await crypto.subtle.importKey("raw", publicKey, { name: "Ed25519" }, false, ["verify"]);
      signatureVerified = await crypto.subtle.verify({ name: "Ed25519" }, imported, signature, signingBytes);
    }
  } catch (error) { errors.push(`Auditor signature: ${error instanceof Error ? error.message : "verification failed"}.`); }
  if (!signatureVerified && !errors.some(error => error.startsWith("Auditor signature:"))) errors.push("Auditor Ed25519 signature verification failed.");

  const submission = manifest.submission && typeof manifest.submission === "object" && !Array.isArray(manifest.submission) ? manifest.submission as Record<string, unknown> : {};
  const timePass = typeof audit.signed_at === "string" && audit.signed_at.endsWith("Z") && Number.isFinite(Date.parse(audit.signed_at)) && typeof submission.created_at === "string" && Number.isFinite(Date.parse(submission.created_at)) && Date.parse(audit.signed_at) <= Date.parse(submission.created_at);
  if (!timePass) errors.push("Audit signed_at must be valid UTC and no later than submission creation.");

  const checks = [
    { id: "V1", label: "FROZEN SEAL PROFILE", passed: metadataPass },
    { id: "V2", label: "BOUND AUDITOR KEY", passed: publicKeyPass },
    { id: "V3", label: "CANONICAL MANIFEST DIGEST", passed: digestPass },
    { id: "V4", label: "ED25519 SIGNATURE", passed: signatureVerified },
    { id: "V5", label: "SIGNING TIME ORDER", passed: timePass },
  ];
  return { status: checks.every(check => check.passed) ? "pass" : "fail", manifestSha256, publicKeySha256, signatureVerified, errors, checks };
}

export const auditSealContract = {
  name: "WANTED Independent Audit Seal Profile",
  version: AUDIT_SEAL_VERSION,
  protocol_version: "0.2",
  applies_to: ["PREQUALIFIED", "WANTED_LAB", "WANTED_WILD", "WANTED_10K"],
  scoring: "certification_gate_not_score",
  algorithm: "Ed25519",
  canonicalization: "RFC8785_JCS",
  signature_scope: "audit_manifest_without_audit.manifest_sha256_and_audit.auditor_signature",
  digest: "SHA-256_of_exact_signature_bytes",
  verifies: ["seal_profile", "auditor_public_key_digest", "canonical_manifest_digest", "auditor_signature", "signing_time_order"],
  hard_failures: ["unknown_seal_profile", "public_key_digest_mismatch", "manifest_digest_mismatch", "invalid_signature", "audit_after_submission"],
  interpretation: "proves_manifest_integrity_and_possession_of_the_declared_auditor_key_not_auditor_identity_independence_competence_or_underlying_factual_truth",
} as const;

export const auditSealSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/audit-seal.schema.json",
  title: "WANTED-10K Independent Audit Seal",
  type: "object",
  additionalProperties: false,
  required: ["profile_version", "auditor", "auditor_organization", "independence_statement", "scope", "signed_at", "signature_algorithm", "canonicalization", "signature_scope", "public_key_uri", "public_key_base64url", "public_key_sha256", "manifest_sha256", "auditor_signature"],
  properties: {
    profile_version: { const: AUDIT_SEAL_VERSION }, auditor: { type: "string", minLength: 1 }, auditor_organization: { type: "string", minLength: 1 }, independence_statement: { type: "string", minLength: 20 }, scope: { type: "array", minItems: 1, items: { type: "string" } }, signed_at: { type: "string", format: "date-time" }, signature_algorithm: { const: "Ed25519" }, canonicalization: { const: "RFC8785_JCS" }, signature_scope: { const: "audit_manifest_without_audit.manifest_sha256_and_audit.auditor_signature" }, public_key_uri: { type: "string", format: "uri", pattern: "^https://" }, public_key_base64url: { type: "string", pattern: "^[A-Za-z0-9_-]{43}$" }, public_key_sha256: { type: "string", pattern: "^[a-f0-9]{64}$" }, manifest_sha256: { type: "string", pattern: "^[a-f0-9]{64}$" }, auditor_signature: { type: "string", pattern: "^[A-Za-z0-9_-]{86}$" },
  },
} as const;

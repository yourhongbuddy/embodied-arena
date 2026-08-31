export const AUDIT_VERIFIER_SDK_VERSION = "0.2-VS1";

export const auditVerifierSdkSource = String.raw`/**
 * WANTED-10K audit package verifier — Protocol 0.2-VS1
 *
 * Zero runtime dependencies. Uses Web Crypto, verifies locally, and performs
 * no network requests. The bundled root is synthetic-test only; callers must
 * explicitly supply a pinned production root for official submissions.
 */

export const AUDIT_VERIFIER_SDK_VERSION = "0.2-VS1";
export const AUDIT_SEAL_VERSION = "0.2-V1";
export const AUDITOR_CREDENTIAL_VERSION = "0.2-V2";

export const DEFAULT_SYNTHETIC_TRUST_ROOT = Object.freeze({
  registry_environment: "synthetic_test",
  registry_id: "wanted-synthetic-auditor-registry",
  issuer_key_id: "wanted-synthetic-root-2026-02",
  issuer_public_key_base64url: "4veHvbfG_LbMTqfWew6jcwS5E3CJ-zA9wQgYLOPGp1A",
  issuer_public_key_sha256: "cbe84409634785bce65986017c312bfd2b42f3743daac679832c48d651f0588d",
  minimum_registry_version: 1,
  maximum_status_age_hours: 24,
});

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function assertIJson(value, path = "manifest") {
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
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("value is not unpadded base64url");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const decoded = atob(padded);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index++) bytes[index] = decoded.charCodeAt(index);
  return bytes;
}

function hex(value) {
  return Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Bytes(value) {
  return hex(await crypto.subtle.digest("SHA-256", value));
}

export function unsignedAuditManifest(manifest) {
  const unsigned = structuredClone(manifest);
  const audit = object(unsigned.audit);
  delete audit.manifest_sha256;
  delete audit.auditor_signature;
  unsigned.audit = audit;
  return unsigned;
}

export function auditSigningBytes(manifest) {
  return new TextEncoder().encode(canonicalize(unsignedAuditManifest(manifest)));
}

export function unsignedAuditorCredential(credential) {
  const unsigned = structuredClone(credential);
  delete unsigned.credential_sha256;
  delete unsigned.issuer_signature;
  return unsigned;
}

export function auditorCredentialSigningBytes(credential) {
  return new TextEncoder().encode(canonicalize(unsignedAuditorCredential(credential)));
}

export async function verifyAuditSeal(manifest) {
  const errors = [];
  const audit = object(manifest.audit);
  const metadataPass = audit.profile_version === AUDIT_SEAL_VERSION && audit.signature_algorithm === "Ed25519" && audit.canonicalization === "RFC8785_JCS" && audit.signature_scope === "audit_manifest_without_audit.manifest_sha256_and_audit.auditor_signature";
  if (!metadataPass) errors.push("Audit seal metadata must freeze profile 0.2-V1, Ed25519, RFC8785_JCS, and the exact non-recursive signature scope.");

  let publicKey = null;
  try {
    publicKey = decodeBase64url(String(audit.public_key_base64url));
    if (publicKey.length !== 32) throw new Error("Ed25519 public key must decode to 32 bytes");
  } catch (error) {
    errors.push("Auditor public key: " + (error instanceof Error ? error.message : "invalid key") + ".");
  }
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
  } catch (error) {
    errors.push("Auditor signature: " + (error instanceof Error ? error.message : "verification failed") + ".");
  }
  if (!signatureVerified && !errors.some(error => error.startsWith("Auditor signature:"))) errors.push("Auditor Ed25519 signature verification failed.");

  const submission = object(manifest.submission);
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

export async function verifyAuditorCredential(manifest, trustedRoots = [DEFAULT_SYNTHETIC_TRUST_ROOT]) {
  const errors = [];
  const audit = object(manifest.audit);
  const credential = object(audit.credential);
  const subject = object(credential.subject);
  const submission = object(manifest.submission);
  const metadataPass = credential.profile_version === AUDITOR_CREDENTIAL_VERSION && credential.signature_algorithm === "Ed25519" && credential.canonicalization === "RFC8785_JCS" && credential.signature_scope === "credential_without_credential_sha256_and_issuer_signature" && typeof credential.registry_id === "string" && credential.registry_id.length > 0 && Number.isInteger(credential.registry_version) && Number(credential.registry_version) >= 1;
  if (!metadataPass) errors.push("Auditor credential metadata must freeze profile 0.2-V2, its registry, Ed25519, RFC8785_JCS, and the exact non-recursive signature scope.");

  let issuerKey = null;
  try {
    issuerKey = decodeBase64url(String(credential.issuer_public_key_base64url));
    if (issuerKey.length !== 32) throw new Error("issuer key must decode to 32 bytes");
  } catch (error) {
    errors.push("Credential issuer key: " + (error instanceof Error ? error.message : "invalid key") + ".");
  }
  const issuerKeySha256 = issuerKey ? await sha256Bytes(issuerKey) : null;
  const trustedRoot = trustedRoots.find(root => root.registry_environment === credential.registry_environment && root.registry_id === credential.registry_id && root.issuer_key_id === credential.issuer_key_id);
  const trustedRootPass = !!trustedRoot && Number(credential.registry_version) >= trustedRoot.minimum_registry_version && credential.issuer_public_key_base64url === trustedRoot.issuer_public_key_base64url && credential.issuer_public_key_sha256 === trustedRoot.issuer_public_key_sha256 && issuerKeySha256 === trustedRoot.issuer_public_key_sha256;
  if (!trustedRootPass) errors.push("Credential issuer does not match a configured pinned WANTED registry root.");

  const signingBytes = auditorCredentialSigningBytes(credential);
  const credentialSha256 = await sha256Bytes(signingBytes);
  const digestPass = credentialSha256 === credential.credential_sha256;
  if (!digestPass) errors.push("Declared credential_sha256 does not match the canonical unsigned credential.");

  let issuerSignatureVerified = false;
  try {
    const signature = decodeBase64url(String(credential.issuer_signature));
    if (signature.length !== 64) throw new Error("issuer signature must decode to 64 bytes");
    if (issuerKey && trustedRootPass) {
      const imported = await crypto.subtle.importKey("raw", issuerKey, { name: "Ed25519" }, false, ["verify"]);
      issuerSignatureVerified = await crypto.subtle.verify({ name: "Ed25519" }, imported, signature, signingBytes);
    }
  } catch (error) {
    errors.push("Credential issuer signature: " + (error instanceof Error ? error.message : "verification failed") + ".");
  }
  if (!issuerSignatureVerified && !errors.some(error => error.startsWith("Credential issuer signature:"))) errors.push("Credential issuer Ed25519 signature verification failed.");

  const subjectPass = subject.auditor === audit.auditor && subject.auditor_organization === audit.auditor_organization && subject.public_key_base64url === audit.public_key_base64url && subject.public_key_sha256 === audit.public_key_sha256;
  if (!subjectPass) errors.push("Credential subject must exactly bind the auditor, organization, and audit-signing key in the sealed manifest.");
  const targetPass = Array.isArray(subject.authorized_certifications) && subject.authorized_certifications.includes(submission.target_certification);
  if (!targetPass) errors.push("Credential does not authorize the requested certification target.");

  const signedAt = Date.parse(String(audit.signed_at));
  const validFrom = Date.parse(String(credential.valid_from));
  const validUntil = Date.parse(String(credential.valid_until));
  const issuedAt = Date.parse(String(credential.issued_at));
  const statusCheckedAt = Date.parse(String(credential.status_checked_at));
  const statusValidUntil = Date.parse(String(credential.status_valid_until));
  const revokedAt = credential.revoked_at === null ? null : Date.parse(String(credential.revoked_at));
  const lifecyclePass = credential.status === "active" && credential.revoked_at === null && [signedAt, validFrom, validUntil, issuedAt].every(Number.isFinite) && issuedAt <= signedAt && validFrom <= signedAt && signedAt < validUntil && (revokedAt === null || signedAt < revokedAt);
  if (!lifecyclePass) errors.push("Credential must be active, issued, valid, and unrevoked at the audit signing time.");
  const freshnessPass = !!trustedRoot && [statusCheckedAt, statusValidUntil].every(Number.isFinite) && issuedAt === statusCheckedAt && statusCheckedAt <= signedAt && signedAt <= statusValidUntil && statusValidUntil - statusCheckedAt <= trustedRoot.maximum_status_age_hours * 3600000;
  if (!freshnessPass) errors.push("Credential requires a current issuer-signed status proof whose bounded freshness window covers the audit signing time.");
  const modePass = manifest.submission_mode === "test" ? credential.registry_environment === "synthetic_test" : manifest.submission_mode === "official" && credential.registry_environment === "production";
  if (!modePass) errors.push("Test submissions require a synthetic-test registry; official submissions require a separately configured production registry root.");

  const checks = [
    { id: "C1", label: "FROZEN CREDENTIAL PROFILE", passed: metadataPass },
    { id: "C2", label: "PINNED ISSUER ROOT", passed: trustedRootPass },
    { id: "C3", label: "CANONICAL CREDENTIAL DIGEST", passed: digestPass },
    { id: "C4", label: "ISSUER ED25519 SIGNATURE", passed: issuerSignatureVerified },
    { id: "C5", label: "AUDITOR + KEY SUBJECT", passed: subjectPass },
    { id: "C6", label: "TARGET AUTHORIZATION", passed: targetPass },
    { id: "C7", label: "VALIDITY + REVOCATION", passed: lifecyclePass },
    { id: "C8", label: "FRESH STATUS PROOF", passed: freshnessPass },
    { id: "C9", label: "SUBMISSION MODE BOUNDARY", passed: modePass },
  ];
  return { status: checks.every(check => check.passed) ? "pass" : "fail", credentialSha256, issuerSignatureVerified, errors, checks };
}

export async function verifyAuditPackage(manifest, trustedRoots = [DEFAULT_SYNTHETIC_TRUST_ROOT]) {
  const [seal, credential] = await Promise.all([verifyAuditSeal(manifest), verifyAuditorCredential(manifest, trustedRoots)]);
  return { status: seal.status === "pass" && credential.status === "pass" ? "pass" : "fail", seal, credential };
}

export async function verifyAuditPackageJson(text, trustedRoots = [DEFAULT_SYNTHETIC_TRUST_ROOT]) {
  const manifest = JSON.parse(text);
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) throw new TypeError("audit package JSON must contain one object");
  return verifyAuditPackage(manifest, trustedRoots);
}
`;

export const auditVerifierSdkContract = {
  name: "WANTED Audit Verifier SDK",
  version: AUDIT_VERIFIER_SDK_VERSION,
  protocol_version: "0.2",
  module: "/wanted-10k/wanted-audit-verifier.mjs",
  format: "JavaScript ESM",
  runtime_dependencies: 0,
  runtime_requirements: ["Web Crypto Ed25519", "TextEncoder", "structuredClone", "atob"],
  performs_network_requests: false,
  exports: ["canonicalize", "unsignedAuditManifest", "auditSigningBytes", "verifyAuditSeal", "unsignedAuditorCredential", "auditorCredentialSigningBytes", "verifyAuditorCredential", "verifyAuditPackage", "verifyAuditPackageJson"],
  verifies: { seal_profile: "0.2-V1", credential_profile: "0.2-V2", checks: 14 },
  bundled_trust: "synthetic_test_root_only",
  official_mode: "caller_must_supply_one_or_more_pinned_production_trust_roots",
  trust_root_schema: "/wanted-10k/auditor-trust-root.schema.json",
  result: "pass_only_when_all_14_seal_and_credential_checks_pass",
} as const;

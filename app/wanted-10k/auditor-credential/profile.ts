import { canonicalizeAuditJson, decodeBase64url, sha256Bytes, verifyAuditSeal } from "../audit-seal/profile.ts";

export const AUDITOR_CREDENTIAL_VERSION = "0.2-V2";
export const SYNTHETIC_TRUST_ROOT = {
  registry_environment: "synthetic_test",
  registry_id: "wanted-synthetic-auditor-registry",
  issuer_key_id: "wanted-synthetic-root-2026-02",
  issuer_public_key_base64url: "4veHvbfG_LbMTqfWew6jcwS5E3CJ-zA9wQgYLOPGp1A",
  issuer_public_key_sha256: "cbe84409634785bce65986017c312bfd2b42f3743daac679832c48d651f0588d",
  minimum_registry_version: 1,
  maximum_status_age_hours: 24,
} as const;
export type TrustedAuditorRoot = { registry_environment: string; registry_id: string; issuer_key_id: string; issuer_public_key_base64url: string; issuer_public_key_sha256: string; minimum_registry_version: number; maximum_status_age_hours: number };

export type AuditorCredentialResult = {
  status: "pass" | "fail";
  credentialSha256: string | null;
  issuerSignatureVerified: boolean;
  errors: string[];
  checks: { id: string; label: string; passed: boolean }[];
};

const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function unsignedAuditorCredential(credential: Record<string, unknown>) {
  const unsigned = structuredClone(credential);
  delete unsigned.credential_sha256;
  delete unsigned.issuer_signature;
  return unsigned;
}

export function auditorCredentialSigningBytes(credential: Record<string, unknown>) {
  return new TextEncoder().encode(canonicalizeAuditJson(unsignedAuditorCredential(credential)));
}

export async function verifyAuditorCredential(manifest: Record<string, unknown>, trustedRoots: readonly TrustedAuditorRoot[] = [SYNTHETIC_TRUST_ROOT]): Promise<AuditorCredentialResult> {
  const errors: string[] = [];
  const audit = object(manifest.audit), credential = object(audit.credential), subject = object(credential.subject), submission = object(manifest.submission);
  const metadataPass = credential.profile_version === AUDITOR_CREDENTIAL_VERSION && credential.signature_algorithm === "Ed25519" && credential.canonicalization === "RFC8785_JCS" && credential.signature_scope === "credential_without_credential_sha256_and_issuer_signature" && typeof credential.registry_id === "string" && credential.registry_id.length > 0 && Number.isInteger(credential.registry_version) && Number(credential.registry_version) >= 1;
  if (!metadataPass) errors.push("Auditor credential metadata must freeze profile 0.2-V2, its registry, Ed25519, RFC8785_JCS, and the exact non-recursive signature scope.");

  let issuerKey: Uint8Array<ArrayBuffer> | null = null;
  try { issuerKey = decodeBase64url(String(credential.issuer_public_key_base64url)); if (issuerKey.length !== 32) throw new Error("issuer key must decode to 32 bytes"); }
  catch (error) { errors.push(`Credential issuer key: ${error instanceof Error ? error.message : "invalid key"}.`); }
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
  } catch (error) { errors.push(`Credential issuer signature: ${error instanceof Error ? error.message : "verification failed"}.`); }
  if (!issuerSignatureVerified && !errors.some(error => error.startsWith("Credential issuer signature:"))) errors.push("Credential issuer Ed25519 signature verification failed.");

  const subjectPass = subject.auditor === audit.auditor && subject.auditor_organization === audit.auditor_organization && subject.public_key_base64url === audit.public_key_base64url && subject.public_key_sha256 === audit.public_key_sha256;
  if (!subjectPass) errors.push("Credential subject must exactly bind the auditor, organization, and audit-signing key in the sealed manifest.");
  const targetPass = Array.isArray(subject.authorized_certifications) && subject.authorized_certifications.includes(submission.target_certification);
  if (!targetPass) errors.push("Credential does not authorize the requested certification target.");

  const signedAt = Date.parse(String(audit.signed_at)), validFrom = Date.parse(String(credential.valid_from)), validUntil = Date.parse(String(credential.valid_until)), issuedAt = Date.parse(String(credential.issued_at));
  const statusCheckedAt = Date.parse(String(credential.status_checked_at)), statusValidUntil = Date.parse(String(credential.status_valid_until));
  const revokedAt = credential.revoked_at === null ? null : Date.parse(String(credential.revoked_at));
  const lifecyclePass = credential.status === "active" && credential.revoked_at === null && [signedAt, validFrom, validUntil, issuedAt].every(Number.isFinite) && issuedAt <= signedAt && validFrom <= signedAt && signedAt < validUntil && (revokedAt === null || signedAt < revokedAt);
  if (!lifecyclePass) errors.push("Credential must be active, issued, valid, and unrevoked at the audit signing time.");
  const freshnessPass = !!trustedRoot && [statusCheckedAt,statusValidUntil].every(Number.isFinite) && issuedAt === statusCheckedAt && statusCheckedAt <= signedAt && signedAt <= statusValidUntil && statusValidUntil - statusCheckedAt <= trustedRoot.maximum_status_age_hours * 3600000;
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

export async function verifyAuditPackage(manifest: Record<string, unknown>, trustedRoots: readonly TrustedAuditorRoot[] = [SYNTHETIC_TRUST_ROOT]) {
  const [seal, credential] = await Promise.all([verifyAuditSeal(manifest), verifyAuditorCredential(manifest, trustedRoots)]);
  return { status: seal.status === "pass" && credential.status === "pass" ? "pass" as const : "fail" as const, seal, credential };
}

export const auditorCredentialTemplate = {
  profile_version: AUDITOR_CREDENTIAL_VERSION,
  registry_environment: "synthetic_test",
  registry_id: "wanted-synthetic-auditor-registry",
  registry_version: 1,
  credential_id: "auditor-credential-synthetic-001",
  issuer: "WANTED Benchmark Authority — Synthetic Test Root",
  issuer_key_id: SYNTHETIC_TRUST_ROOT.issuer_key_id,
  issuer_public_key_base64url: SYNTHETIC_TRUST_ROOT.issuer_public_key_base64url,
  issuer_public_key_sha256: SYNTHETIC_TRUST_ROOT.issuer_public_key_sha256,
  subject: { auditor: "Synthetic Auditor", auditor_organization: "Independent Example Assurance", public_key_base64url: "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo", public_key_sha256: "21fe31dfa154a261626bf854046fd2271b7bed4b6abe45aa58877ef47f9721b9", authorized_certifications: ["PREQUALIFIED", "WANTED_LAB", "WANTED_WILD", "WANTED_10K"] },
  valid_from: "2026-01-01T00:00:00Z", valid_until: "2027-01-01T00:00:00Z", revoked_at: null, status: "active", issued_at: "2026-08-28T17:00:00Z", status_checked_at: "2026-08-28T17:00:00Z", status_valid_until: "2026-08-29T17:00:00Z",
  signature_algorithm: "Ed25519", canonicalization: "RFC8785_JCS", signature_scope: "credential_without_credential_sha256_and_issuer_signature",
  credential_sha256: "74680a446c1ef0fe0aeefb655c44d1dbf1cb60ac410fc7fe650867b29dc82792",
  issuer_signature: "wfGcYGBrjs6DMC-OREHcSCZlpghjFAYNavf_hlOrPZ1Xxexw4QTYRpTKz24XiisOKJB8vCshDRi31zK2PfOoBw",
} as const;

export const auditorCredentialContract = {
  name: "WANTED Auditor Credential Profile", version: AUDITOR_CREDENTIAL_VERSION, protocol_version: "0.2", scoring: "certification_gate_not_score",
  issuer_trust: "pinned_registry_root", algorithm: "Ed25519", canonicalization: "RFC8785_JCS", signature_scope: "credential_without_credential_sha256_and_issuer_signature",
  registry_freshness: { minimum_version_from_trust_root: true, maximum_status_window_hours: 24, audit_signing_time_must_be_covered: true },
  verifies: ["pinned_issuer_root", "minimum_registry_version", "credential_digest", "issuer_signature", "auditor_and_key_subject", "target_authorization", "validity_and_revocation", "bounded_status_freshness", "submission_mode_boundary"],
  bundled_root: "synthetic_test_only", official_mode: "requires_separately_configured_production_registry_root",
  interpretation: "attests_that_a_pinned_registry_issuer_signed_the_auditor_key_binding_not_legal_identity_professional_competence_independence_or_evidence_truth",
} as const;

export const auditorTrustRootTemplate: TrustedAuditorRoot = SYNTHETIC_TRUST_ROOT;

export const auditorTrustRootSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/auditor-trust-root.schema.json",
  title: "WANTED Auditor Registry Trust Root",
  type: "object",
  additionalProperties: false,
  required: ["registry_environment", "registry_id", "issuer_key_id", "issuer_public_key_base64url", "issuer_public_key_sha256", "minimum_registry_version", "maximum_status_age_hours"],
  properties: {
    registry_environment: { enum: ["synthetic_test", "production"] },
    registry_id: { type: "string", minLength: 1 },
    issuer_key_id: { type: "string", minLength: 1 },
    issuer_public_key_base64url: { type: "string", pattern: "^[A-Za-z0-9_-]{43}$" },
    issuer_public_key_sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    minimum_registry_version: { type: "integer", minimum: 1 },
    maximum_status_age_hours: { type: "number", exclusiveMinimum: 0, maximum: 168 },
  },
} as const;

const digest = { type: "string", pattern: "^[a-f0-9]{64}$" };
export const auditorCredentialSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/auditor-credential.schema.json", title: "WANTED Auditor Credential", type: "object", additionalProperties: false,
  required: ["profile_version", "registry_environment", "registry_id", "registry_version", "credential_id", "issuer", "issuer_key_id", "issuer_public_key_base64url", "issuer_public_key_sha256", "subject", "valid_from", "valid_until", "revoked_at", "status", "issued_at", "status_checked_at", "status_valid_until", "signature_algorithm", "canonicalization", "signature_scope", "credential_sha256", "issuer_signature"],
  properties: {
    profile_version: { const: AUDITOR_CREDENTIAL_VERSION }, registry_environment: { enum: ["synthetic_test", "production"] }, registry_id: { type: "string", minLength: 1 }, registry_version: { type: "integer", minimum: 1 }, credential_id: { type: "string", minLength: 1 }, issuer: { type: "string", minLength: 1 }, issuer_key_id: { type: "string", minLength: 1 }, issuer_public_key_base64url: { type: "string", pattern: "^[A-Za-z0-9_-]{43}$" }, issuer_public_key_sha256: digest,
    subject: { type: "object", additionalProperties: false, required: ["auditor", "auditor_organization", "public_key_base64url", "public_key_sha256", "authorized_certifications"], properties: { auditor: { type: "string", minLength: 1 }, auditor_organization: { type: "string", minLength: 1 }, public_key_base64url: { type: "string", pattern: "^[A-Za-z0-9_-]{43}$" }, public_key_sha256: digest, authorized_certifications: { type: "array", minItems: 1, uniqueItems: true, items: { enum: ["PREQUALIFIED", "WANTED_LAB", "WANTED_WILD", "WANTED_10K"] } } } },
    valid_from: { type: "string", format: "date-time" }, valid_until: { type: "string", format: "date-time" }, revoked_at: { type: ["string", "null"], format: "date-time" }, status: { enum: ["active", "revoked"] }, issued_at: { type: "string", format: "date-time" }, status_checked_at: { type: "string", format: "date-time" }, status_valid_until: { type: "string", format: "date-time" }, signature_algorithm: { const: "Ed25519" }, canonicalization: { const: "RFC8785_JCS" }, signature_scope: { const: "credential_without_credential_sha256_and_issuer_signature" }, credential_sha256: digest, issuer_signature: { type: "string", pattern: "^[A-Za-z0-9_-]{86}$" },
  },
} as const;

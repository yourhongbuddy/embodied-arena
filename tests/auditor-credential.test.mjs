import assert from "node:assert/strict";
import test from "node:test";
import { auditManifestTemplates } from "../app/wanted-10k/audit/manifest.ts";
import { assessManifest } from "../app/wanted-10k/audit/readiness.ts";
import { AUDITOR_CREDENTIAL_VERSION, SYNTHETIC_TRUST_ROOT, auditorCredentialContract, auditorCredentialSchema, auditorCredentialTemplate, verifyAuditPackage, verifyAuditorCredential } from "../app/wanted-10k/auditor-credential/profile.ts";

const clone = value => structuredClone(value);
const check = (result,id) => result.checks.find(item => item.id === id);
const gate = (result,id) => result.gates.find(item => item.id === id);

test("verifies the issuer-signed auditor credential for every certification target", async () => {
  for (const [target,manifest] of Object.entries(auditManifestTemplates)) {
    const credential = await verifyAuditorCredential(manifest);
    assert.equal(credential.status, "pass", `${target}: ${credential.errors.join(" ")}`);
    assert.equal(credential.issuerSignatureVerified, true);
    assert.equal(credential.credentialSha256, manifest.audit.credential.credential_sha256);
    assert.equal(credential.checks.every(item => item.passed), true);
    const auditPackage = await verifyAuditPackage(manifest);
    assert.equal(auditPackage.status, "pass");
    const readiness = await assessManifest(JSON.stringify(manifest));
    assert.equal(gate(readiness,"G6").status, "pass");
    assert.equal(readiness.projection.auditor_credential_verified, true);
  }
});

test("rejects subject substitution and unauthorized certification targets", async () => {
  const subject = clone(auditManifestTemplates.WANTED_WILD);
  subject.audit.credential.subject.auditor_organization = "Substituted Organization";
  assert.equal(check(await verifyAuditorCredential(subject),"C5").passed, false);

  const target = clone(auditManifestTemplates.WANTED_WILD);
  target.audit.credential.subject.authorized_certifications = ["WANTED_LAB"];
  assert.equal(check(await verifyAuditorCredential(target),"C6").passed, false);
});

test("rejects credential digest, signature, and trust-root substitution independently", async () => {
  const digest = clone(auditManifestTemplates.WANTED_WILD);
  digest.audit.credential.credential_sha256 = `${"0".repeat(63)}1`;
  const digestResult = await verifyAuditorCredential(digest);
  assert.equal(check(digestResult,"C3").passed, false);
  assert.equal(check(digestResult,"C4").passed, true);

  const signature = clone(auditManifestTemplates.WANTED_WILD);
  signature.audit.credential.issuer_signature = `A${signature.audit.credential.issuer_signature.slice(1)}`;
  assert.equal(check(await verifyAuditorCredential(signature),"C4").passed, false);

  const root = clone(auditManifestTemplates.WANTED_WILD);
  root.audit.credential.issuer_key_id = "unknown-root";
  const rootResult = await verifyAuditorCredential(root);
  assert.equal(check(rootResult,"C2").passed, false);
  assert.equal(check(rootResult,"C4").passed, false);
});

test("rejects expired, revoked, and mode-confused credentials", async () => {
  const expired = clone(auditManifestTemplates.WANTED_WILD);
  expired.audit.credential.valid_until = expired.audit.signed_at;
  assert.equal(check(await verifyAuditorCredential(expired),"C7").passed, false);

  const revoked = clone(auditManifestTemplates.WANTED_WILD);
  revoked.audit.credential.status = "revoked";
  revoked.audit.credential.revoked_at = "2026-08-01T00:00:00Z";
  assert.equal(check(await verifyAuditorCredential(revoked),"C7").passed, false);

  const stale = clone(auditManifestTemplates.WANTED_WILD);
  stale.audit.credential.status_valid_until = "2026-08-28T17:30:00Z";
  assert.equal(check(await verifyAuditorCredential(stale),"C8").passed, false);

  const official = clone(auditManifestTemplates.WANTED_WILD);
  official.submission_mode = "official";
  const officialResult = await verifyAuditorCredential(official);
  assert.equal(check(officialResult,"C9").passed, false);
  assert.match(officialResult.errors.join(" "), /production registry root/);
});

test("a bad credential fails the complete audit-readiness gate", async () => {
  const manifest = clone(auditManifestTemplates.WANTED_WILD);
  manifest.audit.credential.subject.public_key_sha256 = `${"a".repeat(63)}b`;
  const result = await assessManifest(JSON.stringify(manifest));
  assert.equal(gate(result,"G6").status, "fail");
  assert.equal(result.projection.auditor_credential_verified, false);
});

test("publishes an exact pinned-root credential contract", () => {
  assert.equal(AUDITOR_CREDENTIAL_VERSION, "0.2-V2");
  assert.equal(auditorCredentialContract.issuer_trust, "pinned_registry_root");
  assert.equal(auditorCredentialContract.bundled_root, "synthetic_test_only");
  assert.equal(auditorCredentialContract.registry_freshness.maximum_status_window_hours, 24);
  assert.equal(auditorCredentialSchema.additionalProperties, false);
  assert.equal(auditorCredentialSchema.properties.profile_version.const, "0.2-V2");
  assert.equal(auditorCredentialTemplate.issuer_public_key_sha256, SYNTHETIC_TRUST_ROOT.issuer_public_key_sha256);
  assert.equal(auditorCredentialTemplate.issuer_signature.length, 86);
});

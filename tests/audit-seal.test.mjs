import assert from "node:assert/strict";
import test from "node:test";
import { auditManifestTemplates } from "../app/wanted-10k/audit/manifest.ts";
import { assessManifest } from "../app/wanted-10k/audit/readiness.ts";
import { AUDIT_SEAL_VERSION, auditSealContract, auditSealSchema, verifyAuditSeal } from "../app/wanted-10k/audit-seal/profile.ts";

const clone = value => structuredClone(value);
const check = (result, id) => result.checks.find(item => item.id === id);
const gate = (result, id) => result.gates.find(item => item.id === id);

test("cryptographically verifies every signed certification template", async () => {
  for (const [target, manifest] of Object.entries(auditManifestTemplates)) {
    const seal = await verifyAuditSeal(manifest);
    assert.equal(seal.status, "pass", `${target}: ${seal.errors.join(" ")}`);
    assert.equal(seal.signatureVerified, true);
    assert.equal(seal.manifestSha256, manifest.audit.manifest_sha256);
    assert.equal(seal.publicKeySha256, manifest.audit.public_key_sha256);
    assert.equal(seal.checks.every(item => item.passed), true);
    const readiness = await assessManifest(JSON.stringify(manifest));
    assert.equal(gate(readiness, "G6").status, "pass", `${target}: ${JSON.stringify(readiness.gates)}`);
    assert.equal(readiness.projection.audit_seal_verified, true);
  }
});

test("rejects any mutation inside the signed manifest scope", async () => {
  const manifest = clone(auditManifestTemplates.WANTED_WILD);
  manifest.robot.model = "Tampered Model";
  const seal = await verifyAuditSeal(manifest);
  assert.equal(seal.status, "fail");
  assert.equal(check(seal, "V3").passed, false);
  assert.equal(check(seal, "V4").passed, false);
  assert.equal(gate(await assessManifest(JSON.stringify(manifest)), "G6").status, "fail");
});

test("distinguishes digest and signature failures", async () => {
  const digestMutation = clone(auditManifestTemplates.WANTED_WILD);
  digestMutation.audit.manifest_sha256 = `${"0".repeat(63)}1`;
  const digestResult = await verifyAuditSeal(digestMutation);
  assert.equal(check(digestResult, "V3").passed, false);
  assert.equal(check(digestResult, "V4").passed, true);

  const signatureMutation = clone(auditManifestTemplates.WANTED_WILD);
  signatureMutation.audit.auditor_signature = `${signatureMutation.audit.auditor_signature.startsWith("A") ? "B" : "A"}${signatureMutation.audit.auditor_signature.slice(1)}`;
  const signatureResult = await verifyAuditSeal(signatureMutation);
  assert.equal(check(signatureResult, "V3").passed, true);
  assert.equal(check(signatureResult, "V4").passed, false);
});

test("rejects unbound auditor keys and post-submission signing", async () => {
  const unbound = clone(auditManifestTemplates.WANTED_WILD);
  unbound.audit.public_key_sha256 = `${"a".repeat(63)}b`;
  const keyResult = await verifyAuditSeal(unbound);
  assert.equal(check(keyResult, "V2").passed, false);
  assert.equal(check(keyResult, "V4").passed, false);

  const late = clone(auditManifestTemplates.WANTED_WILD);
  late.audit.signed_at = "2026-08-29T00:00:00Z";
  const timeResult = await verifyAuditSeal(late);
  assert.equal(check(timeResult, "V5").passed, false);
});

test("publishes the exact non-recursive Ed25519 seal contract", () => {
  assert.equal(AUDIT_SEAL_VERSION, "0.2-V1");
  assert.equal(auditSealContract.algorithm, "Ed25519");
  assert.equal(auditSealContract.canonicalization, "RFC8785_JCS");
  assert.equal(auditSealContract.signature_scope, "audit_manifest_without_audit.manifest_sha256_and_audit.auditor_signature");
  assert.equal(auditSealContract.scoring, "certification_gate_not_score");
  assert.equal(auditSealSchema.additionalProperties, false);
  assert.equal(auditSealSchema.properties.profile_version.const, "0.2-V1");
  assert.equal(auditSealSchema.properties.credential.$ref.endsWith("/wanted-10k/auditor-credential.schema.json"), true);
  assert.equal(auditSealSchema.properties.auditor_signature.pattern, "^[A-Za-z0-9_-]{86}$");
});

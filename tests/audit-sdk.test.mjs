import assert from "node:assert/strict";
import test from "node:test";
import { auditManifestTemplates } from "../app/wanted-10k/audit/manifest.ts";
import { auditSigningBytes, canonicalizeAuditJson } from "../app/wanted-10k/audit-seal/profile.ts";
import { auditorCredentialSigningBytes, auditorTrustRootSchema, verifyAuditPackage as verifyInternal } from "../app/wanted-10k/auditor-credential/profile.ts";
import { AUDIT_VERIFIER_SDK_VERSION, auditVerifierSdkContract, auditVerifierSdkSource } from "../app/wanted-10k/audit-sdk/source.ts";
import { GET as getModule } from "../app/wanted-10k/wanted-audit-verifier.mjs/route.ts";
import { GET as getContract } from "../app/wanted-10k/audit-verifier-sdk.json/route.ts";
import { GET as getRootSchema } from "../app/wanted-10k/auditor-trust-root.schema.json/route.ts";
import { GET as getRootTemplate } from "../app/wanted-10k/auditor-trust-root.template.json/route.ts";

const sdk = await import("data:text/javascript;charset=utf-8," + encodeURIComponent(auditVerifierSdkSource));
const clone = value => structuredClone(value);
const b64url = bytes => Buffer.from(bytes).toString("base64url");
const hex = bytes => Buffer.from(bytes).toString("hex");
const digest = async bytes => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
const check = (result, id) => result.checks.find(item => item.id === id);

test("standalone verifier exactly matches internal results for every signed template", async () => {
  for (const [target, manifest] of Object.entries(auditManifestTemplates)) {
    const internal = await verifyInternal(manifest);
    const standalone = await sdk.verifyAuditPackage(manifest);
    const fromJson = await sdk.verifyAuditPackageJson(JSON.stringify(manifest));
    assert.equal(internal.status, "pass", target);
    assert.deepEqual(standalone, internal);
    assert.deepEqual(fromJson, internal);
    assert.equal(standalone.seal.checks.length + standalone.credential.checks.length, 14);
  }
});

test("standalone and internal verifiers reject the same signed-scope mutations", async () => {
  const manifest = clone(auditManifestTemplates.WANTED_WILD);
  manifest.robot.model = "Mutated after audit";
  const [internal, standalone] = await Promise.all([verifyInternal(manifest), sdk.verifyAuditPackage(manifest)]);
  assert.deepEqual(standalone, internal);
  assert.equal(check(standalone.seal, "V3").passed, false);
  assert.equal(check(standalone.seal, "V4").passed, false);
});

test("official packages require an explicitly supplied pinned production root", async () => {
  const issuerKeys = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const auditorKeys = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const issuerRaw = new Uint8Array(await crypto.subtle.exportKey("raw", issuerKeys.publicKey));
  const auditorRaw = new Uint8Array(await crypto.subtle.exportKey("raw", auditorKeys.publicKey));
  const issuerDigest = await digest(issuerRaw);
  const auditorDigest = await digest(auditorRaw);
  const root = {
    registry_environment: "production",
    registry_id: "wanted-production-test-registry",
    issuer_key_id: "production-root-test-1",
    issuer_public_key_base64url: b64url(issuerRaw),
    issuer_public_key_sha256: issuerDigest,
    minimum_registry_version: 3,
    maximum_status_age_hours: 24,
  };

  const manifest = clone(auditManifestTemplates.WANTED_WILD);
  manifest.submission_mode = "official";
  manifest.audit.auditor = "Production Test Auditor";
  manifest.audit.auditor_organization = "Production Test Assurance";
  manifest.audit.public_key_uri = "https://registry.example/auditors/production-test";
  manifest.audit.public_key_base64url = b64url(auditorRaw);
  manifest.audit.public_key_sha256 = auditorDigest;
  const credential = manifest.audit.credential;
  Object.assign(credential, {
    registry_environment: "production",
    registry_id: root.registry_id,
    registry_version: 3,
    credential_id: "production-test-credential",
    issuer: "Production Test Registry",
    issuer_key_id: root.issuer_key_id,
    issuer_public_key_base64url: root.issuer_public_key_base64url,
    issuer_public_key_sha256: root.issuer_public_key_sha256,
    subject: {
      auditor: manifest.audit.auditor,
      auditor_organization: manifest.audit.auditor_organization,
      public_key_base64url: manifest.audit.public_key_base64url,
      public_key_sha256: manifest.audit.public_key_sha256,
      authorized_certifications: ["WANTED_WILD"],
    },
    valid_from: "2026-01-01T00:00:00Z",
    valid_until: "2027-01-01T00:00:00Z",
    revoked_at: null,
    status: "active",
    issued_at: "2026-08-28T17:00:00Z",
    status_checked_at: "2026-08-28T17:00:00Z",
    status_valid_until: "2026-08-29T17:00:00Z",
  });
  const credentialBytes = auditorCredentialSigningBytes(credential);
  credential.credential_sha256 = await digest(credentialBytes);
  credential.issuer_signature = b64url(new Uint8Array(await crypto.subtle.sign("Ed25519", issuerKeys.privateKey, credentialBytes)));
  const manifestBytes = auditSigningBytes(manifest);
  manifest.audit.manifest_sha256 = await digest(manifestBytes);
  manifest.audit.auditor_signature = b64url(new Uint8Array(await crypto.subtle.sign("Ed25519", auditorKeys.privateKey, manifestBytes)));

  const [internal, standalone] = await Promise.all([verifyInternal(manifest, [root]), sdk.verifyAuditPackage(manifest, [root])]);
  assert.equal(internal.status, "pass", JSON.stringify(internal));
  assert.deepEqual(standalone, internal);
  assert.equal((await verifyInternal(manifest)).status, "fail");
  const noRoot = await sdk.verifyAuditPackage(manifest);
  assert.equal(noRoot.status, "fail");
  assert.equal(check(noRoot.credential, "C2").passed, false);
});

test("strict canonicalization rejects non-I-JSON inputs in both implementations", () => {
  for (const invalid of [{ value: Number.NaN }, { value: "\uD800" }]) {
    assert.throws(() => canonicalizeAuditJson(invalid), /I-JSON|non-finite|unpaired/);
    assert.throws(() => sdk.canonicalize(invalid), /I-JSON|non-finite|unpaired/);
  }
});

test("published module, contract, and root artifacts are internally bound", async () => {
  const moduleResponse = await getModule();
  const moduleSource = await moduleResponse.text();
  const contract = await (await getContract()).json();
  const schema = await (await getRootSchema()).json();
  const root = await (await getRootTemplate()).json();
  assert.equal(AUDIT_VERIFIER_SDK_VERSION, "0.2-VS1");
  assert.equal(auditVerifierSdkContract.runtime_dependencies, 0);
  assert.equal(moduleSource, auditVerifierSdkSource);
  assert.equal(contract.source_sha256, await digest(new TextEncoder().encode(moduleSource)));
  assert.equal(contract.version, "0.2-VS1");
  assert.equal(moduleResponse.headers.get("content-type"), "text/javascript; charset=utf-8");
  assert.deepEqual(schema, auditorTrustRootSchema);
  assert.equal(schema.additionalProperties, false);
  assert.equal(root.registry_environment, "synthetic_test");
});

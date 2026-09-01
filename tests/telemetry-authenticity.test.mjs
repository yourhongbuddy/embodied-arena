import assert from "node:assert/strict";
import test from "node:test";
import { sampleBundle, sampleKeyManifest, TELEMETRY_AUTHENTICITY_VERSION, validateKeyManifest, validateStream } from "../app/wanted-10k/conformance/validator.ts";
import { telemetryAuthenticityContract, telemetryKeyManifestSchema } from "../app/wanted-10k/telemetry-authenticity/profile.ts";
import { auditManifestTemplates } from "../app/wanted-10k/audit/manifest.ts";
import { assessManifest } from "../app/wanted-10k/audit/readiness.ts";
import { leaderboardContract } from "../app/wanted-10k/leaderboard/registry.ts";

const clone = value => structuredClone(value);

test("cryptographically verifies the complete synthetic six-event stream", async () => {
  const bundle = await sampleBundle();
  const result = await validateStream(bundle.jsonl, bundle.keyManifest);
  assert.equal(result.status, "pass");
  assert.equal(result.events, 6);
  assert.equal(result.coverage, 6);
  assert.equal(result.chainLinks, 5);
  assert.equal(result.signaturesVerified, 6);
  assert.equal(result.signatureFailures, 0);
});

test("rejects tampering, unknown keys, expiration, and revocation", async () => {
  const bundle = await sampleBundle();
  const lines = bundle.jsonl.split("\n");
  const tampered = JSON.parse(lines[0]);
  tampered.payload.participant_acceptance_ref = "controlled://tampered";
  lines[0] = JSON.stringify(tampered);
  const tamperResult = await validateStream(lines.join("\n"), bundle.keyManifest);
  assert.equal(tamperResult.status, "fail");
  assert.equal(tamperResult.invalidSignatures, 1);
  assert.equal(tamperResult.hashChainMismatches, 1);
  assert.match(tamperResult.errors.join(" "), /signature verification failed/);
  assert.match(tamperResult.errors.join(" "), /previous_event_hash does not match/);

  const unknown = clone(sampleKeyManifest);
  unknown.keys[0].key_id = "unrelated-key";
  const unknownResult = await validateStream(bundle.jsonl, JSON.stringify(unknown));
  assert.equal(unknownResult.signatureFailures, 6);
  assert.equal(unknownResult.unknownKeyIds, 1);
  assert.equal(unknownResult.invalidSignatures, 0);
  assert.match(unknownResult.errors.join(" "), /absent from the frozen key manifest/);

  const expired = clone(sampleKeyManifest);
  expired.keys[0].valid_until = "2026-08-28T18:00:00Z";
  const expiredResult = await validateStream(bundle.jsonl, JSON.stringify(expired));
  assert.equal(expiredResult.expiredKeyEvents, 6);
  assert.match(expiredResult.errors.join(" "), /had expired/);

  const revoked = clone(sampleKeyManifest);
  revoked.keys[0].revoked_at = "2026-08-28T18:00:00Z";
  const revokedResult = await validateStream(bundle.jsonl, JSON.stringify(revoked));
  assert.equal(revokedResult.revokedKeyEvents, 6);
  assert.match(revokedResult.errors.join(" "), /was revoked/);
});

test("rejects malformed key manifests before signature acceptance", async () => {
  const bundle = await sampleBundle();
  const duplicate = clone(sampleKeyManifest);
  duplicate.keys.push(clone(duplicate.keys[0]));
  assert.match(validateKeyManifest(JSON.stringify(duplicate)).errors.join(" "), /duplicate key_id/);
  const malformed = clone(sampleKeyManifest);
  malformed.keys[0].public_key_base64url = "AAAA";
  const result = await validateStream(bundle.jsonl, JSON.stringify(malformed));
  assert.equal(result.status, "fail");
  assert.match(result.errors.join(" "), /decode to 32 bytes/);
});

test("binds 0.2-T1 into every field certification and the registry", async () => {
  for (const target of ["WANTED_LAB", "WANTED_WILD", "WANTED_10K"]) {
    const manifest = clone(auditManifestTemplates[target]);
    assert.equal(manifest.telemetry.profile_version, TELEMETRY_AUTHENTICITY_VERSION);
    assert.equal((await assessManifest(JSON.stringify(manifest))).gates.find(gate => gate.id === "G5").status, "pass");
    manifest.telemetry.invalid_signatures = 1;
    manifest.telemetry.verified_signatures--;
    assert.equal((await assessManifest(JSON.stringify(manifest))).gates.find(gate => gate.id === "G5").status, "fail");
    const mismatchedExposure = clone(auditManifestTemplates[target]);
    mismatchedExposure.telemetry.exposure_integrity_sha256 = "f".repeat(64);
    assert.equal((await assessManifest(JSON.stringify(mismatchedExposure))).gates.find(gate => gate.id === "G5").status, "fail");
    const missingReconciliation = clone(auditManifestTemplates[target]);
    missingReconciliation.evidence = missingReconciliation.evidence.filter(item => item.role !== "telemetry_exposure_reconciliation");
    assert.equal((await assessManifest(JSON.stringify(missingReconciliation))).gates.find(gate => gate.id === "G5").status, "fail");
  }
  assert.equal(auditManifestTemplates.PREQUALIFIED.telemetry.applicable, false);
  assert.equal(leaderboardContract.admission.includes("telemetry_authenticity_profile_0.2-T1_passes"), true);
  assert.equal(leaderboardContract.admission.includes("telemetry_exposure_reconciliation_0.2-TX1_passes"), true);
});

test("publishes an exact Ed25519 key-manifest contract", () => {
  assert.equal(telemetryAuthenticityContract.version, "0.2-T1");
  assert.equal(telemetryAuthenticityContract.algorithm, "Ed25519");
  assert.equal(telemetryAuthenticityContract.portable_verifier.version, "0.2-TS4");
  assert.equal(telemetryAuthenticityContract.portable_verifier.aggregate_report, "0.2-TA1");
  assert.equal(telemetryAuthenticityContract.portable_verifier.exposure_reconciliation, "0.2-TX1");
  assert.equal(telemetryAuthenticityContract.portable_verifier.audit_handoff, "exact_audit_manifest.telemetry_shape_with_exposure_binding");
  assert.equal(telemetryAuthenticityContract.hard_failures.includes("telemetry_exposure_reconciliation_mismatch"), true);
  assert.equal(telemetryKeyManifestSchema.properties.algorithm.const, "Ed25519");
  assert.equal(telemetryKeyManifestSchema.properties.keys.items.properties.public_key_base64url.pattern, "^[A-Za-z0-9_-]{43}$");
});

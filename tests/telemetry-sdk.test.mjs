import assert from "node:assert/strict";
import test from "node:test";
import { sampleBundle, validateStream } from "../app/wanted-10k/conformance/validator.ts";
import { TELEMETRY_VERIFIER_SDK_VERSION, telemetryVerifierSdkContract, telemetryVerifierSdkSource } from "../app/wanted-10k/telemetry-sdk/source.ts";
import { GET as getModule } from "../app/wanted-10k/wanted-telemetry-verifier.mjs/route.ts";
import { GET as getContract } from "../app/wanted-10k/telemetry-verifier-sdk.json/route.ts";

const sdk = await import("data:text/javascript;charset=utf-8," + encodeURIComponent(telemetryVerifierSdkSource));
const digest = async bytes => Buffer.from(await crypto.subtle.digest("SHA-256", bytes)).toString("hex");
const parseEvents = jsonl => jsonl.split("\n").map(line => JSON.parse(line));

test("portable telemetry verifier accepts the canonical signed six-event chain", async () => {
  const sample = await sampleBundle();
  const [internal, standalone, fromObjects] = await Promise.all([
    validateStream(sample.jsonl, sample.keyManifest),
    sdk.verifyTelemetryJsonl(sample.jsonl, sample.keyManifest),
    sdk.verifyTelemetry(parseEvents(sample.jsonl), JSON.parse(sample.keyManifest)),
  ]);
  assert.equal(internal.status, "pass", JSON.stringify(internal.errors));
  assert.equal(standalone.status, "pass", JSON.stringify(standalone.errors));
  assert.deepEqual(fromObjects, standalone);
  for (const field of ["events", "coverage", "chainLinks", "signaturesVerified", "signatureFailures", "invalidSignatures", "unknownKeyIds", "expiredKeyEvents", "revokedKeyEvents", "hashChainMismatches", "keyManifestId"]) assert.equal(standalone[field], internal[field], field);
  assert.deepEqual(standalone.errors, []);
  assert.equal(standalone.events, 6);
  assert.equal(standalone.coverage, 6);
});

test("portable verifier exposes payload tampering and the downstream broken chain", async () => {
  const sample = await sampleBundle();
  const events = parseEvents(sample.jsonl);
  events[2].payload.request_type = "pause";
  const result = await sdk.verifyTelemetry(events, JSON.parse(sample.keyManifest));
  assert.equal(result.status, "fail");
  assert.equal(result.invalidSignatures, 1);
  assert.equal(result.hashChainMismatches, 1);
  assert.match(result.errors.join(" "), /signature verification failed/i);
  assert.match(result.errors.join(" "), /previous_event_hash/i);
});

test("portable verifier fails unknown, expired, and revoked signing authority", async () => {
  const sample = await sampleBundle();
  const events = parseEvents(sample.jsonl);
  const unknown = structuredClone(events);
  unknown[0].signing_key_id = "unregistered-key";
  const unknownResult = await sdk.verifyTelemetry(unknown, JSON.parse(sample.keyManifest));
  assert.equal(unknownResult.status, "fail");
  assert.equal(unknownResult.unknownKeyIds, 1);

  const expiredManifest = JSON.parse(sample.keyManifest);
  expiredManifest.keys[0].valid_until = "2026-08-28T18:02:00Z";
  const expired = await sdk.verifyTelemetry(events, expiredManifest);
  assert.equal(expired.status, "fail");
  assert.equal(expired.expiredKeyEvents, 4);

  const revokedManifest = JSON.parse(sample.keyManifest);
  revokedManifest.keys[0].revoked_at = "2026-08-28T18:04:00Z";
  const revoked = await sdk.verifyTelemetry(events, revokedManifest);
  assert.equal(revoked.status, "fail");
  assert.equal(revoked.revokedKeyEvents, 2);
});

test("portable verifier rejects structural and strict I-JSON drift", async () => {
  assert.throws(() => sdk.canonicalize({ value: Number.NaN }), /non-finite/);
  assert.throws(() => sdk.canonicalize({ value: "\uD800" }), /unpaired/);
  const sample = await sampleBundle();
  const events = parseEvents(sample.jsonl);
  events[1].sequence = 3;
  events[2].deployment_id = "different-deployment";
  events[3].unexpected = true;
  const result = await sdk.verifyTelemetry(events, JSON.parse(sample.keyManifest));
  assert.equal(result.status, "fail");
  assert.match(result.errors.join(" "), /expected contiguous sequence 1/);
  assert.match(result.errors.join(" "), /deployment_id changed/);
  assert.match(result.errors.join(" "), /unexpected field unexpected/);
});

test("published telemetry module and contract are digest-bound and local-only", async () => {
  const moduleResponse = await getModule();
  const moduleSource = await moduleResponse.text();
  const contract = await (await getContract()).json();
  assert.equal(TELEMETRY_VERIFIER_SDK_VERSION, "0.2-TS1");
  assert.equal(moduleSource, telemetryVerifierSdkSource);
  assert.equal(contract.source_sha256, await digest(new TextEncoder().encode(moduleSource)));
  assert.equal(contract.version, "0.2-TS1");
  assert.equal(contract.authenticity_profile, "0.2-T1");
  assert.equal(contract.runtime_dependencies, 0);
  assert.equal(contract.performs_network_requests, false);
  assert.equal(contract.privacy, "local_only_no_event_uploads_or_network_requests");
  assert.equal(moduleResponse.headers.get("content-type"), "text/javascript; charset=utf-8");
  assert.match(moduleResponse.headers.get("content-disposition"), /wanted-telemetry-verifier\.mjs/);
  assert.deepEqual(contract.exports, telemetryVerifierSdkContract.exports);
});

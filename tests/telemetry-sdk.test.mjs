import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { auditManifestTemplates } from "../app/wanted-10k/audit/manifest.ts";
import { sampleBundle, validateStream } from "../app/wanted-10k/conformance/validator.ts";
import { TELEMETRY_VERIFIER_SDK_VERSION, telemetryVerifierSdkContract, telemetryVerifierSdkSource } from "../app/wanted-10k/telemetry-sdk/source.ts";
import { GET as getModule } from "../app/wanted-10k/wanted-telemetry-verifier.mjs/route.ts";
import { GET as getContract } from "../app/wanted-10k/telemetry-verifier-sdk.json/route.ts";

const sdk = await import("data:text/javascript;charset=utf-8," + encodeURIComponent(telemetryVerifierSdkSource));
const execFileAsync = promisify(execFile);
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
  assert.equal(standalone.reportProfile, "0.2-TR1");
  assert.equal(standalone.verifierVersion, "0.2-TS4");
  assert.match(standalone.eventStreamSha256, /^[a-f0-9]{64}$/);
  assert.match(standalone.keyManifestSha256, /^[a-f0-9]{64}$/);
  const unsigned = structuredClone(standalone);
  delete unsigned.verificationReportSha256;
  assert.equal(standalone.verificationReportSha256, await sdk.sha256Hex(unsigned));
});

test("canonical evidence digests ignore JSON formatting but bind semantic changes", async () => {
  const sample = await sampleBundle();
  const events = parseEvents(sample.jsonl);
  const compact = await sdk.verifyTelemetryJsonl(sample.jsonl, sample.keyManifest);
  const reformatted = await sdk.verifyTelemetryJsonl(events.map(event => `  ${JSON.stringify(event)}  `).join("\r\n"), JSON.stringify(JSON.parse(sample.keyManifest)));
  assert.equal(reformatted.status, "pass");
  assert.equal(reformatted.eventStreamSha256, compact.eventStreamSha256);
  assert.equal(reformatted.keyManifestSha256, compact.keyManifestSha256);
  assert.equal(reformatted.verificationReportSha256, compact.verificationReportSha256);
  events[4].payload.duration_seconds = 19;
  const changed = await sdk.verifyTelemetry(events, JSON.parse(sample.keyManifest));
  assert.notEqual(changed.eventStreamSha256, compact.eventStreamSha256);
  assert.notEqual(changed.verificationReportSha256, compact.verificationReportSha256);
});

test("aggregates unique passing streams and emits the exact audit telemetry shape", async () => {
  const [first, second] = await Promise.all([
    sampleBundle({ deployment_id: "dep_demo_001", environment_id: "env_demo_001", include_end: true }),
    sampleBundle({ deployment_id: "dep_demo_002", environment_id: "env_demo_002", include_end: true }),
  ]);
  const reports = await Promise.all([sdk.verifyTelemetryJsonl(first.jsonl, first.keyManifest), sdk.verifyTelemetryJsonl(second.jsonl, second.keyManifest)]);
  const aggregate = await sdk.aggregateTelemetryReports(reports);
  assert.equal(aggregate.status, "pass", JSON.stringify(aggregate.errors));
  assert.equal(aggregate.reportProfile, "0.2-TA1");
  assert.equal(aggregate.deploymentStreams, 2);
  assert.equal(aggregate.totalEvents, 14);
  assert.equal(aggregate.verifiedSignatures, 14);
  assert.equal(aggregate.streams.length, 2);
  const aggregateUnsigned = structuredClone(aggregate);
  delete aggregateUnsigned.verificationReportSha256;
  assert.equal(aggregate.verificationReportSha256, await sdk.sha256Hex(aggregateUnsigned));

  const exposureLedger = {
    profile_version: "0.2-X1",
    target_certification: "WANTED_WILD",
    records: aggregate.streams.map((stream, index) => ({
      deployment_id: stream.deploymentId,
      environment_id_sha256: stream.environmentIdSha256,
      activation: { event_id: stream.genesis.eventId, sequence: stream.genesis.sequence, occurred_at: stream.genesis.occurredAt, event_sha256: stream.genesis.eventSha256 },
      end: { event_id: stream.tail.eventId, sequence: stream.tail.sequence, occurred_at: stream.tail.occurredAt, event_sha256: stream.tail.eventSha256, disposition: stream.tail.disposition },
      validated_event_count: stream.events,
      missing_sequences: 0,
      duplicate_sequences: 0,
      backward_timestamps: 0,
      chain_complete: true,
      root_commitment_uri: `https://evidence.example/roots/${index + 1}.json`,
      root_commitment_sha256: String(index + 1).repeat(64),
    })),
  };
  const reconciliation = await sdk.reconcileTelemetryExposure(aggregate, exposureLedger);
  assert.equal(reconciliation.status, "pass", JSON.stringify(reconciliation.errors));
  assert.equal(reconciliation.reportProfile, "0.2-TX1");
  assert.match(reconciliation.interpretation, /0\.2-RC1/);
  assert.equal(reconciliation.rows.length, 2);
  assert.equal(reconciliation.rows.every(row => row.passed), true);
  const reconciliationUnsigned = structuredClone(reconciliation);
  delete reconciliationUnsigned.reconciliationSha256;
  assert.equal(reconciliation.reconciliationSha256, await sdk.sha256Hex(reconciliationUnsigned));

  const bindings = {
    keyManifestUri: "https://evidence.example/telemetry-key-manifest.json",
    verificationReportUri: "https://evidence.example/telemetry-verification-report.json",
    rootCommitmentsUri: "https://evidence.example/telemetry-root-commitments.json",
    rootCommitmentsSha256: "a".repeat(64),
    exposureIntegritySha256: "b".repeat(64),
    exposureReconciliationUri: "https://evidence.example/telemetry-exposure-reconciliation.json",
  };
  const summary = await sdk.createTelemetryAuditSummary(aggregate, bindings, reconciliation);
  assert.equal(summary.conformance_status, "passed");
  assert.equal(summary.total_events, 14);
  assert.equal(summary.verified_signatures, 14);
  assert.equal(summary.deployment_streams, 2);
  assert.equal(summary.key_manifest_sha256, aggregate.keyManifestSha256);
  assert.equal(summary.verification_report_sha256, aggregate.verificationReportSha256);
  assert.equal(summary.exposure_integrity_sha256, bindings.exposureIntegritySha256);
  assert.equal(summary.exposure_reconciliation_sha256, reconciliation.reconciliationSha256);
  assert.deepEqual(Object.keys(summary).sort(), Object.keys(auditManifestTemplates.WANTED_WILD.telemetry).sort());

  const duplicated = await sdk.aggregateTelemetryReports([reports[0], reports[0]]);
  assert.equal(duplicated.status, "fail");
  assert.match(duplicated.errors.join(" "), /duplicates deployment/);
  assert.match(duplicated.errors.join(" "), /duplicates environment/);
  const tampered = structuredClone(aggregate);
  tampered.totalEvents++;
  await assert.rejects(sdk.createTelemetryAuditSummary(tampered, bindings, reconciliation), /does not match/);
  const forged = structuredClone(aggregate);
  forged.streams[1].environmentId = forged.streams[0].environmentId;
  delete forged.verificationReportSha256;
  forged.verificationReportSha256 = await sdk.sha256Hex(forged);
  await assert.rejects(sdk.createTelemetryAuditSummary(forged, bindings, reconciliation), /inconsistent/);

  for (const mutate of [
    ledger => ledger.records[0].validated_event_count++,
    ledger => { ledger.records[0].end.event_sha256 = "f".repeat(64); },
    ledger => { ledger.records[0].environment_id_sha256 = "e".repeat(64); },
    ledger => { ledger.records[0].root_commitment_uri = ""; },
  ]) {
    const invalidLedger = structuredClone(exposureLedger);
    mutate(invalidLedger);
    const failed = await sdk.reconcileTelemetryExposure(aggregate, invalidLedger);
    assert.equal(failed.status, "fail");
    await assert.rejects(sdk.createTelemetryAuditSummary(aggregate, bindings, failed), /passing 0.2-TX1/);
  }
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
  assert.equal(TELEMETRY_VERIFIER_SDK_VERSION, "0.2-TS4");
  assert.equal(moduleSource, telemetryVerifierSdkSource);
  assert.equal(contract.source_sha256, await digest(new TextEncoder().encode(moduleSource)));
  assert.equal(contract.version, "0.2-TS4");
  assert.equal(contract.authenticity_profile, "0.2-T1");
  assert.equal(contract.runtime_dependencies, 0);
  assert.equal(contract.performs_network_requests, false);
  assert.deepEqual(contract.cli.exit_codes, { pass: 0, verification_failed: 1, usage_or_io_error: 2 });
  assert.equal(contract.reports.stream_profile, "0.2-TR1");
  assert.equal(contract.reports.aggregate_profile, "0.2-TA1");
  assert.equal(contract.reports.exposure_reconciliation_profile, "0.2-TX1");
  assert.equal(contract.reports.audit_summary, "exact_audit_manifest.telemetry_shape_with_exposure_binding");
  assert.equal(contract.privacy, "local_only_no_event_uploads_or_network_requests");
  assert.equal(moduleResponse.headers.get("content-type"), "text/javascript; charset=utf-8");
  assert.match(moduleResponse.headers.get("content-disposition"), /wanted-telemetry-verifier\.mjs/);
  assert.deepEqual(contract.exports, telemetryVerifierSdkContract.exports);
});

test("downloaded module runs directly with stable CI exit codes", async t => {
  const directory = await mkdtemp(join(tmpdir(), "wanted-telemetry-cli-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const modulePath = join(directory, "wanted-telemetry-verifier.mjs");
  const eventsPath = join(directory, "events.jsonl");
  const manifestPath = join(directory, "telemetry-key-manifest.json");
  const sample = await sampleBundle();
  await Promise.all([
    writeFile(modulePath, telemetryVerifierSdkSource, "utf8"),
    writeFile(eventsPath, sample.jsonl, "utf8"),
    writeFile(manifestPath, sample.keyManifest, "utf8"),
  ]);

  const passing = await execFileAsync(process.execPath, [modulePath, eventsPath, manifestPath]);
  assert.equal(passing.stderr, "");
  assert.equal(JSON.parse(passing.stdout).status, "pass");

  const tampered = parseEvents(sample.jsonl);
  tampered[3].payload.intent = "mutated after signing";
  await writeFile(eventsPath, tampered.map(event => JSON.stringify(event)).join("\n"), "utf8");
  await assert.rejects(execFileAsync(process.execPath, [modulePath, eventsPath, manifestPath]), error => {
    assert.equal(error.code, 1);
    assert.equal(JSON.parse(error.stdout).status, "fail");
    assert.match(error.stdout, /signature verification failed/i);
    return true;
  });

  await assert.rejects(execFileAsync(process.execPath, [modulePath]), error => {
    assert.equal(error.code, 2);
    assert.match(error.stderr, /Usage:/);
    return true;
  });
  await assert.rejects(execFileAsync(process.execPath, [modulePath, join(directory, "missing.jsonl"), manifestPath]), error => {
    assert.equal(error.code, 2);
    assert.match(error.stderr, /WANTED telemetry verifier:/);
    return true;
  });
});

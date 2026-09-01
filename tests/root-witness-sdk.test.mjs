import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { assessRootCommitmentWitness } from "../app/wanted-10k/root-commitment-witness/profile.ts";
import { rootWitnessTemplateFor } from "../app/wanted-10k/root-commitment-witness/template.ts";
import { ROOT_WITNESS_VERIFIER_SDK_VERSION, rootWitnessVerifierSdkContract, rootWitnessVerifierSdkSource } from "../app/wanted-10k/root-witness-sdk/source.ts";
import { ROOT_WITNESS_CONFORMANCE_VERSION, rootWitnessConformancePack } from "../app/wanted-10k/root-witness-conformance/vectors.ts";
import { GET as getModule } from "../app/wanted-10k/wanted-root-witness-verifier.mjs/route.ts";
import { GET as getContract } from "../app/wanted-10k/root-witness-verifier-sdk.json/route.ts";
import { GET as getVectors } from "../app/wanted-10k/root-witness-conformance-vectors.json/route.ts";

const sdk = await import("data:text/javascript;charset=utf-8," + encodeURIComponent(rootWitnessVerifierSdkSource));
const execFileAsync = promisify(execFile);
const digest = async bytes => Buffer.from(await crypto.subtle.digest("SHA-256", bytes)).toString("hex");
const normalize = result => ({ status: result.status, errors: result.errors, gates: result.gates, summary: result.summary });

test("portable root-witness verifier matches the canonical RC1 implementation", async () => {
  const manifest = await rootWitnessTemplateFor("WANTED_LAB");
  const [internal, standalone] = await Promise.all([assessRootCommitmentWitness(manifest), sdk.verifyRootWitnessManifest(manifest)]);
  assert.deepEqual(normalize(standalone), normalize(internal));
  assert.equal(standalone.status, "passed");
  assert.equal(standalone.gates.length, 8);
  assert.equal(standalone.summary.root_count, 5);
  assert.equal(standalone.summary.receipt_count, 10);
});

test("portable verifier keeps RC1 tamper and chronology outcomes in parity", async () => {
  const cases = [
    manifest => manifest.deployments[0].roots.splice(2, 1),
    manifest => { manifest.deployments[0].roots[0].receipts[0].observed_at = new Date(Date.parse(manifest.deployments[0].roots[0].covers_through_at) + 25 * 3600000).toISOString(); },
    manifest => { manifest.deployments[0].roots[0].receipts[0].signature = `A${manifest.deployments[0].roots[0].receipts[0].signature.slice(1)}`; },
    manifest => { manifest.deployments[0].roots[1].receipts[0].receipt_id = manifest.deployments[0].roots[0].receipts[0].receipt_id; },
    manifest => { manifest.witness_registry.keys[0].revoked_at = "2026-01-01T00:00:00.000Z"; },
    manifest => { manifest.witness_registry.keys[1].organization = manifest.witness_registry.keys[0].organization; },
    manifest => { manifest.assessor.signed_at = manifest.deployments[0].observation_end_at; },
    manifest => { manifest.deployments[0].roots[0].root_commitment_sha256 = "abcdef01".repeat(8); },
  ];
  for (const mutate of cases) {
    const manifest = await rootWitnessTemplateFor("WANTED_LAB");
    mutate(manifest);
    const [internal, standalone] = await Promise.all([assessRootCommitmentWitness(manifest), sdk.verifyRootWitnessManifest(manifest)]);
    assert.deepEqual(normalize(standalone), normalize(internal));
    assert.notEqual(standalone.status, "passed");
  }
});

test("portable verifier enforces strict I-JSON and stable canonical root digests", async () => {
  assert.throws(() => sdk.canonicalize({ value: Number.NaN }), /non-finite/);
  assert.throws(() => sdk.canonicalize({ value: "\uD800" }), /unpaired/);
  const manifest = await rootWitnessTemplateFor("WANTED_LAB");
  assert.equal(await sdk.rootCollectionSha256(manifest.deployments), manifest.root_commitments_sha256);
  const reformatted = JSON.parse(JSON.stringify(manifest, null, 4));
  assert.equal(await sdk.rootCollectionSha256(reformatted.deployments), manifest.root_commitments_sha256);
  reformatted.deployments[0].roots[0].root_commitment_sha256 = "abcdef01".repeat(8);
  assert.notEqual(await sdk.rootCollectionSha256(reformatted.deployments), manifest.root_commitments_sha256);
});

test("normative RCC1 vectors match the canonical and portable verifiers exactly", async () => {
  const pack=await rootWitnessConformancePack();
  assert.equal(pack.version,ROOT_WITNESS_CONFORMANCE_VERSION);
  assert.equal(pack.vectors.length,11);
  assert.equal(new Set(pack.vectors.map(vector=>vector.id)).size,pack.vectors.length);
  for(const vector of pack.vectors){
    const [internal,standalone]=await Promise.all([assessRootCommitmentWitness(vector.manifest),sdk.verifyRootWitnessManifest(vector.manifest)]);
    const failedGateIds=internal.gates.filter(gate=>!gate.passed).map(gate=>gate.id);
    assert.equal(internal.status,vector.expected.status,vector.id);
    assert.deepEqual(failedGateIds,vector.expected.failed_gate_ids,vector.id);
    assert.deepEqual(normalize(standalone),normalize(internal),vector.id);
  }
  const report=await sdk.verifyRootWitnessConformancePack(pack);
  assert.equal(report.status,"passed",JSON.stringify(report));
  assert.equal(report.passed_vectors,11);
  assert.equal(report.failed_vectors,0);
  const drifted=structuredClone(pack);drifted.vectors[0].expected.status="failed";
  const failed=await sdk.verifyRootWitnessConformancePack(drifted);
  assert.equal(failed.status,"failed");
  assert.equal(failed.failed_vectors,1);
});

test("published root-witness module and contract are digest-bound and local-only", async () => {
  const moduleResponse = await getModule();
  const moduleSource = await moduleResponse.text();
  const contract = await (await getContract()).json();
  const publishedVectors=await (await getVectors()).json();
  assert.equal(ROOT_WITNESS_VERIFIER_SDK_VERSION, "0.2-RCS2");
  assert.equal(moduleSource, rootWitnessVerifierSdkSource);
  assert.equal(contract.source_sha256, await digest(new TextEncoder().encode(moduleSource)));
  assert.equal(contract.version, "0.2-RCS2");
  assert.equal(contract.profile, "0.2-RC1");
  assert.equal(contract.conformance_profile,"0.2-RCC1");
  assert.equal(contract.conformance_vectors,"/wanted-10k/root-witness-conformance-vectors.json");
  assert.equal(publishedVectors.version,"0.2-RCC1");
  assert.equal(publishedVectors.vectors.length,11);
  assert.match(contract.vector_pack_sha256,/^[a-f0-9]{64}$/);
  assert.equal(contract.vector_pack_canonicalization,"RFC8785_JCS");
  assert.equal(contract.runtime_dependencies, 0);
  assert.equal(contract.performs_network_requests, false);
  assert.deepEqual(contract.cli.exit_codes, { pass: 0, verification_failed: 1, usage_or_io_error: 2 });
  assert.equal(contract.privacy, "local_only_no_manifest_uploads_or_network_requests");
  assert.equal(moduleResponse.headers.get("content-type"), "text/javascript; charset=utf-8");
  assert.match(moduleResponse.headers.get("content-disposition"), /wanted-root-witness-verifier\.mjs/);
  assert.deepEqual(contract.exports, rootWitnessVerifierSdkContract.exports);
});

test("downloaded root-witness module runs directly with stable CI exit codes", async t => {
  const directory = await mkdtemp(join(tmpdir(), "wanted-root-witness-cli-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const modulePath = join(directory, "wanted-root-witness-verifier.mjs");
  const manifestPath = join(directory, "root-witness-manifest.json");
  const vectorsPath = join(directory,"root-witness-conformance-vectors.json");
  const manifest = await rootWitnessTemplateFor("WANTED_LAB");
  const vectors=await rootWitnessConformancePack();
  await Promise.all([
    writeFile(modulePath, rootWitnessVerifierSdkSource, "utf8"),
    writeFile(manifestPath, JSON.stringify(manifest), "utf8"),
    writeFile(vectorsPath,JSON.stringify(vectors),"utf8"),
  ]);

  const passing = await execFileAsync(process.execPath, [modulePath, manifestPath]);
  assert.equal(passing.stderr, "");
  assert.equal(JSON.parse(passing.stdout).status, "passed");
  const conformance=await execFileAsync(process.execPath,[modulePath,"--conformance",vectorsPath]);
  assert.equal(conformance.stderr,"");
  assert.equal(JSON.parse(conformance.stdout).passed_vectors,11);

  manifest.deployments[0].roots[0].root_commitment_sha256 = "abcdef01".repeat(8);
  await writeFile(manifestPath, JSON.stringify(manifest), "utf8");
  await assert.rejects(execFileAsync(process.execPath, [modulePath, manifestPath]), error => {
    assert.equal(error.code, 1);
    assert.equal(JSON.parse(error.stdout).status, "failed");
    return true;
  });
  await assert.rejects(execFileAsync(process.execPath, [modulePath]), error => {
    assert.equal(error.code, 2);
    assert.match(error.stderr, /Usage:/);
    return true;
  });
  await assert.rejects(execFileAsync(process.execPath, [modulePath, join(directory, "missing.json")]), error => {
    assert.equal(error.code, 2);
    assert.match(error.stderr, /WANTED root-witness verifier:/);
    return true;
  });
});

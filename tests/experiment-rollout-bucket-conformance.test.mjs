import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { experimentDesignLabContract } from "../app/experiments/design-lab.ts";
import { experimentRotatorContract } from "../app/experiments/rotator.ts";
import {
  experimentRolloutBucketConformanceContract,
  experimentRolloutBucketConformanceReferenceBundle,
  verifyExperimentRolloutBucketConformance,
} from "../app/experiments/rollout-bucket-conformance.ts";
import { experimentRolloutBucketConformanceSchema } from "../app/experiments/rollout-bucket-conformance-schema.ts";
import {
  experimentRolloutBucketConformanceVerifierContract,
  experimentRolloutBucketConformanceVerifierSource,
} from "../app/experiments/rollout-bucket-conformance-verifier-source.ts";
import { GET as getContract } from "../app/experiments/rollout-bucket-conformance.json/route.ts";
import { GET as getReference } from "../app/experiments/rollout-bucket-conformance.reference.json/route.ts";
import { GET as getSchema } from "../app/experiments/rollout-bucket-conformance.schema.json/route.ts";
import { GET as getModule } from "../app/experiments/wanted-rollout-bucket-conformance.mjs/route.ts";

const clone = (value) => structuredClone(value);

test("exhaustively certifies exact phase counts, boundaries, nesting, and rollback", async () => {
  const bundle = await experimentRolloutBucketConformanceReferenceBundle();
  const first = await verifyExperimentRolloutBucketConformance(bundle);
  const second = await verifyExperimentRolloutBucketConformance(clone(bundle));
  assert.equal(first.status, "pass", JSON.stringify(first));
  assert.deepEqual(second, first);
  const phases = first.certificate.phases;
  assert.deepEqual(phases.map((phase) => phase.exact_selected_buckets), [500, 2_500, 5_000, 10_000]);
  assert.deepEqual(phases.map((phase) => phase.exact_control_buckets), [9_500, 7_500, 5_000, 0]);
  assert.deepEqual(phases.map((phase) => phase.newly_selected_buckets), [500, 2_000, 2_500, 5_000]);
  assert.deepEqual(phases.map((phase) => phase.last_selected_bucket), [499, 2_499, 4_999, 9_999]);
  assert.deepEqual(phases.map((phase) => phase.first_control_bucket), [500, 2_500, 5_000, null]);
  assert.ok(phases.every((phase) => phase.coverage_complete && phase.no_overlap && phase.nested_with_previous_phase));
  assert.equal(first.certificate.activation_phase, "ramp");
  assert.equal(first.certificate.rollback.exact_selected_buckets, 0);
  assert.equal(first.certificate.rollback.exact_control_buckets, 10_000);
  assert.equal(first.certificate.certificate_sha256.length, 64);
  assert.equal(first.certificate.certificate_sha256, second.certificate.certificate_sha256);
  for (const field of ["reads_user_identifiers", "reads_platform_environment", "performs_network_requests", "uses_live_traffic", "counts_exposures", "supports_version_selection", "changes_live_allocation", "changes_live_phase", "deploys"]) assert.equal(first[field], false, field);
});

test("refuses altered source, manifest, shape, and purpose without emitting a certificate", async () => {
  const mutations = [
    (bundle) => { bundle.compiler_bundle.rollout_package.rollout_plan.phases[1].selected_variant_basis_points = 2_501; },
    (bundle) => { bundle.manifest.manifest_sha256 = "0".repeat(64); },
    (bundle) => { bundle.compiler_bundle.phase_ledger.entries[0].phase_receipt.signature_base64url = "A".repeat(86); },
    (bundle) => { bundle.purpose = "live_selection"; },
    (bundle) => { bundle.extra = true; },
  ];
  for (const mutate of mutations) {
    const bundle = clone(await experimentRolloutBucketConformanceReferenceBundle());
    mutate(bundle);
    const result = await verifyExperimentRolloutBucketConformance(bundle);
    assert.equal(result.status, "fail");
    assert.equal(result.certificate, null);
    assert.equal(result.changes_live_allocation, false);
    assert.equal(result.changes_live_phase, false);
    assert.equal(result.deploys, false);
    assert.ok(result.errors.length);
  }
});

test("portable verifier, CLI, routes, schema, and governance contracts remain in parity", async () => {
  const moduleResponse = await getModule();
  const source = await moduleResponse.text();
  const sdk = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const bundle = await experimentRolloutBucketConformanceReferenceBundle();
  assert.deepEqual(await sdk.verifyRolloutBucketConformance(bundle), await verifyExperimentRolloutBucketConformance(bundle));
  const output = [];
  assert.equal(await sdk.runCli(["--conformance"], { stdout: (value) => output.push(value), stderr: () => {} }), 0);
  assert.equal(JSON.parse(output.pop()).certificate.buckets_enumerated, 10_000);

  const directory = await mkdtemp(join(tmpdir(), "wanted-rollout-buckets-"));
  const modulePath = join(directory, "wanted-rollout-bucket-conformance.mjs");
  const bundlePath = join(directory, "bundle.json");
  try {
    await writeFile(modulePath, source);
    await writeFile(bundlePath, JSON.stringify(bundle));
    const cli = spawnSync(process.execPath, [modulePath, "--verify", bundlePath], { encoding: "utf8" });
    assert.equal(cli.status, 0, cli.stderr);
    assert.equal(JSON.parse(cli.stdout).certificate.rollback.exact_control_buckets, 10_000);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }

  const [contract, schema, reference] = await Promise.all([
    getContract().then((response) => response.json()),
    Promise.resolve(getSchema()).then((response) => response.json()),
    getReference().then((response) => response.json()),
  ]);
  assert.equal(source, experimentRolloutBucketConformanceVerifierSource);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /process\.env(?:\.|\[)/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.equal(contract.version, "0.46-RBC1");
  assert.equal(contract.certificate_profile, "0.46-RBCERT1");
  assert.equal(contract.source_sha256, createHash("sha256").update(source).digest("hex"));
  assert.equal(contract.buckets_enumerated, 10_000);
  assert.equal(contract.runtime_dependencies, 0);
  assert.equal(contract.reads_user_identifiers, false);
  assert.equal(contract.uses_live_traffic, false);
  assert.equal(contract.changes_live_allocation, false);
  assert.equal(contract.deploys, false);
  assert.deepEqual(contract, { ...experimentRolloutBucketConformanceContract, ...experimentRolloutBucketConformanceVerifierContract, source_sha256: contract.source_sha256 });
  assert.deepEqual(schema, experimentRolloutBucketConformanceSchema);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.compiler_bundle.additionalProperties, false);
  assert.equal(schema.properties.manifest.additionalProperties, false);
  assert.equal(reference.synthetic, true);
  assert.equal(reference.expected.status, "pass");
  assert.equal(experimentDesignLabContract.rollout_bucket_conformance.profile, "0.46-RBC1");
  assert.equal(experimentRotatorContract.rollout_bucket_conformance.profile, "0.46-RBC1");
  assert.equal(experimentRotatorContract.version, "0.36-R36");
  assert.equal(experimentRotatorContract.analysis_cohort.id, "wanted_landing_v1-C8");
});

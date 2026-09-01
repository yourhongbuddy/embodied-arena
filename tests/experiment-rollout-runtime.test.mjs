import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { experimentDesignLabContract } from "../app/experiments/design-lab.ts";
import { experimentRotatorContract } from "../app/experiments/rotator.ts";
import { experimentRolloutRuntimeSchema } from "../app/experiments/rollout-runtime-schema.ts";
import {
  experimentRolloutRuntimeContract,
  experimentRolloutRuntimeReferenceBundle,
  resolveExperimentRolloutRuntime,
} from "../app/experiments/rollout-runtime.ts";
import {
  experimentRolloutRuntimeVerifierContract,
  experimentRolloutRuntimeVerifierSource,
} from "../app/experiments/rollout-runtime-verifier-source.ts";
import { GET as getContract } from "../app/experiments/rollout-runtime.json/route.ts";
import { GET as getReference } from "../app/experiments/rollout-runtime.reference.json/route.ts";
import { GET as getSchema } from "../app/experiments/rollout-runtime.schema.json/route.ts";
import { GET as getModule } from "../app/experiments/wanted-rollout-runtime.mjs/route.ts";

const clone = (value) => structuredClone(value);

test("reproduces frozen control and proof ramp assignments without serving them", async () => {
  const control = await resolveExperimentRolloutRuntime(await experimentRolloutRuntimeReferenceBundle(0));
  const proof = await resolveExperimentRolloutRuntime(await experimentRolloutRuntimeReferenceBundle(9));
  for (const result of [control, proof]) {
    assert.equal(result.status, "pass", JSON.stringify(result));
    for (const field of [
      "compiler_verified",
      "manifest_verified",
      "environment_shape_verified",
      "environment_matches_manifest",
      "unit_id_verified",
      "analysis_boundary_verified",
      "deterministic_resolution_verified",
      "fail_closed_verified",
    ]) assert.equal(result[field], true, field);
    assert.equal(result.phase, "ramp");
    assert.equal(result.phase_epoch, "wanted_landing_v1-C9-P2");
    assert.equal(result.selected_variant_basis_points, 2_500);
    assert.equal(result.control_basis_points, 7_500);
    assert.equal(result.live_use_eligible, false);
    assert.equal(result.treatment_served, false);
    assert.equal(result.exposure_counted, false);
    assert.equal(result.reads_platform_environment, false);
    assert.equal(result.changes_live_allocation, false);
    assert.equal(result.changes_live_phase, false);
    assert.equal(result.deploys, false);
  }
  assert.deepEqual(
    [control.rollout_bucket, control.resolved_variant, proof.rollout_bucket, proof.resolved_variant],
    [4_783, "control", 1_925, "proof"],
  );
});

test("fails closed to control with no bucket or phase on every trust-boundary mismatch", async () => {
  const mutations = [
    (bundle) => { bundle.runtime_environment.WANTED_SELECTED_BASIS_POINTS = "2501"; },
    (bundle) => { bundle.manifest.manifest_sha256 = "0".repeat(64); },
    (bundle) => { bundle.compiler_bundle.phase_ledger.entries[0].phase_receipt.signature_base64url = "A".repeat(86); },
    (bundle) => { bundle.synthetic_unit_id = "person@example.com"; },
    (bundle) => { bundle.analysis_use = "version_selection"; },
    (bundle) => { bundle.extra = true; },
  ];
  for (const mutate of mutations) {
    const bundle = clone(await experimentRolloutRuntimeReferenceBundle(9));
    mutate(bundle);
    const result = await resolveExperimentRolloutRuntime(bundle);
    assert.equal(result.status, "fail");
    assert.equal(result.resolved_variant, "control");
    assert.equal(result.rollout_bucket, null);
    assert.equal(result.phase, null);
    assert.equal(result.phase_epoch, null);
    assert.equal(result.selected_variant_basis_points, 0);
    assert.equal(result.control_basis_points, 10_000);
    assert.equal(result.fail_closed_verified, true);
    assert.equal(result.treatment_served, false);
    assert.equal(result.exposure_counted, false);
    assert.equal(result.changes_live_allocation, false);
    assert.equal(result.deploys, false);
    assert.ok(result.errors.length);
  }
});

test("resolves byte-identically from explicit inputs without environment, storage, or network access", async () => {
  const bundle = await experimentRolloutRuntimeReferenceBundle(9);
  const first = await resolveExperimentRolloutRuntime(bundle);
  const second = await resolveExperimentRolloutRuntime(clone(bundle));
  assert.deepEqual(second, first);
  assert.equal(first.assignment_mode, "synthetic_preview");
  assert.equal(first.writes_browser_storage, false);
  assert.equal(first.reads_platform_environment, false);
  assert.equal(first.performs_network_requests, false);
});

test("portable resolver, routes, schema, and governance contracts remain in parity", async () => {
  const moduleResponse = await getModule();
  const source = await moduleResponse.text();
  const sdk = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  for (const index of [0, 9]) {
    const bundle = await experimentRolloutRuntimeReferenceBundle(index);
    const internal = await resolveExperimentRolloutRuntime(bundle);
    const portable = await sdk.resolveRolloutRuntime(bundle);
    assert.deepEqual(portable, internal);
  }

  const output = [];
  assert.equal(await sdk.runCli(["--conformance"], { stdout: (value) => output.push(value), stderr: () => {} }), 0);
  assert.deepEqual(JSON.parse(output.pop()).vectors.map((vector) => vector.resolved_variant), ["control", "proof"]);

  const directory = await mkdtemp(join(tmpdir(), "wanted-rollout-runtime-"));
  const modulePath = join(directory, "wanted-rollout-runtime.mjs");
  const bundlePath = join(directory, "runtime.json");
  try {
    const bundle = await experimentRolloutRuntimeReferenceBundle(9);
    await writeFile(modulePath, source);
    await writeFile(bundlePath, JSON.stringify(bundle));
    const result = spawnSync(process.execPath, [modulePath, "--resolve", bundlePath], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).resolved_variant, "proof");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }

  const [contractResponse, schemaResponse, referenceResponse] = await Promise.all([
    getContract(),
    getSchema(),
    getReference(),
  ]);
  const [contract, schema, reference] = await Promise.all([
    contractResponse.json(),
    schemaResponse.json(),
    referenceResponse.json(),
  ]);
  assert.equal(source, experimentRolloutRuntimeVerifierSource);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /process\.env(?:\.|\[)/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.equal(contract.version, "0.45-RRR1");
  assert.equal(contract.source_sha256, createHash("sha256").update(source).digest("hex"));
  assert.equal(contract.runtime_dependencies, 0);
  assert.equal(contract.reads_platform_environment, false);
  assert.equal(contract.writes_browser_storage, false);
  assert.equal(contract.performs_network_requests, false);
  assert.equal(contract.live_use_eligible, false);
  assert.equal(contract.treatment_served, false);
  assert.equal(contract.exposure_counted, false);
  assert.equal(contract.changes_live_allocation, false);
  assert.equal(contract.changes_live_phase, false);
  assert.equal(contract.deploys, false);
  assert.deepEqual(contract, {
    ...experimentRolloutRuntimeContract,
    ...experimentRolloutRuntimeVerifierContract,
    source_sha256: contract.source_sha256,
  });
  assert.deepEqual(schema, experimentRolloutRuntimeSchema);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.$defs.environment.additionalProperties, false);
  assert.equal(schema.$defs.manifest.additionalProperties, false);
  assert.equal(reference.synthetic, true);
  assert.deepEqual(reference.vectors.map((vector) => vector.expected.resolved_variant), ["control", "proof"]);
  assert.ok(reference.vectors.every((vector) => vector.expected.treatment_served === false));
  assert.equal(experimentDesignLabContract.rollout_runtime_resolver.profile, "0.45-RRR1");
  assert.equal(experimentRotatorContract.rollout_runtime_resolver.profile, "0.45-RRR1");
  assert.equal(experimentRotatorContract.version, "0.36-R36");
  assert.equal(experimentRotatorContract.analysis_cohort.id, "wanted_landing_v1-C8");
});

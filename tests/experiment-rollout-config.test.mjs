import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { experimentDesignLabContract } from "../app/experiments/design-lab.ts";
import { experimentRotatorContract } from "../app/experiments/rotator.ts";
import { experimentRolloutConfigSchema } from "../app/experiments/rollout-config-schema.ts";
import {
  compileExperimentRolloutConfiguration,
  experimentRolloutConfigContract,
  experimentRolloutConfigReferenceBundle,
} from "../app/experiments/rollout-config.ts";
import {
  experimentRolloutConfigVerifierContract,
  experimentRolloutConfigVerifierSource,
} from "../app/experiments/rollout-config-verifier-source.ts";
import { GET as getContract } from "../app/experiments/rollout-config.json/route.ts";
import { GET as getReference } from "../app/experiments/rollout-config.reference.json/route.ts";
import { GET as getSchema } from "../app/experiments/rollout-config.schema.json/route.ts";
import { GET as getModule } from "../app/experiments/wanted-rollout-config.mjs/route.ts";

const clone = (value) => structuredClone(value);

test("compiles the verified canary review into one inert ramp and rollback manifest", async () => {
  const result = await compileExperimentRolloutConfiguration(experimentRolloutConfigReferenceBundle());
  assert.equal(result.status, "pass", JSON.stringify(result));
  for (const field of [
    "package_verified",
    "phase_ledger_verified",
    "source_binding_verified",
    "next_phase_verified",
    "environment_complete",
    "rollback_environment_complete",
    "deterministic_manifest_verified",
    "inference_isolation_verified",
  ]) assert.equal(result[field], true, field);
  const manifest = result.manifest;
  assert.equal(manifest.profile, "0.44-RCM1");
  assert.equal(manifest.reviewed_phase, "canary");
  assert.equal(manifest.activation_phase, "ramp");
  assert.equal(manifest.activation_phase_epoch, "wanted_landing_v1-C9-P2");
  assert.equal(manifest.selected_variant_basis_points, 2_500);
  assert.equal(manifest.control_basis_points, 7_500);
  assert.equal(manifest.environment.WANTED_SELECTED_BASIS_POINTS, "2500");
  assert.equal(manifest.environment.WANTED_CONTROL_BASIS_POINTS, "7500");
  assert.equal(manifest.rollback_environment.WANTED_SELECTED_BASIS_POINTS, "0");
  assert.equal(manifest.rollback_environment.WANTED_CONTROL_BASIS_POINTS, "10000");
  assert.equal(manifest.manifest_sha256, "daea509121a50b2cfedc690885451f55c64284f10aba6d0783af7e2447025438");
  assert.equal(result.applies_configuration, false);
  assert.equal(result.changes_live_allocation, false);
  assert.equal(result.changes_live_phase, false);
  assert.equal(result.reads_or_writes_secrets, false);
  assert.equal(result.deploys, false);
});

test("recompiles byte-identical manifests and binds every upstream source digest", async () => {
  const bundle = experimentRolloutConfigReferenceBundle();
  const first = await compileExperimentRolloutConfiguration(bundle);
  const second = await compileExperimentRolloutConfiguration(clone(bundle));
  assert.deepEqual(second.manifest, first.manifest);
  assert.equal(first.manifest.source_rollout_package_sha256, bundle.phase_ledger.entries[0].phase_receipt.rollout_package_sha256);
  assert.match(first.manifest.source_phase_ledger_sha256, /^[0-9a-f]{64}$/);
  assert.match(first.manifest.source_latest_phase_receipt_sha256, /^[0-9a-f]{64}$/);
  assert.equal(first.manifest.automatic_application, false);
  assert.equal(first.manifest.contains_secrets, false);
});

test("rejects package, ledger, purpose, target, phase, and structural tampering without applying", async () => {
  const mutations = [
    (bundle) => { bundle.purpose = "deploy_now"; },
    (bundle) => { bundle.rollout_package.rollout_plan.phases[1].selected_variant_basis_points = 2_501; },
    (bundle) => { bundle.phase_ledger.entries[0].phase_receipt.target_analysis_cohort = "wanted_landing_v1-C8"; },
    (bundle) => { bundle.phase_ledger.entries[0].phase_receipt.signature_base64url = "A".repeat(86); },
    (bundle) => { bundle.extra = true; },
  ];
  for (const mutate of mutations) {
    const bundle = clone(experimentRolloutConfigReferenceBundle());
    mutate(bundle);
    const result = await compileExperimentRolloutConfiguration(bundle);
    assert.equal(result.status, "fail");
    assert.equal(result.manifest, null);
    assert.equal(result.applies_configuration, false);
    assert.equal(result.changes_live_allocation, false);
    assert.equal(result.changes_live_phase, false);
    assert.equal(result.reads_or_writes_secrets, false);
    assert.equal(result.deploys, false);
    assert.ok(result.errors.length);
  }
});

test("portable compiler, routes, schema, and governance contracts remain in parity", async () => {
  const moduleResponse = await getModule();
  const source = await moduleResponse.text();
  const sdk = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const bundle = experimentRolloutConfigReferenceBundle();
  const internal = await compileExperimentRolloutConfiguration(bundle);
  const portable = await sdk.compileRolloutConfiguration(bundle);
  for (const field of [
    "status",
    "package_verified",
    "phase_ledger_verified",
    "source_binding_verified",
    "next_phase_verified",
    "environment_complete",
    "rollback_environment_complete",
    "deterministic_manifest_verified",
    "inference_isolation_verified",
    "applies_configuration",
    "changes_live_allocation",
    "changes_live_phase",
    "reads_or_writes_secrets",
    "deploys",
  ]) assert.equal(portable[field], internal[field], field);
  assert.deepEqual(portable.manifest, internal.manifest);

  const output = [];
  assert.equal(await sdk.runCli(["--conformance"], { stdout: (value) => output.push(value), stderr: () => {} }), 0);
  assert.equal(JSON.parse(output.pop()).manifest.activation_phase, "ramp");

  const directory = await mkdtemp(join(tmpdir(), "wanted-rollout-config-"));
  const modulePath = join(directory, "wanted-rollout-config.mjs");
  const bundlePath = join(directory, "compiler.json");
  try {
    await writeFile(modulePath, source);
    await writeFile(bundlePath, JSON.stringify(bundle));
    const result = spawnSync(process.execPath, [modulePath, "--compile", bundlePath], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).manifest.manifest_sha256, internal.manifest.manifest_sha256);
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
  assert.equal(source, experimentRolloutConfigVerifierSource);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /process\.env/);
  assert.equal(contract.version, "0.44-RCC1");
  assert.equal(contract.manifest_profile, "0.44-RCM1");
  assert.equal(contract.source_sha256, createHash("sha256").update(source).digest("hex"));
  assert.equal(contract.runtime_dependencies, 0);
  assert.equal(contract.performs_network_requests, false);
  assert.equal(contract.reads_or_writes_secrets, false);
  assert.equal(contract.automatic_application, false);
  assert.equal(contract.applies_configuration, false);
  assert.equal(contract.changes_live_allocation, false);
  assert.equal(contract.changes_live_phase, false);
  assert.equal(contract.deploys, false);
  assert.deepEqual(contract, {
    ...experimentRolloutConfigContract,
    ...experimentRolloutConfigVerifierContract,
    source_sha256: contract.source_sha256,
  });
  assert.deepEqual(schema, experimentRolloutConfigSchema);
  assert.equal(schema.additionalProperties, false);
  assert.equal(reference.synthetic, true);
  assert.equal(reference.expected.status, "pass");
  assert.equal(reference.expected.manifest.activation_phase, "ramp");
  assert.equal(reference.expected.applies_configuration, false);
  assert.equal(experimentDesignLabContract.rollout_config_compiler.profile, "0.44-RCC1");
  assert.equal(experimentRotatorContract.rollout_config_compiler.profile, "0.44-RCC1");
  assert.equal(experimentRotatorContract.version, "0.36-R36");
  assert.equal(experimentRotatorContract.analysis_cohort.id, "wanted_landing_v1-C8");
});

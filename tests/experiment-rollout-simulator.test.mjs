import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { experimentDesignLabContract } from "../app/experiments/design-lab.ts";
import { experimentRotatorContract } from "../app/experiments/rotator.ts";
import { experimentRolloutSimulatorSchema } from "../app/experiments/rollout-simulator-schema.ts";
import {
  EXPERIMENT_ROLLOUT_SIMULATOR_ANALYSIS_USE,
  experimentRolloutSimulatorContract,
  experimentRolloutSimulatorReferenceBundle,
  rolloutBucketForSyntheticUnit,
  simulateExperimentRollout,
  syntheticRolloutUnitId,
  syntheticRolloutUnitIds,
} from "../app/experiments/rollout-simulator.ts";
import {
  experimentRolloutSimulatorVerifierContract,
  experimentRolloutSimulatorVerifierSource,
} from "../app/experiments/rollout-simulator-verifier-source.ts";
import { GET as getContract } from "../app/experiments/rollout-simulator.json/route.ts";
import { GET as getReference } from "../app/experiments/rollout-simulator.reference.json/route.ts";
import { GET as getSchema } from "../app/experiments/rollout-simulator.schema.json/route.ts";
import { GET as getModule } from "../app/experiments/wanted-rollout-simulator.mjs/route.ts";

const clone = (value) => structuredClone(value);

test("replays the frozen synthetic population across monotone rollout phases", async () => {
  const result = await simulateExperimentRollout(experimentRolloutSimulatorReferenceBundle());
  assert.equal(result.status, "pass", JSON.stringify(result));
  for (const field of [
    "package_verified",
    "input_shape_verified",
    "unit_ids_verified",
    "unique_units_verified",
    "deterministic_replay_verified",
    "monotone_membership_verified",
    "phase_allocation_verified",
    "inference_isolation_verified",
  ]) assert.equal(result[field], true, field);
  assert.equal(result.synthetic_units, 1_000);
  assert.deepEqual(result.phase_summaries.map((phase) => phase.selected_units), [54, 239, 491, 1_000]);
  assert.deepEqual(result.phase_summaries.map((phase) => phase.control_units), [946, 761, 509, 0]);
  assert.equal(result.target_rotator_version, "0.37-R37");
  assert.equal(result.target_analysis_cohort, "wanted_landing_v1-C9");
  assert.equal(result.changes_live_allocation, false);
  assert.equal(result.counts_exposures, false);
  assert.equal(result.supports_version_selection, false);
  assert.equal(result.deploys, false);
});

test("keeps synthetic identities, buckets, and prefix membership deterministic", () => {
  const hundred = syntheticRolloutUnitIds(100);
  const thousand = syntheticRolloutUnitIds(1_000);
  assert.deepEqual(thousand.slice(0, 100), hundred);
  assert.equal(new Set(thousand).size, 1_000);
  assert.equal(syntheticRolloutUnitId(0), syntheticRolloutUnitId(0));
  assert.equal(rolloutBucketForSyntheticUnit(hundred[0]), rolloutBucketForSyntheticUnit(hundred[0]));
  assert.throws(() => syntheticRolloutUnitIds(99), /sample size/i);
  assert.throws(() => rolloutBucketForSyntheticUnit("person@example.com"), /UUID/i);
});

test("rejects package, identity, uniqueness, shape, and inference-boundary drift", async () => {
  const mutations = [
    (bundle) => { bundle.analysis_use = "version_selection"; },
    (bundle) => { bundle.synthetic_unit_ids[1] = bundle.synthetic_unit_ids[0]; },
    (bundle) => { bundle.synthetic_unit_ids[0] = "person@example.com"; },
    (bundle) => { bundle.rollout_package.rollout_plan.phases[0].selected_variant_basis_points = 501; },
    (bundle) => { bundle.extra = true; },
  ];
  for (const mutate of mutations) {
    const bundle = clone(experimentRolloutSimulatorReferenceBundle(100));
    mutate(bundle);
    const result = await simulateExperimentRollout(bundle);
    assert.equal(result.status, "fail");
    assert.equal(result.changes_live_allocation, false);
    assert.equal(result.counts_exposures, false);
    assert.equal(result.supports_version_selection, false);
    assert.ok(result.errors.length);
  }
});

test("portable helper, routes, schema, and governance contracts remain in parity", async () => {
  const moduleResponse = await getModule();
  const source = await moduleResponse.text();
  const sdk = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const bundle = experimentRolloutSimulatorReferenceBundle();
  const internal = await simulateExperimentRollout(bundle);
  const portable = await sdk.simulateRollout(bundle);
  for (const field of [
    "status",
    "synthetic_units",
    "package_verified",
    "deterministic_replay_verified",
    "monotone_membership_verified",
    "phase_allocation_verified",
    "inference_isolation_verified",
    "changes_live_allocation",
    "counts_exposures",
    "supports_version_selection",
  ]) assert.equal(portable[field], internal[field], field);
  assert.deepEqual(portable.phase_summaries, internal.phase_summaries);

  const output = [];
  assert.equal(await sdk.runCli(["--conformance"], { stdout: (value) => output.push(value), stderr: () => {} }), 0);
  assert.equal(JSON.parse(output.pop()).monotone_membership_verified, true);

  const directory = await mkdtemp(join(tmpdir(), "wanted-rollout-simulator-"));
  const modulePath = join(directory, "wanted-rollout-simulator.mjs");
  const bundlePath = join(directory, "simulation.json");
  try {
    await writeFile(modulePath, source);
    await writeFile(bundlePath, JSON.stringify(bundle));
    const result = spawnSync(process.execPath, [modulePath, "--simulate", bundlePath], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).synthetic_units, 1_000);
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
  assert.equal(source, experimentRolloutSimulatorVerifierSource);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.equal(contract.version, "0.43-RSM1");
  assert.equal(contract.source_sha256, createHash("sha256").update(source).digest("hex"));
  assert.equal(contract.runtime_dependencies, 0);
  assert.equal(contract.performs_network_requests, false);
  assert.equal(contract.analysis_use, EXPERIMENT_ROLLOUT_SIMULATOR_ANALYSIS_USE);
  assert.equal(contract.monotone_membership_required, true);
  assert.equal(contract.changes_live_allocation, false);
  assert.equal(contract.counts_exposures, false);
  assert.equal(contract.supports_version_selection, false);
  assert.equal(contract.deploys, false);
  assert.deepEqual(contract, {
    ...experimentRolloutSimulatorContract,
    ...experimentRolloutSimulatorVerifierContract,
    source_sha256: contract.source_sha256,
  });
  assert.deepEqual(schema, experimentRolloutSimulatorSchema);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.synthetic_unit_ids.uniqueItems, true);
  assert.equal(reference.synthetic, true);
  assert.equal(reference.expected.status, "pass");
  assert.equal(reference.expected.monotone_membership_verified, true);
  assert.equal(reference.expected.synthetic_units, 1_000);
  assert.equal(experimentDesignLabContract.rollout_simulator.profile, "0.43-RSM1");
  assert.equal(experimentRotatorContract.rollout_simulator.profile, "0.43-RSM1");
  assert.equal(experimentRotatorContract.version, "0.36-R36");
  assert.equal(experimentRotatorContract.analysis_cohort.id, "wanted_landing_v1-C8");
});

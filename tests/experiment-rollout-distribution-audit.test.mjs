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
  auditExperimentRolloutDistribution,
  experimentRolloutDistributionContract,
  experimentRolloutDistributionReferenceBundle,
  EXPERIMENT_ROLLOUT_DISTRIBUTION_REFERENCE_SUMMARY,
} from "../app/experiments/rollout-distribution-audit.ts";
import { experimentRolloutDistributionAuditSchema } from "../app/experiments/rollout-distribution-audit-schema.ts";
import { experimentRolloutSimulatorVerifierSource } from "../app/experiments/rollout-simulator-verifier-source.ts";
import {
  experimentRolloutDistributionAuditVerifierContract,
  experimentRolloutDistributionAuditVerifierSource,
} from "../app/experiments/rollout-distribution-audit-verifier-source.ts";
import { GET as getContract } from "../app/experiments/rollout-distribution.json/route.ts";
import { GET as getReference } from "../app/experiments/rollout-distribution.reference.json/route.ts";
import { GET as getSchema } from "../app/experiments/rollout-distribution.schema.json/route.ts";
import { GET as getModule } from "../app/experiments/wanted-rollout-distribution.mjs/route.ts";

const clone = (value) => structuredClone(value);

test("reproduces the exact one-million-unit synthetic distribution certificate", async () => {
  const first = await auditExperimentRolloutDistribution(experimentRolloutDistributionReferenceBundle());
  const second = await auditExperimentRolloutDistribution(experimentRolloutDistributionReferenceBundle());
  assert.equal(first.status, "pass", JSON.stringify(first));
  assert.deepEqual(second, first);
  const certificate = first.certificate;
  assert.equal(certificate.sample_size, 1_000_000);
  assert.equal(certificate.observed_bucket_count, 10_000);
  assert.equal(certificate.empty_bucket_count, 0);
  assert.equal(certificate.minimum_bucket_occupancy, 63);
  assert.equal(certificate.maximum_bucket_occupancy, 142);
  assert.equal(certificate.maximum_absolute_bucket_deviation, 42);
  assert.equal(certificate.pearson_chi_square_times_100, 982_492);
  assert.equal(certificate.bucket_occupancy_sha256, "8df5abe629859722da49535e8f0e440f2cc8c9bfd175b93ea7f119b860594b93");
  assert.equal(certificate.audited_source_sha256, "aef89bad20c04d1bee8e65af5064606e42ae1dda4ff5e061f707c0a99a7656f3");
  assert.equal(createHash("sha256").update(experimentRolloutSimulatorVerifierSource).digest("hex"), certificate.audited_source_sha256);
  assert.equal(certificate.cross_implementation_vector_count, 16);
  assert.equal(certificate.cross_implementation_vectors_sha256, "b508d15d7c00a933bcc74118dbadf03b1b567a490bc92f5a8c1c77cb62b698ff");
  assert.equal(certificate.certificate_sha256, "d2b808166c3b23902c1f8d1232451b069c696e715bb7b8b1ee215df0a98f81ec");
  assert.deepEqual(certificate.phases.map((phase) => phase.observed_selected_units), [49_907, 249_990, 499_757, 1_000_000]);
  assert.deepEqual(certificate.phases.map((phase) => phase.deviation_parts_per_million), [-93, -10, -243, 0]);
  assert.ok(Object.values(certificate.gates).every(Boolean));
  assert.equal(first.source_binding_verified, true);
  assert.equal(first.cross_implementation_vectors_verified, true);
  assert.equal(certificate.certificate_sha256, second.certificate.certificate_sha256);
  assert.deepEqual(
    EXPERIMENT_ROLLOUT_DISTRIBUTION_REFERENCE_SUMMARY.phases.map((phase) => phase.observed),
    certificate.phases.map((phase) => phase.observed_selected_units),
  );
  for (const field of ["reads_user_identifiers", "reads_platform_environment", "performs_network_requests", "uses_live_traffic", "counts_exposures", "supports_version_selection", "changes_live_allocation", "changes_live_phase", "deploys"]) assert.equal(first[field], false, field);
});

test("rejects sample, generator, algorithm, purpose, and structural drift before enumeration", async () => {
  const mutations = [
    (bundle) => { bundle.sample_size = 999_999; },
    (bundle) => { bundle.index_start = 1; },
    (bundle) => { bundle.generator_profile = "unknown"; },
    (bundle) => { bundle.allocation_algorithm = "random"; },
    (bundle) => { bundle.audited_source_sha256 = "0".repeat(64); },
    (bundle) => { bundle.audited_source_profile = "unknown"; },
    (bundle) => { bundle.purpose = "production"; },
    (bundle) => { bundle.extra = true; },
  ];
  for (const mutate of mutations) {
    const bundle = clone(experimentRolloutDistributionReferenceBundle());
    mutate(bundle);
    const result = await auditExperimentRolloutDistribution(bundle);
    assert.equal(result.status, "fail");
    assert.equal(result.certificate, null);
    assert.equal(result.changes_live_allocation, false);
    assert.equal(result.deploys, false);
    assert.ok(result.errors.length);
  }
});

test("portable auditor, CLI, routes, schema, and governance contracts remain in parity", async () => {
  const moduleResponse = await getModule();
  const source = await moduleResponse.text();
  const sdk = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const bundle = experimentRolloutDistributionReferenceBundle();
  const portable = await sdk.auditRolloutDistribution(bundle);
  const internal = await auditExperimentRolloutDistribution(bundle);
  assert.deepEqual(portable, internal);

  const directory = await mkdtemp(join(tmpdir(), "wanted-rollout-distribution-"));
  const modulePath = join(directory, "wanted-rollout-distribution.mjs");
  try {
    await writeFile(modulePath, source);
    const cli = spawnSync(process.execPath, [modulePath, "--conformance"], { encoding: "utf8" });
    assert.equal(cli.status, 0, cli.stderr);
    assert.equal(JSON.parse(cli.stdout).certificate.empty_bucket_count, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }

  const [contract, schema, reference] = await Promise.all([
    getContract().then((response) => response.json()),
    Promise.resolve(getSchema()).then((response) => response.json()),
    getReference().then((response) => response.json()),
  ]);
  assert.equal(source, experimentRolloutDistributionAuditVerifierSource);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /process\.env(?:\.|\[)/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.equal(contract.version, "0.48-RDA2");
  assert.equal(contract.certificate_profile, "0.48-RDAC2");
  assert.equal(contract.sample_size, 1_000_000);
  assert.equal(contract.audited_source_sha256, "aef89bad20c04d1bee8e65af5064606e42ae1dda4ff5e061f707c0a99a7656f3");
  assert.equal(contract.audited_source_module, "/experiments/wanted-rollout-simulator.mjs");
  assert.equal(contract.cross_implementation_vector_count, 16);
  assert.equal(contract.source_sha256, createHash("sha256").update(source).digest("hex"));
  assert.equal(contract.runtime_dependencies, 0);
  assert.equal(contract.reads_user_identifiers, false);
  assert.equal(contract.uses_live_traffic, false);
  assert.equal(contract.supports_version_selection, false);
  assert.equal(contract.changes_live_allocation, false);
  assert.equal(contract.deploys, false);
  assert.deepEqual(contract, { ...experimentRolloutDistributionContract, ...experimentRolloutDistributionAuditVerifierContract, source_sha256: contract.source_sha256 });
  assert.deepEqual(schema, experimentRolloutDistributionAuditSchema);
  assert.equal(schema.additionalProperties, false);
  assert.equal(reference.synthetic, true);
  assert.equal(reference.expected.status, "pass");
  assert.equal(reference.expected.certificate.empty_bucket_count, 0);
  assert.equal(experimentDesignLabContract.rollout_distribution_audit.profile, "0.48-RDA2");
  assert.equal(experimentRotatorContract.rollout_distribution_audit.profile, "0.48-RDA2");
  assert.equal(experimentRotatorContract.version, "0.36-R36");
  assert.equal(experimentRotatorContract.analysis_cohort.id, "wanted_landing_v1-C8");
});

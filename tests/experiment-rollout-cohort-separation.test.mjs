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
  auditExperimentRolloutCohortSeparation,
  experimentRolloutCohortSeparationContract,
  experimentRolloutCohortSeparationReferenceBundle,
} from "../app/experiments/rollout-cohort-separation.ts";
import { experimentRolloutCohortSeparationSchema } from "../app/experiments/rollout-cohort-separation-schema.ts";
import {
  experimentRolloutCohortSeparationVerifierContract,
  experimentRolloutCohortSeparationVerifierSource,
} from "../app/experiments/rollout-cohort-separation-verifier-source.ts";
import { GET as getContract } from "../app/experiments/rollout-cohort-separation.json/route.ts";
import { GET as getReference } from "../app/experiments/rollout-cohort-separation.reference.json/route.ts";
import { GET as getSchema } from "../app/experiments/rollout-cohort-separation.schema.json/route.ts";
import { GET as getModule } from "../app/experiments/wanted-rollout-cohort-separation.mjs/route.ts";

const clone = (value) => structuredClone(value);

test("completes the source-bound cohort review and places the FNV candidate on hold", async () => {
  const result = await auditExperimentRolloutCohortSeparation(experimentRolloutCohortSeparationReferenceBundle());
  assert.equal(result.evaluation_status, "complete", JSON.stringify(result));
  assert.equal(result.readiness, "hold");
  assert.equal(result.cohort_separation_verified, false);
  assert.equal(result.activation_authorized, false);
  assert.equal(result.certificate.activation_recommendation, "hold");
  assert.equal(result.certificate.previous_variant_candidate_ramp_cramers_v_ppm, 1_435);
  assert.equal(result.certificate.old_new_decile_cramers_v_ppm, 2_723);
  assert.equal(result.certificate.bucket_pearson_correlation_ppm, -358);
  assert.equal(result.certificate.exact_bucket_match_count, 0);
  assert.deepEqual(result.certificate.observed_modulo_16_difference_residues, [1, 3, 5, 7, 9, 11, 13, 15]);
  assert.deepEqual(result.certificate.modulo_16_difference_residue_counts.filter((_, index) => index % 2 === 0), Array(8).fill(0));
  assert.equal(result.certificate.gates.treatment_association_at_most_5_000_ppm, true);
  assert.equal(result.certificate.gates.decile_association_at_most_5_000_ppm, true);
  assert.equal(result.certificate.gates.absolute_linear_correlation_at_most_5_000_ppm, true);
  assert.equal(result.certificate.gates.all_modulo_16_difference_residues_observed, false);
  assert.equal(result.certificate.gates.exact_bucket_match_count_between_50_and_150, false);
  assert.equal(result.certificate.diagnostics_sha256, "21aa594afae6680a6ba43102a3f9fc7c5d0929b2de018830b1633afc16410c52");
  assert.equal(result.certificate.certificate_sha256, "edf66af725607e4849019cd8a6c3b7eeff1b8ab1f926356867716712cc5cdb4d");
  assert.equal(result.findings.length, 2);
  for (const field of ["reads_user_identifiers", "uses_live_traffic", "counts_exposures", "supports_version_selection", "changes_live_allocation", "changes_live_phase", "deploys"]) assert.equal(result[field], false, field);
});

test("rejects source, cohort, sample, purpose, and structural drift without a certificate", async () => {
  const mutations = [
    (bundle) => { bundle.previous_source_sha256 = "0".repeat(64); },
    (bundle) => { bundle.candidate_source_sha256 = "0".repeat(64); },
    (bundle) => { bundle.previous_analysis_cohort = "wanted_landing_v1-C7"; },
    (bundle) => { bundle.candidate_analysis_cohort = "wanted_landing_v1-C10"; },
    (bundle) => { bundle.sample_size = 999_999; },
    (bundle) => { bundle.purpose = "production"; },
    (bundle) => { bundle.extra = true; },
  ];
  for (const mutate of mutations) {
    const bundle = clone(experimentRolloutCohortSeparationReferenceBundle());
    mutate(bundle);
    const result = await auditExperimentRolloutCohortSeparation(bundle);
    assert.equal(result.evaluation_status, "invalid");
    assert.equal(result.readiness, "hold");
    assert.equal(result.certificate, null);
    assert.equal(result.activation_authorized, false);
    assert.equal(result.deploys, false);
    assert.ok(result.errors.length);
  }
});

test("portable hold auditor, CLI, routes, schema, and governance contracts remain in parity", async () => {
  const moduleResponse = await getModule();
  const source = await moduleResponse.text();
  const sdk = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const bundle = experimentRolloutCohortSeparationReferenceBundle();
  const portable = await sdk.auditCohortSeparation(bundle);
  const internal = await auditExperimentRolloutCohortSeparation(bundle);
  assert.deepEqual(portable, internal);

  const directory = await mkdtemp(join(tmpdir(), "wanted-cohort-separation-"));
  const modulePath = join(directory, "wanted-rollout-cohort-separation.mjs");
  try {
    await writeFile(modulePath, source);
    const cli = spawnSync(process.execPath, [modulePath, "--conformance"], { encoding: "utf8" });
    assert.equal(cli.status, 0, cli.stderr);
    const output = JSON.parse(cli.stdout);
    assert.equal(output.evaluation_status, "complete");
    assert.equal(output.readiness, "hold");
    assert.equal(output.activation_authorized, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }

  const [contract, schema, reference] = await Promise.all([
    getContract().then((response) => response.json()),
    Promise.resolve(getSchema()).then((response) => response.json()),
    getReference().then((response) => response.json()),
  ]);
  assert.equal(source, experimentRolloutCohortSeparationVerifierSource);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /process\.env(?:\.|\[)/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.equal(contract.version, "0.49-CSR1");
  assert.equal(contract.certificate_profile, "0.49-CSRC1");
  assert.equal(contract.result, "hold");
  assert.equal(contract.activation_authorized, false);
  assert.equal(contract.source_sha256, createHash("sha256").update(source).digest("hex"));
  assert.equal(contract.runtime_dependencies, 0);
  assert.equal(contract.uses_live_traffic, false);
  assert.equal(contract.changes_live_allocation, false);
  assert.equal(contract.deploys, false);
  assert.deepEqual(contract, { ...experimentRolloutCohortSeparationContract, ...experimentRolloutCohortSeparationVerifierContract, source_sha256: contract.source_sha256 });
  assert.deepEqual(schema, experimentRolloutCohortSeparationSchema);
  assert.equal(schema.additionalProperties, false);
  assert.equal(reference.synthetic, true);
  assert.equal(reference.expected.evaluation_status, "complete");
  assert.equal(reference.expected.readiness, "hold");
  assert.equal(reference.expected.certificate.exact_bucket_match_count, 0);
  assert.equal(experimentDesignLabContract.rollout_cohort_separation.profile, "0.49-CSR1");
  assert.equal(experimentRotatorContract.rollout_cohort_separation.profile, "0.49-CSR1");
  assert.equal(experimentRotatorContract.version, "0.36-R36");
  assert.equal(experimentRotatorContract.analysis_cohort.id, "wanted_landing_v1-C8");
});

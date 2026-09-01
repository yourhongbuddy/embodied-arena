import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { analysisConformancePack } from "../app/wanted-10k/analysis-conformance/vectors.ts";
import {
  ANALYSIS_CONFORMANCE_SDK_VERSION,
  ANALYSIS_CONFORMANCE_PACK_SHA256,
  analysisConformanceSdkContract,
  analysisConformanceSdkSource,
} from "../app/wanted-10k/analysis-conformance-sdk/source.ts";
import { GET as getContract } from "../app/wanted-10k/analysis-conformance-sdk.json/route.ts";
import { GET as getModule } from "../app/wanted-10k/wanted-analysis-conformance.mjs/route.ts";

const sdk = await import(`data:text/javascript;base64,${Buffer.from(analysisConformanceSdkSource).toString("base64")}`);

test("standalone analysis runner passes every canonical AC1 vector", () => {
  const report = sdk.runWantedAnalysisConformance(analysisConformancePack);
  assert.equal(report.status, "pass");
  assert.equal(report.sdk_version, "0.2-ACS1");
  assert.equal(report.pack_version, "0.2-AC1");
  assert.equal(report.analysis_profile_version, "0.2-A2");
  assert.equal(report.passed_vectors, 5);
  assert.equal(report.total_vectors, 5);
  assert.equal(report.vectors.every(vector => vector.checks.every(check => check.passed)), true);
  assert.equal(report.interpretation, "developer_conformance_only_not_certification_audit_or_rank");
});

test("standalone runner exposes exact numeric and refusal mismatches", () => {
  const altered = structuredClone(analysisConformancePack);
  altered.vectors[0].expected.wanted_score += 0.01;
  altered.vectors[3].expected.error_code = "invalid_horizon_censor";
  const report = sdk.runWantedAnalysisConformance(altered);
  assert.equal(report.status, "fail");
  assert.equal(report.passed_vectors, 3);
  const numeric = report.vectors[0].checks.find(check => check.field === "wanted_score");
  const refusal = report.vectors[3].checks.find(check => check.field === "error_code");
  assert.equal(numeric.passed, false);
  assert.ok(numeric.absolute_error > altered.numerical_tolerance);
  assert.equal(refusal.passed, false);
  assert.equal(refusal.actual, "unsupported_horizon");
});

test("standalone runner rejects drifted pack metadata before execution", () => {
  const drifted = structuredClone(analysisConformancePack);
  drifted.analysis_profile_version = "0.2-A1";
  drifted.bootstrap.prng = "Math.random";
  drifted.numerical_tolerance = 0.1;
  drifted.vectors[0].id = "AC1-SUBSTITUTE";
  const report = sdk.runWantedAnalysisConformance(drifted);
  assert.equal(report.status, "fail");
  assert.equal(report.vectors.length, 0);
  assert.match(report.metadata_errors.join(" "), /0\.2-A2/);
  assert.match(report.metadata_errors.join(" "), /bootstrap profile/);
  assert.match(report.metadata_errors.join(" "), /1e-9/);
  assert.match(report.metadata_errors.join(" "), /canonical AC1 vector/);
});

test("URL helper fetches one pack and returns the same report", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify(analysisConformancePack), { status: 200, headers: { "content-type": "application/json" } });
  };
  const report = await sdk.runWantedAnalysisConformanceUrl("https://example.org/vectors.json", fetchImpl);
  assert.equal(report.status, "pass");
  assert.deepEqual(calls, [{ url: "https://example.org/vectors.json", options: { headers: { accept: "application/json" } } }]);
});

test("URL helper rejects a drifted vector pack before execution", async () => {
  const drifted = structuredClone(analysisConformancePack);
  drifted.vectors[0].records[0].resident_hours = 9999;
  await assert.rejects(
    sdk.runWantedAnalysisConformanceUrl("https://example.org/drifted.json", async () => new Response(JSON.stringify(drifted), { status: 200 })),
    /SHA-256 mismatch/,
  );
});

test("published runner and contract are zero-dependency and digest-bound", async () => {
  const moduleResponse = await getModule();
  const source = await moduleResponse.text();
  const contract = await (await getContract()).json();
  const digest = createHash("sha256").update(source).digest("hex");
  const packDigest = createHash("sha256").update(JSON.stringify(analysisConformancePack)).digest("hex");
  assert.equal(ANALYSIS_CONFORMANCE_SDK_VERSION, "0.2-ACS1");
  assert.equal(source, analysisConformanceSdkSource);
  assert.equal(moduleResponse.headers.get("content-type"), "text/javascript; charset=utf-8");
  assert.equal(contract.source_sha256, digest);
  assert.equal(ANALYSIS_CONFORMANCE_PACK_SHA256, packDigest);
  assert.equal(contract.vector_pack_sha256, packDigest);
  assert.equal(contract.module, "/wanted-10k/wanted-analysis-conformance.mjs");
  assert.equal(contract.runtime_dependencies, 0);
  assert.deepEqual(contract.exports, ["ANALYSIS_CONFORMANCE_PACK_SHA256", "runWantedAnalysisConformance", "runWantedAnalysisConformanceUrl"]);
  assert.equal(analysisConformanceSdkContract.ranking_effect, "none");
});

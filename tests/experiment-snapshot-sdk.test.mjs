import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { experimentResultsSnapshot,verifyExperimentResultsSnapshot } from "../app/experiments/snapshot.ts";
import { EXPERIMENT_SNAPSHOT_VERIFIER_VERSION,experimentSnapshotVerifierContract,experimentSnapshotVerifierSource } from "../app/experiments/snapshot-verifier-source.ts";
import { GET as getModule } from "../app/experiments/wanted-result-snapshot.mjs/route.ts";
import { GET as getContract } from "../app/experiments/snapshot-verifier.json/route.ts";

const sdk=await import("data:text/javascript;charset=utf-8,"+encodeURIComponent(experimentSnapshotVerifierSource));
const payload={status:"ready",analysis_snapshot_status:"bound",analysis_window:{started_at:"2026-08-02T12:34:56.000Z",ended_at:"2026-09-01T12:34:56.000Z"},variants:[{variant:"control",exposed_units:10,goal_units:2}]};
const seal=async value=>({...value,analysis_snapshot:await experimentResultsSnapshot(value)});

test("portable verifier accepts the canonical ready snapshot",async()=>{
  const sealed=await seal(payload),result=await sdk.verifyExperimentResultsSnapshot(sealed),jsonResult=await sdk.verifyExperimentResultsJson(JSON.stringify(sealed));
  assert.equal(await verifyExperimentResultsSnapshot(sealed),true);assert.equal(result.status,"pass",JSON.stringify(result));assert.deepEqual(jsonResult,result);assert.equal(result.declared_digest,sealed.analysis_snapshot.digest);assert.equal(result.calculated_digest,sealed.analysis_snapshot.digest);assert.deepEqual(result.errors,[]);
  const reordered={variants:sealed.variants,analysis_window:sealed.analysis_window,analysis_snapshot_status:"bound",status:"ready",analysis_snapshot:sealed.analysis_snapshot};assert.equal((await sdk.verifyExperimentResultsSnapshot(reordered)).status,"pass");
});

test("portable verifier rejects content, metadata, and strict-I-JSON drift",async()=>{
  const sealed=await seal(payload);
  const content=structuredClone(sealed);content.variants[0].goal_units=3;assert.equal((await sdk.verifyExperimentResultsSnapshot(content)).status,"fail");assert.equal(await verifyExperimentResultsSnapshot(content),false);
  const extra=structuredClone(sealed);extra.analysis_snapshot.note="invented";assert.equal((await sdk.verifyExperimentResultsSnapshot(extra)).status,"fail");assert.equal(await verifyExperimentResultsSnapshot(extra),false);
  const metadata=structuredClone(sealed);metadata.analysis_snapshot.signed=true;assert.equal((await sdk.verifyExperimentResultsSnapshot(metadata)).status,"fail");assert.equal(await verifyExperimentResultsSnapshot(metadata),false);
  const nonfinite=structuredClone(sealed);nonfinite.total=Number.NaN;assert.equal((await sdk.verifyExperimentResultsSnapshot(nonfinite)).status,"fail");
  const cycle=structuredClone(sealed);cycle.loop=cycle;assert.equal((await sdk.verifyExperimentResultsSnapshot(cycle)).status,"fail");
  assert.equal((await sdk.verifyExperimentResultsJson("not json")).status,"fail");assert.equal((await sdk.verifyExperimentResultsSnapshot(null)).status,"fail");
});

test("portable verifier reproduces the public conformance vector",async()=>{
  const result=await sdk.verifyConformanceVector();assert.equal(result.status,"pass");assert.equal(result.expected_digest,experimentSnapshotVerifierContract.conformance_vector.digest);assert.equal(result.calculated_digest,result.expected_digest);
});

test("serves one source-digest-bound zero-dependency verifier",async()=>{
  const[moduleResponse,contractResponse]=await Promise.all([getModule(),getContract()]),[moduleSource,contract]=await Promise.all([moduleResponse.text(),contractResponse.json()]);
  assert.equal(EXPERIMENT_SNAPSHOT_VERIFIER_VERSION,"0.31-SVS1");assert.equal(moduleSource,experimentSnapshotVerifierSource);assert.match(moduleResponse.headers.get("content-type"),/text\/javascript/);assert.match(moduleResponse.headers.get("content-disposition"),/wanted-result-snapshot\.mjs/);assert.equal(contract.version,"0.31-SVS1");assert.equal(contract.snapshot_profile,"0.30-AS1");assert.equal(contract.module,"/experiments/wanted-result-snapshot.mjs");assert.equal(contract.contract,"/experiments/snapshot-verifier.json");assert.equal(contract.runtime_dependencies,0);assert.equal(contract.performs_network_requests,false);assert.equal(/\bfetch\s*\(/.test(moduleSource),false);assert.equal(contract.source_sha256,createHash("sha256").update(moduleSource).digest("hex"));assert.deepEqual(contract.exports,["assertIJson","canonicalize","sha256Canonical","verifyExperimentResultsSnapshot","verifyExperimentResultsJson","verifyConformanceVector"]);assert.match(contract.interpretation,/does not authenticate/i);
});

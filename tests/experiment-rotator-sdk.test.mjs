import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp,rm,writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { assignWantedVariant,experimentRotatorContract,exposureTokenForAssignment,wantedVariantForBucket } from "../app/experiments/rotator.ts";
import { EXPERIMENT_ROTATOR_CONFORMANCE_VECTORS,EXPERIMENT_ROTATOR_SDK_VERSION,experimentRotatorSdkContract,experimentRotatorSdkSource } from "../app/experiments/rotator-sdk-source.ts";
import { GET as getModule } from "../app/experiments/wanted-rotator.mjs/route.ts";
import { GET as getContract } from "../app/experiments/rotator-sdk.json/route.ts";

const sdk=await import("data:text/javascript;charset=utf-8,"+encodeURIComponent(experimentRotatorSdkSource));

test("portable rotator reproduces all normative assignments and tokens",()=>{
  assert.equal(EXPERIMENT_ROTATOR_SDK_VERSION,"0.32-RSDK1");
  for(const vector of EXPERIMENT_ROTATOR_CONFORMANCE_VECTORS){
    const internal=assignWantedVariant(vector.unit_id),portable=sdk.assignmentRecord(vector.unit_id);
    assert.deepEqual(portable,vector);assert.deepEqual(internal,{experiment:vector.experiment,variant:vector.variant,bucket:vector.bucket,mode:vector.mode});assert.equal(exposureTokenForAssignment(vector.unit_id,vector.variant),vector.exposure_token);assert.equal(sdk.verifyAssignment(vector.unit_id,vector).status,"pass");
  }
  const report=sdk.verifyConformanceVectors();assert.equal(report.status,"pass");assert.equal(report.vectors.length,3);assert.deepEqual(report.vectors.map(vector=>vector.variant),["control","proof","developer"]);
});

test("portable and internal rotators remain identical across deterministic browser units",()=>{
  for(let index=0;index<2_048;index++){
    const unit=`12345678-1234-4abc-8def-${index.toString(16).padStart(12,"0")}`,internal=assignWantedVariant(unit),portable=sdk.assignmentForUnit(unit);
    assert.deepEqual(portable,internal);assert.equal(sdk.exposureTokenForAssignment(unit,portable.variant),exposureTokenForAssignment(unit,internal.variant));
  }
  for(const bucket of [-1,0,3399,3400,6699,6700,9999,10_000,1.5])assert.equal(sdk.variantForBucket(bucket),wantedVariantForBucket(bucket));
});

test("portable verifier and CLI reject drift without claiming counted delivery",async()=>{
  const vector=structuredClone(EXPERIMENT_ROTATOR_CONFORMANCE_VECTORS[0]);
  assert.equal(sdk.verifyAssignment(vector.unit_id,{...vector,bucket:vector.bucket+1}).status,"fail");assert.equal(sdk.verifyAssignment(vector.unit_id,{...vector,note:"invented"}).status,"fail");assert.equal(sdk.verifyAssignment(vector.unit_id,null).status,"fail");assert.throws(()=>sdk.assignmentForUnit("not-a-unit"),/valid experiment unit/i);assert.throws(()=>sdk.exposureTokenForAssignment(vector.unit_id,"proof"),/does not match/);
  const output=[],errors=[];assert.equal(await sdk.runCli([vector.unit_id],{stdout:value=>output.push(value),stderr:value=>errors.push(value)}),0);assert.deepEqual(JSON.parse(output.pop()),vector);assert.equal(await sdk.runCli(["--verify",vector.unit_id,vector.variant,vector.exposure_token],{stdout:value=>output.push(value),stderr:value=>errors.push(value)}),0);assert.equal(JSON.parse(output.pop()).status,"pass");assert.equal(await sdk.runCli(["--verify",vector.unit_id,vector.variant,"00000000-0000-4000-8000-000000000000"],{stdout:value=>output.push(value),stderr:value=>errors.push(value)}),1);assert.equal(JSON.parse(output.pop()).status,"fail");assert.equal(await sdk.runCli([],{stdout:value=>output.push(value),stderr:value=>errors.push(value)}),2);assert.match(errors.pop(),/Usage:/);
  assert.match(experimentRotatorSdkContract.interpretation,/does not establish experiment eligibility/i);assert.match(experimentRotatorSdkContract.interpretation,/count an exposure/i);assert.equal(experimentRotatorContract.assignment_sdk.issues_server_receipt,false);assert.equal(experimentRotatorContract.assignment_sdk.authenticates_traffic,false);assert.equal(experimentRotatorContract.assignment_sdk.changes_assignment,false);
});

test("serves one digest-bound zero-dependency SDK that executes directly",async()=>{
  const[moduleResponse,contractResponse]=await Promise.all([getModule(),getContract()]),[moduleSource,contract]=await Promise.all([moduleResponse.text(),contractResponse.json()]);
  assert.equal(moduleSource,experimentRotatorSdkSource);assert.match(moduleResponse.headers.get("content-type"),/text\/javascript/);assert.match(moduleResponse.headers.get("content-disposition"),/wanted-rotator\.mjs/);assert.equal(contract.version,"0.32-RSDK1");assert.equal(contract.rotator_version,"0.35-R35");assert.deepEqual(contract.compatible_rotator_versions,["0.28-R28","0.29-R29","0.30-R30","0.31-R31","0.32-R32","0.33-R33","0.34-R34","0.35-R35"]);assert.equal(contract.lab,"/experiments/assignment-lab");assert.equal(contract.design_lab,"/experiments/design-lab");assert.equal(contract.runtime_dependencies,0);assert.equal(contract.performs_network_requests,false);assert.equal(/\bfetch\s*\(/.test(moduleSource),false);assert.equal(contract.source_sha256,createHash("sha256").update(moduleSource).digest("hex"));assert.equal(contract.conformance_vectors.length,3);assert.deepEqual(contract.cli.exit_codes,{pass:0,verification_failed:1,usage_or_input_error:2});
  const directory=await mkdtemp(join(tmpdir(),"wanted-rotator-")),path=join(directory,"wanted-rotator.mjs");try{await writeFile(path,moduleSource);const result=spawnSync(process.execPath,[path,"--conformance"],{encoding:"utf8"});assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).status,"pass")}finally{await rm(directory,{recursive:true,force:true})}
});

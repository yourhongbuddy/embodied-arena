import assert from"node:assert/strict";
import{spawnSync}from"node:child_process";
import{createHash}from"node:crypto";
import{mkdtemp,rm,writeFile}from"node:fs/promises";
import{tmpdir}from"node:os";
import{join}from"node:path";
import test from"node:test";
import{DEFAULT_EXPERIMENT_DESIGN_INPUT,experimentDesignPlanDocument,EXPERIMENT_DESIGN_REFERENCE_SHA256,planFixedHorizonExperiment}from"../app/experiments/design-lab.ts";
import{experimentDesignPlanVerifierSource,EXPERIMENT_DESIGN_PLAN_VERIFIER_VERSION}from"../app/experiments/design-plan-verifier-source.ts";
import{experimentDesignPlanSchema}from"../app/experiments/design-plan-schema.ts";
import{GET as getModule}from"../app/experiments/wanted-design-plan.mjs/route.ts";
import{GET as getContract}from"../app/experiments/design-plan-verifier.json/route.ts";
import{GET as getSchema}from"../app/experiments/design-plan.schema.json/route.ts";
import{GET as getReference}from"../app/experiments/design-plan.reference.json/route.ts";

const sdk=await import("data:text/javascript;charset=utf-8,"+encodeURIComponent(experimentDesignPlanVerifierSource));

test("portable verifier reproduces the internal R36 design and canonical digest",async()=>{
  const internal=experimentDesignPlanDocument(DEFAULT_EXPERIMENT_DESIGN_INPUT),portable=sdk.designPlanDocument(DEFAULT_EXPERIMENT_DESIGN_INPUT,"0.36-R36"),internalDesign=planFixedHorizonExperiment(DEFAULT_EXPERIMENT_DESIGN_INPUT),portableDesign=sdk.planFixedHorizonExperiment(DEFAULT_EXPERIMENT_DESIGN_INPUT);assert.deepEqual(portable,internal);assert.deepEqual(portableDesign,internalDesign);assert.equal(await sdk.sha256Canonical(portable),EXPERIMENT_DESIGN_REFERENCE_SHA256);const result=await sdk.verifyDesignPlan(portable,EXPERIMENT_DESIGN_REFERENCE_SHA256);assert.equal(result.status,"pass",JSON.stringify(result));assert.equal(result.registration_binding_verified,true);assert.equal(result.calculated_digest,EXPERIMENT_DESIGN_REFERENCE_SHA256);assert.deepEqual(result.errors,[]);const unbound=await sdk.verifyDesignPlan(portable);assert.equal(unbound.status,"pass");assert.equal(unbound.registration_binding_verified,false);
});

test("portable verifier accepts a self-consistent compatible R34 plan",async()=>{
  const plan=sdk.designPlanDocument({...DEFAULT_EXPERIMENT_DESIGN_INPUT,developer_minimum_detectable_lift:.025},"0.34-R34"),digest=await sdk.sha256Canonical(plan),result=await sdk.verifyDesignPlan(plan,digest);assert.equal(result.status,"pass",JSON.stringify(result));assert.equal(result.rotator_version,"0.34-R34");assert.equal(result.registration_binding_verified,true);assert.notEqual(digest,EXPERIMENT_DESIGN_REFERENCE_SHA256);
});

test("portable verifier rejects mathematical, field, digest, and I-JSON drift",async()=>{
  const plan=experimentDesignPlanDocument(DEFAULT_EXPERIMENT_DESIGN_INPUT),verify=value=>sdk.verifyDesignPlan(value,EXPERIMENT_DESIGN_REFERENCE_SHA256);
  const target=structuredClone(plan);target.design.stop_targets_accepted_exposures.proof++;assert.equal((await verify(target)).status,"fail");
  const input=structuredClone(plan);input.design.input.proof_minimum_detectable_lift=.03;assert.equal((await verify(input)).status,"fail");
  const extra=structuredClone(plan);extra.note="invented";assert.equal((await verify(extra)).status,"fail");
  const version=structuredClone(plan);version.rotator_version="0.37-R37";assert.equal((await verify(version)).status,"fail");
  const nonfinite=structuredClone(plan);nonfinite.design.z_power=Number.NaN;assert.equal((await verify(nonfinite)).status,"fail");
  const cycle=structuredClone(plan);cycle.loop=cycle;assert.equal((await verify(cycle)).status,"fail");
  assert.equal((await sdk.verifyDesignPlan(plan,"0".repeat(64))).status,"fail");assert.equal((await sdk.verifyDesignPlan(plan,"bad")).status,"fail");assert.equal((await sdk.verifyDesignPlanJson("not json")).status,"fail");assert.equal((await sdk.verifyDesignPlan(null)).status,"fail");
});

test("normative vector and local CLI expose stable verification outcomes",async()=>{
  const conformance=await sdk.verifyConformanceVector();assert.equal(conformance.status,"pass");assert.equal(conformance.targets_match,true);assert.equal(conformance.digest_match,true);assert.equal(conformance.calculated_digest,EXPERIMENT_DESIGN_REFERENCE_SHA256);
  const output=[],errors=[],readFile=async()=>JSON.stringify(experimentDesignPlanDocument(DEFAULT_EXPERIMENT_DESIGN_INPUT));assert.equal(await sdk.runCli(["plan.json"],{readFile,stdout:value=>output.push(value),stderr:value=>errors.push(value)}),0);assert.equal(JSON.parse(output.pop()).registration_binding_verified,false);assert.equal(await sdk.runCli(["--verify","plan.json",EXPERIMENT_DESIGN_REFERENCE_SHA256],{readFile,stdout:value=>output.push(value),stderr:value=>errors.push(value)}),0);assert.equal(JSON.parse(output.pop()).registration_binding_verified,true);assert.equal(await sdk.runCli(["--verify","plan.json","0".repeat(64)],{readFile,stdout:value=>output.push(value),stderr:value=>errors.push(value)}),1);assert.equal(JSON.parse(output.pop()).status,"fail");assert.equal(await sdk.runCli([],{readFile,stdout:value=>output.push(value),stderr:value=>errors.push(value)}),2);assert.match(errors.pop(),/Usage:/);
});

test("publishes strict schema, reference plan, and source-digest-bound verifier",async()=>{
  const[moduleResponse,contractResponse,schemaResponse,referenceResponse]=await Promise.all([getModule(),getContract(),getSchema(),getReference()]),[moduleSource,contract,schema,reference]=await Promise.all([moduleResponse.text(),contractResponse.json(),schemaResponse.json(),referenceResponse.json()]);assert.equal(EXPERIMENT_DESIGN_PLAN_VERIFIER_VERSION,"0.35-DPV1");assert.equal(moduleSource,experimentDesignPlanVerifierSource);assert.match(moduleResponse.headers.get("content-type"),/text\/javascript/);assert.match(moduleResponse.headers.get("content-disposition"),/wanted-design-plan\.mjs/);assert.equal(contract.version,"0.35-DPV1");assert.equal(contract.design_plan_profile,"0.34-DL1");assert.equal(contract.rotator_version,"0.36-R36");assert.deepEqual(contract.compatible_rotator_versions,["0.34-R34","0.35-R35","0.36-R36"]);assert.equal(contract.runtime_dependencies,0);assert.equal(contract.performs_network_requests,false);assert.equal(/\bfetch\s*\(/.test(moduleSource),false);assert.equal(contract.source_sha256,createHash("sha256").update(moduleSource).digest("hex"));assert.deepEqual(contract.cli.exit_codes,{pass:0,verification_failed:1,usage_or_input_error:2});assert.equal(contract.conformance_vector.canonical_plan_sha256,EXPERIMENT_DESIGN_REFERENCE_SHA256);assert.match(contract.interpretation,/does not provide an external timestamp/i);assert.deepEqual(schema,experimentDesignPlanSchema);assert.equal(schema.additionalProperties,false);assert.equal(schema.properties.rotator_version.enum.length,3);assert.equal(schema.properties.design.additionalProperties,false);assert.equal(schema.properties.analysis.additionalProperties,false);assert.equal(reference.canonical_plan_sha256,EXPERIMENT_DESIGN_REFERENCE_SHA256);assert.deepEqual(reference.plan,experimentDesignPlanDocument(DEFAULT_EXPERIMENT_DESIGN_INPUT));assert.match(reference.interpretation,/not an externally preregistered/i);
  const directory=await mkdtemp(join(tmpdir(),"wanted-design-plan-")),modulePath=join(directory,"wanted-design-plan.mjs"),planPath=join(directory,"plan.json");try{await writeFile(modulePath,moduleSource);await writeFile(planPath,JSON.stringify(reference.plan));const result=spawnSync(process.execPath,[modulePath,"--verify",planPath,EXPERIMENT_DESIGN_REFERENCE_SHA256],{encoding:"utf8"});assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).registration_binding_verified,true)}finally{await rm(directory,{recursive:true,force:true})}
});

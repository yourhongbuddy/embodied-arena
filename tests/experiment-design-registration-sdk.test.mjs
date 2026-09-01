import assert from"node:assert/strict";
import{spawnSync}from"node:child_process";
import{createHash}from"node:crypto";
import{mkdtemp,rm,writeFile}from"node:fs/promises";
import{tmpdir}from"node:os";
import{join}from"node:path";
import test from"node:test";
import{EXPERIMENT_DESIGN_REGISTRATION_PROFILE,EXPERIMENT_DESIGN_REGISTRAR_KEY_MANIFEST_SHA256,experimentDesignRegistrationReferenceBundle,verifyExperimentDesignRegistrationBundle}from"../app/experiments/design-registration.ts";
import{experimentDesignRegistrationSchema}from"../app/experiments/design-registration-schema.ts";
import{experimentDesignRegistrationVerifierSource}from"../app/experiments/design-registration-verifier-source.ts";
import{GET as getModule}from"../app/experiments/wanted-design-registration.mjs/route.ts";
import{GET as getContract}from"../app/experiments/design-registration.json/route.ts";
import{GET as getSchema}from"../app/experiments/design-registration.schema.json/route.ts";
import{GET as getReference}from"../app/experiments/design-registration.reference.json/route.ts";
import{GET as getKeys}from"../app/experiments/design-registration-keys.json/route.ts";

const sdk=await import("data:text/javascript;charset=utf-8,"+encodeURIComponent(experimentDesignRegistrationVerifierSource));

test("reference registration bundle passes internal and portable verification without decision authority",async()=>{
  const bundle=experimentDesignRegistrationReferenceBundle(),internal=await verifyExperimentDesignRegistrationBundle(bundle),portable=await sdk.verifyRegistrationBundle(bundle);assert.equal(internal.status,"pass",JSON.stringify(internal));assert.deepEqual(portable,internal);assert.equal(internal.profile,EXPERIMENT_DESIGN_REGISTRATION_PROFILE);assert.equal(internal.plan_digest_verified,true);assert.equal(internal.trust_root_digest_verified,true);assert.equal(internal.registrar_key_verified,true);assert.equal(internal.signature_verified,true);assert.equal(internal.chronology_consistent,true);assert.equal(internal.evidence_bundle_verified,true);assert.equal(internal.decision_eligible,false);assert.equal(internal.errors.length,0);assert.match(internal.limitations.join(" "),/cannot prove.*publicly available/i);
});

test("receipt verifier rejects plan, trust-root, signature, lifecycle, and chronology drift",async()=>{
  const verify=value=>sdk.verifyRegistrationBundle(value),bundle=experimentDesignRegistrationReferenceBundle();
  const plan=structuredClone(bundle);plan.plan.design.total_accepted_target++;assert.equal((await verify(plan)).status,"fail");assert.equal((await verify(plan)).plan_digest_verified,false);
  const trust=structuredClone(bundle);trust.trusted_key_manifest_sha256="0".repeat(64);assert.equal((await verify(trust)).trust_root_digest_verified,false);
  const signature=structuredClone(bundle);signature.receipt.signature_base64url="A"+signature.receipt.signature_base64url.slice(1);assert.equal((await verify(signature)).signature_verified,false);
  const lifecycle=structuredClone(bundle);lifecycle.key_manifest.keys[0].revoked_at="2026-08-31T00:00:00Z";lifecycle.trusted_key_manifest_sha256=await sdk.sha256Canonical(lifecycle.key_manifest);const lifecycleResult=await verify(lifecycle);assert.equal(lifecycleResult.registrar_key_verified,false);
  const chronology=structuredClone(bundle);chronology.first_eligible_exposure_at=chronology.receipt.issued_at;assert.equal((await verify(chronology)).chronology_consistent,false);
});

test("receipt verifier rejects shape and strict-I-JSON drift",async()=>{
  const extra=structuredClone(experimentDesignRegistrationReferenceBundle());extra.receipt.unregistered=true;assert.equal((await sdk.verifyRegistrationBundle(extra)).status,"fail");const negativeZero=structuredClone(experimentDesignRegistrationReferenceBundle());negativeZero.plan.design.input.eligible_units_per_day=-0;assert.equal((await sdk.verifyRegistrationBundle(negativeZero)).status,"fail");assert.equal((await sdk.verifyRegistrationBundleJson("{" )).status,"fail");
});

test("portable conformance and downloaded CLI expose stable outcomes",async()=>{
  const conformance=await sdk.verifyConformanceVector();assert.equal(conformance.status,"pass");assert.equal(conformance.signature_verified,true);assert.equal(conformance.decision_eligible,false);const output=[],errors=[],readFile=async()=>JSON.stringify(experimentDesignRegistrationReferenceBundle());assert.equal(await sdk.runCli(["bundle.json"],{readFile,stdout:value=>output.push(value),stderr:value=>errors.push(value)}),0);assert.equal(JSON.parse(output.pop()).evidence_bundle_verified,true);assert.equal(await sdk.runCli([],{readFile,stdout:value=>output.push(value),stderr:value=>errors.push(value)}),2);assert.match(errors.pop(),/Usage:/);
  const directory=await mkdtemp(join(tmpdir(),"wanted-design-registration-")),modulePath=join(directory,"wanted-design-registration.mjs"),bundlePath=join(directory,"bundle.json");try{await writeFile(modulePath,experimentDesignRegistrationVerifierSource);await writeFile(bundlePath,JSON.stringify(experimentDesignRegistrationReferenceBundle()));const result=spawnSync(process.execPath,[modulePath,bundlePath],{encoding:"utf8"});assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).decision_eligible,false)}finally{await rm(directory,{recursive:true,force:true})}
});

test("publishes a digest-bound module, strict schema, and explicitly synthetic vector",async()=>{
  const[moduleResponse,contractResponse,schemaResponse,referenceResponse,keysResponse]=await Promise.all([getModule(),getContract(),getSchema(),getReference(),getKeys()]),[source,contract,schema,reference,keys]=await Promise.all([moduleResponse.text(),contractResponse.json(),schemaResponse.json(),referenceResponse.json(),keysResponse.json()]);assert.equal(moduleResponse.status,200);assert.match(moduleResponse.headers.get("content-type"),/text\/javascript/);assert.match(moduleResponse.headers.get("content-disposition"),/wanted-design-registration\.mjs/);assert.equal(source,experimentDesignRegistrationVerifierSource);assert.equal(/\bfetch\s*\(/.test(source),false);assert.equal(contract.version,"0.36-DPR1");assert.equal(contract.rotator_version,"0.36-R36");assert.equal(contract.key_manifest,"/experiments/design-registration-keys.json");assert.equal(contract.runtime_dependencies,0);assert.equal(contract.performs_network_requests,false);assert.equal(contract.source_sha256,createHash("sha256").update(source).digest("hex"));assert.equal(contract.synthetic_vector,true);assert.equal(contract.preregisters_plan,false);assert.equal(contract.selects_version,false);assert.match(contract.interpretation,/does not contact a registry/i);assert.deepEqual(schema,experimentDesignRegistrationSchema);assert.equal(schema.additionalProperties,false);assert.equal(schema.$defs.receipt.additionalProperties,false);assert.equal(schema.$defs.keyManifest.additionalProperties,false);assert.equal(reference.synthetic,true);assert.deepEqual(reference.bundle,experimentDesignRegistrationReferenceBundle());assert.equal(reference.bundle.trusted_key_manifest_sha256,EXPERIMENT_DESIGN_REGISTRAR_KEY_MANIFEST_SHA256);assert.match(reference.interpretation,/synthetic/i);assert.equal(keys.synthetic,true);assert.equal(keys.canonical_key_manifest_sha256,EXPERIMENT_DESIGN_REGISTRAR_KEY_MANIFEST_SHA256);assert.deepEqual(keys.key_manifest,reference.bundle.key_manifest);assert.match(keys.interpretation,/independently pin/i);
});

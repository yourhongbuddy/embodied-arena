import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { sampleBundle } from "../app/wanted-10k/conformance/validator.ts";
import { ROOT_ENVELOPE_BATCH_VERSION, ROOT_ENVELOPE_VERSION, createRootEnvelope, rootEnvelopeBatchSchema, rootEnvelopeContract, rootEnvelopeSchema, verifyRootEnvelope, verifyRootEnvelopeBatch, verifyRootEnvelopeSeries } from "../app/wanted-10k/root-envelope/profile.ts";
import { ROOT_ENVELOPE_SDK_VERSION, rootEnvelopeSdkContract, rootEnvelopeSdkSource } from "../app/wanted-10k/root-envelope-sdk/source.ts";
import { rootCollectionSha256 } from "../app/wanted-10k/root-commitment-witness/profile.ts";
import { ROOT_ENVELOPE_BATCH_CONFORMANCE_VERSION, rootEnvelopeBatchConformancePack } from "../app/wanted-10k/root-envelope-conformance/vectors.ts";
import { rootEnvelopeBatchConformanceProjection, verifyRootEnvelopeBatchConformancePack } from "../app/wanted-10k/root-envelope-conformance/verifier.ts";
import { telemetryVerifierSdkSource } from "../app/wanted-10k/telemetry-sdk/source.ts";
import { GET as getModule } from "../app/wanted-10k/wanted-root-envelope.mjs/route.ts";
import { GET as getContract } from "../app/wanted-10k/root-envelope-sdk.json/route.ts";
import { GET as getProfile } from "../app/wanted-10k/root-envelope.json/route.ts";
import { GET as getSchema } from "../app/wanted-10k/root-envelope.schema.json/route.ts";
import { GET as getBatchSchema } from "../app/wanted-10k/root-envelope-batch.schema.json/route.ts";
import { GET as getConformanceVectors } from "../app/wanted-10k/root-envelope-conformance-vectors.json/route.ts";
import { GET as getTemplate } from "../app/wanted-10k/root-envelope.template.json/route.ts";

const telemetryUrl=`data:text/javascript;base64,${Buffer.from(telemetryVerifierSdkSource).toString("base64")}`;
const portableSource=rootEnvelopeSdkSource.replace('"./wanted-telemetry-verifier.mjs"',JSON.stringify(telemetryUrl));
const sdk=await import(`data:text/javascript;base64,${Buffer.from(portableSource).toString("base64")}`);
const execFileAsync=promisify(execFile);
const digest=async bytes=>Buffer.from(await crypto.subtle.digest("SHA-256",bytes)).toString("hex");
const fixture=async()=>{const sample=await sampleBundle(),events=sample.jsonl.split("\n").map(JSON.parse),keyManifest=JSON.parse(sample.keyManifest),activationAt="2026-08-28T18:00:00.000Z",observationEndAt="2026-08-28T20:00:00.000Z",root0=await createRootEnvelope({events,keyManifest,rootOrdinal:0,coversThroughAt:"2026-08-28T19:00:00.000Z"}),root1=await createRootEnvelope({events,keyManifest,rootOrdinal:1,coversThroughAt:observationEndAt,previousEnvelope:root0}),batchInput={profile_version:ROOT_ENVELOPE_BATCH_VERSION,target_certification:"WANTED_LAB",deployments:[{deployment_id:root0.deployment_id,activation_at:activationAt,observation_end_at:observationEndAt,commitment_interval_hours:1,events,key_manifest:keyManifest,roots:[root0,root1].map((envelope,index)=>({root_commitment_uri:`https://example.org/roots/${index}.json`,envelope}))}]};return{sample,events,keyManifest,activationAt,observationEndAt,root0,root1,batchInput};};

test("creates identical internal and portable telemetry root envelopes",async()=>{
  const value=await fixture(),portable0=await sdk.createRootEnvelope({events:value.events,keyManifest:value.keyManifest,rootOrdinal:0,coversThroughAt:value.root0.covers_through_at}),portable1=await sdk.createRootEnvelope({events:value.events,keyManifest:value.keyManifest,rootOrdinal:1,coversThroughAt:value.root1.covers_through_at,previousEnvelope:portable0});
  assert.deepEqual(portable0,value.root0);assert.deepEqual(portable1,value.root1);
  assert.equal(value.root0.profile_version,ROOT_ENVELOPE_VERSION);assert.equal(value.root0.prefix_event_count,6);assert.equal(value.root0.interval_event_count,6);assert.equal(value.root1.prefix_event_count,6);assert.equal(value.root1.interval_event_count,0);assert.equal(value.root1.previous_root_commitment_sha256,value.root0.root_commitment_sha256);
});

test("verifies exact cadence, zero-event windows, and chained root digests",async()=>{
  const value=await fixture(),input={envelopes:[value.root0,value.root1],events:value.events,keyManifest:value.keyManifest,activationAt:value.activationAt,observationEndAt:value.observationEndAt,intervalHours:1};
  const [internal,portable]=await Promise.all([verifyRootEnvelopeSeries(input),sdk.verifyRootEnvelopeSeries(input)]);
  assert.deepEqual(portable,internal);assert.equal(internal.status,"pass",JSON.stringify(internal));assert.equal(internal.root_count,2);assert.equal(internal.final_prefix_event_count,6);assert.equal(internal.final_root_commitment_sha256,value.root1.root_commitment_sha256);
  assert.equal((await verifyRootEnvelope(value.root1,value.events,value.keyManifest,value.root0)).status,"pass");assert.equal((await sdk.verifyRootEnvelope(value.root1,value.events,value.keyManifest,value.root0)).status,"pass");
});

test("reproduces an audit-ready cross-deployment root collection locally",async()=>{
  const value=await fixture(),secondSample=await sampleBundle({deployment_id:"dep_demo_002",environment_id:"env_demo_002",robot_id:"robot_demo_002"}),secondEvents=secondSample.jsonl.split("\n").map(JSON.parse),secondKey=JSON.parse(secondSample.keyManifest),second0=await createRootEnvelope({events:secondEvents,keyManifest:secondKey,rootOrdinal:0,coversThroughAt:value.root0.covers_through_at}),second1=await createRootEnvelope({events:secondEvents,keyManifest:secondKey,rootOrdinal:1,coversThroughAt:value.observationEndAt,previousEnvelope:second0}),batch=structuredClone(value.batchInput);batch.deployments.push({deployment_id:second0.deployment_id,activation_at:value.activationAt,observation_end_at:value.observationEndAt,commitment_interval_hours:1,events:secondEvents,key_manifest:secondKey,roots:[second0,second1].map((envelope,index)=>({root_commitment_uri:`https://example.org/roots/second-${index}.json`,envelope}))});
  const [internal,portable]=await Promise.all([verifyRootEnvelopeBatch(batch),sdk.verifyRootEnvelopeBatch(batch)]);
  assert.deepEqual(portable,internal);assert.equal(internal.status,"pass",JSON.stringify(internal));assert.equal(internal.summary.verification_profile,ROOT_ENVELOPE_BATCH_VERSION);assert.equal(internal.summary.deployment_count,2);assert.equal(internal.summary.root_count,4);assert.equal(internal.summary.expected_root_count,4);assert.equal(internal.summary.verified_envelopes,4);assert.equal(internal.summary.verified_signed_prefixes,4);assert.equal(internal.summary.missing_envelopes,0);assert.equal(internal.summary.invalid_envelopes,0);
  assert.equal(internal.summary.root_commitments_sha256,await rootCollectionSha256(internal.root_witness_projection));
});

test("batch verification classifies missing, key, chain, and prefix failures",async()=>{
  const value=await fixture();
  const missing=structuredClone(value.batchInput);missing.deployments[0].roots.pop();let result=await verifyRootEnvelopeBatch(missing);assert.equal(result.status,"fail");assert.equal(result.summary.missing_envelopes,1);assert.ok(result.summary.cadence_failures>0);
  const key=structuredClone(value.batchInput);key.deployments[0].key_manifest.key_manifest_id="changed";result=await verifyRootEnvelopeBatch(key);assert.equal(result.status,"fail");assert.equal(result.summary.key_manifest_mismatches,2);assert.equal(result.summary.prefix_binding_failures,2);
  const chain=structuredClone(value.batchInput);chain.deployments[0].roots[1].envelope.previous_root_commitment_sha256="ab".repeat(32);result=await verifyRootEnvelopeBatch(chain);assert.equal(result.status,"fail");assert.equal(result.summary.chain_failures,1);
  const prefix=structuredClone(value.batchInput);prefix.deployments[0].events[2].payload.request_type="privacy";result=await verifyRootEnvelopeBatch(prefix);assert.equal(result.status,"fail");assert.equal(result.summary.prefix_binding_failures,2);
});

test("normative REBC1 vectors match canonical and portable batch verifiers exactly",async()=>{
  const pack=await rootEnvelopeBatchConformancePack();assert.equal(pack.version,ROOT_ENVELOPE_BATCH_CONFORMANCE_VERSION);assert.equal(pack.vectors.length,10);assert.equal(new Set(pack.vectors.map(vector=>vector.id)).size,10);
  for(const vector of pack.vectors){const [internal,portable]=await Promise.all([verifyRootEnvelopeBatch(vector.batch),sdk.verifyRootEnvelopeBatch(vector.batch)]);assert.deepEqual(rootEnvelopeBatchConformanceProjection(internal),vector.expected,vector.id);assert.deepEqual(sdk.rootEnvelopeBatchConformanceProjection(portable),vector.expected,vector.id);}
  const [internalReport,portableReport]=await Promise.all([verifyRootEnvelopeBatchConformancePack(pack),sdk.verifyRootEnvelopeBatchConformancePack(pack)]);assert.deepEqual(portableReport,internalReport);assert.equal(internalReport.status,"passed",JSON.stringify(internalReport));assert.equal(internalReport.passed_vectors,10);assert.equal(internalReport.failed_vectors,0);
  const drifted=structuredClone(pack);drifted.vectors[0].expected.status="fail";assert.equal((await verifyRootEnvelopeBatchConformancePack(drifted)).status,"failed");assert.equal((await sdk.verifyRootEnvelopeBatchConformancePack(drifted)).failed_vectors,1);
});

test("rejects event, key, envelope, prior-root, and cadence drift",async()=>{
  const value=await fixture();
  const tamperedEvents=structuredClone(value.events);tamperedEvents[2].payload.request_type="privacy";
  assert.equal((await verifyRootEnvelope(value.root1,tamperedEvents,value.keyManifest,value.root0)).status,"fail");
  const changedKey=structuredClone(value.keyManifest);changedKey.key_manifest_id="changed-key-manifest";
  assert.equal((await verifyRootEnvelope(value.root1,value.events,changedKey,value.root0)).status,"fail");
  const changedEnvelope=structuredClone(value.root1);changedEnvelope.tail_event_sha256="abcdef01".repeat(8);
  assert.equal((await verifyRootEnvelope(changedEnvelope,value.events,value.keyManifest,value.root0)).status,"fail");
  assert.equal((await verifyRootEnvelope(value.root1,value.events,value.keyManifest,null)).status,"fail");
  const missing=await verifyRootEnvelopeSeries({envelopes:[value.root0],events:value.events,keyManifest:value.keyManifest,activationAt:value.activationAt,observationEndAt:value.observationEndAt,intervalHours:1});assert.equal(missing.status,"fail");assert.match(missing.errors.join(" "),/Expected 2/);
  const shifted=structuredClone(value.root1);shifted.covers_through_at="2026-08-28T20:01:00.000Z";const shiftedResult=await verifyRootEnvelopeSeries({envelopes:[value.root0,shifted],events:value.events,keyManifest:value.keyManifest,activationAt:value.activationAt,observationEndAt:value.observationEndAt,intervalHours:1});assert.equal(shiftedResult.status,"fail");assert.match(shiftedResult.errors.join(" "),/exact due/);
});

test("publishes digest-bound profile, schema, SDK, and synthetic series",async()=>{
  const [moduleResponse,contractResponse,profileResponse,schemaResponse,batchSchemaResponse,templateResponse,vectorsResponse]=await Promise.all([getModule(),getContract(),getProfile(),getSchema(),getBatchSchema(),getTemplate(),getConformanceVectors()]);
  const [moduleSource,contract,profile,schema,batchSchema,template,vectors]=await Promise.all([moduleResponse.text(),contractResponse.json(),profileResponse.json(),schemaResponse.json(),batchSchemaResponse.json(),templateResponse.json(),vectorsResponse.json()]);
  assert.equal(ROOT_ENVELOPE_SDK_VERSION,"0.4-RES3");assert.equal(moduleSource,rootEnvelopeSdkSource);assert.equal(contract.source_sha256,await digest(new TextEncoder().encode(moduleSource)));assert.deepEqual(contract.runtime_dependencies,["./wanted-telemetry-verifier.mjs"]);assert.equal(contract.performs_network_requests,false);assert.equal(contract.batch_profile,"0.2-REB1");assert.equal(contract.conformance_profile,"0.2-REBC1");assert.equal(contract.conformance_vectors,"/wanted-10k/root-envelope-conformance-vectors.json");assert.match(contract.vector_pack_sha256,/^[a-f0-9]{64}$/);assert.equal(vectors.version,"0.2-REBC1");assert.equal(vectors.vectors.length,10);assert.equal(profile.version,"0.2-RE1");assert.equal(profile.batch_verification_profile,"0.2-REB1");assert.equal(profile.root_witness_profile,"0.2-RC1");assert.equal(profile.certification_effect,"hard_field_gate");assert.equal(profile.ranking_effect,"eligibility_only_not_score_or_tiebreaker");assert.equal(profile.audit_summary.field,"root_envelope_integrity");assert.equal(profile.audit_summary.verification_profile,"0.2-REB1");assert.equal(schema.$id,rootEnvelopeSchema.$id);assert.equal(batchSchema.$id,rootEnvelopeBatchSchema.$id);assert.equal(schema.additionalProperties,false);assert.equal(template.envelopes.length,2);assert.equal(template.envelopes[1].interval_event_count,0);assert.equal(template.batch_report.status,"pass");assert.equal(template.root_witness_projection[1].root_commitment_sha256,template.envelopes[1].root_commitment_sha256);assert.match(moduleResponse.headers.get("content-disposition"),/wanted-root-envelope\.mjs/);assert.deepEqual(contract.exports,rootEnvelopeSdkContract.exports);assert.equal(profile.binds.length,rootEnvelopeContract.binds.length);
});

test("downloaded helper creates and verifies one root or the complete series",async t=>{
  const directory=await mkdtemp(join(tmpdir(),"wanted-root-envelope-cli-"));t.after(()=>rm(directory,{recursive:true,force:true}));const value=await fixture();
  const rootModule=join(directory,"wanted-root-envelope.mjs"),telemetryModule=join(directory,"wanted-telemetry-verifier.mjs"),eventsPath=join(directory,"events.jsonl"),keyPath=join(directory,"key.json"),root0Path=join(directory,"root0.json"),root1Path=join(directory,"root1.json"),rootsPath=join(directory,"roots.json"),batchPath=join(directory,"batch.json"),vectorsPath=join(directory,"root-envelope-conformance-vectors.json");
  await Promise.all([writeFile(rootModule,rootEnvelopeSdkSource,"utf8"),writeFile(telemetryModule,telemetryVerifierSdkSource,"utf8"),writeFile(eventsPath,value.sample.jsonl,"utf8"),writeFile(keyPath,value.sample.keyManifest,"utf8"),writeFile(root0Path,JSON.stringify(value.root0),"utf8"),writeFile(root1Path,JSON.stringify(value.root1),"utf8"),writeFile(rootsPath,JSON.stringify([value.root0,value.root1]),"utf8"),writeFile(batchPath,JSON.stringify(value.batchInput),"utf8"),writeFile(vectorsPath,JSON.stringify(await rootEnvelopeBatchConformancePack()),"utf8")]);
  const created=await execFileAsync(process.execPath,[rootModule,"--create",eventsPath,keyPath,"0",value.root0.covers_through_at]);assert.deepEqual(JSON.parse(created.stdout),value.root0);
  const verified=await execFileAsync(process.execPath,[rootModule,"--verify",root1Path,eventsPath,keyPath,root0Path]);assert.equal(JSON.parse(verified.stdout).status,"pass");
  const series=await execFileAsync(process.execPath,[rootModule,"--verify-series",rootsPath,eventsPath,keyPath,value.activationAt,value.observationEndAt,"1"]);assert.equal(JSON.parse(series.stdout).status,"pass");
  const batch=await execFileAsync(process.execPath,[rootModule,"--verify-batch",batchPath]);assert.equal(JSON.parse(batch.stdout).status,"pass");
  const conformance=await execFileAsync(process.execPath,[rootModule,"--conformance-batch",vectorsPath]);assert.equal(JSON.parse(conformance.stdout).status,"passed");assert.equal(JSON.parse(conformance.stdout).passed_vectors,10);
  value.root1.tail_event_id="tampered";await writeFile(root1Path,JSON.stringify(value.root1),"utf8");await assert.rejects(execFileAsync(process.execPath,[rootModule,"--verify",root1Path,eventsPath,keyPath,root0Path]),error=>{assert.equal(error.code,1);assert.equal(JSON.parse(error.stdout).status,"fail");return true;});
  await assert.rejects(execFileAsync(process.execPath,[rootModule,"--create",join(directory,"missing.jsonl"),keyPath,"0",value.root0.covers_through_at]),error=>{assert.equal(error.code,2);assert.match(error.stderr,/WANTED root-envelope helper:/);return true;});
});

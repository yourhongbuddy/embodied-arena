import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { sampleBundle } from "../app/wanted-10k/conformance/validator.ts";
import { ROOT_ENVELOPE_VERSION, createRootEnvelope, rootEnvelopeContract, rootEnvelopeSchema, verifyRootEnvelope, verifyRootEnvelopeSeries } from "../app/wanted-10k/root-envelope/profile.ts";
import { ROOT_ENVELOPE_SDK_VERSION, rootEnvelopeSdkContract, rootEnvelopeSdkSource } from "../app/wanted-10k/root-envelope-sdk/source.ts";
import { telemetryVerifierSdkSource } from "../app/wanted-10k/telemetry-sdk/source.ts";
import { GET as getModule } from "../app/wanted-10k/wanted-root-envelope.mjs/route.ts";
import { GET as getContract } from "../app/wanted-10k/root-envelope-sdk.json/route.ts";
import { GET as getProfile } from "../app/wanted-10k/root-envelope.json/route.ts";
import { GET as getSchema } from "../app/wanted-10k/root-envelope.schema.json/route.ts";
import { GET as getTemplate } from "../app/wanted-10k/root-envelope.template.json/route.ts";

const telemetryUrl=`data:text/javascript;base64,${Buffer.from(telemetryVerifierSdkSource).toString("base64")}`;
const portableSource=rootEnvelopeSdkSource.replace('"./wanted-telemetry-verifier.mjs"',JSON.stringify(telemetryUrl));
const sdk=await import(`data:text/javascript;base64,${Buffer.from(portableSource).toString("base64")}`);
const execFileAsync=promisify(execFile);
const digest=async bytes=>Buffer.from(await crypto.subtle.digest("SHA-256",bytes)).toString("hex");
const fixture=async()=>{const sample=await sampleBundle(),events=sample.jsonl.split("\n").map(JSON.parse),keyManifest=JSON.parse(sample.keyManifest),activationAt="2026-08-28T18:00:00.000Z",observationEndAt="2026-08-28T20:00:00.000Z",root0=await createRootEnvelope({events,keyManifest,rootOrdinal:0,coversThroughAt:"2026-08-28T19:00:00.000Z"}),root1=await createRootEnvelope({events,keyManifest,rootOrdinal:1,coversThroughAt:observationEndAt,previousEnvelope:root0});return{sample,events,keyManifest,activationAt,observationEndAt,root0,root1};};

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
  const [moduleResponse,contractResponse,profileResponse,schemaResponse,templateResponse]=await Promise.all([getModule(),getContract(),getProfile(),getSchema(),getTemplate()]);
  const [moduleSource,contract,profile,schema,template]=await Promise.all([moduleResponse.text(),contractResponse.json(),profileResponse.json(),schemaResponse.json(),templateResponse.json()]);
  assert.equal(ROOT_ENVELOPE_SDK_VERSION,"0.2-RES1");assert.equal(moduleSource,rootEnvelopeSdkSource);assert.equal(contract.source_sha256,await digest(new TextEncoder().encode(moduleSource)));assert.deepEqual(contract.runtime_dependencies,["./wanted-telemetry-verifier.mjs"]);assert.equal(contract.performs_network_requests,false);assert.equal(profile.version,"0.2-RE1");assert.equal(profile.root_witness_profile,"0.2-RC1");assert.equal(schema.$id,rootEnvelopeSchema.$id);assert.equal(schema.additionalProperties,false);assert.equal(template.envelopes.length,2);assert.equal(template.envelopes[1].interval_event_count,0);assert.equal(template.root_witness_projection[1].root_commitment_sha256,template.envelopes[1].root_commitment_sha256);assert.match(moduleResponse.headers.get("content-disposition"),/wanted-root-envelope\.mjs/);assert.deepEqual(contract.exports,rootEnvelopeSdkContract.exports);assert.equal(profile.binds.length,rootEnvelopeContract.binds.length);
});

test("downloaded helper creates and verifies one root or the complete series",async t=>{
  const directory=await mkdtemp(join(tmpdir(),"wanted-root-envelope-cli-"));t.after(()=>rm(directory,{recursive:true,force:true}));const value=await fixture();
  const rootModule=join(directory,"wanted-root-envelope.mjs"),telemetryModule=join(directory,"wanted-telemetry-verifier.mjs"),eventsPath=join(directory,"events.jsonl"),keyPath=join(directory,"key.json"),root0Path=join(directory,"root0.json"),root1Path=join(directory,"root1.json"),rootsPath=join(directory,"roots.json");
  await Promise.all([writeFile(rootModule,rootEnvelopeSdkSource,"utf8"),writeFile(telemetryModule,telemetryVerifierSdkSource,"utf8"),writeFile(eventsPath,value.sample.jsonl,"utf8"),writeFile(keyPath,value.sample.keyManifest,"utf8"),writeFile(root0Path,JSON.stringify(value.root0),"utf8"),writeFile(root1Path,JSON.stringify(value.root1),"utf8"),writeFile(rootsPath,JSON.stringify([value.root0,value.root1]),"utf8")]);
  const created=await execFileAsync(process.execPath,[rootModule,"--create",eventsPath,keyPath,"0",value.root0.covers_through_at]);assert.deepEqual(JSON.parse(created.stdout),value.root0);
  const verified=await execFileAsync(process.execPath,[rootModule,"--verify",root1Path,eventsPath,keyPath,root0Path]);assert.equal(JSON.parse(verified.stdout).status,"pass");
  const series=await execFileAsync(process.execPath,[rootModule,"--verify-series",rootsPath,eventsPath,keyPath,value.activationAt,value.observationEndAt,"1"]);assert.equal(JSON.parse(series.stdout).status,"pass");
  value.root1.tail_event_id="tampered";await writeFile(root1Path,JSON.stringify(value.root1),"utf8");await assert.rejects(execFileAsync(process.execPath,[rootModule,"--verify",root1Path,eventsPath,keyPath,root0Path]),error=>{assert.equal(error.code,1);assert.equal(JSON.parse(error.stdout).status,"fail");return true;});
  await assert.rejects(execFileAsync(process.execPath,[rootModule,"--create",join(directory,"missing.jsonl"),keyPath,"0",value.root0.covers_through_at]),error=>{assert.equal(error.code,2);assert.match(error.stderr,/WANTED root-envelope helper:/);return true;});
});

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { witnessReceiptSigningBytes as internalSigningBytes } from "../app/wanted-10k/root-commitment-witness/profile.ts";
import { rootWitnessTemplateFor } from "../app/wanted-10k/root-commitment-witness/template.ts";
import { ROOT_WITNESS_RECEIPT_SDK_VERSION, rootWitnessReceiptSchema, rootWitnessReceiptSdkContract, rootWitnessReceiptSdkSource } from "../app/wanted-10k/root-witness-receipt-sdk/source.ts";
import { GET as getModule } from "../app/wanted-10k/wanted-root-witness-receipt.mjs/route.ts";
import { GET as getContract } from "../app/wanted-10k/root-witness-receipt-sdk.json/route.ts";
import { GET as getSchema } from "../app/wanted-10k/root-witness-receipt.schema.json/route.ts";
import { GET as getTemplate } from "../app/wanted-10k/root-witness-receipt.template.json/route.ts";

const sdk=await import("data:text/javascript;charset=utf-8,"+encodeURIComponent(rootWitnessReceiptSdkSource));
const execFileAsync=promisify(execFile);
const digest=async bytes=>Buffer.from(await crypto.subtle.digest("SHA-256",bytes)).toString("hex");
const fixture=async()=>{const manifest=await rootWitnessTemplateFor("WANTED_LAB"),signed=structuredClone(manifest.deployments[0].roots[0].receipts[0]),unsigned=structuredClone(signed),key=structuredClone(manifest.witness_registry.keys[0]);delete unsigned.signature;return{signed,unsigned,key};};
const hexBytes=value=>new Uint8Array(value.match(/../g).map(byte=>parseInt(byte,16)));
const syntheticSigner=async bytes=>{const key=await crypto.subtle.importKey("pkcs8",hexBytes("302e020100300506032b6570042204209d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60"),{name:"Ed25519"},false,["sign"]);return new Uint8Array(await crypto.subtle.sign("Ed25519",key,bytes));};

test("prepares the exact RC1 canonical signing bytes without a private key",async()=>{
  const {unsigned,key}=await fixture(),prepared=await sdk.prepareWitnessReceipt(unsigned,key);
  assert.equal(prepared.profile_version,"0.2-RIS1");
  assert.equal(prepared.signature_scope,"receipt_without_signature");
  assert.deepEqual(Buffer.from(sdk.witnessReceiptSigningBytes(unsigned)),Buffer.from(internalSigningBytes(unsigned)));
  assert.equal(prepared.signing_bytes_sha256,await digest(internalSigningBytes(unsigned)));
  assert.match(prepared.signing_bytes_base64url,/^[A-Za-z0-9_-]+$/);
  assert.match(prepared.private_key_boundary,/HSM_TPM_KMS/);
  assert.equal("signature" in prepared.unsigned_receipt,false);
});

test("attaches, self-verifies, and callback-signs the canonical synthetic receipt",async()=>{
  const {signed,unsigned,key}=await fixture();
  const attached=await sdk.attachWitnessReceiptSignature(unsigned,signed.signature,key);
  assert.deepEqual(attached,signed);
  const verified=await sdk.verifyWitnessReceipt(attached,key);
  assert.equal(verified.status,"pass",JSON.stringify(verified));
  const callbackSigned=await sdk.signWitnessReceipt(unsigned,key,syntheticSigner);
  assert.deepEqual(callbackSigned,signed);
});

test("rejects identity, chronology, lifecycle, field, and signature misuse",async()=>{
  const {signed,unsigned,key}=await fixture();
  const wrongOrganization=structuredClone(unsigned);wrongOrganization.witness_organization="Different Witness";
  await assert.rejects(sdk.prepareWitnessReceipt(wrongOrganization,key),/identity/);
  const late=structuredClone(unsigned);late.observed_at=new Date(Date.parse(late.covers_through_at)+25*3600000).toISOString();
  await assert.rejects(sdk.prepareWitnessReceipt(late,key),/publication-delay/);
  const revoked=structuredClone(key);revoked.revoked_at=unsigned.observed_at;
  await assert.rejects(sdk.prepareWitnessReceipt(unsigned,revoked),/not valid/);
  const extra=structuredClone(unsigned);extra.private_key="forbidden";
  await assert.rejects(sdk.prepareWitnessReceipt(extra,key),/exactly/);
  await assert.rejects(sdk.signWitnessReceipt(unsigned,key,async()=>new Uint8Array(63)),/64 signature bytes/);
  const forged=structuredClone(signed);forged.signature=`${forged.signature.startsWith("A")?"B":"A"}${forged.signature.slice(1)}`;
  assert.equal((await sdk.verifyWitnessReceipt(forged,key)).status,"fail");
  assert.match((await sdk.verifyWitnessReceipt(forged,key)).errors[0],/signature verification failed/);
  assert.throws(()=>sdk.canonicalize({value:Number.NaN}),/non-finite/);
  assert.throws(()=>sdk.canonicalize({value:"\uD800"}),/unpaired/);
});

test("publishes a digest-bound, no-key-custody module and interchange contract",async()=>{
  const [moduleResponse,contractResponse,schemaResponse,templateResponse]=await Promise.all([getModule(),getContract(),getSchema(),getTemplate()]);
  const [moduleSource,contract,schema,template]=await Promise.all([moduleResponse.text(),contractResponse.json(),schemaResponse.json(),templateResponse.json()]);
  assert.equal(ROOT_WITNESS_RECEIPT_SDK_VERSION,"0.2-RIS1");
  assert.equal(moduleSource,rootWitnessReceiptSdkSource);
  assert.equal(contract.source_sha256,await digest(new TextEncoder().encode(moduleSource)));
  assert.equal(contract.private_key_handling,"never_accepts_reads_stores_or_exports_private_keys");
  assert.equal(contract.cli.private_key_input_supported,false);
  assert.equal(contract.performs_network_requests,false);
  assert.equal(/importKey\(["']pkcs8["']/.test(moduleSource),false);
  assert.equal(schema.$id,rootWitnessReceiptSchema.$id);
  assert.equal(schema.$defs.signed_receipt.additionalProperties,false);
  assert.equal(template.profile_version,"0.2-RIS1");
  assert.equal(template.signed_receipt.signature,template.signature);
  assert.equal((await sdk.verifyWitnessReceipt(template.signed_receipt,template.witness_registry_key)).status,"pass");
  assert.match(moduleResponse.headers.get("content-disposition"),/wanted-root-witness-receipt\.mjs/);
  assert.deepEqual(contract.exports,rootWitnessReceiptSdkContract.exports);
});

test("downloaded CLI prepares, attaches, and verifies without a private-key mode",async t=>{
  const directory=await mkdtemp(join(tmpdir(),"wanted-root-receipt-cli-"));t.after(()=>rm(directory,{recursive:true,force:true}));
  const modulePath=join(directory,"wanted-root-witness-receipt.mjs"),unsignedPath=join(directory,"unsigned.json"),keyPath=join(directory,"key.json"),signaturePath=join(directory,"signature.txt"),receiptPath=join(directory,"receipt.json");
  const {signed,unsigned,key}=await fixture();
  await Promise.all([writeFile(modulePath,rootWitnessReceiptSdkSource,"utf8"),writeFile(unsignedPath,JSON.stringify(unsigned),"utf8"),writeFile(keyPath,JSON.stringify(key),"utf8"),writeFile(signaturePath,signed.signature,"utf8"),writeFile(receiptPath,JSON.stringify(signed),"utf8")]);
  const prepared=await execFileAsync(process.execPath,[modulePath,"--prepare",unsignedPath,keyPath]);assert.equal(JSON.parse(prepared.stdout).signature_scope,"receipt_without_signature");assert.equal(prepared.stderr,"");
  const attached=await execFileAsync(process.execPath,[modulePath,"--attach",unsignedPath,signaturePath,keyPath]);assert.deepEqual(JSON.parse(attached.stdout),signed);
  const verified=await execFileAsync(process.execPath,[modulePath,"--verify",receiptPath,keyPath]);assert.equal(JSON.parse(verified.stdout).status,"pass");
  signed.root_commitment_sha256="abcdef01".repeat(8);await writeFile(receiptPath,JSON.stringify(signed),"utf8");
  await assert.rejects(execFileAsync(process.execPath,[modulePath,"--verify",receiptPath,keyPath]),error=>{assert.equal(error.code,1);assert.equal(JSON.parse(error.stdout).status,"fail");return true;});
  await assert.rejects(execFileAsync(process.execPath,[modulePath,"--sign",unsignedPath,keyPath]),error=>{assert.equal(error.code,2);assert.match(error.stderr,/Usage:/);return true;});
  await assert.rejects(execFileAsync(process.execPath,[modulePath,"--prepare",join(directory,"missing.json"),keyPath]),error=>{assert.equal(error.code,2);assert.match(error.stderr,/WANTED witness receipt helper:/);return true;});
});

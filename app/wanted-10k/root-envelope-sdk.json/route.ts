import { rootEnvelopeSdkContract, rootEnvelopeSdkSource } from "../root-envelope-sdk/source.ts";
import { canonicalizeAuditJson } from "../audit-seal/profile.ts";
import { rootEnvelopeBatchConformancePack } from "../root-envelope-conformance/vectors.ts";

const hex=(value:ArrayBuffer)=>Array.from(new Uint8Array(value),byte=>byte.toString(16).padStart(2,"0")).join("");
export async function GET(){const encoder=new TextEncoder(),pack=await rootEnvelopeBatchConformancePack(),[source_sha256,vector_pack_sha256]=await Promise.all([crypto.subtle.digest("SHA-256",encoder.encode(rootEnvelopeSdkSource)).then(hex),crypto.subtle.digest("SHA-256",encoder.encode(canonicalizeAuditJson(pack))).then(hex)]);return Response.json({...rootEnvelopeSdkContract,source_sha256,vector_pack_sha256,vector_pack_canonicalization:"RFC8785_JCS"},{headers:{"cache-control":"public, max-age=3600"}});}

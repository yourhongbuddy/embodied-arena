import { rootWitnessVerifierSdkContract, rootWitnessVerifierSdkSource } from "../root-witness-sdk/source.ts";
import { canonicalizeAuditJson } from "../audit-seal/profile.ts";
import { rootWitnessConformancePack } from "../root-witness-conformance/vectors.ts";

const hex = (value: ArrayBuffer) => Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, "0")).join("");

export async function GET() {
  const pack=await rootWitnessConformancePack(),encoder=new TextEncoder();
  const [source_sha256,vector_pack_sha256]=await Promise.all([
    crypto.subtle.digest("SHA-256",encoder.encode(rootWitnessVerifierSdkSource)).then(hex),
    crypto.subtle.digest("SHA-256",encoder.encode(canonicalizeAuditJson(pack))).then(hex),
  ]);
  return Response.json({ ...rootWitnessVerifierSdkContract, source_sha256, vector_pack_sha256, vector_pack_canonicalization:"RFC8785_JCS" }, { headers: { "cache-control": "public, max-age=3600" } });
}

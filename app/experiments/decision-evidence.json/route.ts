import{experimentDecisionEvidenceContract}from"../decision-evidence.ts";
import{experimentDecisionEvidenceVerifierContract,experimentDecisionEvidenceVerifierSource}from"../decision-evidence-verifier-source.ts";
const hex=(value:ArrayBuffer)=>Array.from(new Uint8Array(value),byte=>byte.toString(16).padStart(2,"0")).join("");
export async function GET(){const source_sha256=hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(experimentDecisionEvidenceVerifierSource)));return Response.json({...experimentDecisionEvidenceContract,...experimentDecisionEvidenceVerifierContract,source_sha256},{headers:{"cache-control":"public, max-age=3600"}})}

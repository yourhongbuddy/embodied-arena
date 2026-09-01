import{experimentDecisionEvidenceVerifierSource}from"../decision-evidence-verifier-source.ts";
export function GET(){return new Response(experimentDecisionEvidenceVerifierSource,{headers:{"content-type":"text/javascript; charset=utf-8","content-disposition":'attachment; filename="wanted-decision-evidence.mjs"',"cache-control":"public, max-age=3600"}})}

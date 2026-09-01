import{experimentDecisionApprovalVerifierSource}from"../decision-approval-verifier-source.ts";
export function GET(){return new Response(experimentDecisionApprovalVerifierSource,{headers:{"content-type":"text/javascript; charset=utf-8","content-disposition":'attachment; filename="wanted-decision-approval.mjs"',"cache-control":"public, max-age=3600"}})}

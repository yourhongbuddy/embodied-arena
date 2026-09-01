import{experimentDecisionPolicyVerifierSource}from"../decision-policy-verifier-source.ts";
export function GET(){return new Response(experimentDecisionPolicyVerifierSource,{headers:{"content-type":"text/javascript; charset=utf-8","content-disposition":'attachment; filename="wanted-decision-policy.mjs"',"cache-control":"public, max-age=3600"}})}

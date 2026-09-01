import{experimentRolloutAuthorizationVerifierSource}from"../rollout-authorization-verifier-source.ts";
export function GET(){return new Response(experimentRolloutAuthorizationVerifierSource,{headers:{"content-type":"text/javascript; charset=utf-8","content-disposition":'attachment; filename="wanted-rollout-authorization.mjs"',"cache-control":"public, max-age=3600"}})}

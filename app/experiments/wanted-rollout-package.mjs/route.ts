import{experimentRolloutPackageVerifierSource}from"../rollout-package-verifier-source.ts";
export function GET(){return new Response(experimentRolloutPackageVerifierSource,{headers:{"content-type":"text/javascript; charset=utf-8","content-disposition":'attachment; filename="wanted-rollout-package.mjs"',"cache-control":"public, max-age=3600"}})}

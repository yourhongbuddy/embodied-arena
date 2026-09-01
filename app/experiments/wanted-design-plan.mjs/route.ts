import{experimentDesignPlanVerifierSource}from"../design-plan-verifier-source.ts";

export async function GET(){return new Response(experimentDesignPlanVerifierSource,{headers:{"content-type":"text/javascript; charset=utf-8","content-disposition":'attachment; filename="wanted-design-plan.mjs"',"cache-control":"public, max-age=3600"}})}

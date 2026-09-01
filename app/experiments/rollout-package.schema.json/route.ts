import{experimentRolloutPackageSchema}from"../rollout-package-schema.ts";
export function GET(){return Response.json(experimentRolloutPackageSchema,{headers:{"cache-control":"public, max-age=3600"}})}

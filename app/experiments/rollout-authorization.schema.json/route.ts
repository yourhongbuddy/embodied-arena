import{experimentRolloutAuthorizationSchema}from"../rollout-authorization-schema.ts";
export function GET(){return Response.json(experimentRolloutAuthorizationSchema,{headers:{"cache-control":"public, max-age=3600"}})}

import{experimentDecisionPolicySchema}from"../decision-policy-schema.ts";
export function GET(){return Response.json(experimentDecisionPolicySchema,{headers:{"cache-control":"public, max-age=3600"}})}

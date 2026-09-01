import{experimentDecisionApprovalSchema}from"../decision-approval-schema.ts";
export function GET(){return Response.json(experimentDecisionApprovalSchema,{headers:{"cache-control":"public, max-age=3600"}})}

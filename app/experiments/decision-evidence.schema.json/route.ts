import{experimentDecisionEvidenceSchema}from"../decision-evidence-schema.ts";
export function GET(){return Response.json(experimentDecisionEvidenceSchema,{headers:{"cache-control":"public, max-age=3600"}})}

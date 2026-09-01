import{experimentDesignPlanSchema}from"../design-plan-schema.ts";

export function GET(){return Response.json(experimentDesignPlanSchema,{headers:{"cache-control":"public, max-age=3600"}})}

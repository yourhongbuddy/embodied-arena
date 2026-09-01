import{DEFAULT_EXPERIMENT_DESIGN_INPUT,experimentDesignPlanDocument,EXPERIMENT_DESIGN_REFERENCE_SHA256}from"../design-lab.ts";

export function GET(){return Response.json({canonical_plan_sha256:EXPERIMENT_DESIGN_REFERENCE_SHA256,plan:experimentDesignPlanDocument(DEFAULT_EXPERIMENT_DESIGN_INPUT),interpretation:"Normative conformance vector only; not an externally preregistered experiment design."},{headers:{"cache-control":"public, max-age=3600"}})}

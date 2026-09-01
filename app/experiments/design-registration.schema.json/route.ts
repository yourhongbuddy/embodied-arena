import{experimentDesignRegistrationSchema}from"../design-registration-schema.ts";

export function GET(){return Response.json(experimentDesignRegistrationSchema,{headers:{"cache-control":"public, max-age=3600"}})}

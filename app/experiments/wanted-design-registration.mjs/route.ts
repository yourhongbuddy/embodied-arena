import{experimentDesignRegistrationVerifierSource}from"../design-registration-verifier-source.ts";

export function GET(){return new Response(experimentDesignRegistrationVerifierSource,{headers:{"content-type":"text/javascript; charset=utf-8","content-disposition":'attachment; filename="wanted-design-registration.mjs"',"cache-control":"public, max-age=3600"}})}

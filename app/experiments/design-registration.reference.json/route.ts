import{experimentDesignRegistrationReferenceBundle}from"../design-registration.ts";

export function GET(){return Response.json({synthetic:true,bundle:experimentDesignRegistrationReferenceBundle(),interpretation:"Cryptographic conformance vector only. The example.org registrar, receipt, key, and exposure boundary are synthetic and establish no real preregistration."},{headers:{"cache-control":"public, max-age=3600"}})}

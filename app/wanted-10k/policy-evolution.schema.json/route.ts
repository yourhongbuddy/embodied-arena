import{policyEvolutionSchema}from"../policy-evolution/profile.ts";
export async function GET(){return Response.json(policyEvolutionSchema,{headers:{"cache-control":"public, max-age=3600"}})}

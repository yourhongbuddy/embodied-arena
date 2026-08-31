import{policyEvolutionContract}from"../policy-evolution/profile.ts";
export async function GET(){return Response.json(policyEvolutionContract,{headers:{"cache-control":"public, max-age=3600"}})}

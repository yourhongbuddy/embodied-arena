import{policyEvolutionTemplate}from"../policy-evolution/profile.ts";
export async function GET(){return Response.json(policyEvolutionTemplate,{headers:{"cache-control":"public, max-age=3600"}})}

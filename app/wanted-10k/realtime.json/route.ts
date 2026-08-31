import{hiloContract}from"../realtime/profile.ts";
export async function GET(){return Response.json(hiloContract,{headers:{"cache-control":"public, max-age=3600"}})}

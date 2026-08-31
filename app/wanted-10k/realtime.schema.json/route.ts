import{hiloSchema}from"../realtime/profile.ts";
export async function GET(){return Response.json(hiloSchema,{headers:{"cache-control":"public, max-age=3600"}})}

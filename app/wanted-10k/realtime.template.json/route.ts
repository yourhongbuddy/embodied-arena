import{hiloTemplate}from"../realtime/profile.ts";
export async function GET(){return Response.json(hiloTemplate,{headers:{"cache-control":"public, max-age=3600"}})}

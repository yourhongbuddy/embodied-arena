import { withdrawalTemplate } from "../withdrawal/profile.ts";
export async function GET(){return Response.json(withdrawalTemplate,{headers:{"cache-control":"public, max-age=3600"}})}

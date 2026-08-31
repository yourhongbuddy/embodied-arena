import { withdrawalSchema } from "../withdrawal/profile.ts";
export async function GET(){return Response.json(withdrawalSchema,{headers:{"cache-control":"public, max-age=3600"}})}

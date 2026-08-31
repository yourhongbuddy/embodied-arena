import { assistanceSchema } from "../assistance-integrity/profile.ts";
export async function GET(){return Response.json(assistanceSchema,{headers:{"cache-control":"public, max-age=3600"}})}

import { privacySchema } from "../privacy-integrity/profile.ts";export async function GET(){return Response.json(privacySchema,{headers:{"cache-control":"public, max-age=3600"}})}

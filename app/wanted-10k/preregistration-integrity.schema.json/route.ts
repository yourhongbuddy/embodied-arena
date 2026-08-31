import { preregistrationIntegritySchema } from "../preregistration-integrity/profile";
export async function GET(){return Response.json(preregistrationIntegritySchema,{headers:{"cache-control":"public, max-age=3600"}})}

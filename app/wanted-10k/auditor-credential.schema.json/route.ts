import { auditorCredentialSchema } from "../auditor-credential/profile.ts";
export async function GET(){return Response.json(auditorCredentialSchema,{headers:{"cache-control":"public, max-age=3600"}})}

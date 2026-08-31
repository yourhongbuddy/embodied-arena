import { auditorCredentialTemplate } from "../auditor-credential/profile.ts";
export async function GET(){return Response.json(auditorCredentialTemplate,{headers:{"cache-control":"public, max-age=3600"}})}

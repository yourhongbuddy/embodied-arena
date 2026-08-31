import { auditorCredentialContract } from "../auditor-credential/profile.ts";
export async function GET(){return Response.json(auditorCredentialContract,{headers:{"cache-control":"public, max-age=3600"}})}

import { preregistrationIntegrityContract } from "../preregistration-integrity/profile";
export async function GET(){return Response.json(preregistrationIntegrityContract,{headers:{"cache-control":"public, max-age=3600"}})}

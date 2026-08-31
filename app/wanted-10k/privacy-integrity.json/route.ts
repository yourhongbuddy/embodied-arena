import { privacyContract } from "../privacy-integrity/profile.ts";export async function GET(){return Response.json(privacyContract,{headers:{"cache-control":"public, max-age=3600"}})}

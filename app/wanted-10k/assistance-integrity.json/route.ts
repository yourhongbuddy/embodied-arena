import { assistanceContract } from "../assistance-integrity/profile.ts";
export async function GET(){return Response.json(assistanceContract,{headers:{"cache-control":"public, max-age=3600"}})}

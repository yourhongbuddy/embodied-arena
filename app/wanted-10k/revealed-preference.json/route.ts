import { preferenceContract } from "../revealed-preference/profile.ts";
export async function GET(){return Response.json(preferenceContract,{headers:{"cache-control":"public, max-age=3600"}})}

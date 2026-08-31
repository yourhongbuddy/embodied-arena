import { withdrawalContract } from "../withdrawal/profile.ts";
export async function GET(){return Response.json(withdrawalContract,{headers:{"cache-control":"public, max-age=3600"}})}

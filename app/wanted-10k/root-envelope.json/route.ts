import { rootEnvelopeContract } from "../root-envelope/profile.ts";

export async function GET(){return Response.json(rootEnvelopeContract,{headers:{"cache-control":"public, max-age=3600"}});}

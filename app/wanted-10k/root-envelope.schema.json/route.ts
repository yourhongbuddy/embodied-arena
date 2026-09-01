import { rootEnvelopeSchema } from "../root-envelope/profile.ts";

export async function GET(){return Response.json(rootEnvelopeSchema,{headers:{"cache-control":"public, max-age=3600"}});}

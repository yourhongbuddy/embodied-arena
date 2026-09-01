import { rootEnvelopeBatchSchema } from "../root-envelope/profile.ts";

export async function GET(){return Response.json(rootEnvelopeBatchSchema,{headers:{"cache-control":"public, max-age=3600"}});}

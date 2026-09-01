import { rootEnvelopeTemplate } from "../root-envelope/template.ts";

export async function GET(){return Response.json(await rootEnvelopeTemplate(),{headers:{"cache-control":"public, max-age=3600"}});}

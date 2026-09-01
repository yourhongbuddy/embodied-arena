import { rootEnvelopeBatchConformancePack } from "../root-envelope-conformance/vectors.ts";

export async function GET(){return Response.json(await rootEnvelopeBatchConformancePack(),{headers:{"cache-control":"public, max-age=3600"}});}

import { rootWitnessConformancePack } from "../root-witness-conformance/vectors.ts";

export async function GET() {
  return Response.json(await rootWitnessConformancePack(), { headers: { "cache-control": "public, max-age=3600" } });
}

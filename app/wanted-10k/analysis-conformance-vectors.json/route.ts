import { analysisConformancePack } from "../analysis-conformance/vectors.ts";

export async function GET() {
  return Response.json(analysisConformancePack, {
    headers: { "cache-control": "public, max-age=3600" },
  });
}

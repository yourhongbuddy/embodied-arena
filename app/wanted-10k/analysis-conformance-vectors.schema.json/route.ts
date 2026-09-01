import { analysisConformanceSchema } from "../analysis-conformance/vectors.ts";

export async function GET() {
  return Response.json(analysisConformanceSchema, {
    headers: { "cache-control": "public, max-age=3600" },
  });
}

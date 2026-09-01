import { analysisConformanceSdkSource } from "../analysis-conformance-sdk/source.ts";

export async function GET() {
  return new Response(analysisConformanceSdkSource, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "content-disposition": 'attachment; filename="wanted-analysis-conformance.mjs"',
      "cache-control": "public, max-age=3600",
    },
  });
}

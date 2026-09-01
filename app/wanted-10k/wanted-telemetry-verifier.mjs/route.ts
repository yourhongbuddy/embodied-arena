import { telemetryVerifierSdkSource } from "../telemetry-sdk/source.ts";

export async function GET() {
  return new Response(telemetryVerifierSdkSource, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "content-disposition": 'attachment; filename="wanted-telemetry-verifier.mjs"',
      "cache-control": "public, max-age=3600",
    },
  });
}

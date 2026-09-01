import { rootWitnessVerifierSdkSource } from "../root-witness-sdk/source.ts";

export async function GET() {
  return new Response(rootWitnessVerifierSdkSource, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "content-disposition": 'attachment; filename="wanted-root-witness-verifier.mjs"',
      "cache-control": "public, max-age=3600",
    },
  });
}

import { auditVerifierSdkSource } from "../audit-sdk/source.ts";

export async function GET() {
  return new Response(auditVerifierSdkSource, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "content-disposition": 'attachment; filename="wanted-audit-verifier.mjs"',
      "cache-control": "public, max-age=3600",
    },
  });
}

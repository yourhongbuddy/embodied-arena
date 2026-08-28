import { wantedSdkSource } from "../sdk/source";

export async function GET() {
  return new Response(wantedSdkSource, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "content-disposition": 'attachment; filename="wanted-sdk.mjs"',
      "cache-control": "public, max-age=3600",
    },
  });
}

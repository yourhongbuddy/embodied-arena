import { auditManifestSchema } from "../audit/manifest";

export async function GET() {
  return Response.json(auditManifestSchema, { headers: { "cache-control": "public, max-age=3600" } });
}

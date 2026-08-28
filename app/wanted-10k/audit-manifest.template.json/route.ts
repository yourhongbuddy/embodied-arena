import { auditManifestTemplate } from "../audit/manifest";

export async function GET() {
  return Response.json(auditManifestTemplate, { headers: { "content-disposition": "attachment; filename=wanted-10k-audit-manifest.json", "cache-control": "public, max-age=3600" } });
}

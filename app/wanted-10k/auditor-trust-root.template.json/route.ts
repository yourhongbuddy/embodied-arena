import { auditorTrustRootTemplate } from "../auditor-credential/profile.ts";

export async function GET() {
  return Response.json(auditorTrustRootTemplate, { headers: { "cache-control": "public, max-age=3600" } });
}

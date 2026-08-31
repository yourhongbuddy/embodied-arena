import { auditorTrustRootSchema } from "../auditor-credential/profile.ts";

export async function GET() {
  return Response.json(auditorTrustRootSchema, { headers: { "cache-control": "public, max-age=3600" } });
}

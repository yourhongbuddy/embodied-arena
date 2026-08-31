import { telemetryKeyManifestSchema } from "../telemetry-authenticity/profile";
export async function GET() { return Response.json(telemetryKeyManifestSchema, { headers: { "cache-control": "public, max-age=3600" } }); }

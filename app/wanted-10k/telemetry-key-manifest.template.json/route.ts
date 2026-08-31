import { telemetryKeyManifestTemplate } from "../telemetry-authenticity/profile";
export async function GET() { return Response.json(telemetryKeyManifestTemplate, { headers: { "cache-control": "public, max-age=3600" } }); }

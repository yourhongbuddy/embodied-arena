import { telemetryAuthenticityContract } from "../telemetry-authenticity/profile";
export async function GET() { return Response.json(telemetryAuthenticityContract, { headers: { "cache-control": "public, max-age=3600" } }); }

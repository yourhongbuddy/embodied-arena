import { serviceSchema } from "../service-continuity/profile.ts";
export async function GET() { return Response.json(serviceSchema, { headers: { "cache-control": "public, max-age=3600" } }); }

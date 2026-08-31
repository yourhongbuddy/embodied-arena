import { serviceContract } from "../service-continuity/profile.ts";
export async function GET() { return Response.json(serviceContract, { headers: { "cache-control": "public, max-age=3600" } }); }

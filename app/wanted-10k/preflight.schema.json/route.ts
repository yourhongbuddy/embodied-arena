import { preflightSchema } from "../preflight/profile";
export async function GET() { return Response.json(preflightSchema, { headers: { "cache-control": "public, max-age=3600" } }); }

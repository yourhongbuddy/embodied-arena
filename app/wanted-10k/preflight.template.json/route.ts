import { preflightTemplate } from "../preflight/profile";
export async function GET() { return Response.json(preflightTemplate, { headers: { "cache-control": "public, max-age=3600" } }); }

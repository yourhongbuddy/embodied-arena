import { siteHeterogeneitySchema } from "../site-heterogeneity/profile.ts";
export async function GET() { return Response.json(siteHeterogeneitySchema, { headers: { "cache-control": "public, max-age=3600" } }); }

import { siteHeterogeneityTemplate } from "../site-heterogeneity/profile.ts";
export async function GET() { return Response.json(siteHeterogeneityTemplate, { headers: { "cache-control": "public, max-age=3600" } }); }

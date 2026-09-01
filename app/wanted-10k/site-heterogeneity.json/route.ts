import { siteHeterogeneityContract } from "../site-heterogeneity/profile.ts";
export async function GET() { return Response.json(siteHeterogeneityContract, { headers: { "cache-control": "public, max-age=3600" } }); }

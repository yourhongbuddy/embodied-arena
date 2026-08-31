import { serviceTemplateFor } from "../service-continuity/profile.ts";
export async function GET(request: Request) { const target = new URL(request.url).searchParams.get("target"); const selected = target === "WANTED_LAB" || target === "WANTED_10K" ? target : "WANTED_WILD"; return Response.json(serviceTemplateFor(selected), { headers: { "cache-control": "public, max-age=3600" } }); }

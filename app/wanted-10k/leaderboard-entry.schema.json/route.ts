import { leaderboardEntrySchema } from "../leaderboard/registry";
export async function GET() { return Response.json(leaderboardEntrySchema, { headers: { "cache-control": "public, max-age=3600" } }); }

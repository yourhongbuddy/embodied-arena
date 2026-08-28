import { leaderboardContract } from "../leaderboard/registry";
export async function GET() { return Response.json(leaderboardContract, { headers: { "cache-control": "public, max-age=300" } }); }

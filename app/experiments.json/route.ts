import { experimentRotatorContract } from "../experiments/rotator.ts";

export async function GET() {
  return Response.json(experimentRotatorContract, { headers: { "cache-control": "public, max-age=300" } });
}

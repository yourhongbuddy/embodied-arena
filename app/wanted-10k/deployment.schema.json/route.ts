import { deploymentSchema } from "../sdk/deployment";

export async function GET() {
  return Response.json(deploymentSchema, { headers: { "cache-control": "public, max-age=3600" } });
}

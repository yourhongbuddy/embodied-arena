import { experimentRolloutSimulatorSchema } from "../rollout-simulator-schema.ts";

export function GET() {
  return Response.json(experimentRolloutSimulatorSchema, {
    headers: { "cache-control": "public, max-age=3600" },
  });
}

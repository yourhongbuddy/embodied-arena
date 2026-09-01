import { experimentRolloutRuntimeSchema } from "../rollout-runtime-schema.ts";

export function GET() {
  return Response.json(experimentRolloutRuntimeSchema, {
    headers: { "cache-control": "public, max-age=3600" },
  });
}

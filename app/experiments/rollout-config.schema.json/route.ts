import { experimentRolloutConfigSchema } from "../rollout-config-schema.ts";

export function GET() {
  return Response.json(experimentRolloutConfigSchema, {
    headers: { "cache-control": "public, max-age=3600" },
  });
}

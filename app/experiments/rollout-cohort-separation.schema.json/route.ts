import { experimentRolloutCohortSeparationSchema } from "../rollout-cohort-separation-schema.ts";

export function GET() {
  return Response.json(experimentRolloutCohortSeparationSchema, {
    headers: { "cache-control": "public, max-age=3600" },
  });
}

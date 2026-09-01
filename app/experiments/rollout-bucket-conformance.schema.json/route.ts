import { experimentRolloutBucketConformanceSchema } from "../rollout-bucket-conformance-schema.ts";

export function GET() {
  return Response.json(experimentRolloutBucketConformanceSchema, {
    headers: { "cache-control": "public, max-age=3600" },
  });
}

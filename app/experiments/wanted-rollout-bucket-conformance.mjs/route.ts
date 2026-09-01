import { experimentRolloutBucketConformanceVerifierSource } from "../rollout-bucket-conformance-verifier-source.ts";

export function GET() {
  return new Response(experimentRolloutBucketConformanceVerifierSource, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "content-disposition": 'attachment; filename="wanted-rollout-bucket-conformance.mjs"',
      "cache-control": "public, max-age=3600",
    },
  });
}

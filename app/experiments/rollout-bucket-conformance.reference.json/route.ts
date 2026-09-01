import {
  experimentRolloutBucketConformanceReferenceBundle,
  verifyExperimentRolloutBucketConformance,
} from "../rollout-bucket-conformance.ts";

export async function GET() {
  const bundle = await experimentRolloutBucketConformanceReferenceBundle();
  return Response.json(
    {
      synthetic: true,
      bundle,
      expected: await verifyExperimentRolloutBucketConformance(bundle),
      interpretation:
        "Synthetic exhaustive bucket certificate only. It never reads user identifiers, serves a treatment, counts an exposure, changes allocation, advances a phase, or deploys.",
    },
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}

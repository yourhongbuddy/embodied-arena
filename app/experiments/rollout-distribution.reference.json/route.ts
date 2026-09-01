import {
  auditExperimentRolloutDistribution,
  experimentRolloutDistributionReferenceBundle,
} from "../rollout-distribution-audit.ts";

let cached: Awaited<ReturnType<typeof auditExperimentRolloutDistribution>> | null = null;

export async function GET() {
  const bundle = experimentRolloutDistributionReferenceBundle();
  cached ??= await auditExperimentRolloutDistribution(bundle);
  return Response.json(
    {
      synthetic: true,
      bundle,
      expected: cached,
      interpretation:
        "Fixed synthetic hash-distribution diagnostic only. It does not observe users or traffic and cannot select, serve, count, advance, or deploy a version.",
    },
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}

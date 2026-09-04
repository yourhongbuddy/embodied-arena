import {
  auditExperimentRolloutCohortSeparation,
  experimentRolloutCohortSeparationReferenceBundle,
} from "../rollout-cohort-separation.ts";

let cached: Awaited<ReturnType<typeof auditExperimentRolloutCohortSeparation>> | null = null;

export async function GET() {
  const bundle = experimentRolloutCohortSeparationReferenceBundle();
  cached ??= await auditExperimentRolloutCohortSeparation(bundle);
  return Response.json(
    {
      synthetic: true,
      bundle,
      expected: cached,
      interpretation:
        "A complete synthetic review with a hold result. The current candidate is not authorized for activation, selection, phase change, or deployment.",
    },
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}

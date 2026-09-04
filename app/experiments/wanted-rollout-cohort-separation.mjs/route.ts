import { experimentRolloutCohortSeparationVerifierSource } from "../rollout-cohort-separation-verifier-source.ts";

export function GET() {
  return new Response(experimentRolloutCohortSeparationVerifierSource, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "content-disposition": 'attachment; filename="wanted-rollout-cohort-separation.mjs"',
      "cache-control": "public, max-age=3600",
    },
  });
}

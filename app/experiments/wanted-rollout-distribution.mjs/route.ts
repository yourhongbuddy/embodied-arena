import { experimentRolloutDistributionAuditVerifierSource } from "../rollout-distribution-audit-verifier-source.ts";

export function GET() {
  return new Response(experimentRolloutDistributionAuditVerifierSource, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "content-disposition": 'attachment; filename="wanted-rollout-distribution.mjs"',
      "cache-control": "public, max-age=3600",
    },
  });
}

import { experimentRolloutDistributionAuditSchema } from "../rollout-distribution-audit-schema.ts";

export function GET() {
  return Response.json(experimentRolloutDistributionAuditSchema, {
    headers: { "cache-control": "public, max-age=3600" },
  });
}

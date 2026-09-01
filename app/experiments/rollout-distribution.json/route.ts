import { experimentRolloutDistributionContract } from "../rollout-distribution-audit.ts";
import {
  experimentRolloutDistributionAuditVerifierContract,
  experimentRolloutDistributionAuditVerifierSource,
} from "../rollout-distribution-audit-verifier-source.ts";

const hex = (value: ArrayBuffer) =>
  Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");

export async function GET() {
  const source_sha256 = hex(await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(experimentRolloutDistributionAuditVerifierSource),
  ));
  return Response.json(
    {
      ...experimentRolloutDistributionContract,
      ...experimentRolloutDistributionAuditVerifierContract,
      source_sha256,
    },
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}

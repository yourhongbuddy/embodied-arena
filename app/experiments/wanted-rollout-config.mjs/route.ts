import { experimentRolloutConfigVerifierSource } from "../rollout-config-verifier-source.ts";

export function GET() {
  return new Response(experimentRolloutConfigVerifierSource, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "content-disposition": 'attachment; filename="wanted-rollout-config.mjs"',
      "cache-control": "public, max-age=3600",
    },
  });
}

import { experimentRolloutRuntimeVerifierSource } from "../rollout-runtime-verifier-source.ts";

export function GET() {
  return new Response(experimentRolloutRuntimeVerifierSource, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "content-disposition": 'attachment; filename="wanted-rollout-runtime.mjs"',
      "cache-control": "public, max-age=3600",
    },
  });
}

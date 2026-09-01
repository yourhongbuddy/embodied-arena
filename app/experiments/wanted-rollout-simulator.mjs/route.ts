import { experimentRolloutSimulatorVerifierSource } from "../rollout-simulator-verifier-source.ts";

export function GET() {
  return new Response(experimentRolloutSimulatorVerifierSource, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "content-disposition": 'attachment; filename="wanted-rollout-simulator.mjs"',
      "cache-control": "public, max-age=3600",
    },
  });
}

import {
  experimentRolloutSimulatorReferenceBundle,
  simulateExperimentRollout,
} from "../rollout-simulator.ts";

export async function GET() {
  const bundle = experimentRolloutSimulatorReferenceBundle();
  return Response.json(
    {
      synthetic: true,
      bundle,
      expected: await simulateExperimentRollout(bundle),
      interpretation:
        "Synthetic preproduction allocation replay only. It creates no identifiers, sends no analytics, counts no exposure, selects no version, and changes no live allocation.",
    },
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}

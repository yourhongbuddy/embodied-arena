import {
  compileExperimentRolloutConfiguration,
  experimentRolloutConfigReferenceBundle,
} from "../rollout-config.ts";

export async function GET() {
  const bundle = experimentRolloutConfigReferenceBundle();
  return Response.json(
    {
      synthetic: true,
      bundle,
      expected: await compileExperimentRolloutConfiguration(bundle),
      interpretation:
        "Synthetic configuration compilation only. The emitted activation and rollback values are inert, contain no secrets, and are never applied or deployed by this helper.",
    },
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}

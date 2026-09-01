import {
  experimentRolloutRuntimeReferenceBundle,
  resolveExperimentRolloutRuntime,
} from "../rollout-runtime.ts";

export async function GET() {
  const controlBundle = await experimentRolloutRuntimeReferenceBundle(0);
  const proofBundle = await experimentRolloutRuntimeReferenceBundle(9);
  return Response.json(
    {
      synthetic: true,
      vectors: [
        { label: "ramp_control", bundle: controlBundle, expected: await resolveExperimentRolloutRuntime(controlBundle) },
        { label: "ramp_proof", bundle: proofBundle, expected: await resolveExperimentRolloutRuntime(proofBundle) },
      ],
      interpretation:
        "Synthetic runtime-resolution vectors only. Neither result is served, exposed, stored, counted, or eligible for live use.",
    },
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}

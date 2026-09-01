import { experimentRolloutConfigContract } from "../rollout-config.ts";
import {
  experimentRolloutConfigVerifierContract,
  experimentRolloutConfigVerifierSource,
} from "../rollout-config-verifier-source.ts";

const hex = (value: ArrayBuffer) =>
  Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");

export async function GET() {
  const source_sha256 = hex(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(experimentRolloutConfigVerifierSource),
    ),
  );
  return Response.json(
    {
      ...experimentRolloutConfigContract,
      ...experimentRolloutConfigVerifierContract,
      source_sha256,
    },
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}

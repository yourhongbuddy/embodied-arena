const digest = { type: "string", pattern: "^[a-f0-9]{64}$" };
const uri = { type: "string", format: "uri" };

export const deploymentSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/deployment.schema.json",
  title: "WANTED-10K Adapter Deployment Configuration",
  type: "object",
  additionalProperties: false,
  required: ["protocol_version", "deployment_id", "environment_id", "robot_id", "robot_description", "signing", "transport", "clock", "checkpoint"],
  properties: {
    protocol_version: { const: "0.2" },
    deployment_id: { type: "string", minLength: 1, maxLength: 128 },
    environment_id: { type: "string", minLength: 1, maxLength: 128 },
    robot_id: { type: "string", minLength: 1, maxLength: 128 },
    robot_description: { type: "object", additionalProperties: false, required: ["format", "uri", "sha256"], properties: { format: { enum: ["URDF", "MJCF", "USD"] }, uri, sha256: digest } },
    signing: { type: "object", additionalProperties: false, required: ["authenticity_profile", "algorithm", "key_id", "public_key_uri", "public_key_sha256", "private_key_exportable"], properties: { authenticity_profile: { const: "0.2-T1" }, algorithm: { const: "Ed25519" }, key_id: { type: "string", minLength: 1, maxLength: 128 }, public_key_uri: uri, public_key_sha256: digest, private_key_exportable: { const: false } } },
    transport: { type: "object", additionalProperties: false, required: ["events_url", "timeout_ms", "max_retries"], properties: { events_url: { type: "string", format: "uri", pattern: "^https://" }, timeout_ms: { type: "integer", minimum: 100, maximum: 120000 }, max_retries: { type: "integer", minimum: 0, maximum: 100 } } },
    clock: { type: "object", additionalProperties: false, required: ["source", "maximum_error_ms"], properties: { source: { type: "string", minLength: 1 }, maximum_error_ms: { type: "number", minimum: 0 } } },
    checkpoint: { type: "object", additionalProperties: false, required: ["single_writer", "durable_before_next_event", "recovery_tested"], properties: { single_writer: { const: true }, durable_before_next_event: { const: true }, recovery_tested: { const: true } } },
  },
};

export const deploymentTemplate = {
  protocol_version: "0.2",
  deployment_id: "[Stable deployment identifier]",
  environment_id: "[Independent environment identifier]",
  robot_id: "[Robot identifier]",
  robot_description: { format: "URDF", uri: "https://example.org/robot.urdf", sha256: "[64 lowercase hexadecimal characters]" },
  signing: { authenticity_profile: "0.2-T1", algorithm: "Ed25519", key_id: "[Preregistered key identifier]", public_key_uri: "https://example.org/wanted-telemetry-key-manifest.json", public_key_sha256: "[64 lowercase hexadecimal characters]", private_key_exportable: false },
  transport: { events_url: "https://example.org/v1/events", timeout_ms: 10000, max_retries: 8 },
  clock: { source: "[UTC-disciplined monotonic wall clock]", maximum_error_ms: 100 },
  checkpoint: { single_writer: true, durable_before_next_event: true, recovery_tested: true },
};

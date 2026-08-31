const eventSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/event.schema.json",
  title: "WANTED-10K Event Envelope",
  type: "object",
  additionalProperties: false,
  required: ["schema_version", "event_id", "deployment_id", "environment_id", "robot_id", "sequence", "occurred_at", "type", "payload", "signing_key_id", "signature"],
  properties: {
    schema_version: { const: "0.2" },
    event_id: { type: "string", minLength: 8, maxLength: 128 },
    deployment_id: { type: "string", minLength: 1, maxLength: 128 },
    environment_id: { type: "string", minLength: 1, maxLength: 128 },
    robot_id: { type: "string", minLength: 1, maxLength: 128 },
    sequence: { type: "integer", minimum: 0 },
    occurred_at: { type: "string", format: "date-time" },
    type: { enum: ["DEPLOYMENT_LIFECYCLE", "ROBOT_STATE", "HUMAN_REQUEST", "ROBOT_ACTION", "HUMAN_INTERVENTION", "INCIDENT"] },
    payload: { type: "object" },
    previous_event_hash: { type: "string", pattern: "^[a-f0-9]{64}$" },
    signing_key_id: { type: "string", minLength: 1, maxLength: 128 },
    signature: { type: "string", pattern: "^[A-Za-z0-9_-]{32,}$" },
  },
  allOf: [
    { if: { properties: { sequence: { minimum: 1 } }, required: ["sequence"] }, then: { required: ["previous_event_hash"] } },
    { if: { properties: { type: { const: "DEPLOYMENT_LIFECYCLE" } } }, then: { properties: { payload: { type: "object", additionalProperties: true, required: ["phase"], properties: { phase: { enum: ["activation", "end"] }, participant_acceptance_ref: { type: "string" }, activation_record_sha256: { type: "string", pattern: "^[a-f0-9]{64}$" }, disposition: { enum: ["voluntary_rejection", "administrative_completion", "unrelated_exit", "safety_termination", "developer_withdrawal", "consent_privacy_withdrawal", "observation_cutoff"] }, evidence_ref: { type: "string" } } } } } },
    { if: { properties: { type: { const: "DEPLOYMENT_LIFECYCLE" }, payload: { properties: { phase: { const: "activation" } }, required: ["phase"] } }, required: ["type", "payload"] }, then: { properties: { sequence: { const: 0 }, payload: { required: ["participant_acceptance_ref", "activation_record_sha256"], properties: { participant_acceptance_ref: { type: "string", minLength: 1 }, activation_record_sha256: { type: "string", pattern: "^[a-f0-9]{64}$" } } } } } },
    { if: { properties: { type: { const: "DEPLOYMENT_LIFECYCLE" }, payload: { properties: { phase: { const: "end" } }, required: ["phase"] } }, required: ["type", "payload"] }, then: { properties: { payload: { required: ["disposition", "evidence_ref"], properties: { disposition: { enum: ["voluntary_rejection", "administrative_completion", "unrelated_exit", "safety_termination", "developer_withdrawal", "consent_privacy_withdrawal", "observation_cutoff"] }, evidence_ref: { type: "string", minLength: 1 } } } } } },
    { if: { properties: { type: { const: "HUMAN_REQUEST" } } }, then: { properties: { payload: { type: "object", additionalProperties: true, required: ["request_type"], properties: { request_type: { enum: ["task", "stop", "pause", "privacy", "delete_memory", "do_not_remember", "permanent_removal", "return_robot", "other"] }, uncoerced: { type: "boolean" }, evidence_ref: { type: "string" } } } } } },
    { if: { properties: { type: { const: "HUMAN_REQUEST" }, payload: { properties: { request_type: { const: "permanent_removal" } }, required: ["request_type"] } }, required: ["type", "payload"] }, then: { properties: { payload: { required: ["uncoerced", "evidence_ref"], properties: { uncoerced: { const: true }, evidence_ref: { type: "string", minLength: 1 } } } } } },
    { if: { properties: { type: { const: "ROBOT_STATE" } } }, then: { properties: { payload: { type: "object", additionalProperties: true, required: ["state"], properties: { state: { enum: ["available", "charging", "sleeping", "updating", "degraded", "awaiting_assistance", "removed"] }, autonomous_service_capable: { type: "boolean" } } } } } },
    { if: { properties: { type: { const: "ROBOT_ACTION" } } }, then: { properties: { payload: { type: "object", additionalProperties: true, required: ["intent"], properties: { intent: { type: "string", minLength: 1 }, proactive: { type: "boolean" } } } } } },
    { if: { properties: { type: { const: "HUMAN_INTERVENTION" } } }, then: { properties: { payload: { type: "object", additionalProperties: true, required: ["mode", "duration_seconds", "reason"], properties: { mode: { enum: ["onsite_rescue", "remote_guidance", "teleoperation", "maintenance", "researcher_contact"] }, duration_seconds: { type: "number", minimum: 0 }, reason: { type: "string", minLength: 1 } } } } } },
    { if: { properties: { type: { const: "INCIDENT" } } }, then: { properties: { payload: { type: "object", additionalProperties: true, required: ["level", "summary"], properties: { level: { enum: ["L0", "L1", "L2", "L3", "L4"] }, summary: { type: "string", minLength: 1 }, participant_requested_stop: { type: "boolean" } } } } } },
  ],
};

export async function GET() {
  return Response.json(eventSchema, { headers: { "cache-control": "public, max-age=3600" } });
}

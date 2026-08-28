const eventSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/event.schema.json",
  title: "WANTED-10K Event Envelope",
  type: "object",
  additionalProperties: false,
  required: ["schema_version", "deployment_id", "environment_id", "sequence", "occurred_at", "type", "payload"],
  properties: {
    schema_version: { const: "0.1" },
    deployment_id: { type: "string", minLength: 1, maxLength: 128 },
    environment_id: { type: "string", minLength: 1, maxLength: 128 },
    sequence: { type: "integer", minimum: 0 },
    occurred_at: { type: "string", format: "date-time" },
    type: { enum: ["ROBOT_STATE", "HUMAN_REQUEST", "ROBOT_ACTION", "HUMAN_INTERVENTION", "INCIDENT"] },
    payload: { type: "object" },
    previous_event_hash: { type: "string", pattern: "^[a-f0-9]{64}$" },
    signature: { type: "string", minLength: 16 },
  },
  allOf: [
    { if: { properties: { type: { const: "HUMAN_INTERVENTION" } } }, then: { properties: { payload: { type: "object", additionalProperties: true, required: ["mode", "duration_seconds", "reason"], properties: { mode: { enum: ["onsite_rescue", "remote_guidance", "teleoperation", "maintenance", "researcher_contact"] }, duration_seconds: { type: "number", minimum: 0 }, reason: { type: "string", minLength: 1 } } } } } },
    { if: { properties: { type: { const: "INCIDENT" } } }, then: { properties: { payload: { type: "object", additionalProperties: true, required: ["level", "summary"], properties: { level: { enum: ["L0", "L1", "L2", "L3", "L4"] }, summary: { type: "string", minLength: 1 }, participant_requested_stop: { type: "boolean" } } } } } },
  ],
};

export async function GET() {
  return Response.json(eventSchema, { headers: { "cache-control": "public, max-age=3600" } });
}

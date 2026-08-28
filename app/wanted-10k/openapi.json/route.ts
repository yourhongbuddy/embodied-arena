const openapi = {
  openapi: "3.1.0",
  info: {
    title: "WANTED-10K Adapter Contract",
    version: "0.2.0",
    description: "A vendor-neutral transport profile with RFC 8785 canonicalization, per-deployment ordering, signatures, and a SHA-256 previous-event chain. Implementers expose or adapt this relative path; this website does not operate a study-ingestion service.",
  },
  paths: {
    "/v1/events": {
      post: {
        operationId: "appendWantedEvent",
        summary: "Append one ordered benchmark event",
        parameters: [{ name: "Idempotency-Key", in: "header", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "./event.schema.json" } } } },
        responses: {
          "202": { description: "Accepted after schema, idempotency, sequence, hash-chain, and signature validation" },
          "409": { description: "Duplicate idempotency key or non-monotonic sequence" },
          "422": { description: "Invalid benchmark event" },
        },
      },
    },
    "/v1/deployments/{deployment_id}/tail": {
      get: {
        operationId: "getWantedDeploymentTail",
        summary: "Recover the last accepted chain checkpoint after restart",
        parameters: [{ name: "deployment_id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Authoritative accepted tail", content: { "application/json": { schema: { type: "object", required: ["next_sequence", "previous_event_hash", "last_occurred_at"], properties: { next_sequence: { type: "integer", minimum: 1 }, previous_event_hash: { type: "string", pattern: "^[a-f0-9]{64}$" }, last_occurred_at: { type: "string", format: "date-time" } } } } } },
          "404": { description: "No accepted event; initialize a genesis checkpoint at sequence zero" },
        },
      },
    },
  },
  "x-wanted-status": "contract-only",
  "x-wanted-reference-sdk": "/wanted-10k/wanted-sdk.mjs",
};

export async function GET() {
  return Response.json(openapi, { headers: { "cache-control": "public, max-age=3600" } });
}

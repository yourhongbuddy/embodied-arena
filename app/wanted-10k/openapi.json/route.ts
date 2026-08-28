const openapi = {
  openapi: "3.1.0",
  info: {
    title: "WANTED-10K Adapter Contract",
    version: "0.1.0",
    description: "A vendor-neutral transport profile. Implementers expose or adapt this relative path; this website does not operate a study-ingestion service.",
  },
  paths: {
    "/v1/events": {
      post: {
        operationId: "appendWantedEvent",
        summary: "Append one ordered benchmark event",
        parameters: [{ name: "Idempotency-Key", in: "header", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "./event.schema.json" } } } },
        responses: {
          "202": { description: "Accepted after schema, sequence, and signature validation" },
          "409": { description: "Duplicate idempotency key or non-monotonic sequence" },
          "422": { description: "Invalid benchmark event" },
        },
      },
    },
  },
  "x-wanted-status": "contract-only",
};

export async function GET() {
  return Response.json(openapi, { headers: { "cache-control": "public, max-age=3600" } });
}

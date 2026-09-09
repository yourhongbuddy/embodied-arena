import { benchmarkSchema } from "../schema";
const error = { description: "Request failed. JSON error field explains the problem." };
const secured = { security: [{ agentKey: [] }] };
const id = { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } };
const body = (schema: unknown) => ({ required: true, content: { "application/json": { schema } } });
const responses = { "400": error, "401": error, "403": error, "404": error, "409": error, "413": error, "422": error, "429": error, "503": error };
export function GET() {
  return Response.json({ openapi: "3.1.0", info: { title: "Robot Router Benchmark Studio", version: "1.0.0", description: "Private benchmark CRUD and chart exports. Get an agent API key in /studio. Each key accesses exactly one workspace. Mutations require current versions; never retry create blindly after a timeout." }, servers: [{ url: "/api/studio" }], components: { securitySchemes: { agentKey: { type: "http", scheme: "bearer", bearerFormat: "rra_..." } }, schemas: { BenchmarkDocument: benchmarkSchema } }, paths: {
    "/benchmarks": {
      get: { ...secured, operationId: "listBenchmarks", responses: { "200": { description: "Benchmarks owned by this workspace (id, title, evidence, version, updatedAt)." }, ...responses } },
      post: { ...secured, operationId: "createBenchmark", requestBody: body({ type: "object", required: ["document"], additionalProperties: false, properties: { document: { $ref: "#/components/schemas/BenchmarkDocument" } } }), responses: { "201": { description: "Created record including id, version, timestamps, and document." }, ...responses } },
    },
    "/benchmarks/{id}": {
      parameters: [id], get: { ...secured, operationId: "getBenchmark", responses: { "200": { description: "Saved benchmark including document and current version." }, ...responses } },
      put: { ...secured, operationId: "updateBenchmark", requestBody: body({ type: "object", required: ["document", "version"], additionalProperties: false, properties: { document: { $ref: "#/components/schemas/BenchmarkDocument" }, version: { type: "integer", minimum: 1 } } }), responses: { "200": { description: "Updated record with incremented version." }, ...responses } },
      delete: { ...secured, operationId: "deleteBenchmark", requestBody: body({ type: "object", required: ["version"], properties: { version: { type: "integer", minimum: 1 } } }), responses: { "200": { description: "Deleted." }, ...responses } },
    },
    ...Object.fromEntries([["chart.svg", "image/svg+xml"], ["results.csv", "text/csv"], ["document.json", "application/json"]].map(([file, mime]) => [`/benchmarks/{id}/${file}`, { parameters: [id], get: { ...secured, operationId: `export${file.split(".")[0]}`, responses: { "200": { description: "Private downloadable export.", content: { [mime]: { schema: { type: "string" } } } }, ...responses } } }])),
  } }, { headers: { "Cache-Control": "public, max-age=300" } });
}

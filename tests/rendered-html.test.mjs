import assert from "node:assert/strict";
import test from "node:test";

let workerPromise;
async function worker() {
  if (!workerPromise) {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
    workerPromise = import(workerUrl.href).then(module => module.default);
  }
  return workerPromise;
}

async function request(path, accept = "text/html") {
  return (await worker()).fetch(
    new Request(`http://localhost${path}`, { headers: { accept } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the WANTED-10K benchmark and protocol kit", async () => {
  const benchmark = await request("/wanted-10k");
  assert.equal(benchmark.status, 200);
  const benchmarkHtml = await benchmark.text();
  assert.match(benchmarkHtml, /Still wanted/);
  assert.match(benchmarkHtml, /VERSION 0\.2/);
  assert.match(benchmarkHtml, /Open protocol kit/);
  assert.match(benchmarkHtml, /CONFORMANCE CHECKER/);

  const protocol = await request("/wanted-10k/protocol");
  assert.equal(protocol.status, 200);
  const protocolHtml = await protocol.text();
  assert.match(protocolHtml, /Freeze the rules/);
  assert.match(protocolHtml, /W is never extrapolated/);
  assert.match(protocolHtml, /ENDPOINT ADJUDICATION/);
  assert.match(protocolHtml, /Six gates/);
});

test("publishes internally consistent protocol 0.2 resources", async () => {
  const [specResponse, eventResponse, preregResponse, templateResponse, rulesResponse] = await Promise.all([
    request("/wanted-10k/spec.json", "application/json"),
    request("/wanted-10k/event.schema.json", "application/json"),
    request("/wanted-10k/preregistration.schema.json", "application/json"),
    request("/wanted-10k/preregistration.template.json", "application/json"),
    request("/wanted-10k/endpoint-rules.json", "application/json"),
  ]);
  for (const response of [specResponse, eventResponse, preregResponse, templateResponse, rulesResponse]) assert.equal(response.status, 200);
  const [spec, eventSchema, preregSchema, template, rules] = await Promise.all([specResponse.json(), eventResponse.json(), preregResponse.json(), templateResponse.json(), rulesResponse.json()]);
  assert.equal(spec.version, "0.2");
  assert.equal(eventSchema.properties.schema_version.const, "0.2");
  assert.ok(eventSchema.required.includes("signature"));
  assert.ok(eventSchema.required.includes("robot_id"));
  assert.equal(preregSchema.properties.protocol_version.const, "0.2");
  assert.equal(template.protocol_version, "0.2");
  assert.equal(rules.protocol_version, "0.2");
  assert.match(spec.primary_score.identifiability_rule, /do_not_report/);
});

test("serves the local conformance checker and corrected score lab", async () => {
  const conformance = await request("/wanted-10k/conformance");
  assert.equal(conformance.status, 200);
  const conformanceHtml = await conformance.text();
  assert.match(conformanceHtml, /Prove the stream/);
  assert.match(conformanceHtml, /LOCAL VALIDATOR/);

  const calculator = await request("/wanted-10k/calculator");
  assert.equal(calculator.status, 200);
  const calculatorHtml = await calculator.text();
  assert.match(calculatorHtml, /refuses unsupported 10,000-hour extrapolation/);
});

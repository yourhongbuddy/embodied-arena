import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
  assert.match(benchmarkHtml, /Audited registry/);

  const protocol = await request("/wanted-10k/protocol");
  assert.equal(protocol.status, 200);
  const protocolHtml = await protocol.text();
  assert.match(protocolHtml, /Freeze the rules/);
  assert.match(protocolHtml, /W is never extrapolated/);
  assert.match(protocolHtml, /ENDPOINT ADJUDICATION/);
  assert.match(protocolHtml, /Six gates/);
  assert.match(protocolHtml, /Twenty-eight artifacts/);
  assert.match(protocolHtml, /PREFLIGHT LAB/);
  assert.match(protocolHtml, /PREPARE AUDIT PACK/);
});

test("publishes the cohort-integrity selection and independence gate", async () => {
  const [pageResponse, contractResponse, schemaResponse, templateResponse, auditResponse, leaderboardResponse, specResponse] = await Promise.all([
    request("/wanted-10k/cohort-integrity"),
    request("/wanted-10k/cohort-integrity.json", "application/json"),
    request("/wanted-10k/cohort-integrity.schema.json", "application/json"),
    request("/wanted-10k/cohort-integrity.template.json", "application/json"),
    request("/wanted-10k/audit-manifest.template.json", "application/json"),
    request("/wanted-10k/leaderboard.json", "application/json"),
    request("/wanted-10k/spec.json", "application/json"),
  ]);
  for (const response of [pageResponse, contractResponse, schemaResponse, templateResponse, auditResponse, leaderboardResponse, specResponse]) assert.equal(response.status, 200);
  const pageHtml = await pageResponse.text();
  assert.match(pageHtml, /Count each choice/);
  assert.match(pageHtml, /No disappearing/);
  assert.match(pageHtml, /METHOD BASIS/);
  assert.match(pageHtml, /CONSORT 2025/);
  assert.match(pageHtml, /INDEPENDENCE != REPRESENTATIVENESS/);
  const [contract, schema, template, audit, leaderboard, spec] = await Promise.all([contractResponse.json(), schemaResponse.json(), templateResponse.json(), auditResponse.json(), leaderboardResponse.json(), specResponse.json()]);
  assert.equal(contract.version, "0.2-E1");
  assert.equal(contract.representativeness_claim, false);
  assert.equal(schema.properties.flow.properties.post_activation_exclusions.const, 0);
  assert.equal(template.profile_version, "0.2-E1");
  assert.equal(audit.cohort_integrity.profile_version, "0.2-E1");
  assert.equal(leaderboard.admission.includes("cohort_integrity_profile_0.2-E1_passes"), true);
  assert.equal(spec.cohort_integrity_profile.analysis_principle, "all_activated_environments_remain_in_analysis");
  assert.equal(spec.developer_resources.cohort_integrity_lab, "/wanted-10k/cohort-integrity");
});

test("publishes the target-specific certification applicability contract", async () => {
  const [pageResponse, contractResponse, templatesResponse, schemaResponse, specResponse] = await Promise.all([
    request("/wanted-10k/certification"),
    request("/wanted-10k/certification.json", "application/json"),
    request("/wanted-10k/certification-templates.json", "application/json"),
    request("/wanted-10k/audit-manifest.schema.json", "application/json"),
    request("/wanted-10k/spec.json", "application/json"),
  ]);
  for (const response of [pageResponse, contractResponse, templatesResponse, schemaResponse, specResponse]) assert.equal(response.status, 200);
  const pageHtml = await pageResponse.text();
  assert.match(pageHtml, /Ask only for evidence/);
  assert.match(pageHtml, /Do not fake a ladder/);
  assert.match(pageHtml, /TYPED NOT APPLICABLE/);
  const [contract, templates, schema, spec] = await Promise.all([contractResponse.json(), templatesResponse.json(), schemaResponse.json(), specResponse.json()]);
  assert.equal(contract.version, "0.2-C1");
  assert.equal(contract.ranking.only_target, "WANTED_WILD");
  assert.equal(templates.certification_profile_version, "0.2-C1");
  assert.deepEqual(Object.keys(templates.templates), ["PREQUALIFIED", "WANTED_LAB", "WANTED_WILD", "WANTED_10K"]);
  assert.equal(templates.templates.PREQUALIFIED.primary.applicable, false);
  assert.equal(templates.templates.WANTED_10K.primary.applicable, false);
  assert.equal(schema.allOf.length, 4);
  assert.equal(spec.certification_profile.rankable_target, "WANTED_WILD");
  assert.equal(spec.developer_resources.certification_matrix, "/wanted-10k/certification");
});

test("publishes the non-compensatory field safety-case profile", async () => {
  const [pageResponse, contractResponse, schemaResponse, templateResponse, auditResponse, specResponse] = await Promise.all([
    request("/wanted-10k/safety"),
    request("/wanted-10k/safety.json", "application/json"),
    request("/wanted-10k/safety-manifest.schema.json", "application/json"),
    request("/wanted-10k/safety-manifest.template.json", "application/json"),
    request("/wanted-10k/audit-manifest.template.json", "application/json"),
    request("/wanted-10k/spec.json", "application/json"),
  ]);
  for (const response of [pageResponse, contractResponse, schemaResponse, templateResponse, auditResponse, specResponse]) assert.equal(response.status, 200);
  const pageHtml = await pageResponse.text();
  assert.match(pageHtml, /Pass every gate/);
  assert.match(pageHtml, /No universal/);
  assert.match(pageHtml, /NOT A CONFORMITY MARK/);
  const [contract, schema, template, audit, spec] = await Promise.all([contractResponse.json(), schemaResponse.json(), templateResponse.json(), auditResponse.json(), specResponse.json()]);
  assert.equal(contract.version, "0.2-S1");
  assert.equal(contract.universal_latency_limit_ms, null);
  assert.equal(schema.properties.profile_version.const, "0.2-S1");
  assert.equal(template.protective_functions.protective_stop.trials >= 100, true);
  assert.equal(audit.safety.profile_version, "0.2-S1");
  assert.equal(audit.safety.policy_artifact_sha256, audit.robot.policy_artifact_sha256);
  assert.equal(spec.safety_case_profile.conformity_claim, false);
  assert.equal(spec.developer_resources.safety_case_lab, "/wanted-10k/safety");
});

test("publishes the audited WANTED registry without invented entries", async () => {
  const [pageResponse, contractResponse, schemaResponse, specResponse] = await Promise.all([
    request("/wanted-10k/leaderboard"),
    request("/wanted-10k/leaderboard.json", "application/json"),
    request("/wanted-10k/leaderboard-entry.schema.json", "application/json"),
    request("/wanted-10k/spec.json", "application/json"),
  ]);
  for (const response of [pageResponse, contractResponse, schemaResponse, specResponse]) assert.equal(response.status, 200);
  const pageHtml = await pageResponse.text();
  assert.match(pageHtml, /No one has/);
  assert.match(pageHtml, /NO AUDITED WANTED WILD ENTRIES/);
  assert.match(pageHtml, /1 · 1 · 3/);
  const [contract, schema, spec] = await Promise.all([contractResponse.json(), schemaResponse.json(), specResponse.json()]);
  assert.equal(contract.version, "0.2-L1");
  assert.deepEqual(contract.entries, []);
  assert.equal(contract.ranking.forbidden_tiebreakers.includes("safety_incidents"), true);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.registry_profile_version.const, "0.2-L1");
  assert.equal(spec.leaderboard_profile.uncertainty_changes_rank, false);
  assert.equal(spec.developer_resources.audited_registry, "/wanted-10k/leaderboard");
});

test("publishes the simulator-neutral digital-twin preflight contract", async () => {
  const [pageResponse, schemaResponse, templateResponse, auditResponse, specResponse] = await Promise.all([
    request("/wanted-10k/preflight"),
    request("/wanted-10k/preflight.schema.json", "application/json"),
    request("/wanted-10k/preflight.template.json", "application/json"),
    request("/wanted-10k/audit-manifest.template.json", "application/json"),
    request("/wanted-10k/spec.json", "application/json"),
  ]);
  for (const response of [pageResponse, schemaResponse, templateResponse, auditResponse, specResponse]) assert.equal(response.status, 200);
  const pageHtml = await pageResponse.text();
  assert.match(pageHtml, /Stress it first/);
  assert.match(pageHtml, /SIMULATION BOUNDARY/);
  assert.match(pageHtml, /CLOPPER/);
  const [schema, template, audit, spec] = await Promise.all([schemaResponse.json(), templateResponse.json(), auditResponse.json(), specResponse.json()]);
  assert.equal(schema.properties.profile_version.const, "0.2-P1");
  assert.equal(template.families.length, 8);
  assert.equal(audit.preflight.profile_version, "0.2-P1");
  assert.equal(audit.preflight.catastrophic_events, 0);
  assert.equal(spec.preflight_profile.simulated_human_retention_permitted, false);
  assert.equal(spec.developer_resources.preflight_lab, "/wanted-10k/preflight");
});

test("publishes the non-ranking longitudinal diagnostic profile", async () => {
  const [pageResponse, contractResponse, schemaResponse, auditResponse, specResponse] = await Promise.all([
    request("/wanted-10k/diagnostics"),
    request("/wanted-10k/diagnostics.json", "application/json"),
    request("/wanted-10k/diagnostic-input.schema.json", "application/json"),
    request("/wanted-10k/audit-manifest.template.json", "application/json"),
    request("/wanted-10k/spec.json", "application/json"),
  ]);
  for (const response of [pageResponse, contractResponse, schemaResponse, auditResponse, specResponse]) assert.equal(response.status, 200);
  const pageHtml = await pageResponse.text();
  assert.match(pageHtml, /Explain the score/);
  assert.match(pageHtml, /NOT A COMPOSITE SCORE/);
  const [contract, schema, audit, spec] = await Promise.all([contractResponse.json(), schemaResponse.json(), auditResponse.json(), specResponse.json()]);
  assert.equal(contract.version, "0.2-D1");
  assert.equal(contract.ranking_effect, "none");
  assert.equal(schema.additionalProperties, false);
  assert.equal(audit.diagnostics.profile_version, "0.2-D1");
  assert.equal(spec.diagnostic_profile.zero_event_rule, "right_censored_lower_bound_not_infinity");
  assert.equal(spec.developer_resources.diagnostic_lab, "/wanted-10k/diagnostics");
});

test("ships an executable adapter that produces one conformant five-event chain", async () => {
  const [pageResponse, sdkResponse, schemaResponse, templateResponse, openapiResponse, specResponse] = await Promise.all([
    request("/wanted-10k/sdk"),
    request("/wanted-10k/wanted-sdk.mjs", "text/javascript"),
    request("/wanted-10k/deployment.schema.json", "application/json"),
    request("/wanted-10k/deployment.template.json", "application/json"),
    request("/wanted-10k/openapi.json", "application/json"),
    request("/wanted-10k/spec.json", "application/json"),
  ]);
  for (const response of [pageResponse, sdkResponse, schemaResponse, templateResponse, openapiResponse, specResponse]) assert.equal(response.status, 200);
  const pageHtml = await pageResponse.text();
  assert.match(pageHtml, /Robot to valid stream/);
  assert.match(pageHtml, /REFERENCE, NOT A COLLECTOR/);

  const source = await sdkResponse.text();
  const sdk = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const events = [];
  let minute = 0;
  const wanted = new sdk.WantedClient({
    deploymentId: "dep_test_001",
    environmentId: "env_test_001",
    robotId: "robot_test_001",
    signingKeyId: "key_test_001",
    sign: async () => new Uint8Array(64).fill(7),
    sink: async event => events.push(event),
    now: () => new Date(`2026-08-28T18:0${minute++}:00Z`),
    eventId: () => `evt_test_${String(minute).padStart(3, "0")}`,
  });
  await Promise.all([
    wanted.state("available", { autonomous_service_capable: true }),
    wanted.request("task", { evidence_ref: "local://request/1" }),
    wanted.action("bring water", { proactive: false }),
    wanted.intervention("remote_guidance", 18, "recovery"),
    wanted.incident("L1", "Brief hallway obstruction", { participant_requested_stop: false }),
  ]);
  assert.deepEqual(events.map(event => event.sequence), [0, 1, 2, 3, 4]);
  assert.deepEqual(new Set(events.map(event => event.type)), new Set(["ROBOT_STATE", "HUMAN_REQUEST", "ROBOT_ACTION", "HUMAN_INTERVENTION", "INCIDENT"]));
  const independentCanonicalize = value => value === null || typeof value !== "object" ? JSON.stringify(value) : Array.isArray(value) ? `[${value.map(independentCanonicalize).join(",")}]` : `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${independentCanonicalize(value[key])}`).join(",")}}`;
  for (let index = 1; index < events.length; index++) {
    const expected = createHash("sha256").update(independentCanonicalize(events[index - 1])).digest("hex");
    assert.equal(events[index].previous_event_hash, expected);
  }
  const checkpoint = { next_sequence: 5, previous_event_hash: createHash("sha256").update(independentCanonicalize(events[4])).digest("hex"), last_occurred_at: "2026-08-28T18:04:00.000Z" };
  assert.deepEqual(wanted.checkpoint(), checkpoint);
  const resumedEvents = [];
  const resumed = new sdk.WantedClient({ deploymentId: "dep_test_001", environmentId: "env_test_001", robotId: "robot_test_001", signingKeyId: "key_test_001", checkpoint, sign: async () => new Uint8Array(64).fill(8), sink: async event => resumedEvents.push(event), eventId: () => "evt_test_006" });
  await resumed.state("charging", {}, "2026-08-28T18:05:00Z");
  assert.equal(resumedEvents[0].sequence, 5);
  assert.equal(resumedEvents[0].previous_event_hash, checkpoint.previous_event_hash);

  let sinkAttempts = 0;
  const retryEvents = [];
  const retrying = new sdk.WantedClient({ deploymentId: "dep_retry_001", environmentId: "env_retry_001", robotId: "robot_retry_001", signingKeyId: "key_retry_001", sign: async () => new Uint8Array(64).fill(9), eventId: () => `evt_retry_${sinkAttempts}`, sink: async event => { sinkAttempts++; if (sinkAttempts === 1) throw new Error("offline"); retryEvents.push(event); } });
  await assert.rejects(retrying.state("available"), /offline/);
  await retrying.state("available");
  assert.equal(retryEvents[0].sequence, 0);
  assert.equal(retrying.checkpoint().next_sequence, 1);
  await assert.rejects(retrying.action("invalid number", { score: Number.NaN }), /non-finite/);
  const [schema, template, openapi, spec] = await Promise.all([schemaResponse.json(), templateResponse.json(), openapiResponse.json(), specResponse.json()]);
  assert.equal(schema.properties.protocol_version.const, "0.2");
  assert.equal(template.checkpoint.recovery_tested, true);
  assert.ok(openapi.paths["/v1/deployments/{deployment_id}/tail"]);
  assert.equal(spec.developer_resources.reference_sdk, "/wanted-10k/wanted-sdk.mjs");
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

test("ships the robustness analysis in the dependency-free Python reference", async () => {
  const response = await request("/wanted-10k/reference-score.py", "text/x-python");
  assert.equal(response.status, 200);
  const source = await response.text();
  assert.match(source, /def robustness_profile/);
  assert.match(source, /profile_version.*0\.2-R1/);
  assert.match(source, /unidentifiable_exclusions/);
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
  assert.match(calculatorHtml, /ROBUSTNESS DISCLOSURE/);
  assert.match(calculatorHtml, /CENSORING ENVELOPE/);
});

test("publishes the primary-score robustness contract", async () => {
  const [contractResponse, preregResponse, auditResponse, specResponse] = await Promise.all([
    request("/wanted-10k/robustness.json", "application/json"),
    request("/wanted-10k/preregistration.template.json", "application/json"),
    request("/wanted-10k/audit-manifest.template.json", "application/json"),
    request("/wanted-10k/spec.json", "application/json"),
  ]);
  for (const response of [contractResponse, preregResponse, auditResponse, specResponse]) assert.equal(response.status, 200);
  const [contract, prereg, audit, spec] = await Promise.all([contractResponse.json(), preregResponse.json(), auditResponse.json(), specResponse.json()]);
  assert.equal(contract.version, "0.2-R1");
  assert.equal(contract.primary_estimator_changed, false);
  assert.equal(prereg.analysis.leave_one_environment_out, true);
  assert.equal(audit.primary.robustness_profile_version, "0.2-R1");
  assert.equal(spec.robustness_profile.bounds_are_rankable_scores, false);
});

test("publishes the aggregate certification audit contract", async () => {
  const [pageResponse, schemaResponse, templateResponse, specResponse] = await Promise.all([
    request("/wanted-10k/audit"),
    request("/wanted-10k/audit-manifest.schema.json", "application/json"),
    request("/wanted-10k/audit-manifest.template.json", "application/json"),
    request("/wanted-10k/spec.json", "application/json"),
  ]);
  for (const response of [pageResponse, schemaResponse, templateResponse, specResponse]) assert.equal(response.status, 200);
  const pageHtml = await pageResponse.text();
  assert.match(pageHtml, /One row/);
  assert.match(pageHtml, /Every claim bound/);
  assert.match(pageHtml, /CERTIFICATION HANDOFF/);
  const [schema, template, spec] = await Promise.all([schemaResponse.json(), templateResponse.json(), specResponse.json()]);
  assert.equal(schema.properties.protocol_version.const, "0.2");
  assert.equal(template.protocol_version, "0.2");
  assert.equal(template.submission_mode, "test");
  assert.equal(template.privacy.participant_data_included, false);
  assert.equal(spec.certification_handoff.participant_data_permitted, false);
  assert.equal(spec.developer_resources.audit_pack, "/wanted-10k/audit");
});

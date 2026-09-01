import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:net";
import { dirname } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { assignWantedVariant,exposureTokenForAssignment } from "../app/experiments/rotator.ts";

const projectRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
let serverProcess;
let serverPromise;
let serverOutput = "";

async function availablePort() {
  return new Promise((resolve, reject) => {
    const listener = createServer();
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", () => {
      const address = listener.address();
      const port = typeof address === "object" && address ? address.port : null;
      listener.close(error => {
        if (error) reject(error);
        else if (port === null) reject(new Error("Could not reserve a test port"));
        else resolve(port);
      });
    });
  });
}

async function standaloneServer() {
  if (!serverPromise) {
    serverPromise = (async () => {
      const port = await availablePort();
      const baseUrl = `http://127.0.0.1:${port}/`;
      serverProcess = spawn(process.execPath, ["dist/standalone/server.js"], {
        cwd: projectRoot,
        env: { ...process.env, HOST: "127.0.0.1", PORT: String(port) },
        stdio: ["ignore", "pipe", "pipe"],
      });
      for (const stream of [serverProcess.stdout, serverProcess.stderr]) {
        stream.setEncoding("utf8");
        stream.on("data", chunk => { serverOutput = `${serverOutput}${chunk}`.slice(-8_000); });
      }
      for (let attempt = 0; attempt < 100; attempt += 1) {
        if (serverProcess.exitCode !== null) {
          throw new Error(`Standalone server exited with code ${serverProcess.exitCode}.\n${serverOutput}`);
        }
        try {
          const response = await fetch(new URL("robots.txt", baseUrl), {
            signal: AbortSignal.timeout(1_000),
          });
          if (response.status < 500) return baseUrl;
        } catch {
          // The server is still starting.
        }
        await delay(50);
      }
      serverProcess.kill("SIGTERM");
      throw new Error(`Standalone server did not become ready.\n${serverOutput}`);
    })();
  }
  return serverPromise;
}

async function request(path, accept = "text/html") {
  const baseUrl = await standaloneServer();
  return fetch(new URL(path, baseUrl), { headers: { accept } });
}

after(async () => {
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill("SIGTERM");
    await Promise.race([once(serverProcess, "exit"), delay(2_000)]);
    if (serverProcess.exitCode === null) serverProcess.kill("SIGKILL");
  }
  assert.doesNotMatch(serverOutput,/Each child in a list should have a unique/);
});

test("server-renders the WANTED-10K benchmark and protocol kit", async () => {
  const benchmark = await request("/wanted-10k");
  assert.equal(benchmark.status, 200);
  const benchmarkHtml = await benchmark.text();
  assert.match(benchmarkHtml, /Still wanted/);
  assert.match(benchmarkHtml,/wantedVariant--pending/);assert.match(benchmarkHtml,/data-variant="pending"/);assert.match(benchmarkHtml,/aria-busy="true"/);assert.match(benchmarkHtml,/Assigning a stable privacy-first site version/);
  assert.match(benchmarkHtml, /VERSION 0\.2/);
  assert.match(benchmarkHtml, /Open protocol kit/);
  assert.match(benchmarkHtml, /CONFORMANCE CHECKER/);
  assert.match(benchmarkHtml, /AUDIT TRUST VERIFIER/);
  assert.match(benchmarkHtml, /Audited registry/);

  const protocol = await request("/wanted-10k/protocol");
  assert.equal(protocol.status, 200);
  const protocolHtml = await protocol.text();
  assert.match(protocolHtml, /Freeze the rules/);
  assert.match(protocolHtml, /W is never extrapolated/);
  assert.match(protocolHtml, /ENDPOINT ADJUDICATION/);
  assert.match(protocolHtml, /Six gates/);
  assert.match(protocolHtml, /One hundred six artifacts/);
  assert.match(protocolHtml, /AUDIT VERIFIER SDK/);
  assert.match(protocolHtml, /PREFLIGHT LAB/);
  assert.match(protocolHtml, /PREPARE AUDIT PACK/);
});

test("publishes a stable privacy-first site version rotator",async()=>{
  const [pageResponse,contractResponse,resultResponse]=await Promise.all([request("/experiments"),request("/experiments.json","application/json"),request("/api/experiments","application/json")]);
  for(const response of [pageResponse,contractResponse,resultResponse])assert.equal(response.status,200);
  const pageHtml=await pageResponse.text();
  assert.match(pageHtml,/Test the framing/);assert.match(pageHtml,/PRESENTATION ONLY/);assert.match(pageHtml,/DESCRIPTIVE ONLY/);assert.match(pageHtml,/INTERVAL POSITION/);assert.match(pageHtml,/cannot select or stop a version/i);assert.match(pageHtml,/experiment-only assignment ID/);assert.match(pageHtml,/browser-profile units, not unique people, households, or devices/i);assert.match(pageHtml,/shared profile can combine people/i);assert.match(pageHtml,/site opt-out, Global Privacy Control, or Do Not Track signal/i);assert.match(pageHtml,/DISABLE LOCAL ANALYTICS/);assert.match(pageHtml,/server recomputes each eligible unit.*assigned version and cohort-bound exposure token/i);assert.match(pageHtml,/SHA-256 treatment fingerprint/i);assert.match(pageHtml,/content or allocation drift cannot mix into it/i);assert.match(pageHtml,/compatible software releases do not restart the test/i);assert.match(pageHtml,/rolling 35-day raw-event window/);assert.match(pageHtml,/wanted_variant=control/);assert.match(pageHtml,/wanted_variant=proof/);assert.match(pageHtml,/wanted_variant=developer/);
  const [contract,results]=await Promise.all([contractResponse.json(),resultResponse.json()]);
  assert.equal(contract.version,"0.19-R19");assert.equal(contract.analysis_cohort.id,"wanted_landing_v1-C4");assert.equal(contract.analysis_cohort.starts_at_implementation_version,"0.19-R19");assert.deepEqual(contract.analysis_cohort.legacy_versions_included,[]);assert.match(contract.analysis_cohort.treatment_fingerprint,/^sha256:[0-9a-f]{64}$/);assert.deepEqual(contract.analysis_cohort.aggregation_keys,["analysis_cohort","treatment_fingerprint"]);assert.equal(contract.analysis_cohort.implementation_revision_changes_reset_cohort,false);assert.equal(contract.analysis_cohort.measurement_contract_change_requires_new_cohort,true);assert.equal(contract.assignment.stable_per_device,false);assert.equal(contract.assignment.stable_per_browser_profile_storage,true);assert.equal(contract.assignment.eligibility_checked_before_identifier_creation,true);assert.deepEqual(contract.assignment.eligibility_exclusions,["site_opt_out","global_privacy_control","do_not_track"]);assert.equal(contract.assignment.privacy_exclusion_behavior,"control_or_named_preview_excluded");assert.equal(contract.assignment.persistence_write_readback_required,true);assert.equal(contract.assignment.storage_unavailable_behavior,"control_or_named_preview_excluded");assert.equal(contract.assignment.human_identity_resolution,false);assert.equal(contract.assignment.cross_device_identity_resolution,false);assert.equal(contract.assignment.server_recomputable,true);assert.equal(contract.assignment.analysis_unit_matches_assignment_unit,true);assert.equal(contract.assignment.one_assigned_variant_per_session,true);assert.equal(contract.assignment.pre_assignment_presentation,"neutral_noninteractive");assert.deepEqual(contract.assignment.unit_regeneration_conditions,["site_data_cleared","site_analytics_opt_out_then_reenabled","private_browsing_session_recreated","different_browser_profile","different_device"]);assert.equal(contract.privacy.identifies_person,false);assert.equal(contract.privacy.identifies_household,false);assert.equal(contract.privacy.identifies_device,false);assert.equal(contract.privacy.site_opt_out_control_path,"/experiments");assert.equal(contract.privacy.site_opt_out_storage_key,"ea_analytics_opt_out");assert.equal(contract.privacy.site_opt_out_clears_local_analytics_state,true);assert.equal(contract.privacy.site_opt_out_preserves_unrelated_browser_state,true);assert.deepEqual(contract.privacy.browser_privacy_signals_honored,["global_privacy_control","do_not_track"]);assert.equal(contract.privacy.privacy_exclusion_precedes_identifier_creation,true);assert.equal(contract.privacy.privacy_excluded_general_analytics_sent,false);assert.equal(contract.privacy.privacy_excluded_experiment_analytics_sent,false);assert.equal(contract.privacy.event_retention_days,35);assert.equal(contract.privacy.assignment_id_contains_user_attributes,false);assert.equal(contract.privacy.separate_device_identifier,false);assert.equal(contract.privacy.unit_id_cross_experiment_linkage,false);assert.equal(contract.delivery.exposure_token_server_recomputable,true);assert.equal(contract.delivery.exposure_token_implementation_revision_bound,false);assert.equal(contract.delivery.session_marker_after_acknowledgement,true);assert.equal(contract.delivery.goal_outbox_scope,"session_only");assert.equal(contract.counting.reported_as_unique_users,false);assert.equal(contract.counting.human_deduplication,false);assert.equal(contract.counting.privacy_excluded_units_included,false);assert.equal(contract.counting.storage_unavailable_units_included,false);assert.equal(contract.counting.receipt_order_dependency,false);assert.equal(contract.counting.cross_variant_units_excluded,true);assert.equal(contract.counting.multi_token_units_excluded,true);assert.equal(contract.counting.one_exposure_token_per_counted_unit,true);assert.equal(contract.ingestion.analysis_cohort_required,true);assert.equal(contract.ingestion.treatment_fingerprint_required,true);assert.equal(contract.ingestion.assigned_mode_only,true);assert.equal(contract.ingestion.server_recomputes_variant,true);assert.equal(contract.ingestion.server_recomputes_exposure_token,true);assert.equal(contract.ingestion.automated_fabrication_resistance,false);assert.equal(contract.ingestion.decision_use_without_edge_abuse_control,false);assert.equal(contract.safety_boundary.changes_score,false);assert.equal(contract.inference.multiple_comparison_control,"bonferroni_two_comparisons_familywise_95_percent");assert.equal(contract.inference.monitoring_window,"rolling_30_day_continuously_viewed");assert.equal(contract.inference.repeated_look_adjustment,"none");assert.equal(contract.inference.confidence_intervals_support_stopping,false);assert.equal(contract.inference.winner_declaration,false);assert.equal(contract.experiments[0].variants.reduce((sum,variant)=>sum+variant.weight_basis_points,0),10_000);
  assert.equal(results.experiment,"wanted_landing_v1");assert.equal(results.analysis_cohort,"wanted_landing_v1-C4");assert.equal(results.treatment_fingerprint,contract.analysis_cohort.treatment_fingerprint);assert.equal(results.implementation_version,"0.19-R19");assert.equal(results.analysis_unit,"experiment_scoped_anonymous_browser_unit");assert.equal(results.unit_represents,"one_first_party_browser_profile_storage_instance");assert.equal(results.reported_as_unique_users,false);assert.equal(results.human_identity_resolution,false);assert.equal(results.variants.length,3);assert.equal(results.comparisons.length,2);assert.equal(results.comparisons.every(comparison=>comparison.interval_position==="unavailable"),true);assert.equal(results.decision_gate.status,"descriptive_only");assert.equal(results.decision_gate.automatic_action,false);assert.deepEqual(results.decision_gate.blocking_reasons,["rolling_window_continuously_monitored","no_repeated_look_adjustment","no_preregistered_stopping_rule","human_traffic_not_authenticated"]);assert.equal(results.sample_ratio_mismatch.status,"insufficient");assert.equal(Number.isInteger(results.cross_variant_units_excluded),true);assert.equal(Number.isInteger(results.multi_token_units_excluded),true);assert.equal(Number.isInteger(results.total_exposed_units),true);assert.equal(["ready","unavailable"].includes(results.status),true);
  const baseUrl=await standaloneServer();
  const invalid=await fetch(new URL("api/analytics",baseUrl),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sessionId:"bad",eventType:"experiment_exposure",path:"/wanted-10k"})});
  assert.equal(invalid.status,400);
  const unit="10101010-1010-4010-8010-101010101010",assignment=assignWantedVariant(unit),token=exposureTokenForAssignment(unit,assignment.variant);
  const metadata={experiment:"wanted_landing_v1",analysis_cohort:"wanted_landing_v1-C4",treatment_fingerprint:contract.analysis_cohort.treatment_fingerprint,unit_id:unit,variant:assignment.variant,assignment_mode:"assigned",rotator_version:"0.19-R19",exposure_id:token};
  const accepted=await fetch(new URL("api/analytics",baseUrl),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sessionId:"session_test_001",eventType:"experiment_exposure",path:"/wanted-10k",metadata})});
  assert.equal(accepted.status,204);assert.equal(["accepted","unavailable"].includes(accepted.headers.get("x-analytics-status")),true);
  const forgedVariant=assignment.variant==="control"?"proof":"control";
  const forged=await fetch(new URL("api/analytics",baseUrl),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sessionId:"session_test_001",eventType:"experiment_exposure",path:"/wanted-10k",metadata:{...metadata,variant:forgedVariant}})});
  assert.equal(forged.status,400);
  const wrongType=await fetch(new URL("api/analytics",baseUrl),{method:"POST",body:"{}"});assert.equal(wrongType.status,415);
  const oversized=await fetch(new URL("api/analytics",baseUrl),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({padding:"x".repeat(9_000)})});assert.equal(oversized.status,413);
});

test("publishes the vendor-neutral HILO Realtime protocol", async () => {
  const [response,contractResponse,schemaResponse,templateResponse] = await Promise.all([request("/wanted-10k/realtime"),request("/wanted-10k/realtime.json"),request("/wanted-10k/realtime.schema.json"),request("/wanted-10k/realtime.template.json")]);
  assert.equal(response.status, 200);assert.equal(contractResponse.status,200);assert.equal(schemaResponse.status,200);assert.equal(templateResponse.status,200);
  const html = await response.text(),contract=await contractResponse.json(),schema=await schemaResponse.json(),template=await templateResponse.json();
  assert.match(html, /Benchmark the loop/);
  assert.match(html, /MEAN TIME TO HUMAN INTERVENTION/);
  assert.match(html, /INDEPENDENT SAFETY KERNEL/);
  assert.match(html, /IMAGE_EVENT/);
  assert.match(html, /REFERENCE ≠ STANDARD/);
  assert.match(html, /gpt-realtime-2\.1/);
  assert.match(html, /LOCAL CLOSED-LOOP VERIFIER/);
  assert.equal(contract.version,"0.1-RT1");assert.equal(contract.vendor_neutral,true);
  assert.equal(schema.properties.stop_tests.minItems,10);assert.equal(template.certification_tier,"T2");
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

test("publishes the signed resident-time exposure ledger", async () => {
  const [pageResponse, contractResponse, schemaResponse, templateResponse, auditResponse, leaderboardResponse, specResponse] = await Promise.all([
    request("/wanted-10k/exposure-ledger"), request("/wanted-10k/exposure-ledger.json", "application/json"), request("/wanted-10k/exposure-ledger.schema.json", "application/json"), request("/wanted-10k/exposure-ledger.template.json", "application/json"), request("/wanted-10k/audit-manifest.template.json", "application/json"), request("/wanted-10k/leaderboard.json", "application/json"), request("/wanted-10k/spec.json", "application/json"),
  ]);
  for (const response of [pageResponse, contractResponse, schemaResponse, templateResponse, auditResponse, leaderboardResponse, specResponse]) assert.equal(response.status, 200);
  const pageHtml = await pageResponse.text();
  assert.match(pageHtml, /Every hour/); assert.match(pageHtml, /No outage creates/); assert.match(pageHtml, /RESIDENCE != UPTIME/);
  const [contract, schema, template, audit, leaderboard, spec] = await Promise.all([contractResponse.json(), schemaResponse.json(), templateResponse.json(), auditResponse.json(), leaderboardResponse.json(), specResponse.json()]);
  assert.equal(contract.version, "0.2-X1"); assert.equal(contract.pause_deductions_permitted, false); assert.equal(schema.properties.records.items.properties.paused_seconds_deducted.const, 0); assert.equal(template.records.length, 24); assert.equal(audit.exposure_integrity.profile_version, "0.2-X1"); assert.equal(leaderboard.admission.includes("exposure_ledger_profile_0.2-X1_passes"), true); assert.equal(spec.exposure_ledger_profile.telemetry_outage_pauses_clock, false); assert.equal(spec.developer_resources.exposure_ledger_lab, "/wanted-10k/exposure-ledger");
});

test("publishes independent periodic root-commitment witnessing",async()=>{
  const responses=await Promise.all([request("/wanted-10k/root-commitment-witness"),request("/wanted-10k/root-commitment-witness.json","application/json"),request("/wanted-10k/root-commitment-witness.schema.json","application/json"),request("/wanted-10k/root-commitment-witness.template.json","application/json"),request("/wanted-10k/audit-manifest.template.json","application/json"),request("/wanted-10k/leaderboard.json","application/json"),request("/wanted-10k/spec.json","application/json"),request("/wanted-10k/openapi.json","application/json")]);
  for(const response of responses)assert.equal(response.status,200);
  const page=await responses[0].text();assert.match(page,/Commit first/);assert.match(page,/No post-hoc roots/);assert.match(page,/LOCAL ROOT-WITNESS VERIFIER/);assert.match(page,/Pasted manifests never leave this browser/);assert.match(page,/ELIGIBILITY ONLY/);
  const [contract,schema,template,audit,leaderboard,spec,openapi]=await Promise.all(responses.slice(1).map(response=>response.json()));
  assert.equal(contract.version,"0.2-RC1");assert.equal(contract.witness_quorum.minimum_organizations_per_root,2);assert.equal(contract.publication_delay.maximum_hours,24);assert.equal(contract.local_verifier.pasted_manifest_uploads,false);
  assert.equal(schema.properties.protocol.properties.commitment_interval_hours.maximum,24);assert.equal(schema.properties.deployments.items.properties.roots.items.properties.receipts.minItems,2);
  assert.equal(template.profile_version,"0.2-RC1");assert.equal(template.deployments[0].roots.length,5);assert.equal(template.deployments[0].roots.every(root=>root.receipts.length===2),true);
  assert.equal(audit.root_commitment_witness.profile_version,"0.2-RC1");assert.equal(audit.root_commitment_witness.root_commitments_sha256,audit.telemetry.root_commitments_sha256);
  assert.equal(leaderboard.admission.includes("root_commitment_witness_profile_0.2-RC1_passes"),true);
  assert.equal(spec.root_commitment_witness_profile.quorum.minimum_independent_organizations_per_root,2);assert.equal(spec.root_commitment_witness_profile.local_verifier.pasted_manifest_uploads,false);assert.equal(spec.developer_resources.root_commitment_witness_lab,"/wanted-10k/root-commitment-witness");
  assert.equal(openapi["x-wanted-evidence-profiles"].root_commitment_witness.version,"0.2-RC1");assert.equal(openapi["x-wanted-evidence-profiles"].root_commitment_witness.pasted_manifest_uploads,false);
});

test("publishes deterministic ranked-score reproduction",async()=>{const [pageResponse,contractResponse,schemaResponse,templateResponse,auditResponse,leaderboardResponse,specResponse]=await Promise.all([request("/wanted-10k/analysis-reproduction"),request("/wanted-10k/analysis-reproduction.json","application/json"),request("/wanted-10k/analysis-reproduction.schema.json","application/json"),request("/wanted-10k/analysis-reproduction.template.json","application/json"),request("/wanted-10k/audit-manifest.template.json","application/json"),request("/wanted-10k/leaderboard.json","application/json"),request("/wanted-10k/spec.json","application/json")]);for(const response of [pageResponse,contractResponse,schemaResponse,templateResponse,auditResponse,leaderboardResponse,specResponse])assert.equal(response.status,200);const pageHtml=await pageResponse.text();assert.match(pageHtml,/Do not trust W/);assert.match(pageHtml,/Same rows/);assert.match(pageHtml,/REPRODUCIBLE != REPRESENTATIVE/);const [contract,schema,template,audit,leaderboard,spec]=await Promise.all([contractResponse.json(),schemaResponse.json(),templateResponse.json(),auditResponse.json(),leaderboardResponse.json(),specResponse.json()]);assert.equal(contract.version,"0.2-A2");assert.equal(contract.bootstrap.minimum_samples,10000);assert.equal(contract.horizon_boundary.support_identity,"support_at_10000_equals_horizon_rejections_plus_retained_at_10000");assert.equal(schema.properties.bootstrap.properties.prng.const,"pcg32_xsh_rr_64_32_seeded_v1");assert.equal(schema.properties.claimed.required.includes("horizon_rejections"),true);assert.equal(template.claimed.wanted_score,87.5);assert.equal(template.claimed.horizon_rejections,0);assert.equal(template.claimed.retained_at_10000,8);assert.equal(audit.analysis_reproduction.profile_version,"0.2-A2");assert.equal(audit.primary.wanted_score,87.5);assert.equal(audit.primary.support_at_10000,audit.primary.horizon_rejections+audit.primary.retained_at_10000);assert.equal(leaderboard.admission.includes("analysis_reproduction_profile_0.2-A2_passes"),true);assert.equal(leaderboard.disclosure.includes("horizon_rejections_plus_retained_at_10000_equals_support_at_10000"),true);assert.equal(spec.analysis_reproduction_profile.numerical_tolerance,.000001);assert.equal(spec.analysis_reproduction_profile.horizon_boundary.support_identity,"support_at_10000_equals_horizon_rejections_plus_retained_at_10000");assert.equal(spec.developer_resources.analysis_reproduction_lab,"/wanted-10k/analysis-reproduction")});

test("publishes non-ranking multi-site heterogeneity evidence",async()=>{
  const responses=await Promise.all([
    request("/wanted-10k/site-heterogeneity"),
    request("/wanted-10k/site-heterogeneity.json","application/json"),
    request("/wanted-10k/site-heterogeneity.schema.json","application/json"),
    request("/wanted-10k/site-heterogeneity.template.json","application/json"),
    request("/wanted-10k/audit-manifest.template.json","application/json"),
    request("/wanted-10k/leaderboard.json","application/json"),
    request("/wanted-10k/spec.json","application/json"),
    request("/wanted-10k/openapi.json","application/json"),
  ]);
  for(const response of responses)assert.equal(response.status,200);
  const pageHtml=await responses[0].text();
  assert.match(pageHtml,/One score/);
  assert.match(pageHtml,/HETEROGENEITY != RANK/);
  const [contract,schema,template,audit,leaderboard,spec,openapi]=await Promise.all(responses.slice(1).map(response=>response.json()));
  assert.equal(contract.version,"0.2-SH1");
  assert.equal(contract.ranking_effect,"eligibility_gate_and_public_diagnostic_not_score_or_tiebreaker");
  assert.equal(schema.properties.claimed.properties.site_profiles.minItems,3);
  assert.equal(template.claimed.site_profiles.length,3);
  assert.equal(template.claimed.maximum_site_share,.333333333);
  assert.equal(audit.site_heterogeneity.profile_version,"0.2-SH1");
  assert.equal(audit.site_heterogeneity.pooled_wanted_score,audit.primary.wanted_score);
  assert.equal(leaderboard.admission.includes("site_heterogeneity_profile_0.2-SH1_passes"),true);
  assert.equal(leaderboard.ranking.forbidden_tiebreakers.includes("site_heterogeneity_metrics"),true);
  assert.equal(spec.site_heterogeneity_profile.topology.maximum_single_site_share,.5);
  assert.equal(spec.developer_resources.site_heterogeneity_lab,"/wanted-10k/site-heterogeneity");
  assert.equal(openapi["x-wanted-evidence-profiles"].site_heterogeneity.version,"0.2-SH1");
});

test("publishes and reproduces the neutral seven-day withdrawal profile",async()=>{const [pageResponse,contractResponse,schemaResponse,templateResponse,auditResponse,certificationResponse,specResponse]=await Promise.all([request("/wanted-10k/withdrawal"),request("/wanted-10k/withdrawal.json","application/json"),request("/wanted-10k/withdrawal.schema.json","application/json"),request("/wanted-10k/withdrawal.template.json","application/json"),request("/wanted-10k/audit-manifest.template.json","application/json"),request("/wanted-10k/certification.json","application/json"),request("/wanted-10k/spec.json","application/json")]);for(const response of [pageResponse,contractResponse,schemaResponse,templateResponse,auditResponse,certificationResponse,specResponse])assert.equal(response.status,200);const pageHtml=await pageResponse.text();assert.match(pageHtml,/Take it away/);assert.match(pageHtml,/EXACT 168-HOUR CLOCK/);assert.match(pageHtml,/WITHDRAWAL != RANK/);const [contract,schema,template,audit,certification,spec]=await Promise.all([contractResponse.json(),schemaResponse.json(),templateResponse.json(),auditResponse.json(),certificationResponse.json(),specResponse.json()]);assert.equal(contract.version,"0.2-W1");assert.equal(contract.ranking_effect,"none");assert.equal(schema.properties.protocol.properties.withdrawal_hours.const,168);assert.equal(template.records.length,8);assert.equal(template.claimed.median_days_to_return_request,2.5);assert.equal(audit.withdrawal.profile_version,"0.2-W1");assert.equal(audit.withdrawal.manifest_sha256,template.evidence.withdrawal_register_sha256);assert.equal(certification.targets.WANTED_10K.requires.includes("withdrawal_0.2-W1"),true);assert.equal(spec.withdrawal_profile.median_rule.includes("null"),true);assert.equal(spec.developer_resources.withdrawal_reproducer,"/wanted-10k/withdrawal")});

test("publishes and reproduces the neutral four-item human-measures profile",async()=>{
  const [pageResponse,contractResponse,schemaResponse,templateResponse,auditResponse,certificationResponse,specResponse,leaderboardResponse]=await Promise.all([
    request("/wanted-10k/human-measures"),request("/wanted-10k/human-measures.json","application/json"),request("/wanted-10k/human-measures.schema.json","application/json"),request("/wanted-10k/human-measures.template.json","application/json"),request("/wanted-10k/audit-manifest.template.json","application/json"),request("/wanted-10k/certification.json","application/json"),request("/wanted-10k/spec.json","application/json"),request("/wanted-10k/leaderboard.json","application/json")
  ]);
  for(const response of [pageResponse,contractResponse,schemaResponse,templateResponse,auditResponse,certificationResponse,specResponse,leaderboardResponse]) assert.equal(response.status,200);
  const pageHtml=await pageResponse.text();
  assert.match(pageHtml,/Ask four things/);
  assert.match(pageHtml,/Tiny by design/);
  assert.match(pageHtml,/RESPONSE != RETENTION/);
  const [contract,schema,template,audit,certification,spec,leaderboard]=await Promise.all([contractResponse.json(),schemaResponse.json(),templateResponse.json(),auditResponse.json(),certificationResponse.json(),specResponse.json(),leaderboardResponse.json()]);
  assert.equal(contract.version,"0.2-H1");
  assert.deepEqual(contract.questions.map(item=>item.id),["keep","value","burden","trust"]);
  assert.equal(schema.properties.protocol.properties.response_window_hours.const,72);
  assert.equal(template.records.length,120);
  assert.equal(template.claimed.phase_profiles.length,5);
  assert.equal(audit.human_measures.profile_version,"0.2-H1");
  assert.equal(audit.human_measures.manifest_sha256,template.evidence.controlled_response_register_sha256);
  assert.equal(certification.targets.WANTED_LAB.requires.includes("human_measures_0.2-H1"),true);
  assert.equal(spec.human_measures_profile.denominator,"every_due_prompt_set_including_nonresponse");
  assert.equal(spec.developer_resources.human_measures_lab,"/wanted-10k/human-measures");
  assert.equal(leaderboard.admission.includes("human_measures_profile_0.2-H1_passes"),true);
});

test("publishes and reproduces matched learning and generalization",async()=>{
  const [pageResponse,contractResponse,schemaResponse,templateResponse,auditResponse,certificationResponse,specResponse,leaderboardResponse]=await Promise.all([
    request("/wanted-10k/learning-generalization"),request("/wanted-10k/learning-generalization.json","application/json"),request("/wanted-10k/learning-generalization.schema.json","application/json"),request("/wanted-10k/learning-generalization.template.json","application/json"),request("/wanted-10k/audit-manifest.template.json","application/json"),request("/wanted-10k/certification.json","application/json"),request("/wanted-10k/spec.json","application/json"),request("/wanted-10k/leaderboard.json","application/json")
  ]);
  for(const response of [pageResponse,contractResponse,schemaResponse,templateResponse,auditResponse,certificationResponse,specResponse,leaderboardResponse]) assert.equal(response.status,200);
  const pageHtml=await pageResponse.text();
  assert.match(pageHtml,/Same families/);assert.match(pageHtml,/20%/);assert.match(pageHtml,/IMPROVEMENT != CAUSATION/);
  const [contract,schema,template,audit,certification,spec,leaderboard]=await Promise.all([contractResponse.json(),schemaResponse.json(),templateResponse.json(),auditResponse.json(),certificationResponse.json(),specResponse.json(),leaderboardResponse.json()]);
  assert.equal(contract.version,"0.2-LG1");assert.equal(contract.design.novelty_share_per_complete_window,.2);
  assert.equal(schema.properties.protocol.properties.bootstrap_samples.const,10000);assert.equal(template.declared_due_trials,240);assert.equal(template.claimed.paired_environment_count,23);
  assert.equal(audit.learning_generalization.profile_version,"0.2-LG1");assert.equal(audit.learning_generalization.manifest_sha256,template.evidence.controlled_trial_register_sha256);
  assert.equal(certification.targets.WANTED_LAB.requires.includes("learning_generalization_0.2-LG1"),true);
  assert.equal(spec.learning_generalization_profile.design.frozen_task_families,5);assert.equal(spec.developer_resources.learning_generalization_lab,"/wanted-10k/learning-generalization");
  assert.equal(leaderboard.admission.includes("learning_generalization_profile_0.2-LG1_passes"),true);assert.equal(leaderboard.ranking.forbidden_tiebreakers.includes("learning_delta"),true);
});

test("publishes and reproduces assistance integrity from every help episode",async()=>{
  const [pageResponse,contractResponse,schemaResponse,templateResponse,auditResponse,certificationResponse,specResponse,leaderboardResponse,preregResponse]=await Promise.all([
    request("/wanted-10k/assistance-integrity"),request("/wanted-10k/assistance-integrity.json","application/json"),request("/wanted-10k/assistance-integrity.schema.json","application/json"),request("/wanted-10k/assistance-integrity.template.json","application/json"),request("/wanted-10k/audit-manifest.template.json","application/json"),request("/wanted-10k/certification.json","application/json"),request("/wanted-10k/spec.json","application/json"),request("/wanted-10k/leaderboard.json","application/json"),request("/wanted-10k/preregistration.template.json","application/json")
  ]);
  for(const response of [pageResponse,contractResponse,schemaResponse,templateResponse,auditResponse,certificationResponse,specResponse,leaderboardResponse,preregResponse]) assert.equal(response.status,200);
  const pageHtml=await pageResponse.text();assert.match(pageHtml,/Count the help/);assert.match(pageHtml,/ANTI-GHOSTWORK/);assert.match(pageHtml,/RESIDENCE != AUTONOMY/);
  const [contract,schema,template,audit,certification,spec,leaderboard,prereg]=await Promise.all([contractResponse.json(),schemaResponse.json(),templateResponse.json(),auditResponse.json(),certificationResponse.json(),specResponse.json(),leaderboardResponse.json(),preregResponse.json()]);
  assert.equal(contract.version,"0.2-I1");assert.match(contract.inclusion,/every_signed/);assert.equal(schema.properties.protocol.properties.bootstrap_samples.const,10000);assert.equal(template.interventions.length,72);assert.equal(template.claimed.rescue_events,48);
  assert.equal(audit.assistance_integrity.profile_version,"0.2-I1");assert.equal(audit.assistance_integrity.manifest_sha256,template.evidence.controlled_intervention_register_sha256);assert.equal(audit.diagnostics.assistance_minutes_per_100_hours,template.claimed.assistance_minutes_per_100_hours);
  assert.equal(certification.targets.WANTED_LAB.requires.includes("assistance_integrity_0.2-I1"),true);assert.equal(spec.assistance_integrity_profile.uncertainty.samples,10000);assert.equal(spec.developer_resources.assistance_integrity_lab,"/wanted-10k/assistance-integrity");
  assert.equal(leaderboard.admission.includes("assistance_integrity_profile_0.2-I1_passes"),true);assert.equal(prereg.operations.out_of_band_support_permitted,false);
});
test("publishes and reproduces immutable policy evolution",async()=>{
  const responses=await Promise.all([
    request("/wanted-10k/policy-evolution"),request("/wanted-10k/policy-evolution.json","application/json"),request("/wanted-10k/policy-evolution.schema.json","application/json"),request("/wanted-10k/policy-evolution.template.json","application/json"),request("/wanted-10k/audit-manifest.template.json","application/json"),request("/wanted-10k/certification.json","application/json"),request("/wanted-10k/spec.json","application/json"),request("/wanted-10k/leaderboard.json","application/json"),request("/wanted-10k/preregistration.template.json","application/json")
  ]);for(const response of responses)assert.equal(response.status,200);const pageHtml=await responses[0].text();assert.match(pageHtml,/Let it improve/);assert.match(pageHtml,/Frozen algorithm/);assert.match(pageHtml,/SCORE BELONGS TO A DEFINED ROBOT REVISION/);const [contract,schema,template,audit,certification,spec,leaderboard,prereg]=await Promise.all(responses.slice(1).map(response=>response.json()));
  assert.equal(contract.version,"0.2-U1");assert.equal(contract.ranking_effect,"none");assert.equal(schema.properties.protocol.properties.max_global_rollout_lag_hours.const,24);assert.equal(template.artifacts.length,3);assert.equal(template.deployment_segments.length,72);assert.equal(template.claimed.material_update_count,0);
  assert.equal(audit.policy_evolution_integrity.profile_version,"0.2-U1");assert.equal(audit.policy_evolution_integrity.manifest_sha256,template.evidence.controlled_policy_register_sha256);assert.equal(audit.policy_evolution_integrity.baseline_artifact_sha256,audit.robot.policy_artifact_sha256);
  assert.equal(certification.targets.WANTED_LAB.requires.includes("policy_evolution_integrity_0.2-U1"),true);assert.equal(spec.policy_evolution_integrity_profile.rollout.global_atomic_max_hours,24);assert.equal(spec.developer_resources.policy_evolution_lab,"/wanted-10k/policy-evolution");
  assert.equal(leaderboard.admission.includes("policy_evolution_integrity_profile_0.2-U1_passes"),true);assert.equal(leaderboard.ranking.forbidden_tiebreakers.includes("policy_update_count"),true);assert.equal(prereg.software_updates.profile_version,"0.2-U1");assert.equal(prereg.software_updates.unmatched_deployed_artifacts_permitted,false);
});

test("publishes and reproduces privacy and consent integrity",async()=>{
  const responses=await Promise.all([request("/wanted-10k/privacy-integrity"),request("/wanted-10k/privacy-integrity.json","application/json"),request("/wanted-10k/privacy-integrity.schema.json","application/json"),request("/wanted-10k/privacy-integrity.template.json","application/json"),request("/wanted-10k/audit-manifest.template.json","application/json"),request("/wanted-10k/certification.json","application/json"),request("/wanted-10k/spec.json","application/json"),request("/wanted-10k/leaderboard.json","application/json")]);
  for(const response of responses)assert.equal(response.status,200);const pageHtml=await responses[0].text();assert.match(pageHtml,/Life at home/);assert.match(pageHtml,/NOTICE BEFORE SENSING/);assert.match(pageHtml,/BENCHMARK GATE, NOT LEGAL APPROVAL/);const [contract,schema,template,audit,certification,spec,leaderboard]=await Promise.all(responses.slice(1).map(response=>response.json()));
  assert.equal(contract.version,"0.2-PV1");assert.equal(contract.certification_effect,"hard_field_gate");assert.equal(contract.ranking_effect,"none");assert.equal(schema.properties.protocol.properties.raw_media_export_permitted.const,false);assert.equal(template.environments.length,24);assert.equal(template.claimed.raw_export_count,0);assert.equal(template.claimed.guest_notice_coverage,1);assert.equal(template.claimed.sensor_indicator_uptime,1);
  assert.equal(audit.privacy_integrity.profile_version,"0.2-PV1");assert.equal(audit.privacy_integrity.manifest_sha256,template.evidence.controlled_privacy_register_sha256);assert.equal(certification.targets.WANTED_LAB.requires.includes("privacy_integrity_0.2-PV1"),true);assert.equal(spec.privacy_integrity_profile.ranking_effect,"none");assert.equal(spec.developer_resources.privacy_integrity_lab,"/wanted-10k/privacy-integrity");assert.equal(leaderboard.admission.includes("privacy_integrity_profile_0.2-PV1_passes"),true);assert.equal(leaderboard.ranking.forbidden_tiebreakers.includes("privacy_metrics"),true);
});

test("publishes and reproduces complete service continuity",async()=>{
  const responses=await Promise.all([request("/wanted-10k/service-continuity"),request("/wanted-10k/service-continuity.json","application/json"),request("/wanted-10k/service-continuity.schema.json","application/json"),request("/wanted-10k/service-continuity.template.json","application/json"),request("/wanted-10k/audit-manifest.template.json","application/json"),request("/wanted-10k/certification.json","application/json"),request("/wanted-10k/spec.json","application/json"),request("/wanted-10k/leaderboard.json","application/json")]);
  for(const response of responses)assert.equal(response.status,200);const pageHtml=await responses[0].text();assert.match(pageHtml,/Ten thousand hours/);assert.match(pageHtml,/EVERY SECOND HAS A STATE/);assert.match(pageHtml,/INTEGRITY GATE, NOT AN UPTIME SCORE/);const [contract,schema,template,audit,certification,spec,leaderboard]=await Promise.all(responses.slice(1).map(response=>response.json()));
  assert.equal(contract.version,"0.2-SC1");assert.equal(contract.certification_effect,"field_evidence_integrity_gate");assert.equal(contract.ranking_effect,"none");assert.equal(schema.properties.protocol.properties.inclusion_rule.const,"complete_partition_of_every_resident_second");assert.equal(template.environments.length,24);assert.equal(template.claimed.resident_hours,120000);assert.equal(template.claimed.autonomous_available_fraction+.01+.001,1);
  assert.equal(audit.service_continuity.profile_version,"0.2-SC1");assert.equal(audit.service_continuity.manifest_sha256,template.evidence.controlled_service_register_sha256);assert.equal(audit.diagnostics.autonomous_availability,template.claimed.autonomous_available_fraction);assert.equal(certification.targets.WANTED_LAB.requires.includes("service_continuity_0.2-SC1"),true);assert.equal(spec.service_continuity_profile.ranking_effect,"none");assert.equal(spec.developer_resources.service_continuity_lab,"/wanted-10k/service-continuity");assert.equal(leaderboard.admission.includes("service_continuity_profile_0.2-SC1_passes"),true);assert.equal(leaderboard.ranking.forbidden_tiebreakers.includes("service_continuity_metrics"),true);
});

test("publishes and reproduces endpoint adjudication integrity",async()=>{
  const responses=await Promise.all([request("/wanted-10k/endpoint-adjudication"),request("/wanted-10k/endpoint-adjudication.json","application/json"),request("/wanted-10k/endpoint-adjudication.schema.json","application/json"),request("/wanted-10k/endpoint-adjudication.template.json","application/json"),request("/wanted-10k/audit-manifest.template.json","application/json"),request("/wanted-10k/certification.json","application/json"),request("/wanted-10k/spec.json","application/json"),request("/wanted-10k/leaderboard.json","application/json")]);
  for(const response of responses)assert.equal(response.status,200);const pageHtml=await responses[0].text();assert.match(pageHtml,/Before survival analysis/);assert.match(pageHtml,/TWO BLINDED REVIEWS/);assert.match(pageHtml,/NO LABEL, NO SCORE/);const[contract,schema,template,audit,certification,spec,leaderboard]=await Promise.all(responses.slice(1).map(response=>response.json()));
  assert.equal(contract.version,"0.2-J1");assert.match(contract.ranking_effect,/never_score_or_tiebreaker/);assert.equal(schema.properties.protocol.properties.minimum_independent_reviews.const,2);assert.equal(template.records.length,24);assert.equal(template.claimed.voluntary_rejections,4);assert.equal(template.claimed.administrative_completions,8);assert.equal(template.claimed.unresolved_decisions,0);
  assert.equal(audit.adjudication.profile_version,"0.2-J1");assert.equal(audit.adjudication.manifest_sha256,template.evidence.controlled_decision_register_sha256);assert.equal(audit.analysis_reproduction.endpoint_decisions_sha256,audit.adjudication.manifest_sha256);assert.equal(certification.targets.WANTED_WILD.requires.includes("endpoint_adjudication_0.2-J1"),true);assert.equal(spec.endpoint_adjudication.version,"0.2-J1");assert.equal(spec.developer_resources.endpoint_adjudication_lab,"/wanted-10k/endpoint-adjudication");assert.equal(leaderboard.admission.includes("endpoint_adjudication_profile_0.2-J1_passes"),true);assert.equal(leaderboard.ranking.forbidden_tiebreakers.includes("endpoint_review_metrics"),true);
});

test("publishes and enforces preregistration freeze and amendment integrity", async () => {
  const responses = await Promise.all([
    request("/wanted-10k/preregistration-integrity"),
    request("/wanted-10k/preregistration-integrity.json", "application/json"),
    request("/wanted-10k/preregistration-integrity.schema.json", "application/json"),
    request("/wanted-10k/preregistration-integrity.template.json?target=WANTED_WILD", "application/json"),
    request("/wanted-10k/audit-manifest.template.json", "application/json"),
    request("/wanted-10k/certification.json", "application/json"),
    request("/wanted-10k/spec.json", "application/json"),
    request("/wanted-10k/leaderboard.json", "application/json"),
  ]);
  for (const response of responses) assert.equal(response.status, 200);
  const pageHtml = await responses[0].text();
  assert.match(pageHtml, /Prove the rules/);
  assert.match(pageHtml, /APPEND-ONLY PROVENANCE/);
  assert.match(pageHtml, /NO PROSPECTIVE PROOF, NO CONFIRMATORY CLAIM/);
  const [contract, schema, template, audit, certification, spec, leaderboard] = await Promise.all(responses.slice(1).map(response => response.json()));
  assert.equal(contract.version, "0.2-PR1");
  assert.equal(contract.ranking_effect, "eligibility_only_never_score_or_tiebreaker");
  assert.equal(schema.properties.claimed.properties.outcome_informed_amendments.const, 0);
  assert.equal(schema.properties.amendments.items.properties.retroactive_application.const, false);
  assert.equal(template.profile_version, "0.2-PR1");
  assert.equal(template.target_certification, "WANTED_WILD");
  assert.equal(audit.preregistration_integrity.profile_version, "0.2-PR1");
  assert.equal(audit.preregistration_integrity.original_document_sha256, audit.study.preregistration_sha256);
  assert.equal(Object.values(certification.targets).every(target => target.requires.includes("preregistration_integrity_0.2-PR1")), true);
  assert.equal(spec.preregistration_integrity_profile.version, "0.2-PR1");
  assert.equal(spec.developer_resources.preregistration_integrity_lab, "/wanted-10k/preregistration-integrity");
  assert.equal(leaderboard.admission.includes("preregistration_integrity_profile_0.2-PR1_passes"), true);
  assert.equal(leaderboard.ranking.forbidden_tiebreakers.includes("preregistration_amendment_count"), true);
});

test("publishes and enforces complete non-manipulative protocol-deviation handling", async () => {
  const responses = await Promise.all([
    request("/wanted-10k/protocol-deviations"),
    request("/wanted-10k/protocol-deviations.json", "application/json"),
    request("/wanted-10k/protocol-deviations.schema.json", "application/json"),
    request("/wanted-10k/protocol-deviations.template.json?target=WANTED_WILD", "application/json"),
    request("/wanted-10k/audit-manifest.template.json", "application/json"),
    request("/wanted-10k/certification.json", "application/json"),
    request("/wanted-10k/spec.json", "application/json"),
    request("/wanted-10k/leaderboard.json", "application/json"),
  ]);
  for (const response of responses) assert.equal(response.status, 200);
  const pageHtml = await responses[0].text();
  assert.match(pageHtml, /Show every departure/);
  assert.match(pageHtml, /CLOSED RECONCILIATION/);
  assert.match(pageHtml, /NO COMPLETE REGISTER, NO CERTIFICATION CLAIM/);
  const [contract, schema, template, audit, certification, spec, leaderboard] = await Promise.all(responses.slice(1).map(response => response.json()));
  assert.equal(contract.version, "0.2-DV1");
  assert.equal(contract.universal_reporting_deadline_hours, null);
  assert.equal(contract.ranking_effect, "eligibility_only_never_score_or_tiebreaker");
  assert.equal(schema.properties.records.items.properties.excluded_from_primary_analysis.const, false);
  assert.equal(schema.properties.claimed.properties.suppressed_deviations.const, 0);
  assert.equal(template.profile_version, "0.2-DV1");
  assert.equal(template.target_certification, "WANTED_WILD");
  assert.equal(audit.protocol_deviations.profile_version, "0.2-DV1");
  assert.equal(audit.protocol_deviations.preregistration_sha256, audit.study.preregistration_sha256);
  assert.equal(Object.values(certification.targets).every(target => target.requires.includes("protocol_deviation_integrity_0.2-DV1")), true);
  assert.equal(spec.protocol_deviation_integrity_profile.version, "0.2-DV1");
  assert.equal(spec.developer_resources.protocol_deviation_integrity_lab, "/wanted-10k/protocol-deviations");
  assert.equal(leaderboard.admission.includes("protocol_deviation_integrity_profile_0.2-DV1_passes"), true);
  assert.equal(leaderboard.ranking.forbidden_tiebreakers.includes("protocol_deviation_count"), true);
});

test("publishes and enforces prospective sampling and stopping integrity", async () => {
  const responses = await Promise.all([
    request("/wanted-10k/sampling-stopping"),
    request("/wanted-10k/sampling-stopping.json", "application/json"),
    request("/wanted-10k/sampling-stopping.schema.json", "application/json"),
    request("/wanted-10k/sampling-stopping.template.json?target=WANTED_WILD", "application/json"),
    request("/wanted-10k/audit-manifest.template.json", "application/json"),
    request("/wanted-10k/certification.json", "application/json"),
    request("/wanted-10k/spec.json", "application/json"),
    request("/wanted-10k/leaderboard.json", "application/json"),
    request("/wanted-10k/openapi.json", "application/json"),
  ]);
  for (const response of responses) assert.equal(response.status, 200);
  const pageHtml = await responses[0].text();
  assert.match(pageHtml, /Freeze the finish line/);
  assert.match(pageHtml, /DETERMINISTIC CLOSURE/);
  assert.match(pageHtml, /NO FROZEN FINISH LINE, NO CERTIFICATION CLAIM/);
  const [contract, schema, template, audit, certification, spec, leaderboard, openapi] = await Promise.all(responses.slice(1).map(response => response.json()));
  assert.equal(contract.version, "0.2-ST1");
  assert.equal(contract.outcome_adaptive_enrollment_permitted, false);
  assert.equal(schema.properties.execution.properties.primary_outcome_access_events_before_cutoff.const, 0);
  assert.equal(schema.properties.execution.properties.result_informed_early_stops.const, 0);
  assert.equal(template.profile_version, "0.2-ST1");
  assert.equal(template.target_certification, "WANTED_WILD");
  assert.equal(template.plan.planned_units, 24);
  assert.equal(template.plan.planned_exposure_hours, 120000);
  assert.equal(audit.sampling_stopping.profile_version, "0.2-ST1");
  assert.equal(audit.sampling_stopping.preregistration_sha256, audit.study.preregistration_sha256);
  assert.equal(Object.values(certification.targets).every(target => target.requires.includes("sampling_stopping_integrity_0.2-ST1")), true);
  assert.equal(spec.sampling_stopping_integrity_profile.version, "0.2-ST1");
  assert.equal(spec.developer_resources.sampling_stopping_integrity_lab, "/wanted-10k/sampling-stopping");
  assert.equal(spec.certification_handoff.binds.includes("sampling_stopping_integrity_profile_0.2-ST1"), true);
  assert.equal(leaderboard.admission.includes("sampling_stopping_integrity_profile_0.2-ST1_passes"), true);
  assert.equal(leaderboard.ranking.forbidden_tiebreakers.includes("sampling_target_or_overshoot"), true);
  assert.equal(openapi["x-wanted-evidence-profiles"].sampling_stopping_integrity.version, "0.2-ST1");
  assert.equal(openapi["x-wanted-evidence-profiles"].root_commitment_witness.version, "0.2-RC1");
});

test("publishes and reproduces the separate-cohort revealed-preference profile",async()=>{
  const [pageResponse,contractResponse,schemaResponse,templateResponse,specResponse,leaderboardResponse,preregistrationResponse]=await Promise.all([request("/wanted-10k/revealed-preference"),request("/wanted-10k/revealed-preference.json","application/json"),request("/wanted-10k/revealed-preference.schema.json","application/json"),request("/wanted-10k/revealed-preference.template.json","application/json"),request("/wanted-10k/spec.json","application/json"),request("/wanted-10k/leaderboard.json","application/json"),request("/wanted-10k/preregistration.template.json","application/json")]);
  for(const response of [pageResponse,contractResponse,schemaResponse,templateResponse,specResponse,leaderboardResponse,preregistrationResponse])assert.equal(response.status,200);
  const pageHtml=await pageResponse.text();assert.match(pageHtml,/Make the choice real/);assert.match(pageHtml,/SEPARATE COHORT/);assert.match(pageHtml,/PRICE != RANK/);
  const [contract,schema,template,spec,leaderboard,preregistration]=await Promise.all([contractResponse.json(),schemaResponse.json(),templateResponse.json(),specResponse.json(),leaderboardResponse.json(),preregistrationResponse.json()]);
  assert.equal(contract.version,"0.2-RP1");assert.equal(contract.ranking_effect,"none");assert.match(contract.cohort_separation,/never_pooled/);
  assert.deepEqual(schema.properties.protocol.properties.milestones.const,[100,500,1000,2500,5000,7500,10000]);assert.equal(template.claimed.milestone_profiles.length,7);assert.equal(template.declared_due_choices,56);
  assert.equal(spec.revealed_preference_profile.identification.finite_upper_bound_is_open,true);assert.equal(spec.developer_resources.revealed_preference_lab,"/wanted-10k/revealed-preference");
  assert.equal(leaderboard.ranking.forbidden_tiebreakers.includes("reservation_value"),true);assert.equal(leaderboard.disclosure.includes("revealed_preference_0.2-RP1_status_and_10K_interval_when_run"),true);
  assert.equal(preregistration.participant_choice.revealed_preference_substudy.cohort_separate_from_ranked_primary,true);
});

test("publishes cryptographic field-telemetry verification", async () => {
  const [pageResponse, contractResponse, schemaResponse, templateResponse, auditResponse, leaderboardResponse, preregResponse, specResponse] = await Promise.all([
    request("/wanted-10k/conformance"), request("/wanted-10k/telemetry-authenticity.json", "application/json"), request("/wanted-10k/telemetry-key-manifest.schema.json", "application/json"), request("/wanted-10k/telemetry-key-manifest.template.json", "application/json"), request("/wanted-10k/audit-manifest.template.json", "application/json"), request("/wanted-10k/leaderboard.json", "application/json"), request("/wanted-10k/preregistration.template.json", "application/json"), request("/wanted-10k/spec.json", "application/json"),
  ]);
  for (const response of [pageResponse, contractResponse, schemaResponse, templateResponse, auditResponse, leaderboardResponse, preregResponse, specResponse]) assert.equal(response.status, 200);
  const pageHtml = await pageResponse.text();
  assert.match(pageHtml, /Prove who signed/); assert.match(pageHtml, /FROZEN KEY MANIFEST/); assert.match(pageHtml, /TELEMETRY AUTHENTICITY/);
  const [contract, schema, template, audit, leaderboard, prereg, spec] = await Promise.all([contractResponse.json(), schemaResponse.json(), templateResponse.json(), auditResponse.json(), leaderboardResponse.json(), preregResponse.json(), specResponse.json()]);
  assert.equal(contract.version, "0.2-T1"); assert.equal(schema.properties.algorithm.const, "Ed25519"); assert.equal(template.keys[0].public_key_base64url.length, 43); assert.equal(audit.telemetry.profile_version, "0.2-T1"); assert.equal(audit.telemetry.verified_signatures, audit.telemetry.total_events); assert.equal(leaderboard.admission.includes("telemetry_authenticity_profile_0.2-T1_passes"), true); assert.equal(prereg.telemetry.authenticity_profile, "0.2-T1"); assert.equal(spec.telemetry_authenticity_profile.verification_unit, "every_event");
});

test("publishes cryptographic aggregate-audit verification", async () => {
  const [pageResponse, contractResponse, schemaResponse, credentialContractResponse, credentialSchemaResponse, credentialTemplateResponse, auditResponse, certificationResponse, leaderboardResponse, specResponse] = await Promise.all([
    request("/wanted-10k/audit-seal"),
    request("/wanted-10k/audit-seal.json", "application/json"),
    request("/wanted-10k/audit-seal.schema.json", "application/json"),
    request("/wanted-10k/auditor-credential.json", "application/json"),
    request("/wanted-10k/auditor-credential.schema.json", "application/json"),
    request("/wanted-10k/auditor-credential.template.json", "application/json"),
    request("/wanted-10k/audit-manifest.template.json", "application/json"),
    request("/wanted-10k/certification.json", "application/json"),
    request("/wanted-10k/leaderboard.json", "application/json"),
    request("/wanted-10k/spec.json", "application/json"),
  ]);
  for (const response of [pageResponse, contractResponse, schemaResponse, credentialContractResponse, credentialSchemaResponse, credentialTemplateResponse, auditResponse, certificationResponse, leaderboardResponse, specResponse]) assert.equal(response.status, 200);
  const pageHtml = await pageResponse.text();
  assert.match(pageHtml, /Trust the seal/);
  assert.match(pageHtml, /TWO-LAYER TRUST/);
  assert.match(pageHtml, /Then trust the key/);
  const [contract, schema, credentialContract, credentialSchema, credentialTemplate, audit, certification, leaderboard, spec] = await Promise.all([contractResponse.json(), schemaResponse.json(), credentialContractResponse.json(), credentialSchemaResponse.json(), credentialTemplateResponse.json(), auditResponse.json(), certificationResponse.json(), leaderboardResponse.json(), specResponse.json()]);
  assert.equal(contract.version, "0.2-V1");
  assert.equal(contract.algorithm, "Ed25519");
  assert.equal(schema.properties.profile_version.const, "0.2-V1");
  assert.equal(audit.audit.profile_version, "0.2-V1");
  assert.equal(audit.audit.auditor_signature.length, 86);
  assert.equal(audit.audit.manifest_sha256.length, 64);
  assert.equal(credentialContract.version, "0.2-V2");
  assert.equal(credentialContract.bundled_root, "synthetic_test_only");
  assert.equal(credentialSchema.properties.profile_version.const, "0.2-V2");
  assert.equal(credentialTemplate.credential_sha256, audit.audit.credential.credential_sha256);
  assert.equal(credentialTemplate.issuer_signature.length, 86);
  assert.equal(certification.targets.PREQUALIFIED.requires.includes("independent_audit_seal_0.2-V1"), true);
  assert.equal(certification.targets.PREQUALIFIED.requires.includes("auditor_credential_0.2-V2"), true);
  assert.equal(leaderboard.admission.includes("independent_audit_seal_profile_0.2-V1_passes"), true);
  assert.equal(leaderboard.admission.includes("auditor_credential_profile_0.2-V2_passes"), true);
  assert.equal(spec.independent_audit_seal_profile.version, "0.2-V1");
  assert.equal(spec.auditor_credential_profile.version, "0.2-V2");
  assert.equal(spec.developer_resources.audit_seal_verifier, "/wanted-10k/audit-seal");
  assert.equal(spec.developer_resources.auditor_credential_template, "/wanted-10k/auditor-credential.template.json");
});

test("serves the portable audit-verifier SDK and trust-root contracts", async () => {
  const [pageResponse, moduleResponse, contractResponse, rootSchemaResponse, rootTemplateResponse, specResponse] = await Promise.all([
    request("/wanted-10k/audit-sdk"),
    request("/wanted-10k/wanted-audit-verifier.mjs", "text/javascript"),
    request("/wanted-10k/audit-verifier-sdk.json", "application/json"),
    request("/wanted-10k/auditor-trust-root.schema.json", "application/json"),
    request("/wanted-10k/auditor-trust-root.template.json", "application/json"),
    request("/wanted-10k/spec.json", "application/json"),
  ]);
  for (const response of [pageResponse, moduleResponse, contractResponse, rootSchemaResponse, rootTemplateResponse, specResponse]) assert.equal(response.status, 200);
  const pageHtml = await pageResponse.text();
  assert.match(pageHtml, /Fourteen checks/);
  assert.match(pageHtml, /Production trust/);
  assert.match(pageHtml, /OFFICIAL MODE/);
  const source = await moduleResponse.text();
  const portable = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const sampleResponse = await request("/wanted-10k/audit-manifest.template.json", "application/json");
  const result = await portable.verifyAuditPackage(await sampleResponse.json());
  assert.equal(result.status, "pass");
  assert.equal(result.seal.checks.length + result.credential.checks.length, 14);
  const [contract, schema, root, spec] = await Promise.all([contractResponse.json(), rootSchemaResponse.json(), rootTemplateResponse.json(), specResponse.json()]);
  assert.equal(contract.version, "0.2-VS1");
  assert.equal(contract.source_sha256, createHash("sha256").update(source).digest("hex"));
  assert.equal(schema.additionalProperties, false);
  assert.equal(root.registry_environment, "synthetic_test");
  assert.equal(spec.audit_verifier_sdk_profile.performs_network_requests, false);
  assert.equal(spec.developer_resources.audit_verifier_module, "/wanted-10k/wanted-audit-verifier.mjs");
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
  assert.match(pageHtml, /AUDIT SEAL 0\.2-V1/);
  assert.match(pageHtml, /AUDITOR CREDENTIAL 0\.2-V2/);
  const [contract, templates, schema, spec] = await Promise.all([contractResponse.json(), templatesResponse.json(), schemaResponse.json(), specResponse.json()]);
  assert.equal(contract.version, "0.2-C1");
  assert.equal(contract.ranking.only_target, "WANTED_WILD");
  assert.equal(templates.certification_profile_version, "0.2-C1");
  assert.deepEqual(Object.keys(templates.templates), ["PREQUALIFIED", "WANTED_LAB", "WANTED_WILD", "WANTED_10K"]);
  assert.equal(templates.templates.PREQUALIFIED.primary.applicable, false);
  assert.equal(templates.templates.WANTED_10K.primary.applicable, false);
  assert.equal(schema.allOf.length, 8);
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
  assert.match(pageHtml, /ADJUDICATED \+ REPRODUCED W/);
  assert.match(pageHtml, /href="\/wanted-10k\/endpoint-adjudication"/);
  assert.match(pageHtml, /href="\/wanted-10k\/preregistration-integrity"/);
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

test("ships an executable adapter that produces one conformant six-event chain", async () => {
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
  assert.match(pageHtml, /ENDPOINT ADJUDICATION/);
  assert.match(pageHtml, /href="\/wanted-10k\/endpoint-adjudication"/);
  assert.match(pageHtml, /href="\/wanted-10k\/preregistration-integrity"/);
  assert.match(pageHtml, /href="\/wanted-10k\/wanted-telemetry-verifier\.mjs"/);
  assert.match(pageHtml, /TELEMETRY VERIFIER/);

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
    wanted.lifecycle("activation", { participant_acceptance_ref: "controlled://acceptance/1", activation_record_sha256: "ab0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd" }),
    wanted.state("available", { autonomous_service_capable: true }),
    wanted.request("task", { evidence_ref: "local://request/1" }),
    wanted.action("bring water", { proactive: false }),
    wanted.intervention("remote_guidance", 18, "recovery"),
    wanted.incident("L1", "Brief hallway obstruction", { participant_requested_stop: false }),
  ]);
  assert.deepEqual(events.map(event => event.sequence), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(new Set(events.map(event => event.type)), new Set(["DEPLOYMENT_LIFECYCLE", "ROBOT_STATE", "HUMAN_REQUEST", "ROBOT_ACTION", "HUMAN_INTERVENTION", "INCIDENT"]));
  const independentCanonicalize = value => value === null || typeof value !== "object" ? JSON.stringify(value) : Array.isArray(value) ? `[${value.map(independentCanonicalize).join(",")}]` : `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${independentCanonicalize(value[key])}`).join(",")}}`;
  for (let index = 1; index < events.length; index++) {
    const expected = createHash("sha256").update(independentCanonicalize(events[index - 1])).digest("hex");
    assert.equal(events[index].previous_event_hash, expected);
  }
  const checkpoint = { next_sequence: 6, previous_event_hash: createHash("sha256").update(independentCanonicalize(events[5])).digest("hex"), last_occurred_at: "2026-08-28T18:05:00.000Z" };
  assert.deepEqual(wanted.checkpoint(), checkpoint);
  const resumedEvents = [];
  const resumed = new sdk.WantedClient({ deploymentId: "dep_test_001", environmentId: "env_test_001", robotId: "robot_test_001", signingKeyId: "key_test_001", checkpoint, sign: async () => new Uint8Array(64).fill(8), sink: async event => resumedEvents.push(event), eventId: () => "evt_test_006" });
  await resumed.state("charging", {}, "2026-08-28T18:06:00Z");
  assert.equal(resumedEvents[0].sequence, 6);
  assert.equal(resumedEvents[0].previous_event_hash, checkpoint.previous_event_hash);
  await resumed.lifecycle("end", { disposition: "observation_cutoff", evidence_ref: "controlled://cutoff/1" }, "2026-08-28T18:07:00Z");
  assert.equal(resumedEvents[1].sequence, 7);

  const invalidGenesis = new sdk.WantedClient({ deploymentId: "dep_invalid_001", environmentId: "env_invalid_001", robotId: "robot_invalid_001", signingKeyId: "key_invalid_001", sign: async () => new Uint8Array(64).fill(3), sink: async () => undefined });
  await assert.rejects(invalidGenesis.state("available"), /sequence zero/);
  const wrongSignatureSize = new sdk.WantedClient({ deploymentId: "dep_bad_signature_001", environmentId: "env_bad_signature_001", robotId: "robot_bad_signature_001", signingKeyId: "key_bad_signature_001", sign: async () => new Uint8Array(32), sink: async () => undefined });
  await assert.rejects(wrongSignatureSize.lifecycle("activation", { participant_acceptance_ref: "controlled://acceptance/bad-signature", activation_record_sha256: "ab0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd" }), /64-byte Ed25519 signature/);

  let sinkAttempts = 0;
  const retryEvents = [];
  const retrying = new sdk.WantedClient({ deploymentId: "dep_retry_001", environmentId: "env_retry_001", robotId: "robot_retry_001", signingKeyId: "key_retry_001", sign: async () => new Uint8Array(64).fill(9), eventId: () => `evt_retry_${sinkAttempts}`, sink: async event => { sinkAttempts++; if (sinkAttempts === 1) throw new Error("offline"); retryEvents.push(event); } });
  await assert.rejects(retrying.lifecycle("activation", { participant_acceptance_ref: "controlled://acceptance/retry", activation_record_sha256: "ab0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd" }), /offline/);
  await retrying.lifecycle("activation", { participant_acceptance_ref: "controlled://acceptance/retry", activation_record_sha256: "ab0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd" });
  assert.equal(retryEvents[0].sequence, 0);
  assert.equal(retrying.checkpoint().next_sequence, 1);
  await assert.rejects(retrying.action("invalid number", { score: Number.NaN }), /non-finite/);
  const [schema, template, openapi, spec] = await Promise.all([schemaResponse.json(), templateResponse.json(), openapiResponse.json(), specResponse.json()]);
  assert.equal(schema.properties.protocol_version.const, "0.2");
  assert.equal(template.checkpoint.recovery_tested, true);
  assert.equal(template.signing.authenticity_profile, "0.2-T1");
  assert.ok(openapi.paths["/v1/deployments/{deployment_id}/tail"]);
  assert.equal(openapi["x-wanted-evidence-profiles"].protocol_deviation_integrity.version, "0.2-DV1");
  assert.equal(openapi["x-wanted-evidence-profiles"].protocol_deviation_integrity.schema, "/wanted-10k/protocol-deviations.schema.json");
  assert.equal(openapi["x-wanted-evidence-profiles"].sampling_stopping_integrity.version, "0.2-ST1");
  assert.equal(openapi["x-wanted-certification"].target_templates, "/wanted-10k/certification-templates.json");
  assert.equal(openapi["x-wanted-audit-verifier"].performs_network_requests, false);
  assert.equal(openapi["x-wanted-telemetry-verifier"].version, "0.2-TS4");
  assert.equal(openapi["x-wanted-telemetry-verifier"].performs_network_requests, false);
  assert.equal(openapi["x-wanted-telemetry-verifier"].cli_exit_codes.verification_failed, 1);
  assert.equal(openapi["x-wanted-telemetry-verifier"].reports.aggregate, "0.2-TA1");
  assert.equal(openapi["x-wanted-telemetry-verifier"].reports.exposure_reconciliation, "0.2-TX1");
  assert.equal(openapi["x-wanted-telemetry-verifier"].reports.audit_handoff, "exact_audit_manifest.telemetry_shape_with_exposure_binding");
  assert.equal(spec.developer_resources.reference_sdk, "/wanted-10k/wanted-sdk.mjs");
  assert.equal(spec.developer_resources.telemetry_verifier_module, "/wanted-10k/wanted-telemetry-verifier.mjs");
  assert.equal(spec.telemetry_verifier_sdk_profile.version, "0.2-TS4");
  assert.equal(spec.telemetry_verifier_sdk_profile.cli.exit_codes.usage_or_IO_error, 2);
  assert.equal(spec.telemetry_verifier_sdk_profile.reports.audit_handoff, "exact_audit_manifest.telemetry_shape_with_exposure_binding");
  assert.equal(spec.mandatory_events[0], "DEPLOYMENT_LIFECYCLE");
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
  assert.equal(eventSchema.properties.signature.pattern, "^[A-Za-z0-9_-]{86}$");
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
  assert.match(source, /def validate_rows/);
  assert.match(source, /duplicate environment identifier/);
  assert.match(source, /must not have leading or trailing whitespace/);
  assert.match(source, /def _wanted_summary_unchecked/);
  assert.match(source, /def confidence_summary/);
  assert.match(source, /unrelated censoring at 10,000 hours is invalid/);
  assert.match(source, /retained_at_10000/);
});

test("publishes normative A2 analysis conformance vectors and executable runner", async () => {
  const [vectorsResponse, schemaResponse, contractResponse, runnerResponse, runnerContractResponse, pageResponse, openapiResponse, specResponse] = await Promise.all([
    request("/wanted-10k/analysis-conformance-vectors.json", "application/json"),
    request("/wanted-10k/analysis-conformance-vectors.schema.json", "application/json"),
    request("/wanted-10k/analysis-reproduction.json", "application/json"),
    request("/wanted-10k/wanted-analysis-conformance.mjs", "text/javascript"),
    request("/wanted-10k/analysis-conformance-sdk.json", "application/json"),
    request("/wanted-10k/analysis-reproduction"),
    request("/wanted-10k/openapi.json", "application/json"),
    request("/wanted-10k/spec.json", "application/json"),
  ]);
  for (const response of [vectorsResponse, schemaResponse, contractResponse, runnerResponse, runnerContractResponse, pageResponse, openapiResponse, specResponse]) assert.equal(response.status, 200);
  const [vectors, schema, contract, runnerSource, runnerContract, pageHtml, openapi, spec] = await Promise.all([
    vectorsResponse.json(),
    schemaResponse.json(),
    contractResponse.json(),
    runnerResponse.text(),
    runnerContractResponse.json(),
    pageResponse.text(),
    openapiResponse.json(),
    specResponse.json(),
  ]);
  assert.equal(vectors.version, "0.2-AC4");
  assert.equal(vectors.analysis_profile_version, "0.2-A2");
  assert.equal(vectors.vectors.length, 9);
  assert.equal(schema.properties.version.const, "0.2-AC4");
  assert.equal(contract.conformance_profile, "0.2-AC4");
  assert.equal(contract.conformance_vectors, "/wanted-10k/analysis-conformance-vectors.json");
  assert.match(runnerSource, /runWantedAnalysisConformance/);
  assert.equal(runnerContract.version, "0.2-ACS4");
  assert.equal(runnerContract.source_sha256, createHash("sha256").update(runnerSource).digest("hex"));
  assert.equal(runnerContract.vector_pack_sha256, createHash("sha256").update(JSON.stringify(vectors)).digest("hex"));
  assert.match(pageHtml, /Import once/);
  assert.match(pageHtml, /href="\/wanted-10k\/wanted-analysis-conformance\.mjs"/);
  assert.equal(openapi["x-wanted-analysis-conformance"].runner_version, "0.2-ACS4");
  assert.equal(openapi["x-wanted-analysis-conformance"].vector_pack_sha256, runnerContract.vector_pack_sha256);
  assert.equal(spec.analysis_conformance_profile.version, "0.2-AC4");
  assert.equal(spec.analysis_conformance_profile.runner_version, "0.2-ACS4");
  assert.match(spec.primary_score.terminal_competing_cause_rule,/refuse_primary_W/);
  assert.equal(spec.analysis_conformance_profile.vector_pack_sha256, runnerContract.vector_pack_sha256);
  assert.equal(spec.developer_resources.analysis_conformance_vectors, "/wanted-10k/analysis-conformance-vectors.json");
  assert.equal(spec.developer_resources.analysis_conformance_runner, "/wanted-10k/wanted-analysis-conformance.mjs");
});

test("serves the local conformance checker and corrected score lab", async () => {
  const conformance = await request("/wanted-10k/conformance");
  assert.equal(conformance.status, 200);
  const conformanceHtml = await conformance.text();
  assert.match(conformanceHtml, /Prove who signed/);
  assert.match(conformanceHtml, /TELEMETRY AUTHENTICITY/);

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
  assert.match(pageHtml, /Adjudicate endpoints/);
  assert.match(pageHtml, /href="\/wanted-10k\/endpoint-adjudication"/);
  const [schema, template, spec] = await Promise.all([schemaResponse.json(), templateResponse.json(), specResponse.json()]);
  assert.equal(schema.properties.protocol_version.const, "0.2");
  assert.equal(template.protocol_version, "0.2");
  assert.equal(template.submission_mode, "test");
  assert.equal(template.privacy.participant_data_included, false);
  assert.equal(template.telemetry.profile_version, "0.2-T1");
  assert.equal(template.telemetry.invalid_signatures, 0);
  assert.equal(template.audit.profile_version, "0.2-V1");
  assert.equal(template.audit.auditor_signature.length, 86);
  assert.equal(template.audit.credential.profile_version, "0.2-V2");
  assert.equal(template.audit.credential.registry_environment, "synthetic_test");
  assert.equal(template.withdrawal.profile_version, "0.2-W1");
  assert.equal(template.preregistration_integrity.profile_version, "0.2-PR1");
  assert.equal(template.preregistration_integrity.original_document_sha256, template.study.preregistration_sha256);
  assert.equal(template.protocol_deviations.profile_version, "0.2-DV1");
  assert.equal(template.protocol_deviations.preregistration_sha256, template.study.preregistration_sha256);
  assert.equal(template.sampling_stopping.profile_version, "0.2-ST1");
  assert.equal(template.sampling_stopping.preregistration_sha256, template.study.preregistration_sha256);
  assert.equal("audit_seal_verified" in template, false);
  assert.equal(spec.certification_handoff.participant_data_permitted, false);
  assert.equal(spec.certification_handoff.binds.includes("independent_audit_seal_0.2-V1"), true);
  assert.equal(spec.certification_handoff.binds.includes("auditor_credential_0.2-V2"), true);
  assert.equal(spec.certification_handoff.binds.includes("preregistration_integrity_profile_0.2-PR1"), true);
  assert.equal(spec.certification_handoff.binds.includes("protocol_deviation_integrity_profile_0.2-DV1"), true);
  assert.equal(spec.certification_handoff.binds.includes("sampling_stopping_integrity_profile_0.2-ST1"), true);
  assert.equal(spec.developer_resources.audit_pack, "/wanted-10k/audit");
});

import assert from "node:assert/strict";
import test from "node:test";
import { rankRegistry } from "../app/wanted-10k/leaderboard/registry.ts";
import { models } from "../app/leaderboard/models.ts";
import { selectModels, scoreRank } from "../app/leaderboard/explorer.ts";

const explorerDefaults = { query: "", environment: "all", openOnly: false, sort: "overall", ascending: false };
test("model explorer combines filters, handles no matches, and preserves shared fixtures", () => {
  const original = structuredClone(models);
  assert.deepEqual(selectModels(models, { ...explorerDefaults, environment: "SIM", openOnly: true }).map(model => model.name), ["RoboBrain 2.0"]);
  assert.equal(selectModels(models, { ...explorerDefaults, query: "  NVIDIA " })[0].name, "GR00T N1.6");
  assert.equal(selectModels(models, { ...explorerDefaults, query: "nothing matches" }).length, 0);
  assert.equal(selectModels(models, { ...explorerDefaults, sort: "navigation" })[0].name, "GR00T N1.6");
  assert.equal(selectModels(models, { ...explorerDefaults, sort: "reasoning", ascending: true })[0].name, "SmolVLA");
  assert.deepEqual(models, original);
});
test("model ranks remain score-based after name sorting and ties share a rank", () => {
  const rows = selectModels(models, { ...explorerDefaults, sort: "name", ascending: true });
  assert.equal(scoreRank(models[0], rows, "overall"), 1);
  const tied = [models[0], { ...models[1], overall: models[0].overall }, models[2]];
  assert.deepEqual(tied.map(model => scoreRank(model, tied, "overall")), [1, 1, 3]);
  assert.equal(scoreRank(models[2], [models[2]], "overall"), 1);
});

const hash = prefix => `${prefix}${"0123456789abcdef".repeat(4)}`.slice(0,64);
const entry = (submission_id, public_label, wanted_score, overrides = {}) => ({
  preregistration_integrity_verified:true, preregistration_amendment_count:2, preregistration_post_activity_amendments:1, preregistration_outcome_informed_amendments:0, preregistration_retroactive_amendments:0, preregistration_material_amendments_in_same_claim:0, preregistration_chain_breaks:0,
  sampling_stopping_integrity_verified:true, sampling_planned_units:24, sampling_actual_units:24, sampling_operational_overshoot_units:0, sampling_planned_exposure_hours:120000, sampling_actual_exposure_hours:120000, sampling_primary_outcome_access_before_cutoff:0, sampling_unscheduled_primary_analyses:0, sampling_result_informed_extensions:0, sampling_result_informed_early_stops:0, sampling_target_changes_after_activity:0, sampling_cutoff_changes_after_activity:0, sampling_excluded_activated_units:0, sampling_excluded_overshoot_units:0,
  protocol_deviation_integrity_verified:true, protocol_deviation_count:2, protocol_deviation_important_count:1, protocol_deviation_unresolved_important:0, protocol_deviation_suppressed:0, protocol_deviation_primary_exclusions:0, protocol_deviation_resident_seconds_deducted:0, protocol_deviation_endpoint_reclassifications:0, protocol_deviation_outcome_informed:0,
  endpoint_adjudication_verified:true, endpoint_voluntary_rejections:4, endpoint_administrative_completions:8, endpoint_censors:12, endpoint_terminal_competing_causes:0, endpoint_unresolved_decisions:0,
  site_heterogeneity_verified:true, site_count:3, smallest_site_n:8, maximum_site_share:1/3, identifiable_site_count:3, site_wanted_min:81.25, site_wanted_max:90.625, site_wanted_range:9.375, leave_one_site_out_maximum_absolute_shift:3.125, site_leave_one_out_unidentifiable:0,
  root_envelope_integrity_verified:true, root_envelope_verification_profile:"0.2-REB1", root_envelope_count:1000,
  registry_profile_version: "0.2-L1", submission_id, study_id: `study-${submission_id}`, cohort_id: `cohort-${submission_id}`, public_label, manufacturer: "Example Robotics", model: "H1", hardware_version: "1.0", policy_version: "1.0", policy_artifact_sha256: hash("a1"), certifications: ["PREQUALIFIED", "WANTED_LAB", "WANTED_WILD"], registry_status: "active", wanted_score, ci95_lower: Math.max(0, wanted_score - 5), ci95_upper: Math.min(100, wanted_score + 5), survival_at_10000: .6, independent_environments: 24, total_resident_hours: 120000, support_at_10000: 8, horizon_rejections: 0, retained_at_10000: 8, censoring_bound_width: 12.4, assistance_minutes_per_100_hours: 18.2, assistance_integrity_verified: true, assistance_ci95_lower: 15, assistance_ci95_upper: 21, assisted_exposure_fraction: .003, participant_labor_minutes_per_100_hours: 2.1, teleoperation_minutes_per_100_hours: 4.2, maintenance_minutes_per_100_hours: 7.4, researcher_contact_minutes_per_100_hours: 0, human_rescue_events: 280, policy_evolution_integrity_verified:true, policy_artifact_count:3, policy_change_event_count:2, policy_changed_exposure_fraction:.8, policy_safety_hotfix_count:1, policy_rollback_count:0, policy_longest_rollout_lag_hours:.4, policy_material_update_count:0, policy_revision_intact:true, privacy_integrity_verified:true, privacy_raw_export_count:0, privacy_guest_notice_coverage:1, privacy_rights_completion_rate:1, privacy_sensor_indicator_uptime:1, privacy_unauthorized_access_count:0, privacy_unresolved_material_incidents:0, service_continuity_verified:true, service_autonomous_available_fraction:.989, service_degraded_fraction:.01, service_unavailable_fraction:.001, service_unplanned_downtime_hours:120, service_unplanned_outage_count:24, service_longest_unplanned_outage_hours:5, service_participant_maintenance_minutes_per_100_hours:.02, service_technician_minutes_per_100_hours:.06, service_technician_visit_count:24, service_replacement_part_count:8, service_consumable_unit_count:24, service_cloud_dependency_downtime_hours:30, human_measure_completion_rate: .92, human_keep_rate: .84, human_value_median: 1, human_burden_median: 1, human_trust_median: 3, learning_generalization_verified: true, learning_paired_environments: 23, learning_trial_completion_rate: .995, learning_delta_familiar: .18, learning_delta_ci95_lower: .08, learning_delta_ci95_upper: .28, late_generalization_ratio: .86, revealed_preference: { status: "not_run" }, mean_time_between_human_rescue_hours: 428.57, mean_time_between_human_rescue_lower_bound_hours: null, l4_incidents: 0, safety_gate_status: "passed", audit_manifest_uri: `https://example.org/${submission_id}.json`, audit_manifest_sha256: hash("b2"), audit_signed_at: "2026-08-28T18:00:00Z", published_at: "2026-08-28T19:00:00Z", supersedes_submission_id: null, ...overrides,
});

test("ranks by displayed W and preserves competition ties", () => {
  const result = rankRegistry([entry("s1", "Zulu", 74.64), entry("s2", "Alpha", 74.61), entry("s3", "Beta", 73.94)]);
  assert.deepEqual(result.ranked.map(row => [row.public_label, row.displayed_wanted_score, row.rank, row.tied]), [["Alpha",74.6,1,true],["Zulu",74.6,1,true],["Beta",73.9,3,false]]);
  assert.equal(result.excluded.length, 0);
});

test("does not use safety, burden, preference value, or badges as tiebreakers", () => {
  const preference={status:"passed",profile_version:"0.2-RP1",currency:"USD",unit_amount:25,completed_choices_at_10000:8,reservation_median_lower_units:4,reservation_median_upper_units:32,manifest_uri:"https://example.org/preference.json",manifest_sha256:hash("c3")};
  const result = rankRegistry([entry("s1", "Alpha", 80.01, { assistance_minutes_per_100_hours: 200, assistance_ci95_lower:150, assistance_ci95_upper:250, human_keep_rate: .2, revealed_preference: preference }), entry("s2", "Beta", 80.04, { assistance_minutes_per_100_hours: 1, assistance_ci95_lower:.5, assistance_ci95_upper:1.5, human_keep_rate: 1, certifications: ["PREQUALIFIED", "WANTED_LAB", "WANTED_WILD", "WANTED_10K"] })]);
  assert.deepEqual(result.ranked.map(row => [row.public_label,row.rank]), [["Alpha",1],["Beta",1]]);
});

test("requires site heterogeneity but never uses site diagnostics to break W ties",()=>{
  const dominated=entry("dominated","Dominated",75,{maximum_site_share:.75});
  let result=rankRegistry([dominated]);
  assert.equal(result.ranked.length,0);
  assert.match(result.excluded[0].reasons.join(" "),/0.2-SH1/);
  const tie=rankRegistry([
    entry("stable","Alpha",80.01,{site_wanted_min:79,site_wanted_max:81,site_wanted_range:2,leave_one_site_out_maximum_absolute_shift:1}),
    entry("variable","Beta",80.04,{site_wanted_min:55,site_wanted_max:95,site_wanted_range:40,leave_one_site_out_maximum_absolute_shift:18}),
  ]);
  assert.deepEqual(tie.ranked.map(row=>[row.public_label,row.rank]),[["Alpha",1],["Beta",1]]);
});

test("excludes non-WILD, unsafe, and ambiguous active revisions", () => {
  const lab = entry("lab", "Lab only", 90, { certifications: ["PREQUALIFIED", "WANTED_LAB"] });
  const unsafe = entry("unsafe", "Unsafe", 95, { l4_incidents: 1 });
  const duplicateA = entry("dup-a", "Duplicate A", 70, { study_id: "shared", cohort_id: "shared" });
  const duplicateB = entry("dup-b", "Duplicate B", 71, { study_id: "shared", cohort_id: "shared" });
  const result = rankRegistry([lab, unsafe, duplicateA, duplicateB]);
  assert.equal(result.ranked.length, 0);
  assert.equal(result.excluded.length, 4);
  assert.match(result.excluded.find(row => row.submission_id === "lab").reasons.join(" "), /WANTED_WILD/);
  assert.match(result.excluded.find(row => row.submission_id === "unsafe").reasons.join(" "), /safety gate/);
  assert.match(result.excluded.find(row => row.submission_id === "dup-a").reasons.join(" "), /Multiple active revisions/);
});

test("requires a coherent optional revealed-preference disclosure",()=>{
  const malformed=entry("bad-preference","Bad preference",75,{revealed_preference:{status:"passed",profile_version:"0.2-RP1",currency:"USD",unit_amount:25,completed_choices_at_10000:3,reservation_median_lower_units:8,reservation_median_upper_units:4,manifest_uri:"https://example.org/preference.json",manifest_sha256:hash("c3")}});
  const result=rankRegistry([malformed]);
  assert.equal(result.ranked.length,0);
  assert.match(result.excluded[0].reasons.join(" "),/coherent 10K set bounds/);
});

test("requires matched learning evidence but never uses it to break W ties",()=>{
  const malformed=entry("bad-learning","Bad learning",75,{learning_delta_ci95_lower:.4,learning_delta_familiar:.2});
  const result=rankRegistry([malformed]);
  assert.equal(result.ranked.length,0);
  assert.match(result.excluded[0].reasons.join(" "),/0.2-LG1/);
  const tie=rankRegistry([entry("slow","Alpha",80.01,{learning_delta_familiar:.1}),entry("fast","Beta",80.04,{learning_delta_familiar:.25})]);
  assert.deepEqual(tie.ranked.map(row=>[row.public_label,row.rank]),[["Alpha",1],["Beta",1]]);
});

test("requires assistance integrity and exact rescue-frequency disclosure",()=>{
  const malformed=entry("bad-assistance","Bad assistance",75,{assistance_ci95_lower:30});
  let result=rankRegistry([malformed]);assert.equal(result.ranked.length,0);assert.match(result.excluded[0].reasons.join(" "),/0.2-I1/);
  const wrongRescue=entry("bad-rescue","Bad rescue",75,{human_rescue_events:10});result=rankRegistry([wrongRescue]);assert.equal(result.ranked.length,0);assert.match(result.excluded[0].reasons.join(" "),/MTBHR/);
});
test("requires policy-evolution integrity but never uses update history to break W ties",()=>{const malformed=entry("bad-policy","Bad policy",75,{policy_material_update_count:1,policy_revision_intact:false});let result=rankRegistry([malformed]);assert.equal(result.ranked.length,0);assert.match(result.excluded[0].reasons.join(" "),/0.2-U1/);const tie=rankRegistry([entry("few","Alpha",80.01,{policy_change_event_count:0,policy_changed_exposure_fraction:0}),entry("many","Beta",80.04,{policy_change_event_count:8,policy_changed_exposure_fraction:.95})]);assert.deepEqual(tie.ranked.map(row=>[row.public_label,row.rank]),[["Alpha",1],["Beta",1]])});
test("requires service-continuity integrity but never uses uptime to break W ties",()=>{const malformed=entry("bad-service","Bad service",75,{service_autonomous_available_fraction:.95,service_degraded_fraction:.01,service_unavailable_fraction:.01});let result=rankRegistry([malformed]);assert.equal(result.ranked.length,0);assert.match(result.excluded[0].reasons.join(" "),/0.2-SC1/);const tie=rankRegistry([entry("low","Alpha",80.01,{service_autonomous_available_fraction:.9,service_degraded_fraction:.05,service_unavailable_fraction:.05,service_unplanned_downtime_hours:6000,service_longest_unplanned_outage_hours:5000}),entry("high","Beta",80.04,{service_autonomous_available_fraction:.999,service_degraded_fraction:.0005,service_unavailable_fraction:.0005,service_unplanned_downtime_hours:60,service_longest_unplanned_outage_hours:5})]);assert.deepEqual(tie.ranked.map(row=>[row.public_label,row.rank]),[["Alpha",1],["Beta",1]])});
test("requires endpoint adjudication but never uses review metrics to break W ties",()=>{const malformed=entry("bad-endpoint","Bad endpoint",75,{endpoint_unresolved_decisions:1});let result=rankRegistry([malformed]);assert.equal(result.ranked.length,0);assert.match(result.excluded[0].reasons.join(" "),/0.2-J1/);const tie=rankRegistry([entry("few","Alpha",80.01,{endpoint_voluntary_rejections:2,endpoint_censors:14}),entry("many","Beta",80.04,{endpoint_voluntary_rejections:8,endpoint_censors:8})]);assert.deepEqual(tie.ranked.map(row=>[row.public_label,row.rank]),[["Alpha",1],["Beta",1]])});
test("accepts an exact-horizon rejection when the public risk-set identity holds",()=>{const result=rankRegistry([entry("boundary","Boundary",75,{endpoint_voluntary_rejections:5,endpoint_administrative_completions:7,endpoint_censors:12,horizon_rejections:1,retained_at_10000:7})]);assert.equal(result.ranked.length,1);assert.equal(result.excluded.length,0)});
test("requires preregistration integrity but never uses amendment count to break W ties",()=>{const malformed=entry("bad-prereg","Bad preregistration",75,{preregistration_outcome_informed_amendments:1});let result=rankRegistry([malformed]);assert.equal(result.ranked.length,0);assert.match(result.excluded[0].reasons.join(" "),/0.2-PR1/);const tie=rankRegistry([entry("few","Alpha",80.01,{preregistration_amendment_count:0,preregistration_post_activity_amendments:0}),entry("many","Beta",80.04,{preregistration_amendment_count:12,preregistration_post_activity_amendments:10})]);assert.deepEqual(tie.ranked.map(row=>[row.public_label,row.rank]),[["Alpha",1],["Beta",1]])});
test("requires sampling and stopping integrity but never uses target or overshoot to break W ties",()=>{const malformed=entry("bad-stop","Bad stop",75,{sampling_primary_outcome_access_before_cutoff:1});let result=rankRegistry([malformed]);assert.equal(result.ranked.length,0);assert.match(result.excluded[0].reasons.join(" "),/0.2-ST1/);const tie=rankRegistry([entry("planned","Alpha",80.01),entry("overshoot","Beta",80.04,{sampling_planned_units:23,sampling_operational_overshoot_units:1})]);assert.deepEqual(tie.ranked.map(row=>[row.public_label,row.rank]),[["Alpha",1],["Beta",1]])});
test("requires deviation integrity but never uses deviation count to break W ties",()=>{const malformed=entry("bad-deviation","Bad deviation",75,{protocol_deviation_suppressed:1});let result=rankRegistry([malformed]);assert.equal(result.ranked.length,0);assert.match(result.excluded[0].reasons.join(" "),/0.2-DV1/);const tie=rankRegistry([entry("few-deviations","Alpha",80.01,{protocol_deviation_count:0,protocol_deviation_important_count:0}),entry("many-deviations","Beta",80.04,{protocol_deviation_count:12,protocol_deviation_important_count:8})]);assert.deepEqual(tie.ranked.map(row=>[row.public_label,row.rank]),[["Alpha",1],["Beta",1]])});
test("requires batch-verified root-envelope integrity but never uses envelope count to break W ties",()=>{const malformed=entry("bad-envelope","Bad envelope",75,{root_envelope_integrity_verified:false});let result=rankRegistry([malformed]);assert.equal(result.ranked.length,0);assert.match(result.excluded[0].reasons.join(" "),/0.2-REB1/);const legacy=entry("legacy-series","Legacy series",75,{root_envelope_verification_profile:"0.2-RES1"});result=rankRegistry([legacy]);assert.equal(result.ranked.length,0);assert.match(result.excluded[0].reasons.join(" "),/0.2-REB1/);const tie=rankRegistry([entry("few-envelopes","Alpha",80.01,{root_envelope_count:24}),entry("many-envelopes","Beta",80.04,{root_envelope_count:5000})]);assert.deepEqual(tie.ranked.map(row=>[row.public_label,row.rank]),[["Alpha",1],["Beta",1]])});

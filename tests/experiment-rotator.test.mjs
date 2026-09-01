import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { assignWantedVariant, canonicalTreatmentJson,EXPERIMENT_ANALYSIS_COHORT,EXPERIMENT_DECISION_GATE,EXPERIMENT_EXPOSURE_RETRY_DELAYS_MS,EXPERIMENT_GOAL_OUTBOX_MAX_AGE_MS,EXPERIMENT_GOAL_OUTBOX_MAX_ENTRIES,EXPERIMENT_PRESENTATION_FINGERPRINT,EXPERIMENT_PRESENTATION_IDENTITY,EXPERIMENT_PRESENTATION_NORMALIZATION,EXPERIMENT_PRESENTATION_PROFILE,EXPERIMENT_PRESENTATION_SOURCES,EXPERIMENT_TREATMENT_FINGERPRINT,experimentRotatorContract,exposureTokenForAssignment, resolveWantedAssignment,validExperimentUnitId,validWantedSessionAssignment,validWantedSessionAssignmentForUnit, validWantedVariant, WANTED_LANDING_EXPERIMENT,WANTED_LANDING_TREATMENT_IDENTITY } from "../app/experiments/rotator.ts";
import { BONFERRONI_TWO_COMPARISON_Z,newcombeRiskDifference,summarizeExperiment,summarizeReceiptIntegrity,wilsonInterval } from "../app/experiments/results.ts";
import { experimentIntegrityQuery,experimentReceiptIntegrityQuery,experimentResultsQuery } from "../app/api/experiments/route.ts";
import { ANALYTICS_RETENTION_DAYS,ANALYTICS_RETENTION_QUERY,validExperimentEvent,validExposureToken } from "../app/experiments/ingestion.ts";
import { startAcknowledgedDelivery } from "../app/experiments/delivery.ts";
import { createExperimentOutbox } from "../app/experiments/outbox.ts";
import { persistentRandomUnit,safeSessionStorage } from "../app/experiments/browser-storage.ts";
import { ANALYTICS_OPT_OUT_STORAGE_KEY,persistAnalyticsOptOut,purgeLocalAnalyticsState,trackingExclusionReason } from "../app/experiments/privacy-choice.ts";
import { ASSIGNMENT_RECEIPT_DELETE_QUERY,createAssignmentReceiptRecord,EXPERIMENT_ASSIGNMENT_RECEIPT_RETENTION_DAYS,EXPERIMENT_ASSIGNMENT_RECEIPT_TTL_SECONDS,experimentAssignmentReceiptContract,storeAssignmentReceipt,verifyAssignmentReceipt } from "../app/experiments/assignment-receipt.ts";

function unitForVariant(variant,ordinal=0){let found=0;for(let index=1;index<100_000;index++){const unit=`00000000-0000-4000-8000-${index.toString(16).padStart(12,"0")}`;if(assignWantedVariant(unit).variant===variant&&found++===ordinal)return unit}throw new Error(`No test unit for ${variant}`)}

function d1FromSqlite(db){return{prepare(query){let values=[];return{bind(...next){values=next;return this},async run(){return db.prepare(query).run(...values)},async first(){return db.prepare(query).get(...values)??null},async all(){return{results:db.prepare(query).all(...values)}}}}}}

test("publishes a complete deterministic allocation",()=>{
  assert.equal(WANTED_LANDING_EXPERIMENT.variants.reduce((sum,variant)=>sum+variant.weight_basis_points,0),10_000);
  const first=assignWantedVariant("stable-device-seed-0001");
  assert.deepEqual(assignWantedVariant("stable-device-seed-0001"),first);
  assert.equal(first.mode,"assigned");assert.equal(first.bucket>=0&&first.bucket<10_000,true);
  const unit=unitForVariant(first.variant);const token=exposureTokenForAssignment(unit,first.variant);
  assert.equal(validExposureToken(token),true);assert.equal(exposureTokenForAssignment(unit,first.variant),token);
  assert.throws(()=>exposureTokenForAssignment(unit,first.variant==="control"?"proof":"control"),/does not match/);
});

test("requires persistent storage before creating a counted browser unit",()=>{
  const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  const created="12345678-1234-4123-8123-123456789abc",valid=value=>typeof value==="string"&&value===created;
  assert.equal(persistentRandomUnit(storage,"unit",()=>created,valid),created);
  assert.equal(persistentRandomUnit(storage,"unit",()=>{throw new Error("must reuse")},valid),created);
  const blocked={getItem:()=>{throw new Error("blocked")},setItem:()=>{throw new Error("blocked")},removeItem:()=>{throw new Error("blocked")}};
  assert.equal(persistentRandomUnit(blocked,"unit",()=>created,valid),null);
  assert.equal(persistentRandomUnit({getItem:()=>null,setItem:()=>{},removeItem:()=>{}},"unit",()=>created,valid),null);
  safeSessionStorage.setItem("storage_test","value");assert.equal(safeSessionStorage.getItem("storage_test"),"value");safeSessionStorage.removeItem("storage_test");assert.equal(safeSessionStorage.getItem("storage_test"),null);
});

test("honors explicit browser privacy choices before experiment eligibility",()=>{
  const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  assert.equal(trackingExclusionReason(storage,{globalPrivacyControl:false,doNotTrack:"0"}),null);
  assert.equal(trackingExclusionReason(storage,{globalPrivacyControl:true,doNotTrack:"0"}),"global_privacy_control");
  assert.equal(trackingExclusionReason(storage,{globalPrivacyControl:false,doNotTrack:"1"}),"do_not_track");
  assert.equal(trackingExclusionReason(storage,{globalPrivacyControl:false,doNotTrack:"yes"}),"do_not_track");
  assert.equal(persistAnalyticsOptOut(storage,true),true);assert.equal(storage.getItem(ANALYTICS_OPT_OUT_STORAGE_KEY),"1");
  assert.equal(trackingExclusionReason(storage,{globalPrivacyControl:true,doNotTrack:"1"}),"site_opt_out");
  assert.equal(persistAnalyticsOptOut(storage,false),true);assert.equal(storage.getItem(ANALYTICS_OPT_OUT_STORAGE_KEY),null);
  const blocked={getItem:()=>{throw new Error("blocked")},setItem:()=>{},removeItem:()=>{}};
  assert.equal(trackingExclusionReason(blocked,{globalPrivacyControl:true,doNotTrack:"0"}),"global_privacy_control");
  assert.equal(persistAnalyticsOptOut(blocked,true),false);
});

test("purges only device-local analytics state on site opt-out",()=>{
  const makeStorage=entries=>{const values=new Map(entries);return{get length(){return values.size},key:index=>[...values.keys()][index]??null,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key),values}};
  const local=makeStorage([[ANALYTICS_OPT_OUT_STORAGE_KEY,"1"],["ea_experiment_unit:wanted_landing_v1","unit"],["ea_exposure:legacy","sent"],["theme","dark"]]);
  const session=makeStorage([["ea_session","session"],["ea_experiment_operator","1"],["ea_experiment_goal_outbox","[]"],["ea_assignment:wanted_landing_v1:C4","{}"],["ea_exposure:wanted_landing_v1:C4:control:sent","1"],["editor_draft","keep"]]);
  assert.deepEqual(purgeLocalAnalyticsState(local,session),{local_removed:2,session_removed:5});
  assert.deepEqual([...local.values.entries()],[[ANALYTICS_OPT_OUT_STORAGE_KEY,"1"],["theme","dark"]]);
  assert.deepEqual([...session.values.entries()],[ ["editor_draft","keep"] ]);
});

test("freezes the complete allocation and rendered treatment identity",()=>{
  const computed=`sha256:${createHash("sha256").update(canonicalTreatmentJson(WANTED_LANDING_TREATMENT_IDENTITY)).digest("hex")}`;
  assert.equal(computed,EXPERIMENT_TREATMENT_FINGERPRINT);
  assert.equal(experimentRotatorContract.analysis_cohort.treatment_fingerprint,computed);
  assert.deepEqual(experimentRotatorContract.analysis_cohort.aggregation_keys,["analysis_cohort","treatment_fingerprint","presentation_fingerprint"]);
});

test("binds every rendered landing-page source into the analysis cohort",()=>{
  assert.equal(EXPERIMENT_PRESENTATION_PROFILE,"0.21-RP2");
  assert.equal(EXPERIMENT_PRESENTATION_NORMALIZATION,"utf8_lf");
  assert.equal(EXPERIMENT_PRESENTATION_SOURCES.length,6);
  for(const source of EXPERIMENT_PRESENTATION_SOURCES){
    const normalized=readFileSync(new URL(`../${source.path}`,import.meta.url),"utf8").replace(/\r\n?/g,"\n");
    assert.equal(createHash("sha256").update(normalized).digest("hex"),source.sha256,source.path);
  }
  const computed=`sha256:${createHash("sha256").update(canonicalTreatmentJson(EXPERIMENT_PRESENTATION_IDENTITY)).digest("hex")}`;
  assert.equal(computed,EXPERIMENT_PRESENTATION_FINGERPRINT);
  assert.equal(experimentRotatorContract.analysis_cohort.presentation_fingerprint,computed);
  assert.deepEqual(experimentRotatorContract.analysis_cohort.presentation_sources,EXPERIMENT_PRESENTATION_SOURCES);
});

test("requires a live same-session assignment receipt without claiming human identity",async()=>{
  const migration=readFileSync(new URL("../drizzle/0001_lyrical_vermin.sql",import.meta.url),"utf8").split("--> statement-breakpoint").join("");
  const db=new DatabaseSync(":memory:");db.exec(migration);const d1=d1FromSqlite(db);
  const unit=unitForVariant("proof"),session="11111111-1111-4111-8111-111111111111";
  const expired=createAssignmentReceiptRecord(unit,session,"22222222-2222-4222-8222-222222222222","2026-07-20T00:00:00.000Z");
  await storeAssignmentReceipt(d1,expired);
  const receipt=createAssignmentReceiptRecord(unit,session,"33333333-3333-4333-8333-333333333333","2026-09-01T00:00:00.000Z");
  await storeAssignmentReceipt(d1,receipt);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM experiment_assignment_receipts").get().count,1);
  assert.equal(Date.parse(receipt.expires_at)-Date.parse(receipt.issued_at),EXPERIMENT_ASSIGNMENT_RECEIPT_TTL_SECONDS*1_000);
  const metadata={assignment_receipt:receipt.receipt_id,unit_id:unit,variant:receipt.variant};
  assert.equal(await verifyAssignmentReceipt(d1,session,metadata,"2026-09-01T12:00:00.000Z"),true);
  assert.equal(await verifyAssignmentReceipt(d1,"44444444-4444-4444-8444-444444444444",metadata,"2026-09-01T12:00:00.000Z"),false);
  assert.equal(await verifyAssignmentReceipt(d1,session,metadata,"2026-09-02T00:00:00.001Z"),false);
  assert.equal(await verifyAssignmentReceipt(d1,session,{...metadata,assignment_receipt:"55555555-5555-4555-8555-555555555555"},"2026-09-01T12:00:00.000Z"),false);
  const plan=db.prepare(`EXPLAIN QUERY PLAN ${ASSIGNMENT_RECEIPT_DELETE_QUERY}`).all("2026-09-01T00:00:00.000Z").map(row=>String(row.detail)).join(" ");
  assert.match(plan,/idx_experiment_assignment_receipts_expires_at/);
  assert.equal(EXPERIMENT_ASSIGNMENT_RECEIPT_RETENTION_DAYS,ANALYTICS_RETENTION_DAYS);
  assert.equal(experimentAssignmentReceiptContract.retention_covers_raw_event_window,true);
  assert.equal(experimentAssignmentReceiptContract.same_origin_request_required,true);
  assert.equal(experimentAssignmentReceiptContract.receipt_replay_across_sessions_permitted,false);
  assert.equal(experimentAssignmentReceiptContract.server_stores_no_IP_address,true);
  assert.equal(experimentAssignmentReceiptContract.proves_human_traffic,false);
  assert.equal(experimentAssignmentReceiptContract.eliminates_automated_fabrication,false);
  assert.doesNotMatch(migration,/ip_address/i);db.close();
});

test("approximates the declared allocation without an unassigned bucket",()=>{
  const counts={control:0,proof:0,developer:0};
  for(let index=0;index<30_000;index++)counts[assignWantedVariant(`anonymous-device-${index}`).variant]++;
  assert.equal(Object.values(counts).reduce((sum,value)=>sum+value,0),30_000);
  assert.equal(Math.abs(counts.control/30_000-.34)<.015,true);
  assert.equal(Math.abs(counts.proof/30_000-.33)<.015,true);
  assert.equal(Math.abs(counts.developer/30_000-.33)<.015,true);
});

test("accepts only named preview variants and keeps previews out of assigned buckets",()=>{
  assert.equal(validWantedVariant("proof"),true);assert.equal(validWantedVariant("winner"),false);
  const preview=resolveWantedAssignment("stable-device-seed-0001","developer");
  assert.deepEqual(preview,{experiment:"wanted_landing_v1",variant:"developer",bucket:null,mode:"preview"});
  assert.equal(resolveWantedAssignment("stable-device-seed-0001","invalid").mode,"assigned");
});

test("accepts only complete assigned session locks",()=>{
  const unit=unitForVariant("control"),assigned=assignWantedVariant(unit),otherUnit=unitForVariant("proof");
  assert.equal(validWantedSessionAssignment(assigned),true);
  assert.equal(validWantedSessionAssignmentForUnit(assigned,unit),true);
  assert.equal(validWantedSessionAssignmentForUnit(assigned,otherUnit),false);
  assert.equal(validWantedSessionAssignmentForUnit(assigned,"not-a-unit"),false);
  assert.equal(validWantedSessionAssignment({...assigned,mode:"preview"}),false);
  assert.equal(validWantedSessionAssignment({...assigned,bucket:null}),false);
  assert.equal(validWantedSessionAssignment({...assigned,variant:"invented"}),false);
  assert.equal(validWantedSessionAssignment({...assigned,variant:assigned.variant==="control"?"developer":"control"}),false);
});

test("freezes a privacy-first presentation-only boundary",()=>{
  assert.equal(experimentRotatorContract.analysis_cohort.id,EXPERIMENT_ANALYSIS_COHORT);
  assert.equal(experimentRotatorContract.analysis_cohort.starts_at_implementation_version,"0.21-R21");
  assert.deepEqual(experimentRotatorContract.analysis_cohort.legacy_versions_included,[]);
  assert.equal(experimentRotatorContract.analysis_cohort.implementation_revision_changes_reset_cohort,false);
  assert.equal(experimentRotatorContract.analysis_cohort.rendered_source_changes_require_new_cohort,true);
  assert.equal(experimentRotatorContract.analysis_cohort.assignment_or_treatment_change_requires_new_cohort,true);
  assert.equal(experimentRotatorContract.analysis_cohort.allocation_change_requires_new_cohort,true);
  assert.equal(experimentRotatorContract.analysis_cohort.measurement_contract_change_requires_new_cohort,true);
  assert.deepEqual(experimentRotatorContract.analysis_cohort.previous_cohorts,[{id:"wanted_landing_v1-C1",starts_at_implementation_version:"0.14-R14",ends_at_implementation_version:"0.14-R14",current_aggregation:false,reason_closed:"treatment_fingerprint_measurement_contract_added"},{id:"wanted_landing_v1-C2",starts_at_implementation_version:"0.15-R15",ends_at_implementation_version:"0.17-R17",current_aggregation:false,reason_closed:"browser_privacy_choice_eligibility_contract_added"},{id:"wanted_landing_v1-C3",starts_at_implementation_version:"0.18-R18",ends_at_implementation_version:"0.18-R18",current_aggregation:false,reason_closed:"site_opt_out_unit_purge_changes_regeneration_contract"},{id:"wanted_landing_v1-C4",starts_at_implementation_version:"0.19-R19",ends_at_implementation_version:"0.19-R19",current_aggregation:false,reason_closed:"rendered_source_fingerprint_added"},{id:"wanted_landing_v1-C5",starts_at_implementation_version:"0.20-R20",ends_at_implementation_version:"0.20-R20",current_aggregation:false,reason_closed:"server_assignment_receipt_added"}]);
  assert.equal(experimentRotatorContract.privacy.persistent_identifier,"experiment_scoped_random_assignment_id");
  assert.equal(experimentRotatorContract.privacy.assignment_id_contains_user_attributes,false);
  assert.equal(experimentRotatorContract.privacy.separate_device_identifier,false);
  assert.equal(experimentRotatorContract.privacy.identifies_person,false);
  assert.equal(experimentRotatorContract.privacy.identifies_household,false);
  assert.equal(experimentRotatorContract.privacy.identifies_device,false);
  assert.equal(experimentRotatorContract.privacy.browser_storage_partitioning_may_create_multiple_units,true);
  assert.equal(experimentRotatorContract.privacy.unit_id_cross_experiment_linkage,false);
  assert.equal(experimentRotatorContract.privacy.site_opt_out_control_path,"/experiments");
  assert.equal(experimentRotatorContract.privacy.site_opt_out_storage_key,ANALYTICS_OPT_OUT_STORAGE_KEY);
  assert.equal(experimentRotatorContract.privacy.site_opt_out_clears_local_analytics_state,true);
  assert.equal(experimentRotatorContract.privacy.site_opt_out_preserves_unrelated_browser_state,true);
  assert.deepEqual(experimentRotatorContract.privacy.browser_privacy_signals_honored,["global_privacy_control","do_not_track"]);
  assert.equal(experimentRotatorContract.privacy.privacy_exclusion_precedes_identifier_creation,true);
  assert.equal(experimentRotatorContract.privacy.privacy_excluded_general_analytics_sent,false);
  assert.equal(experimentRotatorContract.privacy.privacy_excluded_experiment_analytics_sent,false);
  assert.deepEqual(experimentRotatorContract.privacy.deletion_triggers,["accepted_insert","analytics_summary_read","experiment_results_read"]);
  assert.equal(experimentRotatorContract.privacy.IP_storage,false);
  assert.equal(experimentRotatorContract.privacy.event_retention_days,ANALYTICS_RETENTION_DAYS);
  assert.equal(experimentRotatorContract.counting.preview_mode_included,false);
  assert.equal(experimentRotatorContract.counting.operator_mode_included,false);
  assert.equal(experimentRotatorContract.counting.receipt_order_dependency,false);
  assert.equal(experimentRotatorContract.counting.cross_variant_units_excluded,true);
  assert.equal(experimentRotatorContract.counting.multi_token_units_excluded,true);
  assert.equal(experimentRotatorContract.counting.one_exposure_token_per_counted_unit,true);
  assert.equal(experimentRotatorContract.counting.duplicate_sessions_and_receipts_with_same_unit_token_deduplicated,true);
  assert.equal(experimentRotatorContract.counting.integrity_exclusions_disclosed,true);
  assert.equal(experimentRotatorContract.counting.query_path_required,true);
  assert.equal(experimentRotatorContract.counting.reported_as_unique_users,false);
  assert.equal(experimentRotatorContract.counting.human_deduplication,false);
  assert.equal(experimentRotatorContract.counting.household_deduplication,false);
  assert.equal(experimentRotatorContract.counting.device_deduplication,false);
  assert.equal(experimentRotatorContract.counting.one_person_may_contribute_multiple_units,true);
  assert.equal(experimentRotatorContract.counting.shared_browser_profile_may_combine_people,true);
  assert.equal(experimentRotatorContract.counting.privacy_excluded_units_included,false);
  assert.equal(experimentRotatorContract.counting.storage_unavailable_units_included,false);
  assert.equal(experimentRotatorContract.assignment.analysis_unit_matches_assignment_unit,true);
  assert.equal(experimentRotatorContract.assignment.server_recomputable,true);
  assert.equal(experimentRotatorContract.assignment.unit_represents,"one_first_party_browser_profile_storage_instance");
  assert.equal(experimentRotatorContract.assignment.persistence_storage,"first_party_local_storage");
  assert.equal(experimentRotatorContract.assignment.eligibility_checked_before_identifier_creation,true);
  assert.deepEqual(experimentRotatorContract.assignment.eligibility_exclusions,["site_opt_out","global_privacy_control","do_not_track"]);
  assert.equal(experimentRotatorContract.assignment.privacy_exclusion_behavior,"control_or_named_preview_excluded");
  assert.equal(experimentRotatorContract.assignment.persistence_write_readback_required,true);
  assert.equal(experimentRotatorContract.assignment.storage_unavailable_behavior,"control_or_named_preview_excluded");
  assert.equal(experimentRotatorContract.assignment.stable_per_device,false);
  assert.equal(experimentRotatorContract.assignment.stable_per_browser_profile_storage,true);
  assert.equal(experimentRotatorContract.assignment.stable_after_storage_clear,false);
  assert.equal(experimentRotatorContract.assignment.stable_across_private_browsing_sessions,false);
  assert.equal(experimentRotatorContract.assignment.cross_browser_identity_resolution,false);
  assert.equal(experimentRotatorContract.assignment.cross_device_identity_resolution,false);
  assert.equal(experimentRotatorContract.assignment.human_identity_resolution,false);
  assert.deepEqual(experimentRotatorContract.assignment.unit_regeneration_conditions,["site_data_cleared","site_analytics_opt_out_then_reenabled","private_browsing_session_recreated","different_browser_profile","different_device"]);
  assert.equal(experimentRotatorContract.assignment.one_assigned_variant_per_unit,true);
  assert.equal(experimentRotatorContract.assignment.one_assigned_variant_per_session,true);
  assert.equal(experimentRotatorContract.assignment.session_lock_revalidated_against_persistent_unit,true);
  assert.equal(experimentRotatorContract.assignment.invalid_session_lock_behavior,"replace_with_recomputed_assignment");
  assert.equal(experimentRotatorContract.inference.multiple_comparison_control,"bonferroni_two_comparisons_familywise_95_percent");
  assert.equal(experimentRotatorContract.inference.monitoring_window,"rolling_30_day_continuously_viewed");
  assert.equal(experimentRotatorContract.inference.repeated_look_adjustment,"none");
  assert.equal(experimentRotatorContract.inference.confidence_intervals_support_stopping,false);
  assert.equal(experimentRotatorContract.inference.preregistered_stopping_rule,false);
  assert.equal(experimentRotatorContract.inference.interval_labels_are_directional_decisions,false);
  assert.deepEqual(experimentRotatorContract.inference.decision_gate,EXPERIMENT_DECISION_GATE);
  assert.equal(experimentRotatorContract.inference.automatic_decision,false);
  assert.equal(experimentRotatorContract.delivery.session_marker_after_acknowledgement,true);
  assert.equal(experimentRotatorContract.delivery.assignment_receipt_profile,"0.21-AR1");
  assert.equal(experimentRotatorContract.delivery.assignment_receipt_required_before_counted_delivery,true);
  assert.equal(experimentRotatorContract.delivery.assignment_receipt_failure_behavior,"render_normally_but_send_no_counted_experiment_event");
  assert.equal(experimentRotatorContract.delivery.exposure_token_server_recomputable,true);
  assert.equal(experimentRotatorContract.assignment.session_lock_scope,"analysis_cohort_experiment");
  assert.equal(experimentRotatorContract.delivery.session_marker_scope,"analysis_cohort_experiment_variant");
  assert.equal(experimentRotatorContract.delivery.exposure_token_implementation_revision_bound,false);
  assert.equal(experimentRotatorContract.delivery.retry_when_online,true);
  assert.deepEqual(experimentRotatorContract.delivery.retry_delays_ms,EXPERIMENT_EXPOSURE_RETRY_DELAYS_MS);
  assert.equal(experimentRotatorContract.delivery.goal_outbox_scope,"session_only");
  assert.equal(experimentRotatorContract.delivery.goal_outbox_max_entries,EXPERIMENT_GOAL_OUTBOX_MAX_ENTRIES);
  assert.equal(experimentRotatorContract.delivery.goal_outbox_max_age_ms,EXPERIMENT_GOAL_OUTBOX_MAX_AGE_MS);
  assert.equal(experimentRotatorContract.delivery.rejected_goal_events_discarded,true);
  assert.equal(experimentRotatorContract.assignment.pre_assignment_presentation,"neutral_noninteractive");
  assert.equal(experimentRotatorContract.inference.winner_declaration,false);
  assert.equal(experimentRotatorContract.ingestion.assigned_mode_only,true);
  assert.equal(experimentRotatorContract.ingestion.analysis_cohort_required,true);
  assert.equal(experimentRotatorContract.ingestion.treatment_fingerprint_required,true);
  assert.equal(experimentRotatorContract.ingestion.presentation_fingerprint_required,true);
  assert.equal(experimentRotatorContract.ingestion.assignment_receipt_required,true);
  assert.equal(experimentRotatorContract.ingestion.assignment_receipt_same_session_required,true);
  assert.equal(experimentRotatorContract.ingestion.assignment_receipt_expiry_required,true);
  assert.equal(experimentRotatorContract.ingestion.direct_event_fabrication_resistance,"server_issued_same_session_receipt");
  assert.equal(experimentRotatorContract.ingestion.server_recomputes_variant,true);
  assert.equal(experimentRotatorContract.ingestion.server_recomputes_exposure_token,true);
  assert.equal(experimentRotatorContract.ingestion.automated_fabrication_resistance,false);
  assert.equal(experimentRotatorContract.ingestion.decision_use_without_edge_abuse_control,false);
  assert.equal(experimentRotatorContract.receipt_diagnostics.profile,"0.22-RD1");
  assert.equal(experimentRotatorContract.receipt_diagnostics.thresholds,null);
  assert.equal(experimentRotatorContract.receipt_diagnostics.decision_effect,"none");
  assert.equal(experimentRotatorContract.receipt_diagnostics.counts_rejected_requests,false);
  assert.equal(experimentRotatorContract.receipt_diagnostics.proves_human_traffic,false);
  assert.equal(experimentRotatorContract.safety_boundary.presentation_only,true);
  assert.equal(experimentRotatorContract.safety_boundary.changes_score,false);
  assert.equal(experimentRotatorContract.safety_boundary.changes_certification,false);
  assert.equal(experimentRotatorContract.safety_boundary.changes_registry_rank,false);
});

test("marks an exposure sent only after acknowledged delivery",async()=>{
  const scheduled=[],responses=[false,false,true];let acknowledged=false,marks=0;
  const delivery=startAcknowledgedDelivery({
    send:async()=>responses.shift()??false,
    isAcknowledged:()=>acknowledged,
    markAcknowledged:()=>{acknowledged=true;marks++},
    retryDelaysMs:EXPERIMENT_EXPOSURE_RETRY_DELAYS_MS,
    schedule:(callback,delay)=>{const handle={callback,delay};scheduled.push(handle);return handle},
    clearSchedule:handle=>{const index=scheduled.indexOf(handle);if(index>=0)scheduled.splice(index,1)},
  });
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(acknowledged,false);assert.equal(scheduled[0].delay,2_000);
  scheduled.shift().callback();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(acknowledged,false);assert.equal(scheduled[0].delay,10_000);
  scheduled.shift().callback();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(acknowledged,true);assert.equal(marks,1);assert.equal(scheduled.length,0);
  delivery.retryNow();await new Promise(resolve=>setImmediate(resolve));assert.equal(marks,1);
  delivery.cancel();
});

test("retains retryable goals and removes acknowledged or rejected goals",async()=>{
  const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  const dispositions=["retry","accepted","rejected"];let id=0,now=1_800_000_000_000;
  const outbox=createExperimentOutbox({storage,storageKey:"test",send:async()=>dispositions.shift(),makeId:()=>`00000000-0000-4000-8000-${String(++id).padStart(12,"0")}`,now:()=>now,maxEntries:2,maxAgeMs:1_000});
  outbox.enqueue("/wanted-10k",{goal:"primary_cta"});outbox.enqueue("/wanted-10k",{goal:"secondary_sdk"});
  assert.deepEqual(await outbox.flush(),{accepted:0,rejected:0,pending:2});
  assert.deepEqual(await outbox.flush(),{accepted:1,rejected:1,pending:0});
  outbox.enqueue("/wanted-10k",{goal:"a"});outbox.enqueue("/wanted-10k",{goal:"b"});outbox.enqueue("/wanted-10k",{goal:"c"});
  assert.equal(outbox.pendingCount(),2);
  now+=1_001;assert.equal(outbox.pendingCount(),0);assert.equal(storage.getItem("test"),null);
});

test("rejects malformed assignment IDs",()=>{assert.throws(()=>assignWantedVariant("short"),/bounded anonymous/)});

test("reports bounded Wilson intervals without inventing empty-sample precision",()=>{
  assert.equal(wilsonInterval(0,0),null);
  const interval=wilsonInterval(50,100);assert.ok(interval);assert.equal(Math.abs(interval.low-.4038)<.001,true);assert.equal(Math.abs(interval.high-.5962)<.001,true);
  assert.deepEqual(wilsonInterval(101,100),null);
});

test("reports descriptive Newcombe interval positions without declaring a winner",()=>{
  assert.equal(BONFERRONI_TWO_COMPARISON_Z>2.24,true);
  assert.equal(newcombeRiskDifference(1,0,0,0),null);
  const positive=newcombeRiskDifference(160,1000,100,1000);assert.ok(positive);assert.equal(positive.low>0,true);assert.equal(positive.high<1,true);
  const summary=summarizeExperiment([{variant:"control",exposed_units:1000,goal_units:100},{variant:"proof",exposed_units:1000,goal_units:160},{variant:"developer",exposed_units:1000,goal_units:100}]);
  assert.equal(summary.comparisons.length,2);assert.equal(summary.comparisons[0].interval_position,"entirely_above_zero");assert.equal(summary.comparisons[1].interval_position,"includes_zero");assert.equal(Math.abs(summary.comparisons[0].absolute_lift-.06)<1e-12,true);
  assert.equal(summarizeExperiment([]).comparisons.every(comparison=>comparison.interval_position==="unavailable"),true);
  assert.equal(summary.decision_gate.status,"descriptive_only");assert.equal(summary.decision_gate.automatic_action,false);
  assert.deepEqual(summary.decision_gate.blocking_reasons,["rolling_window_continuously_monitored","no_repeated_look_adjustment","no_preregistered_stopping_rule","human_traffic_not_authenticated"]);
});

test("detects gross allocation drift",()=>{
  const balanced=summarizeExperiment([{variant:"control",exposed_units:34,goal_units:10},{variant:"proof",exposed_units:33,goal_units:8},{variant:"developer",exposed_units:33,goal_units:9}]);
  assert.equal(balanced.sample_ratio_mismatch.status,"pass");assert.equal(balanced.total_exposed_units,100);assert.equal(balanced.variants[0].conversion_interval_95!==null,true);
  const drifted=summarizeExperiment([{variant:"control",exposed_units:98,goal_units:10},{variant:"proof",exposed_units:1,goal_units:0},{variant:"developer",exposed_units:1,goal_units:0}]);
  assert.equal(drifted.sample_ratio_mismatch.status,"alert");
});

test("attributes goals across repeated sessions through one experiment unit and exposure token",()=>{
  assert.match(experimentResultsQuery,/HAVING COUNT\(DISTINCT variant\)=1 AND COUNT\(DISTINCT exposure_token\)=1/);
  assert.match(experimentResultsQuery,/path='\/wanted-10k'/);
  assert.match(experimentResultsQuery,/g\.path='\/wanted-10k'/);
  assert.match(experimentResultsQuery,/json_extract\(g\.metadata,'\$\.unit_id'\)=e\.unit_id/);
  assert.match(experimentResultsQuery,/json_extract\(g\.metadata,'\$\.variant'\)=e\.variant/);
  assert.match(experimentResultsQuery,/json_extract\(g\.metadata,'\$\.exposure_id'\)=e\.exposure_token/);
  assert.match(experimentResultsQuery,/json_extract\(g\.metadata,'\$\.goal'\)='primary_cta'/);
  assert.match(experimentResultsQuery,/json_extract\(metadata,'\$\.analysis_cohort'\)=\?/);
  assert.match(experimentResultsQuery,/json_extract\(metadata,'\$\.treatment_fingerprint'\)=\?/);
  assert.match(experimentResultsQuery,/json_extract\(metadata,'\$\.presentation_fingerprint'\)=\?/);
  assert.doesNotMatch(experimentResultsQuery,/rotator_version/);
});

test("executes the matched-exposure query against SQLite",()=>{
  const db=new DatabaseSync(":memory:");
  db.exec("CREATE TABLE analytics_events (id INTEGER PRIMARY KEY AUTOINCREMENT,session_id TEXT,event_type TEXT,path TEXT,metadata TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  const insert=db.prepare("INSERT INTO analytics_events (session_id,event_type,path,metadata) VALUES (?,?,?,?)");
  const event=({session,eventType,variant,unit,token=exposureTokenForAssignment(unit,assignWantedVariant(unit).variant),mode="assigned",goal,version="0.22-R22",cohort=EXPERIMENT_ANALYSIS_COHORT,fingerprint=EXPERIMENT_TREATMENT_FINGERPRINT,presentation=EXPERIMENT_PRESENTATION_FINGERPRINT,path="/wanted-10k"})=>insert.run(session,eventType,path,JSON.stringify({experiment:"wanted_landing_v1",analysis_cohort:cohort,treatment_fingerprint:fingerprint,presentation_fingerprint:presentation,assignment_receipt:"77777777-7777-4777-8777-777777777777",unit_id:unit,variant,assignment_mode:mode,rotator_version:version,exposure_id:token,...goal&&{goal}}));
  const controlUnit=unitForVariant("control"),controlToken=exposureTokenForAssignment(controlUnit,"control");
  event({session:"matched_session_a",eventType:"experiment_exposure",variant:"control",unit:controlUnit});event({session:"matched_session_a",eventType:"experiment_exposure",variant:"control",unit:controlUnit});event({session:"matched_session_b",eventType:"experiment_exposure",variant:"control",unit:controlUnit});event({session:"matched_session_b",eventType:"experiment_goal",variant:"control",unit:controlUnit,goal:"primary_cta"});
  const proofUnit=unitForVariant("proof"),proofToken=exposureTokenForAssignment(proofUnit,"proof");
  event({session:"early_goal_session",eventType:"experiment_goal",variant:"proof",unit:proofUnit,goal:"primary_cta"});event({session:"early_goal_session",eventType:"experiment_exposure",variant:"proof",unit:proofUnit});
  const developerUnit=unitForVariant("developer"),developerToken=exposureTokenForAssignment(developerUnit,"developer");
  event({session:"wrong_token_session",eventType:"experiment_exposure",variant:"developer",unit:developerUnit});event({session:"wrong_token_session",eventType:"experiment_goal",variant:"developer",unit:developerUnit,token:"44444444-4444-4444-8444-444444444444",goal:"primary_cta"});
  event({session:"preview_session",eventType:"experiment_exposure",variant:"control",unit:controlUnit,mode:"preview"});event({session:"preview_session",eventType:"experiment_goal",variant:"control",unit:controlUnit,mode:"preview",goal:"primary_cta"});
  const compatibleReleaseUnit=unitForVariant("control",2);event({session:"compatible_release",eventType:"experiment_exposure",variant:"control",unit:compatibleReleaseUnit,version:"0.23-R23"});event({session:"compatible_release",eventType:"experiment_goal",variant:"control",unit:compatibleReleaseUnit,version:"0.23-R23",goal:"primary_cta"});
  const wrongCohortUnit=unitForVariant("control",3);event({session:"wrong_cohort",eventType:"experiment_exposure",variant:"control",unit:wrongCohortUnit,cohort:"wanted_landing_v1-C1"});event({session:"wrong_cohort",eventType:"experiment_goal",variant:"control",unit:wrongCohortUnit,cohort:"wanted_landing_v1-C1",goal:"primary_cta"});
  const wrongFingerprintUnit=unitForVariant("control",4);event({session:"wrong_fingerprint",eventType:"experiment_exposure",variant:"control",unit:wrongFingerprintUnit,fingerprint:"sha256:0000000000000000000000000000000000000000000000000000000000000000"});event({session:"wrong_fingerprint",eventType:"experiment_goal",variant:"control",unit:wrongFingerprintUnit,fingerprint:"sha256:0000000000000000000000000000000000000000000000000000000000000000",goal:"primary_cta"});
  const wrongPresentationUnit=unitForVariant("proof",3);event({session:"wrong_presentation",eventType:"experiment_exposure",variant:"proof",unit:wrongPresentationUnit,presentation:"sha256:0000000000000000000000000000000000000000000000000000000000000000"});event({session:"wrong_presentation",eventType:"experiment_goal",variant:"proof",unit:wrongPresentationUnit,presentation:"sha256:0000000000000000000000000000000000000000000000000000000000000000",goal:"primary_cta"});
  const crossUnit=unitForVariant("control",1);event({session:"cross_variant_session_a",eventType:"experiment_exposure",variant:"control",unit:crossUnit});event({session:"cross_variant_session_a",eventType:"experiment_goal",variant:"control",unit:crossUnit,goal:"primary_cta"});event({session:"cross_variant_session_b",eventType:"experiment_exposure",variant:"developer",unit:crossUnit,token:"88888888-8888-4888-8888-888888888888"});event({session:"cross_variant_session_b",eventType:"experiment_goal",variant:"developer",unit:crossUnit,token:"88888888-8888-4888-8888-888888888888",goal:"primary_cta"});
  const multiUnit=unitForVariant("proof",1);event({session:"multi_token_session_a",eventType:"experiment_exposure",variant:"proof",unit:multiUnit});event({session:"multi_token_session_a",eventType:"experiment_goal",variant:"proof",unit:multiUnit,goal:"primary_cta"});event({session:"multi_token_session_b",eventType:"experiment_exposure",variant:"proof",unit:multiUnit,token:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"});event({session:"multi_token_session_b",eventType:"experiment_goal",variant:"proof",unit:multiUnit,token:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",goal:"primary_cta"});
  const wrongPathUnit=unitForVariant("proof",2);event({session:"wrong_path_session",eventType:"experiment_exposure",variant:"proof",unit:wrongPathUnit,path:"/wanted-10k/evidence"});event({session:"wrong_path_session",eventType:"experiment_goal",variant:"proof",unit:wrongPathUnit,path:"/wanted-10k/evidence",goal:"primary_cta"});
  assert.equal(validExposureToken(controlToken)&&validExposureToken(proofToken)&&validExposureToken(developerToken),true);
  const rows=db.prepare(experimentResultsQuery).all("wanted_landing_v1",EXPERIMENT_ANALYSIS_COHORT,EXPERIMENT_TREATMENT_FINGERPRINT,EXPERIMENT_PRESENTATION_FINGERPRINT,"wanted_landing_v1",EXPERIMENT_ANALYSIS_COHORT,EXPERIMENT_TREATMENT_FINGERPRINT,EXPERIMENT_PRESENTATION_FINGERPRINT);
  const found=new Map(rows.map(row=>[row.variant,row]));
  assert.deepEqual({...found.get("control")},{variant:"control",exposed_units:2,goal_units:2});
  assert.deepEqual({...found.get("proof")},{variant:"proof",exposed_units:1,goal_units:1});
  assert.deepEqual({...found.get("developer")},{variant:"developer",exposed_units:1,goal_units:0});
  assert.deepEqual({...db.prepare(experimentIntegrityQuery).get("wanted_landing_v1",EXPERIMENT_ANALYSIS_COHORT,EXPERIMENT_TREATMENT_FINGERPRINT,EXPERIMENT_PRESENTATION_FINGERPRINT)},{cross_variant_units:1,multi_token_units:1});
  db.close();
});

test("reports the indexed receipt-to-exposure funnel without inventing rejected traffic",async()=>{
  const db=new DatabaseSync(":memory:");
  for(const file of ["../drizzle/0000_remarkable_mongoose.sql","../drizzle/0001_lyrical_vermin.sql"]){const migration=readFileSync(new URL(file,import.meta.url),"utf8").split("--> statement-breakpoint").join("");db.exec(migration)}
  const d1=d1FromSqlite(db),now=new Date(),sessionA="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",sessionB="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",sessionC="cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const unitA=unitForVariant("control",5),unitB=unitForVariant("proof",5),unitC=unitForVariant("developer",5);
  const receipts=[
    createAssignmentReceiptRecord(unitA,sessionA,"10000000-0000-4000-8000-000000000001",new Date(now.getTime()-3_600_000).toISOString()),
    createAssignmentReceiptRecord(unitB,sessionB,"10000000-0000-4000-8000-000000000002",new Date(now.getTime()-3_600_000).toISOString()),
    createAssignmentReceiptRecord(unitC,sessionC,"10000000-0000-4000-8000-000000000003",new Date(now.getTime()-2*86_400_000).toISOString()),
    createAssignmentReceiptRecord(unitB,sessionB,"10000000-0000-4000-8000-000000000004",new Date(now.getTime()-1_800_000).toISOString()),
  ];
  for(const receipt of receipts)await storeAssignmentReceipt(d1,receipt);
  db.prepare("INSERT INTO analytics_events (session_id,event_type,path,metadata) VALUES (?,?,?,?)").run(sessionA,"experiment_exposure","/wanted-10k",JSON.stringify({experiment:WANTED_LANDING_EXPERIMENT.id,analysis_cohort:EXPERIMENT_ANALYSIS_COHORT,treatment_fingerprint:EXPERIMENT_TREATMENT_FINGERPRINT,presentation_fingerprint:EXPERIMENT_PRESENTATION_FINGERPRINT,assignment_mode:"assigned",assignment_receipt:receipts[0].receipt_id}));
  const nowIso=now.toISOString(),cutoff=new Date(now.getTime()-29*86_400_000).toISOString(),parameters=[cutoff,nowIso,WANTED_LANDING_EXPERIMENT.id,EXPERIMENT_ANALYSIS_COHORT,EXPERIMENT_TREATMENT_FINGERPRINT,EXPERIMENT_PRESENTATION_FINGERPRINT,WANTED_LANDING_EXPERIMENT.id,EXPERIMENT_ANALYSIS_COHORT,EXPERIMENT_TREATMENT_FINGERPRINT,EXPERIMENT_PRESENTATION_FINGERPRINT,nowIso];
  const raw=db.prepare(experimentReceiptIntegrityQuery).get(...parameters),summary=summarizeReceiptIntegrity(raw);
  assert.deepEqual({...raw},{issued_receipts:4,issued_units:3,exposed_receipts:1,unexposed_receipts:3,expired_unexposed_receipts:1,duplicate_identity_receipts:1});
  assert.deepEqual(summary,{profile:"0.22-RD1",window_days:30,issued_receipts:4,issued_units:3,exposed_receipts:1,unexposed_receipts:3,active_unexposed_receipts:2,expired_unexposed_receipts:1,duplicate_identity_receipts:1,receipt_to_exposure_rate:.25,status:"descriptive",counts_rejected_requests:false,proves_human_traffic:false,interpretation:"receipt issuance and accepted exposure funnel only; does not count rejected requests or identify human users"});
  const plan=db.prepare(`EXPLAIN QUERY PLAN ${experimentReceiptIntegrityQuery}`).all(...parameters).map(row=>String(row.detail)).join(" ");
  assert.match(plan,/idx_experiment_assignment_receipts_expires_at/);assert.match(plan,/idx_analytics_event_path/);
  assert.equal(summarizeReceiptIntegrity(null).receipt_to_exposure_rate,null);assert.equal(summarizeReceiptIntegrity({issued_receipts:1,exposed_receipts:4}).exposed_receipts,1);db.close();
});

test("accepts only current, internal, schema-valid experiment events",()=>{
  const unit=unitForVariant("control"),token=exposureTokenForAssignment(unit,"control");
  const exposure={experiment:"wanted_landing_v1",analysis_cohort:EXPERIMENT_ANALYSIS_COHORT,treatment_fingerprint:EXPERIMENT_TREATMENT_FINGERPRINT,presentation_fingerprint:EXPERIMENT_PRESENTATION_FINGERPRINT,assignment_receipt:"66666666-6666-4666-8666-666666666666",unit_id:unit,variant:"control",assignment_mode:"assigned",rotator_version:"0.22-R22",exposure_id:token};
  assert.equal(validExperimentUnitId(exposure.unit_id),true);assert.equal(validExperimentUnitId("shared-user"),false);
  assert.equal(validExposureToken(exposure.exposure_id),true);assert.equal(validExposureToken("1"),false);
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",exposure),true);
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",{...exposure,variant:"invented"}),false);
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",{...exposure,rotator_version:"0.8-R8"}),false);
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",{...exposure,analysis_cohort:"wanted_landing_v1-C1"}),false);
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",Object.fromEntries(Object.entries(exposure).filter(([key])=>key!=="analysis_cohort"))),false);
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",{...exposure,treatment_fingerprint:"sha256:wrong"}),false);
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",Object.fromEntries(Object.entries(exposure).filter(([key])=>key!=="treatment_fingerprint"))),false);
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",{...exposure,presentation_fingerprint:"sha256:wrong"}),false);
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",Object.fromEntries(Object.entries(exposure).filter(([key])=>key!=="presentation_fingerprint"))),false);
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",{...exposure,assignment_receipt:"invented"}),false);
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",Object.fromEntries(Object.entries(exposure).filter(([key])=>key!=="assignment_receipt"))),false);
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",{...exposure,unit_id:"invented"}),false);
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",{...exposure,exposure_id:"invented"}),false);
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",{...exposure,exposure_id:"11111111-1111-4111-8111-111111111111"}),false);
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",{...exposure,variant:"proof"}),false);
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",{...exposure,assignment_mode:"preview"}),false);
  assert.equal(validExperimentEvent("experiment_exposure","/analytics",exposure),false);
  assert.equal(validExperimentEvent("experiment_goal","/wanted-10k",{...exposure,goal:"primary_cta",destination:"/wanted-10k/protocol"}),true);
  assert.equal(validExperimentEvent("experiment_goal","/wanted-10k",{...exposure,goal:"primary_cta",destination:"https://example.com"}),false);
});

test("deletes analytics older than the bounded retention window",()=>{
  assert.equal(ANALYTICS_RETENTION_DAYS,35);
  const db=new DatabaseSync(":memory:");db.exec("CREATE TABLE analytics_events (id INTEGER PRIMARY KEY,created_at TEXT NOT NULL)");
  db.prepare("INSERT INTO analytics_events VALUES (?,datetime('now',?))").run(1,"-36 days");db.prepare("INSERT INTO analytics_events VALUES (?,datetime('now',?))").run(2,"-34 days");
  db.exec(ANALYTICS_RETENTION_QUERY);assert.deepEqual(db.prepare("SELECT id FROM analytics_events ORDER BY id").all().map(row=>row.id),[2]);db.close();
});

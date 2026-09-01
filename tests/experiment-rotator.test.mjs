import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { assignWantedVariant, EXPERIMENT_EXPOSURE_RETRY_DELAYS_MS,EXPERIMENT_GOAL_OUTBOX_MAX_AGE_MS,EXPERIMENT_GOAL_OUTBOX_MAX_ENTRIES,experimentRotatorContract, resolveWantedAssignment,validWantedSessionAssignment, validWantedVariant, WANTED_LANDING_EXPERIMENT } from "../app/experiments/rotator.ts";
import { BONFERRONI_TWO_COMPARISON_Z,newcombeRiskDifference,summarizeExperiment,wilsonInterval } from "../app/experiments/results.ts";
import { experimentIntegrityQuery,experimentResultsQuery } from "../app/api/experiments/route.ts";
import { ANALYTICS_RETENTION_DAYS,ANALYTICS_RETENTION_QUERY,validExperimentEvent,validExposureToken } from "../app/experiments/ingestion.ts";
import { startAcknowledgedDelivery } from "../app/experiments/delivery.ts";
import { createExperimentOutbox } from "../app/experiments/outbox.ts";

test("publishes a complete deterministic allocation",()=>{
  assert.equal(WANTED_LANDING_EXPERIMENT.variants.reduce((sum,variant)=>sum+variant.weight_basis_points,0),10_000);
  const first=assignWantedVariant("stable-device-seed-0001");
  assert.deepEqual(assignWantedVariant("stable-device-seed-0001"),first);
  assert.equal(first.mode,"assigned");assert.equal(first.bucket>=0&&first.bucket<10_000,true);
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
  const assigned=assignWantedVariant("stable-device-seed-0001");
  assert.equal(validWantedSessionAssignment(assigned),true);
  assert.equal(validWantedSessionAssignment({...assigned,mode:"preview"}),false);
  assert.equal(validWantedSessionAssignment({...assigned,bucket:null}),false);
  assert.equal(validWantedSessionAssignment({...assigned,variant:"invented"}),false);
  assert.equal(validWantedSessionAssignment({...assigned,variant:assigned.variant==="control"?"developer":"control"}),false);
});

test("freezes a privacy-first presentation-only boundary",()=>{
  assert.equal(experimentRotatorContract.privacy.persistent_identifier,"device_local_only");
  assert.equal(experimentRotatorContract.privacy.IP_storage,false);
  assert.equal(experimentRotatorContract.privacy.event_retention_days,ANALYTICS_RETENTION_DAYS);
  assert.equal(experimentRotatorContract.counting.preview_mode_included,false);
  assert.equal(experimentRotatorContract.counting.operator_mode_included,false);
  assert.equal(experimentRotatorContract.counting.receipt_order_dependency,false);
  assert.equal(experimentRotatorContract.counting.cross_variant_sessions_excluded,true);
  assert.equal(experimentRotatorContract.counting.multi_token_sessions_excluded,true);
  assert.equal(experimentRotatorContract.counting.one_exposure_token_per_counted_session,true);
  assert.equal(experimentRotatorContract.counting.duplicate_events_with_same_token_deduplicated,true);
  assert.equal(experimentRotatorContract.counting.integrity_exclusions_disclosed,true);
  assert.equal(experimentRotatorContract.counting.query_path_required,true);
  assert.equal(experimentRotatorContract.assignment.one_assigned_variant_per_session,true);
  assert.equal(experimentRotatorContract.inference.multiple_comparison_control,"bonferroni_two_comparisons_familywise_95_percent");
  assert.equal(experimentRotatorContract.inference.automatic_decision,false);
  assert.equal(experimentRotatorContract.delivery.session_marker_after_acknowledgement,true);
  assert.equal(experimentRotatorContract.delivery.session_marker_scope,"rotator_version_experiment_variant");
  assert.equal(experimentRotatorContract.delivery.retry_when_online,true);
  assert.deepEqual(experimentRotatorContract.delivery.retry_delays_ms,EXPERIMENT_EXPOSURE_RETRY_DELAYS_MS);
  assert.equal(experimentRotatorContract.delivery.goal_outbox_scope,"session_only");
  assert.equal(experimentRotatorContract.delivery.goal_outbox_max_entries,EXPERIMENT_GOAL_OUTBOX_MAX_ENTRIES);
  assert.equal(experimentRotatorContract.delivery.goal_outbox_max_age_ms,EXPERIMENT_GOAL_OUTBOX_MAX_AGE_MS);
  assert.equal(experimentRotatorContract.delivery.rejected_goal_events_discarded,true);
  assert.equal(experimentRotatorContract.assignment.pre_assignment_presentation,"neutral_noninteractive");
  assert.equal(experimentRotatorContract.inference.winner_declaration,false);
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

test("rejects malformed assignment seeds",()=>{assert.throws(()=>assignWantedVariant("short"),/bounded anonymous/)});

test("reports bounded Wilson intervals without inventing empty-sample precision",()=>{
  assert.equal(wilsonInterval(0,0),null);
  const interval=wilsonInterval(50,100);assert.ok(interval);assert.equal(Math.abs(interval.low-.4038)<.001,true);assert.equal(Math.abs(interval.high-.5962)<.001,true);
  assert.deepEqual(wilsonInterval(101,100),null);
});

test("reports simultaneous Newcombe control comparisons without declaring a winner",()=>{
  assert.equal(BONFERRONI_TWO_COMPARISON_Z>2.24,true);
  assert.equal(newcombeRiskDifference(1,0,0,0),null);
  const positive=newcombeRiskDifference(160,1000,100,1000);assert.ok(positive);assert.equal(positive.low>0,true);assert.equal(positive.high<1,true);
  const summary=summarizeExperiment([{variant:"control",exposed_sessions:1000,goal_sessions:100},{variant:"proof",exposed_sessions:1000,goal_sessions:160},{variant:"developer",exposed_sessions:1000,goal_sessions:100}]);
  assert.equal(summary.comparisons.length,2);assert.equal(summary.comparisons[0].signal,"positive");assert.equal(summary.comparisons[1].signal,"inconclusive");assert.equal(Math.abs(summary.comparisons[0].absolute_lift-.06)<1e-12,true);
  assert.equal(summarizeExperiment([]).comparisons.every(comparison=>comparison.signal==="insufficient"),true);
});

test("detects gross allocation drift",()=>{
  const balanced=summarizeExperiment([{variant:"control",exposed_sessions:34,goal_sessions:10},{variant:"proof",exposed_sessions:33,goal_sessions:8},{variant:"developer",exposed_sessions:33,goal_sessions:9}]);
  assert.equal(balanced.sample_ratio_mismatch.status,"pass");assert.equal(balanced.total_exposed_sessions,100);assert.equal(balanced.variants[0].conversion_interval_95!==null,true);
  const drifted=summarizeExperiment([{variant:"control",exposed_sessions:98,goal_sessions:10},{variant:"proof",exposed_sessions:1,goal_sessions:0},{variant:"developer",exposed_sessions:1,goal_sessions:0}]);
  assert.equal(drifted.sample_ratio_mismatch.status,"alert");
});

test("attributes same-session same-variant goals through an exposure token",()=>{
  assert.match(experimentResultsQuery,/HAVING COUNT\(DISTINCT variant\)=1 AND COUNT\(DISTINCT exposure_token\)=1/);
  assert.match(experimentResultsQuery,/path='\/wanted-10k'/);
  assert.match(experimentResultsQuery,/g\.path='\/wanted-10k'/);
  assert.match(experimentResultsQuery,/g\.session_id=e\.session_id/);
  assert.match(experimentResultsQuery,/json_extract\(g\.metadata,'\$\.variant'\)=e\.variant/);
  assert.match(experimentResultsQuery,/json_extract\(g\.metadata,'\$\.exposure_id'\)=e\.exposure_token/);
  assert.match(experimentResultsQuery,/json_extract\(g\.metadata,'\$\.goal'\)='primary_cta'/);
});

test("executes the matched-exposure query against SQLite",()=>{
  const db=new DatabaseSync(":memory:");
  db.exec("CREATE TABLE analytics_events (id INTEGER PRIMARY KEY AUTOINCREMENT,session_id TEXT,event_type TEXT,path TEXT,metadata TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  const insert=db.prepare("INSERT INTO analytics_events (session_id,event_type,path,metadata) VALUES (?,?,?,?)");
  const event=(session,eventType,variant,token,mode="assigned",goal,version="0.10-R10",path="/wanted-10k")=>insert.run(session,eventType,path,JSON.stringify({experiment:"wanted_landing_v1",variant,assignment_mode:mode,rotator_version:version,exposure_id:token,...goal&&{goal}}));
  event("matched_session","experiment_exposure","control","11111111-1111-4111-8111-111111111111");event("matched_session","experiment_exposure","control","11111111-1111-4111-8111-111111111111");event("matched_session","experiment_goal","control","11111111-1111-4111-8111-111111111111","assigned","primary_cta");
  event("early_goal_session","experiment_goal","proof","22222222-2222-4222-8222-222222222222","assigned","primary_cta");event("early_goal_session","experiment_exposure","proof","22222222-2222-4222-8222-222222222222");
  event("wrong_token_session","experiment_exposure","developer","33333333-3333-4333-8333-333333333333");event("wrong_token_session","experiment_goal","developer","44444444-4444-4444-8444-444444444444","assigned","primary_cta");
  event("preview_session","experiment_exposure","control","55555555-5555-4555-8555-555555555555","preview");event("preview_session","experiment_goal","control","55555555-5555-4555-8555-555555555555","preview","primary_cta");
  event("old_version","experiment_exposure","control","66666666-6666-4666-8666-666666666666","assigned",undefined,"0.4-R4");
  event("cross_variant_session","experiment_exposure","control","77777777-7777-4777-8777-777777777777");event("cross_variant_session","experiment_goal","control","77777777-7777-4777-8777-777777777777","assigned","primary_cta");
  event("cross_variant_session","experiment_exposure","developer","88888888-8888-4888-8888-888888888888");event("cross_variant_session","experiment_goal","developer","88888888-8888-4888-8888-888888888888","assigned","primary_cta");
  event("multi_token_session","experiment_exposure","proof","99999999-9999-4999-8999-999999999999");event("multi_token_session","experiment_goal","proof","99999999-9999-4999-8999-999999999999","assigned","primary_cta");
  event("multi_token_session","experiment_exposure","proof","aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");event("multi_token_session","experiment_goal","proof","aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","assigned","primary_cta");
  event("wrong_path_session","experiment_exposure","proof","bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","assigned",undefined,"0.10-R10","/wanted-10k/evidence");event("wrong_path_session","experiment_goal","proof","bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","assigned","primary_cta","0.10-R10","/wanted-10k/evidence");
  const rows=db.prepare(experimentResultsQuery).all("wanted_landing_v1","0.10-R10","wanted_landing_v1","0.10-R10");
  const found=new Map(rows.map(row=>[row.variant,row]));
  assert.deepEqual({...found.get("control")},{variant:"control",exposed_sessions:1,goal_sessions:1});
  assert.deepEqual({...found.get("proof")},{variant:"proof",exposed_sessions:1,goal_sessions:1});
  assert.deepEqual({...found.get("developer")},{variant:"developer",exposed_sessions:1,goal_sessions:0});
  assert.deepEqual({...db.prepare(experimentIntegrityQuery).get("wanted_landing_v1","0.10-R10")},{cross_variant_sessions:1,multi_token_sessions:1});
  db.close();
});

test("accepts only current, internal, schema-valid experiment events",()=>{
  const exposure={experiment:"wanted_landing_v1",variant:"control",assignment_mode:"assigned",rotator_version:"0.10-R10",exposure_id:"11111111-1111-4111-8111-111111111111"};
  assert.equal(validExposureToken(exposure.exposure_id),true);assert.equal(validExposureToken("1"),false);
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",exposure),true);
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",{...exposure,variant:"invented"}),false);
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",{...exposure,rotator_version:"0.8-R8"}),false);
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",{...exposure,exposure_id:"invented"}),false);
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

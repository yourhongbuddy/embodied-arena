import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { assignWantedVariant, experimentRotatorContract, resolveWantedAssignment, validWantedVariant, WANTED_LANDING_EXPERIMENT } from "../app/experiments/rotator.ts";
import { summarizeExperiment,wilsonInterval } from "../app/experiments/results.ts";
import { experimentResultsQuery } from "../app/api/experiments/route.ts";
import { ANALYTICS_RETENTION_DAYS,ANALYTICS_RETENTION_QUERY,validExperimentEvent } from "../app/experiments/ingestion.ts";

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

test("freezes a privacy-first presentation-only boundary",()=>{
  assert.equal(experimentRotatorContract.privacy.persistent_identifier,"device_local_only");
  assert.equal(experimentRotatorContract.privacy.IP_storage,false);
  assert.equal(experimentRotatorContract.privacy.event_retention_days,ANALYTICS_RETENTION_DAYS);
  assert.equal(experimentRotatorContract.counting.preview_mode_included,false);
  assert.equal(experimentRotatorContract.counting.operator_mode_included,false);
  assert.equal(experimentRotatorContract.inference.winner_declaration,false);
  assert.equal(experimentRotatorContract.safety_boundary.presentation_only,true);
  assert.equal(experimentRotatorContract.safety_boundary.changes_score,false);
  assert.equal(experimentRotatorContract.safety_boundary.changes_certification,false);
  assert.equal(experimentRotatorContract.safety_boundary.changes_registry_rank,false);
});

test("rejects malformed assignment seeds",()=>{assert.throws(()=>assignWantedVariant("short"),/bounded anonymous/)});

test("reports bounded Wilson intervals without inventing empty-sample precision",()=>{
  assert.equal(wilsonInterval(0,0),null);
  const interval=wilsonInterval(50,100);assert.ok(interval);assert.equal(Math.abs(interval.low-.4038)<.001,true);assert.equal(Math.abs(interval.high-.5962)<.001,true);
  assert.deepEqual(wilsonInterval(101,100),null);
});

test("detects gross allocation drift",()=>{
  const balanced=summarizeExperiment([{variant:"control",exposed_sessions:34,goal_sessions:10},{variant:"proof",exposed_sessions:33,goal_sessions:8},{variant:"developer",exposed_sessions:33,goal_sessions:9}]);
  assert.equal(balanced.sample_ratio_mismatch.status,"pass");assert.equal(balanced.total_exposed_sessions,100);assert.equal(balanced.variants[0].conversion_interval_95!==null,true);
  const drifted=summarizeExperiment([{variant:"control",exposed_sessions:98,goal_sessions:10},{variant:"proof",exposed_sessions:1,goal_sessions:0},{variant:"developer",exposed_sessions:1,goal_sessions:0}]);
  assert.equal(drifted.sample_ratio_mismatch.status,"alert");
});

test("attributes only later same-session same-variant goals to an exposure",()=>{
  assert.match(experimentResultsQuery,/g\.session_id=e\.session_id AND g\.id>e\.exposure_id/);
  assert.match(experimentResultsQuery,/json_extract\(g\.metadata,'\$\.variant'\)=e\.variant/);
  assert.match(experimentResultsQuery,/json_extract\(g\.metadata,'\$\.goal'\)='primary_cta'/);
});

test("executes the matched-exposure query against SQLite",()=>{
  const db=new DatabaseSync(":memory:");
  db.exec("CREATE TABLE analytics_events (id INTEGER PRIMARY KEY AUTOINCREMENT,session_id TEXT,event_type TEXT,path TEXT,metadata TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  const insert=db.prepare("INSERT INTO analytics_events (session_id,event_type,path,metadata) VALUES (?,?,?,?)");
  const event=(session,eventType,variant,mode="assigned",goal)=>insert.run(session,eventType,"/wanted-10k",JSON.stringify({experiment:"wanted_landing_v1",variant,assignment_mode:mode,...goal&&{goal}}));
  event("matched_session","experiment_exposure","control");event("matched_session","experiment_goal","control","assigned","primary_cta");
  event("early_goal_session","experiment_goal","proof","assigned","primary_cta");event("early_goal_session","experiment_exposure","proof");
  event("wrong_variant_session","experiment_exposure","developer");event("wrong_variant_session","experiment_goal","control","assigned","primary_cta");
  event("preview_session","experiment_exposure","control","preview");event("preview_session","experiment_goal","control","preview","primary_cta");
  const rows=db.prepare(experimentResultsQuery).all("wanted_landing_v1","wanted_landing_v1");
  const found=new Map(rows.map(row=>[row.variant,row]));
  assert.deepEqual({...found.get("control")},{variant:"control",exposed_sessions:1,goal_sessions:1});
  assert.deepEqual({...found.get("proof")},{variant:"proof",exposed_sessions:1,goal_sessions:0});
  assert.deepEqual({...found.get("developer")},{variant:"developer",exposed_sessions:1,goal_sessions:0});
  db.close();
});

test("accepts only current, internal, schema-valid experiment events",()=>{
  const exposure={experiment:"wanted_landing_v1",variant:"control",assignment_mode:"assigned",rotator_version:"0.3-R3"};
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",exposure),true);
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",{...exposure,variant:"invented"}),false);
  assert.equal(validExperimentEvent("experiment_exposure","/wanted-10k",{...exposure,rotator_version:"0.2-R2"}),false);
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

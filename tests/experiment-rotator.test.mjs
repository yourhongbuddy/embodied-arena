import assert from "node:assert/strict";
import test from "node:test";
import { assignWantedVariant, experimentRotatorContract, resolveWantedAssignment, validWantedVariant, WANTED_LANDING_EXPERIMENT } from "../app/experiments/rotator.ts";

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
  assert.equal(experimentRotatorContract.counting.preview_mode_included,false);
  assert.equal(experimentRotatorContract.safety_boundary.presentation_only,true);
  assert.equal(experimentRotatorContract.safety_boundary.changes_score,false);
  assert.equal(experimentRotatorContract.safety_boundary.changes_certification,false);
  assert.equal(experimentRotatorContract.safety_boundary.changes_registry_rank,false);
});

test("rejects malformed assignment seeds",()=>{assert.throws(()=>assignWantedVariant("short"),/bounded anonymous/)});

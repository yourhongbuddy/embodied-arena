import assert from "node:assert/strict";
import test from "node:test";
import { HUMAN_MEASURES_PROFILE_VERSION, assessHumanMeasures, humanMeasuresContract, humanMeasuresSchema, humanMeasuresTemplate, humanMeasuresTemplateFor, reproduceHumanMeasures } from "../app/wanted-10k/human-measures/profile.ts";

const clone=value=>structuredClone(value);
const gate=(result,id)=>result.gates.find(item=>item.id===id);

test("reproduces the complete randomized human-measures profile",()=>{
  const result=assessHumanMeasures(humanMeasuresTemplate);
  assert.equal(result.status,"passed",JSON.stringify(result.gates));
  assert.equal(result.summary.environment_count,24);
  assert.equal(result.summary.eligible_prompt_sets,120);
  assert.equal(result.summary.phase_profiles.length,5);
  assert.equal(result.summary.phase_profiles.every(item=>item.due===24),true);
  for(const target of ["WANTED_LAB","WANTED_10K"]){
    const targetResult=assessHumanMeasures(humanMeasuresTemplateFor(target));
    assert.equal(targetResult.status,"passed",target);
    assert.equal(targetResult.summary.environment_count,1);
  }
});

test("retains missing prompts and nonresponses in the denominator",()=>{
  const missing=clone(humanMeasuresTemplate);
  missing.records.pop();
  assert.equal(gate(assessHumanMeasures(missing),"H1").passed,false);
  const dropped=clone(humanMeasuresTemplate);
  const record=dropped.records.find(item=>item.response_status==="nonresponse");
  record.response_status="completed";
  assert.equal(gate(assessHumanMeasures(dropped),"H5").passed,false);
});

test("rejects coaching, contingent incentives, and schedule drift",()=>{
  const coached=clone(humanMeasuresTemplate);
  coached.records[0].researcher_contact_minutes=1;
  assert.equal(gate(assessHumanMeasures(coached),"H4").passed,false);
  const incentive=clone(humanMeasuresTemplate);
  incentive.records[0].answer_linked_incentive=true;
  assert.equal(gate(assessHumanMeasures(incentive),"H4").passed,false);
  const drift=clone(humanMeasuresTemplate);
  drift.protocol.schedule_frozen_before_hour_one=false;
  assert.equal(gate(assessHumanMeasures(drift),"H3").passed,false);
});

test("reproduces phase profiles and preserves nulls without completed answers",()=>{
  const sparse=clone(humanMeasuresTemplateFor("WANTED_10K"));
  for(const record of sparse.records){record.response_status="nonresponse";record.responded_at=null;record.keep_choice=null;record.value_recent=null;record.burden_created=null;record.trust_unsupervised=null;record.neutral_reminders=1}
  sparse.claimed=reproduceHumanMeasures(sparse.records);
  const result=assessHumanMeasures(sparse);
  assert.equal(result.status,"passed");
  assert.equal(result.summary.completion_rate,0);
  assert.equal(result.summary.keep_rate,null);
  assert.equal(result.summary.phase_profiles.every(item=>item.keep_rate===null),true);
  const mismatch=clone(humanMeasuresTemplate);
  mismatch.claimed.keep_rate=.5;
  assert.equal(gate(assessHumanMeasures(mismatch),"H6").passed,false);
});

test("publishes the exact four-item non-ranking contract",()=>{
  assert.equal(HUMAN_MEASURES_PROFILE_VERSION,"0.2-H1");
  assert.equal(humanMeasuresContract.ranking_effect,"none");
  assert.deepEqual(humanMeasuresContract.questions.map(item=>item.id),["keep","value","burden","trust"]);
  assert.equal(humanMeasuresSchema.additionalProperties,false);
  assert.equal(humanMeasuresSchema.properties.protocol.properties.response_window_hours.const,72);
});

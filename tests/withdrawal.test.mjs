import assert from "node:assert/strict";
import test from "node:test";
import { WITHDRAWAL_PROFILE_VERSION, assessWithdrawal, reproduceWithdrawal, withdrawalContract, withdrawalSchema, withdrawalTemplate, withdrawalTemplateFor } from "../app/wanted-10k/withdrawal/profile.ts";

const clone=value=>structuredClone(value);
const gate=(result,id)=>result.gates.find(item=>item.id===id);

test("reproduces the complete seven-day withdrawal profile",()=>{
  const result=assessWithdrawal(withdrawalTemplate);
  assert.equal(result.status,"passed",JSON.stringify(result.gates));
  assert.equal(result.summary.eligible,8);
  assert.equal(result.summary.completed,8);
  assert.equal(result.summary.return_request_rate,.75);
  assert.equal(result.summary.reacquisition_rate,.75);
  assert.equal(result.summary.median_days_to_return_request,2.5);
  assert.equal(result.summary.median_identifiable,true);
  const lifetime=assessWithdrawal(withdrawalTemplateFor("WANTED_10K"));
  assert.equal(lifetime.status,"passed");
  assert.equal(lifetime.summary.eligible,1);
  assert.equal(lifetime.summary.reacquisition_rate,1);
});

test("fails selected withdrawal subsets and duplicate lifetime units",()=>{
  const subset=clone(withdrawalTemplate);
  subset.records.pop();
  assert.equal(gate(assessWithdrawal(subset),"W1").passed,false);
  const duplicate=clone(withdrawalTemplate);
  duplicate.records[1].environment_id_sha256=duplicate.records[0].environment_id_sha256;
  assert.equal(gate(assessWithdrawal(duplicate),"W2").passed,false);
});

test("fails contaminated, shortened, and early-reinstalled absences",()=>{
  const replacement=clone(withdrawalTemplate);
  replacement.records[0].replacement_robot_provided=true;
  assert.equal(gate(assessWithdrawal(replacement),"W3").passed,false);
  const shortened=clone(withdrawalTemplate);
  shortened.records[0].withdrawal_completed_at="2027-03-07T00:00:00.000Z";
  assert.equal(gate(assessWithdrawal(shortened),"W4").passed,false);
  const early=clone(withdrawalTemplate);
  early.records[0].reinstallation_at="2027-03-04T00:00:00.000Z";
  assert.equal(gate(assessWithdrawal(early),"W5").passed,false);
});

test("reproduces claims and preserves an unidentifiable median as null",()=>{
  const mismatch=clone(withdrawalTemplate);
  mismatch.claimed.reacquisition_rate=.5;
  assert.equal(gate(assessWithdrawal(mismatch),"W6").passed,false);
  const sparse=clone(withdrawalTemplate);
  for(let index=3;index<sparse.records.length;index++) sparse.records[index].first_return_request_at=null;
  sparse.claimed=reproduceWithdrawal(sparse.records);
  const result=assessWithdrawal(sparse);
  assert.equal(result.status,"passed");
  assert.equal(result.summary.median_identifiable,false);
  assert.equal(result.summary.median_days_to_return_request,null);
});

test("publishes a strict non-ranking withdrawal contract",()=>{
  assert.equal(WITHDRAWAL_PROFILE_VERSION,"0.2-W1");
  assert.equal(withdrawalContract.absence_hours,168);
  assert.equal(withdrawalContract.ranking_effect,"none");
  assert.equal(withdrawalSchema.additionalProperties,false);
  assert.equal(withdrawalSchema.properties.protocol.properties.early_reinstallation_permitted.const,false);
});

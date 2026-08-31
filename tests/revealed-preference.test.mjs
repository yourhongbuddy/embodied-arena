import assert from "node:assert/strict";
import test from "node:test";
import { assessPreference, preferenceContract, preferenceTemplate, reproducePreference, RESERVATION_MILESTONES } from "../app/wanted-10k/revealed-preference/profile.ts";

const clone=value=>structuredClone(value);
const gate=(result,id)=>result.gates.find(item=>item.id===id);

test("reproduces the complete seven-milestone preference substudy",()=>{
  const result=assessPreference(preferenceTemplate);
  assert.equal(result.status,"passed",JSON.stringify(result));
  assert.deepEqual(result.summary.milestone_profiles.map(item=>item.milestone_hour),RESERVATION_MILESTONES);
  assert.equal(result.summary.due_choices,56);
  assert.equal(result.summary.nonresponse_choices,1);
});

test("retains nonresponse and every exposure-derived due choice",()=>{
  const missing=clone(preferenceTemplate);missing.choices.pop();missing.declared_due_choices--;
  const hidden=assessPreference(missing);
  assert.equal(gate(hidden,"RP1").passed,false);
  const recoded=clone(preferenceTemplate);const row=recoded.choices.find(item=>item.response_status==="nonresponse");row.response_status="completed";row.responded_at=row.presented_at;row.choice="keep_robot";row.choice_honored_at=row.presented_at;row.robot_access_continued=true;recoded.claimed=reproducePreference(recoded.environments,recoded.choices);
  assert.equal(assessPreference(recoded).status,"passed");
});

test("rejects coaching, offer drift, and unhonored choices",()=>{
  const coached=clone(preferenceTemplate);coached.choices[0].researcher_contact_minutes=1;assert.equal(gate(assessPreference(coached),"RP3").passed,false);
  const drift=clone(preferenceTemplate);drift.choices[0].offer_units=3;assert.equal(gate(assessPreference(drift),"RP3").passed,false);
  const unhonored=clone(preferenceTemplate);const alternative=unhonored.choices.find(item=>item.choice==="alternative_benefit");alternative.alternative_benefit_delivered=false;assert.equal(gate(assessPreference(unhonored),"RP5").passed,false);
  const wrongDraw=clone(preferenceTemplate);wrongDraw.choices[0].offer_units=wrongDraw.protocol.offer_lattice_units.find(value=>value!==wrongDraw.choices[0].offer_units);assert.equal(gate(assessPreference(wrongDraw),"RP3").passed,false);
  const overlap=clone(preferenceTemplate);overlap.upstream_bindings.cross_cohort_overlap_count=1;assert.equal(gate(assessPreference(overlap),"RP7").passed,false);
});

test("reports interval-censored median bounds without false precision",()=>{
  const result=assessPreference(preferenceTemplate),at10k=result.summary.milestone_profiles.find(item=>item.milestone_hour===10000);
  assert.equal(typeof at10k.reservation_median_lower_units,"number");
  assert.ok(at10k.reservation_median_upper_units===null||at10k.reservation_median_upper_units>=at10k.reservation_median_lower_units);
  const noAnswers=clone(preferenceTemplate);for(const row of noAnswers.choices.filter(item=>item.milestone_hour===500)){Object.assign(row,{response_status:"nonresponse",responded_at:null,choice:null,choice_honored_at:null,robot_access_continued:null,alternative_benefit_delivered:false})}noAnswers.claimed=reproducePreference(noAnswers.environments,noAnswers.choices);
  const empty=assessPreference(noAnswers).summary.milestone_profiles.find(item=>item.milestone_hour===500);
  assert.equal(empty.reservation_median_lower_units,null);assert.equal(empty.reservation_median_upper_units,null);assert.equal(empty.reservation_median_identified,false);
});

test("publishes an exact non-ranking, separate-cohort contract",()=>{
  assert.equal(preferenceContract.version,"0.2-RP1");
  assert.equal(preferenceContract.ranking_effect,"none");
  assert.match(preferenceContract.cohort_separation,/never_pooled/);
  assert.equal(preferenceContract.estimator.finite_upper_bound_is_open,true);
});

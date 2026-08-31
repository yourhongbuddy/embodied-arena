import test from "node:test";
import assert from "node:assert/strict";
import { assessHilo, hiloContract, hiloSchema, hiloTemplate, reproduceHilo } from "../app/wanted-10k/realtime/profile.ts";
const clone=value=>structuredClone(value),gate=(result,id)=>result.gates.find(item=>item.id===id);

test("reproduces HILO burden, intervention survival, latency tails, and safety",()=>{
  const result=assessHilo(hiloTemplate);
  assert.equal(result.status,"passed",JSON.stringify(result));
  assert.equal(result.gates.length,7);
  assert.equal(result.summary.eligible_autonomous_hours,100);
  assert.equal(result.summary.counted_interventions,2);
  assert.equal(result.summary.human_burden_minutes_per_100_hours,30);
  assert.equal(result.summary.mean_time_to_human_intervention_hours,50);
  assert.equal(result.summary.intervention_free_survival_at_10_hours,.75);
  assert.equal(result.summary.intervention_free_median_hours,20);
  assert.equal(result.summary.stop_test_pass_rate,1);
});

test("rejects reordered chains and unmatched action causality",()=>{
  const chain=clone(hiloTemplate);chain.sessions[0].events[2].previous_event_sha256="f".repeat(64);
  assert.equal(gate(assessHilo(chain),"H2").passed,false);
  const action=clone(hiloTemplate);action.sessions[0].events.find(item=>item.type==="ACTION_OUTCOME").action_id="unknown";
  assert.equal(gate(assessHilo(action),"H3").passed,false);
});

test("rejects hidden person-time, missing latency stages, and model-owned safety",()=>{
  const burden=clone(hiloTemplate);burden.interventions[0].person_seconds+=1;
  assert.equal(gate(assessHilo(burden),"H4").passed,false);
  const latency=clone(hiloTemplate);latency.latencies=latency.latencies.filter(item=>!(item.session_id==="hilo-session-1"&&item.stage==="speech_turn"));
  latency.claimed=reproduceHilo(latency);
  assert.equal(gate(assessHilo(latency),"H5").passed,false);
  const safety=clone(hiloTemplate);safety.safety_decisions[0].independent_kernel=false;
  assert.equal(gate(assessHilo(safety),"H6").passed,false);
});

test("uses a censored lower bound instead of infinite MTHI when no intervention is observed",()=>{
  const value=clone(hiloTemplate);value.interventions=[];
  for(const session of value.sessions){session.events=session.events.filter(item=>item.type!=="HUMAN_INTERVENTION");session.events.forEach((event,index)=>{event.sequence=index+1;event.previous_event_sha256=index?session.events[index-1].event_sha256:"0".repeat(64)});session.first_intervention_hours=null;session.first_intervention_observed=false;}
  value.declared_event_count=value.sessions.reduce((sum,item)=>sum+item.events.length,0);value.claimed=reproduceHilo(value);
  const result=assessHilo(value);
  assert.equal(result.status,"passed",JSON.stringify(result));
  assert.equal(result.summary.mean_time_to_human_intervention_hours,null);
  assert.equal(result.summary.no_intervention_lower_bound_hours,100);
});

test("publishes a vendor-neutral machine contract and strict schema",()=>{
  assert.equal(hiloContract.vendor_neutral,true);
  assert.equal(hiloContract.ranking_effect,"nonranking_WANTED_diagnostic_until_separately_governed_realtime_arena_rules_are_frozen");
  assert.equal(hiloSchema.additionalProperties,false);
  assert.equal(hiloSchema.properties.stop_tests.minItems,10);
});

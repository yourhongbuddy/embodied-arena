export const EXPERIMENT_DECISION_POLICY_PROFILE="0.37-DSP1";
export const EXPERIMENT_DECISION_POLICY_BUNDLE_PROFILE="wanted_experiment_fixed_close_bundle_0.37-DSP1";
export const EXPERIMENT_DECISION_POLICY_MINIMUM_LIFT=.02;
export const EXPERIMENT_DECISION_POLICY_TARGETS={control:4720,proof:4581,developer:4581}as const;
export const EXPERIMENT_DECISION_POLICY_PLAN_SHA256="9a57d5e55a2da89ee3547bd03d01010398dba1928be85a5df7603765b66a72b9";
export const EXPERIMENT_DECISION_POLICY_CLI_EXIT_CODES={pass:0,verification_failed:1,usage_or_input_error:2}as const;

type Variant="proof"|"developer";
type Outcome="recommend_proof_for_human_review"|"recommend_developer_for_human_review"|"retain_control_for_human_review"|"inconclusive"|"invalid";
const rootKeys=["profile","evidence_purpose","experiment","analysis_cohort","rotator_version","registered_plan_sha256","analysis_mode","final_window_frozen","one_final_look","rolling_dashboard_used","accepted_exposures","integrity","guardrails","comparisons","human_approval"]as const;
const exposureKeys=["control","proof","developer"]as const;
const integrityKeys=["registration_bundle_verified","registry_publication_authenticated","first_exposure_boundary_authenticated","sample_ratio_mismatch","unit_delivery_balance","independent_edge_abuse_control","current_cohort_and_fingerprints","live_assignment_receipts"]as const;
const guardrailKeys=["safety_incident","privacy_breach","data_integrity_failure"]as const;
const comparisonKeys=["variant","absolute_lift","familywise_interval_95"]as const;
const intervalKeys=["low","high"]as const;
const approvalKeys=["required","granted"]as const;

function exactKeys(value:unknown,keys:readonly string[]){return Boolean(value&&typeof value==="object"&&!Array.isArray(value)&&JSON.stringify(Object.keys(value).sort())===JSON.stringify([...keys].sort()))}
const record=(value:unknown)=>value as Record<string,unknown>;
const finite=(value:unknown)=>typeof value==="number"&&Number.isFinite(value);

export type ExperimentDecisionPolicyResult={profile:typeof EXPERIMENT_DECISION_POLICY_PROFILE;status:"pass"|"fail";policy_outcome:Outcome;recommended_variant:"control"|Variant|null;decision_eligible:boolean;deployment_authorized:false;automatic_deployment:false;human_approval_required:true;qualifying_variants:Variant[];errors:string[];reasons:string[];limitations:string[]};

export function evaluateExperimentDecisionPolicy(value:unknown):ExperimentDecisionPolicyResult{
  const errors:string[]=[],reasons:string[]=[],qualifying:Variant[]=[];
  if(!exactKeys(value,rootKeys))errors.push("Bundle fields do not match the fixed-close contract.");
  const bundle=record(value),exposures=record(bundle?.accepted_exposures),integrity=record(bundle?.integrity),guardrails=record(bundle?.guardrails),approval=record(bundle?.human_approval);
  if(bundle?.profile!==EXPERIMENT_DECISION_POLICY_BUNDLE_PROFILE||bundle?.experiment!=="wanted_landing_v1"||bundle?.analysis_cohort!=="wanted_landing_v1-C8"||bundle?.rotator_version!=="0.36-R36")errors.push("Experiment identity does not match the frozen R36 design.");
  if(bundle?.registered_plan_sha256!==EXPERIMENT_DECISION_POLICY_PLAN_SHA256)errors.push("Registered plan digest does not match the frozen design.");
  if(bundle?.analysis_mode!=="fixed_close_final"||bundle?.final_window_frozen!==true||bundle?.one_final_look!==true||bundle?.rolling_dashboard_used!==false)errors.push("Evidence must be one frozen final look and must not use the rolling dashboard.");
  if(bundle?.evidence_purpose!=="production"&&bundle?.evidence_purpose!=="conformance_only")errors.push("Evidence purpose must be production or conformance_only.");
  if(!exactKeys(exposures,exposureKeys))errors.push("Accepted-exposure fields are invalid.");
  for(const variant of exposureKeys){const count=exposures?.[variant];if(!Number.isInteger(count)||Number(count)<EXPERIMENT_DECISION_POLICY_TARGETS[variant])errors.push(`${variant} accepted exposures are below the preregistered target.`)}
  if(!exactKeys(integrity,integrityKeys))errors.push("Integrity-gate fields are invalid.");
  for(const gate of integrityKeys){if(integrity?.[gate]!==true&&integrity?.[gate]!=="pass")errors.push(`${gate} did not pass.`)}
  if(!exactKeys(guardrails,guardrailKeys)||guardrailKeys.some(key=>typeof guardrails?.[key]!=="boolean"))errors.push("Guardrail fields are invalid.");
  if(!exactKeys(approval,approvalKeys)||approval?.required!==true||typeof approval?.granted!=="boolean")errors.push("Human-approval fields are invalid.");
  const comparisons=Array.isArray(bundle?.comparisons)?bundle.comparisons:[];
  if(comparisons.length!==2)errors.push("Exactly two treatment comparisons are required.");
  const seen=new Set<string>();
  for(const raw of comparisons){
    const item=record(raw),interval=record(item?.familywise_interval_95),variant=item?.variant;
    if(!exactKeys(item,comparisonKeys)||!exactKeys(interval,intervalKeys)||!(variant==="proof"||variant==="developer")||seen.has(String(variant))||!finite(item?.absolute_lift)||!finite(interval?.low)||!finite(interval?.high)||Number(interval?.low)>Number(interval?.high)||Number(item?.absolute_lift)<Number(interval?.low)||Number(item?.absolute_lift)>Number(interval?.high)){errors.push("Comparison rows must be unique, finite, ordered, and contain the estimate.");continue}
    seen.add(variant);if(Number(interval.low)>=EXPERIMENT_DECISION_POLICY_MINIMUM_LIFT)qualifying.push(variant);
  }
  if(errors.length)return result("fail","invalid",null,false,qualifying,errors,["Malformed or incomplete evidence cannot produce a policy recommendation."]);
  const guardrailFailure=guardrailKeys.filter(key=>guardrails[key]===true);
  let outcome:Outcome="inconclusive",recommended:"control"|Variant|null=null;
  if(guardrailFailure.length){outcome="retain_control_for_human_review";recommended="control";reasons.push(`Hard guardrail triggered: ${guardrailFailure.join(", ")}.`)}
  else if(qualifying.length===1){recommended=qualifying[0];outcome=`recommend_${recommended}_for_human_review` as Outcome;reasons.push(`${recommended} is the only treatment whose familywise lower bound meets the 2 percentage-point practical threshold.`)}
  else if(qualifying.length===2)reasons.push("Both treatments meet the threshold; the precommitted rule refuses a post-hoc tie-break.");
  else{
    const allFutile=comparisons.every(raw=>Number(record(record(raw).familywise_interval_95).high)<EXPERIMENT_DECISION_POLICY_MINIMUM_LIFT);
    if(allFutile){outcome="retain_control_for_human_review";recommended="control";reasons.push("Both familywise upper bounds are below the practical threshold.")}
    else reasons.push("No treatment clears the practical threshold and at least one interval still includes a practically meaningful effect.");
  }
  if(bundle.evidence_purpose==="production")reasons.push("A production label is a claim, not authentication; a separately verified signed evidence seal is required before policy review.");
  else reasons.push("Synthetic conformance evidence cannot be decision eligible.");
  return result("pass",outcome,recommended,false,qualifying,[],reasons);
}

function result(status:"pass"|"fail",policy_outcome:Outcome,recommended_variant:"control"|Variant|null,decision_eligible:boolean,qualifying_variants:Variant[],errors:string[],reasons:string[]):ExperimentDecisionPolicyResult{return{profile:EXPERIMENT_DECISION_POLICY_PROFILE,status,policy_outcome,recommended_variant,decision_eligible,deployment_authorized:false,automatic_deployment:false,human_approval_required:true,qualifying_variants,errors,reasons,limitations:["This evaluator validates supplied evidence but does not contact a registry or authenticate external systems.","A policy recommendation is not a winner declaration, deployment authorization, or substitute for human review.","The live rolling dashboard is never admissible fixed-close evidence."]}}

export const EXPERIMENT_DECISION_POLICY_REFERENCE_BUNDLE={profile:EXPERIMENT_DECISION_POLICY_BUNDLE_PROFILE,evidence_purpose:"conformance_only",experiment:"wanted_landing_v1",analysis_cohort:"wanted_landing_v1-C8",rotator_version:"0.36-R36",registered_plan_sha256:EXPERIMENT_DECISION_POLICY_PLAN_SHA256,analysis_mode:"fixed_close_final",final_window_frozen:true,one_final_look:true,rolling_dashboard_used:false,accepted_exposures:{control:4720,proof:4581,developer:4581},integrity:{registration_bundle_verified:true,registry_publication_authenticated:true,first_exposure_boundary_authenticated:true,sample_ratio_mismatch:"pass",unit_delivery_balance:"pass",independent_edge_abuse_control:"pass",current_cohort_and_fingerprints:"pass",live_assignment_receipts:"pass"},guardrails:{safety_incident:false,privacy_breach:false,data_integrity_failure:false},comparisons:[{variant:"proof",absolute_lift:.031,familywise_interval_95:{low:.022,high:.04}},{variant:"developer",absolute_lift:.014,familywise_interval_95:{low:.005,high:.023}}],human_approval:{required:true,granted:false}}as const;

export const experimentDecisionPolicyContract={name:"Embodied Arena WANTED Fixed-Close Decision Policy",version:EXPERIMENT_DECISION_POLICY_PROFILE,bundle_profile:EXPERIMENT_DECISION_POLICY_BUNDLE_PROFILE,experiment:"wanted_landing_v1",analysis_cohort:"wanted_landing_v1-C8",rotator_version:"0.36-R36",registered_plan_sha256:EXPERIMENT_DECISION_POLICY_PLAN_SHA256,minimum_practical_absolute_lift:EXPERIMENT_DECISION_POLICY_MINIMUM_LIFT,comparison_interval:"Bonferroni-familywise 95% Newcombe-Wilson",outcomes:["recommend_proof_for_human_review","recommend_developer_for_human_review","retain_control_for_human_review","inconclusive","invalid"],module:"/experiments/wanted-decision-policy.mjs",schema:"/experiments/decision-policy.schema.json",reference_bundle:"/experiments/decision-policy.reference.json",lab:"/experiments/decision-lab",evidence_seal_verifier:"/experiments/wanted-decision-evidence.mjs",runtime_dependencies:0,performs_network_requests:false,uses_rolling_dashboard:false,automatic_deployment:false,human_approval_required:true,decision_eligible_without_verified_evidence_seal:false,selects_version:false,interpretation:"precommitted fixed-close policy evaluation only; a production label is never authentication, a separately verified signed evidence seal is required before review, and every recommendation requires accountable human approval"}as const;

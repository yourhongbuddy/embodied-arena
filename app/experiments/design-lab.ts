import{LOCAL_ONLY_ANALYTICS_PATHS}from"./analytics-boundary.ts";
import{canonicalTreatmentJson,EXPERIMENT_ANALYSIS_COHORT,EXPERIMENT_DECISION_GATE,ROTATOR_VERSION,WANTED_LANDING_EXPERIMENT,type WantedVariant}from"./rotator.ts";

export const EXPERIMENT_DESIGN_LAB_PROFILE="0.34-DL1";
export const EXPERIMENT_DESIGN_COMPARISONS=["proof","developer"]as const satisfies readonly WantedVariant[];

export type ExperimentDesignInput={
  baseline_rate:number;
  proof_minimum_detectable_lift:number;
  developer_minimum_detectable_lift:number;
  familywise_alpha:number;
  power:number;
  expected_accepted_delivery_rate:number;
  eligible_units_per_day:number;
};

export const DEFAULT_EXPERIMENT_DESIGN_INPUT:ExperimentDesignInput={baseline_rate:.10,proof_minimum_detectable_lift:.02,developer_minimum_detectable_lift:.02,familywise_alpha:.05,power:.80,expected_accepted_delivery_rate:.90,eligible_units_per_day:250};

function finite(value:number){return typeof value==="number"&&Number.isFinite(value)}
export function validExperimentDesignInput(input:ExperimentDesignInput){
  const lifts=[input.proof_minimum_detectable_lift,input.developer_minimum_detectable_lift];
  return finite(input.baseline_rate)&&input.baseline_rate>=.001&&input.baseline_rate<=.95&&lifts.every(value=>finite(value)&&value>=.001&&value<=.25&&input.baseline_rate+value<1)&&finite(input.familywise_alpha)&&input.familywise_alpha>=.001&&input.familywise_alpha<=.10&&finite(input.power)&&input.power>=.60&&input.power<=.99&&finite(input.expected_accepted_delivery_rate)&&input.expected_accepted_delivery_rate>=.50&&input.expected_accepted_delivery_rate<=1&&Number.isInteger(input.eligible_units_per_day)&&input.eligible_units_per_day>=1&&input.eligible_units_per_day<=1_000_000;
}

export function inverseStandardNormal(probability:number){
  if(!finite(probability)||probability<=0||probability>=1)throw new RangeError("Probability must be strictly between zero and one.");
  const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239];
  const b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572];
  const c=[-.007784894002430293,-.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783];
  const d=[.007784695709041462,.3224671290700398,2.445134137142996,3.754408661907416];
  const low=.02425,high=1-low;
  if(probability<low){const q=Math.sqrt(-2*Math.log(probability));return(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}
  if(probability>high){const q=Math.sqrt(-2*Math.log(1-probability));return-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}
  const q=probability-.5,r=q*q;
  return(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}

function allocationShare(variant:WantedVariant){const row=WANTED_LANDING_EXPERIMENT.variants.find(item=>item.id===variant);if(!row)throw new Error("Unknown presentation version.");return row.weight_basis_points/WANTED_LANDING_EXPERIMENT.allocation_basis_points}

export function planFixedHorizonExperiment(input:ExperimentDesignInput){
  if(!validExperimentDesignInput(input))throw new RangeError("Design inputs fall outside the frozen planning bounds.");
  const comparisons=EXPERIMENT_DESIGN_COMPARISONS.length,perComparisonAlpha=input.familywise_alpha/comparisons,zAlpha=inverseStandardNormal(1-perComparisonAlpha/2),zPower=inverseStandardNormal(input.power),controlShare=allocationShare("control");
  const lifts={proof:input.proof_minimum_detectable_lift,developer:input.developer_minimum_detectable_lift};
  const rows=EXPERIMENT_DESIGN_COMPARISONS.map(variant=>{
    const variantShare=allocationShare(variant),alternativeRate=Number((input.baseline_rate+lifts[variant]).toFixed(12)),pooledRate=(controlShare*input.baseline_rate+variantShare*alternativeRate)/(controlShare+variantShare);
    const nullVariance=pooledRate*(1-pooledRate)*(1/controlShare+1/variantShare),alternativeVariance=input.baseline_rate*(1-input.baseline_rate)/controlShare+alternativeRate*(1-alternativeRate)/variantShare;
    const requiredAcceptedTraffic=Math.ceil((zAlpha*Math.sqrt(nullVariance)+zPower*Math.sqrt(alternativeVariance))**2/lifts[variant]**2);
    const requiredAcceptedControl=Math.ceil(requiredAcceptedTraffic*controlShare),requiredAcceptedVariant=Math.ceil(requiredAcceptedTraffic*variantShare);
    return{variant,baseline:"control"as const,minimum_detectable_absolute_lift:lifts[variant],alternative_rate:alternativeRate,allocation_share:variantShare,required_accepted_traffic:requiredAcceptedTraffic,required_accepted_control:requiredAcceptedControl,required_accepted_variant:requiredAcceptedVariant,planned_issued_control:Math.ceil(requiredAcceptedControl/input.expected_accepted_delivery_rate),planned_issued_variant:Math.ceil(requiredAcceptedVariant/input.expected_accepted_delivery_rate)};
  });
  const stopTargets={control:Math.max(...rows.map(row=>row.required_accepted_control)),proof:rows.find(row=>row.variant==="proof")!.required_accepted_variant,developer:rows.find(row=>row.variant==="developer")!.required_accepted_variant};
  const plannedIssuedTargets={control:Math.ceil(stopTargets.control/input.expected_accepted_delivery_rate),proof:Math.ceil(stopTargets.proof/input.expected_accepted_delivery_rate),developer:Math.ceil(stopTargets.developer/input.expected_accepted_delivery_rate)};
  const totalAcceptedTarget=stopTargets.control+stopTargets.proof+stopTargets.developer,totalIssuedTarget=plannedIssuedTargets.control+plannedIssuedTargets.proof+plannedIssuedTargets.developer;
  return{profile:EXPERIMENT_DESIGN_LAB_PROFILE,method:"normal_approximation_two_independent_proportions_unequal_allocation",multiplicity:"bonferroni_two_sided_familywise",comparisons,per_comparison_alpha:perComparisonAlpha,z_alpha_two_sided:zAlpha,z_power:zPower,input,rows,stop_targets_accepted_exposures:stopTargets,planned_issued_targets:plannedIssuedTargets,total_accepted_target:totalAcceptedTarget,total_issued_target:totalIssuedTarget,estimated_calendar_days:Math.ceil(totalIssuedTarget/input.eligible_units_per_day),stopping_rule:"close_only_after_every_per_arm_accepted_exposure_target_is_met_and_the_fixed_analysis_window_is_frozen",decision_effect:"none"as const};
}

export function experimentDesignPlanDocument(input:ExperimentDesignInput){return{schema_profile:"wanted_landing_design_plan_0.34-DL1",profile:EXPERIMENT_DESIGN_LAB_PROFILE,status:"draft_requires_external_preregistration",experiment:WANTED_LANDING_EXPERIMENT.id,analysis_cohort:EXPERIMENT_ANALYSIS_COHORT,rotator_version:ROTATOR_VERSION,primary_goal:WANTED_LANDING_EXPERIMENT.primary_goal,design:planFixedHorizonExperiment(input),analysis:{effect_measure:"absolute_conversion_rate_difference_vs_control",interval:"newcombe_wilson",familywise_control:"bonferroni_two_comparisons_familywise_95_percent",analysis_unit:"experiment_scoped_anonymous_browser_unit",one_final_look:true,interim_inference:false},integrity_gates:{sample_ratio_mismatch_p_at_least:.001,unit_delivery_balance_p_at_least:.001,current_cohort_and_fingerprints_required:true,live_assignment_receipts_required:true,independent_edge_abuse_control_required:true},selection_rule:"No automatic winner. Apply a separately preregistered human decision rule only after all targets and integrity gates pass.",current_site_decision_gate:EXPERIMENT_DECISION_GATE,interpretation:"Planning artifact only. A local digest is not an external timestamp, registration, decision, or authorization to select a version."}as const}

export function canonicalExperimentDesignPlan(input:ExperimentDesignInput){return canonicalTreatmentJson(experimentDesignPlanDocument(input))}
export async function experimentDesignPlanSha256(input:ExperimentDesignInput){const bytes=new TextEncoder().encode(canonicalExperimentDesignPlan(input)),digest=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("")}

export const EXPERIMENT_DESIGN_REFERENCE_SHA256="9a57d5e55a2da89ee3547bd03d01010398dba1928be85a5df7603765b66a72b9";

export const experimentDesignLabContract={
  profile:EXPERIMENT_DESIGN_LAB_PROFILE,rotator_version:ROTATOR_VERSION,route:"/experiments/design-lab",contract:"/experiments/design-lab.json",plan_schema:"/experiments/design-plan.schema.json",reference_plan:"/experiments/design-plan.reference.json",
  verifier:{profile:"0.35-DPV1",module:"/experiments/wanted-design-plan.mjs",contract:"/experiments/design-plan-verifier.json",runtime_dependencies:0,performs_network_requests:false},
  registration_verifier:{profile:"0.36-DPR1",lab:"/experiments/registration-lab",module:"/experiments/wanted-design-registration.mjs",contract:"/experiments/design-registration.json",schema:"/experiments/design-registration.schema.json",reference_bundle:"/experiments/design-registration.reference.json",runtime_dependencies:0,performs_network_requests:false},
  decision_policy:{profile:"0.37-DSP1",lab:"/experiments/decision-lab",module:"/experiments/wanted-decision-policy.mjs",contract:"/experiments/decision-policy.json",schema:"/experiments/decision-policy.schema.json",reference_bundle:"/experiments/decision-policy.reference.json",runtime_dependencies:0,performs_network_requests:false,uses_rolling_dashboard:false,automatic_deployment:false,human_approval_required:true},
  decision_evidence_seal:{profile:"0.38-DEA1",lab:"/experiments/evidence-seal-lab",module:"/experiments/wanted-decision-evidence.mjs",contract:"/experiments/decision-evidence.json",schema:"/experiments/decision-evidence.schema.json",reference_bundle:"/experiments/decision-evidence.reference.json",key_manifest:"/experiments/decision-evidence-keys.json",runtime_dependencies:0,performs_network_requests:false,automatic_deployment:false,human_approval_required:true},
  decision_approval:{profile:"0.39-DAR1",lab:"/experiments/approval-lab",module:"/experiments/wanted-decision-approval.mjs",contract:"/experiments/decision-approval.json",schema:"/experiments/decision-approval.schema.json",reference_bundle:"/experiments/decision-approval.reference.json",key_manifest:"/experiments/decision-approval-keys.json",runtime_dependencies:0,performs_network_requests:false,private_key_input_supported:false,automatic_deployment:false,changes_live_allocation:false},
  rollout_package:{profile:"0.40-RP1",lab:"/experiments/rollout-lab",module:"/experiments/wanted-rollout-package.mjs",contract:"/experiments/rollout-package.json",schema:"/experiments/rollout-package.schema.json",reference_package:"/experiments/rollout-package.reference.json",target_rotator_version:"0.37-R37",target_analysis_cohort:"wanted_landing_v1-C9",runtime_dependencies:0,performs_network_requests:false,automatic_progression:false,changes_live_allocation:false,deploys:false},
  experiment:WANTED_LANDING_EXPERIMENT.id,analysis_cohort:EXPERIMENT_ANALYSIS_COHORT,design:"fixed_horizon_two_independent_proportions",comparison_count:2,multiplicity:"bonferroni_two_sided_familywise",sample_size_method:"normal_approximation_unequal_allocation",sample_size_formula:"ceil((z_alpha*sqrt(p_bar*(1-p_bar)*(1/q_control+1/q_variant))+z_power*sqrt(p0*(1-p0)/q_control+p1*(1-p1)/q_variant))^2/delta^2)",pooled_rate_formula:"(q_control*p0+q_variant*p1)/(q_control+q_variant)",alpha_formula:"familywise_alpha/comparison_count",canonicalization:"sorted_key_recursive_json",digest:"SHA-256",digest_is_external_timestamp:false,accepted_input_bounds:{baseline_rate:[.001,.95],minimum_detectable_absolute_lift:[.001,.25],familywise_alpha:[.001,.10],power:[.60,.99],expected_accepted_delivery_rate:[.50,1],eligible_units_per_day:[1,1_000_000]},reference_design:{input:DEFAULT_EXPERIMENT_DESIGN_INPUT,stop_targets_accepted_exposures:{control:4_720,proof:4_581,developer:4_581},total_accepted_target:13_882,total_issued_target:15_425,estimated_calendar_days:62,canonical_plan_sha256:EXPERIMENT_DESIGN_REFERENCE_SHA256},performs_network_requests:false,creates_or_reads_persistent_identifier:false,sends_general_analytics:false,sends_experiment_analytics:false,flushes_experiment_goal_outbox:false,analytics_exclusion_paths:LOCAL_ONLY_ANALYTICS_PATHS,changes_live_allocation:false,changes_live_assignment:false,changes_decision_gate:false,preregisters_plan:false,selects_version:false,interpretation:"local planning and reproducibility only; external preregistration, independent traffic controls, fixed-close execution, and a precommitted decision rule remain required"
}as const;

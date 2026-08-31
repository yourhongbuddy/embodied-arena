export const POLICY_EVOLUTION_VERSION = "0.2-U1" as const;
export const POLICY_TARGETS = ["WANTED_LAB", "WANTED_WILD", "WANTED_10K"] as const;
export const POLICY_CHANGE_CLASSES = ["baseline", "configuration", "bugfix", "safety_hotfix", "capability_update"] as const;
export const POLICY_ROLLOUT_MODES = ["global_atomic", "preregistered_staged", "emergency_safety"] as const;
type PolicyTarget = typeof POLICY_TARGETS[number];
type ChangeClass = typeof POLICY_CHANGE_CLASSES[number];

export type PolicyArtifact = {
  artifact_sha256: string; version: string; parent_artifact_sha256: string | null;
  release_manifest_sha256: string; build_provenance_sha256: string; safety_assessment_sha256: string;
  released_at: string; change_class: ChangeClass; material_capability_change: boolean;
};
export type PolicyEnvironment = {
  environment_id_sha256: string; activated_at: string; terminal_at: string;
  resident_seconds: number; exposure_record_sha256: string;
};
export type PolicyChange = {
  change_id: string; from_artifact_sha256: string; to_artifact_sha256: string;
  change_class: Exclude<ChangeClass,"baseline"> | "rollback"; decision_at: string;
  rollout_started_at: string; rollout_completed_at: string; rollout_mode: typeof POLICY_ROLLOUT_MODES[number];
  rationale: string; cohort_outcomes_used: boolean; cohort_task_logs_used: boolean;
  participant_specific_targeting: boolean; preregistered_schedule_sha256: string;
  independent_safety_approval_sha256: string | null; creates_new_claim_revision: boolean;
};
export type PolicySegment = {
  environment_id_sha256: string; segment_id: string; artifact_sha256: string;
  started_at: string; ended_at: string; resident_seconds: number;
  activation_event_sha256: string; boundary_event_sha256: string;
};
export type ArtifactExposure = { artifact_sha256: string; environment_count: number; resident_hours: number; exposure_fraction: number };
export type PolicyClaim = {
  environment_count: number; artifact_count: number; change_event_count: number; deployment_segment_count: number;
  resident_hours: number; baseline_exposure_fraction: number; changed_exposure_fraction: number;
  material_update_count: number; safety_hotfix_count: number; rollback_count: number;
  longest_rollout_lag_hours: number; participant_specific_target_count: number;
  outcome_informed_update_count: number; task_log_informed_update_count: number;
  rankable_revision_intact: boolean; artifact_exposure: ArtifactExposure[];
};
export type PolicyInput = {
  profile_version: string; target_certification: PolicyTarget;
  protocol: {
    inclusion_rule: string; resident_time_source: string; telemetry_boundary_rule: string;
    local_adaptation_boundary: string; decision_information_rule: string; material_change_rule: string;
    unmatched_deployed_artifacts_permitted: boolean; max_global_rollout_lag_hours: number;
    max_preregistered_staged_rollout_lag_hours: number;
  };
  declared_environment_count: number; declared_artifact_count: number; declared_change_event_count: number;
  declared_deployment_segment_count: number; baseline_artifact_sha256: string;
  environments: PolicyEnvironment[]; artifacts: PolicyArtifact[]; changes: PolicyChange[];
  deployment_segments: PolicySegment[]; claimed: PolicyClaim;
  upstream_bindings: { exposure_integrity_sha256: string; telemetry_authenticity_sha256: string; preregistration_sha256: string; baseline_policy_sha256: string };
  evidence: { controlled_policy_register_uri: string; controlled_policy_register_sha256: string; release_manifest_bundle_uri: string; release_manifest_bundle_sha256: string; public_aggregate_only: boolean };
  assessor: { name: string; organization: string; independent_of_sponsor: boolean; attested: boolean; signed_at: string };
};
export type PolicyGate = { id: string; label: string; passed: boolean; detail: string; remedy: string };
export type PolicyResult = { status: "passed"|"failed"|"invalid"; errors: string[]; gates: PolicyGate[]; summary: ({profile_version:typeof POLICY_EVOLUTION_VERSION;status:"passed";target_certification:PolicyTarget}&PolicyClaim)|null };

const hash=(prefix:string)=>`${prefix}${"0123456789abcdef".repeat(4)}`.slice(0,64);
const digest=(value:unknown)=>typeof value==="string"&&/^[a-f0-9]{64}$/.test(value);
const utc=(value:unknown)=>typeof value==="string"&&!Number.isNaN(Date.parse(value))&&value.endsWith("Z");
const https=(value:unknown)=>typeof value==="string"&&value.startsWith("https://");
const close=(a:unknown,b:unknown)=>typeof a==="number"&&typeof b==="number"&&Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-7;
const round=(value:number)=>Number(value.toFixed(8));
const object=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==="object"&&!Array.isArray(value);
const gate=(id:string,label:string,passed:boolean,detail:string,remedy:string):PolicyGate=>({id,label,passed,detail:passed?detail:remedy,remedy});

export function reproducePolicyEvolution(environments:PolicyEnvironment[],artifacts:PolicyArtifact[],changes:PolicyChange[],segments:PolicySegment[],baselineArtifact:string):PolicyClaim {
  const residentSeconds=environments.reduce((sum,item)=>sum+item.resident_seconds,0);
  const baselineSeconds=segments.filter(item=>item.artifact_sha256===baselineArtifact).reduce((sum,item)=>sum+item.resident_seconds,0);
  const exposure=artifacts.map(artifact=>{
    const rows=segments.filter(item=>item.artifact_sha256===artifact.artifact_sha256);
    const seconds=rows.reduce((sum,item)=>sum+item.resident_seconds,0);
    return {artifact_sha256:artifact.artifact_sha256,environment_count:new Set(rows.map(item=>item.environment_id_sha256)).size,resident_hours:round(seconds/3600),exposure_fraction:round(residentSeconds?seconds/residentSeconds:0)};
  });
  const used=new Set(segments.map(item=>item.artifact_sha256));
  const material=changes.filter(item=>item.change_class==="capability_update"&&used.has(item.to_artifact_sha256));
  const lag=changes.map(item=>(Date.parse(item.rollout_completed_at)-Date.parse(item.rollout_started_at))/3600000);
  return {
    environment_count:environments.length, artifact_count:artifacts.length, change_event_count:changes.length,
    deployment_segment_count:segments.length, resident_hours:round(residentSeconds/3600),
    baseline_exposure_fraction:round(residentSeconds?baselineSeconds/residentSeconds:0),
    changed_exposure_fraction:round(residentSeconds?(residentSeconds-baselineSeconds)/residentSeconds:0),
    material_update_count:material.length, safety_hotfix_count:changes.filter(item=>item.change_class==="safety_hotfix").length,
    rollback_count:changes.filter(item=>item.change_class==="rollback").length,
    longest_rollout_lag_hours:round(lag.length?Math.max(...lag):0),
    participant_specific_target_count:changes.filter(item=>item.participant_specific_targeting).length,
    outcome_informed_update_count:changes.filter(item=>item.cohort_outcomes_used).length,
    task_log_informed_update_count:changes.filter(item=>item.cohort_task_logs_used).length,
    rankable_revision_intact:material.length===0&&changes.every(item=>!item.participant_specific_targeting&&!item.cohort_outcomes_used&&!item.cohort_task_logs_used),
    artifact_exposure:exposure,
  };
}

function sameExposure(a:ArtifactExposure[],b:ArtifactExposure[]){return Array.isArray(a)&&a.length===b.length&&a.every((item,index)=>item.artifact_sha256===b[index].artifact_sha256&&item.environment_count===b[index].environment_count&&close(item.resident_hours,b[index].resident_hours)&&close(item.exposure_fraction,b[index].exposure_fraction))}

export function assessPolicyEvolution(value:unknown):PolicyResult {
  const errors:string[]=[];
  if(!object(value))return{status:"invalid",errors:["Manifest must be a JSON object."],gates:[],summary:null};
  const input=value as unknown as PolicyInput;
  if(input.profile_version!==POLICY_EVOLUTION_VERSION)errors.push(`profile_version must equal ${POLICY_EVOLUTION_VERSION}.`);
  if(!POLICY_TARGETS.includes(input.target_certification))errors.push("target_certification is invalid.");
  if(!object(input.protocol)||!Array.isArray(input.environments)||!Array.isArray(input.artifacts)||!Array.isArray(input.changes)||!Array.isArray(input.deployment_segments)||!object(input.claimed)||!object(input.upstream_bindings)||!object(input.evidence)||!object(input.assessor))errors.push("Required profile sections are missing.");
  if(errors.length)return{status:"invalid",errors,gates:[],summary:null};
  const target=input.target_certification, envs=input.environments, artifacts=input.artifacts, changes=input.changes, segments=input.deployment_segments;
  const envIds=envs.map(item=>item.environment_id_sha256), artifactIds=artifacts.map(item=>item.artifact_sha256), changeIds=changes.map(item=>item.change_id), segmentIds=segments.map(item=>item.segment_id);
  const surfacePass=input.declared_environment_count===envs.length&&input.declared_artifact_count===artifacts.length&&input.declared_change_event_count===changes.length&&input.declared_deployment_segment_count===segments.length&&new Set(envIds).size===envIds.length&&new Set(artifactIds).size===artifactIds.length&&new Set(changeIds).size===changeIds.length&&new Set(segmentIds).size===segmentIds.length;
  const protocol=input.protocol;
  const protocolPass=protocol.inclusion_rule==="every_operator_deployed_policy_artifact_change_and_exposure_segment"&&protocol.resident_time_source==="passing_exposure_ledger_0.2-X1"&&protocol.telemetry_boundary_rule==="every_segment_boundary_is_a_signed_telemetry_event"&&protocol.local_adaptation_boundary==="online_personalization_is_not_an_update_only_when_the_learning_algorithm_is_frozen_in_the_baseline_artifact"&&protocol.decision_information_rule==="release_decisions_precede_access_to_current_cohort_outcomes_and_task_logs"&&protocol.material_change_rule==="capability_changes_create_a_new_claim_revision_and_cannot_share_ranked_exposure"&&protocol.unmatched_deployed_artifacts_permitted===false&&protocol.max_global_rollout_lag_hours===24&&protocol.max_preregistered_staged_rollout_lag_hours===168;
  const root=artifacts.find(item=>item.artifact_sha256===input.baseline_artifact_sha256);
  const artifactsPass=Boolean(root&&root.parent_artifact_sha256===null&&root.change_class==="baseline"&&!root.material_capability_change&&artifacts.filter(item=>item.parent_artifact_sha256===null).length===1&&artifacts.every(item=>digest(item.artifact_sha256)&&typeof item.version==="string"&&item.version.length>0&&digest(item.release_manifest_sha256)&&digest(item.build_provenance_sha256)&&digest(item.safety_assessment_sha256)&&utc(item.released_at)&&POLICY_CHANGE_CLASSES.includes(item.change_class)&&item.material_capability_change===(item.change_class==="capability_update")&&(item.parent_artifact_sha256===null||artifactIds.includes(item.parent_artifact_sha256))));
  const envPass=envs.every(item=>digest(item.environment_id_sha256)&&utc(item.activated_at)&&utc(item.terminal_at)&&Date.parse(item.terminal_at)>Date.parse(item.activated_at)&&Number.isInteger(item.resident_seconds)&&item.resident_seconds>0&&item.resident_seconds<=36000000&&close(item.resident_seconds,(Date.parse(item.terminal_at)-Date.parse(item.activated_at))/1000)&&digest(item.exposure_record_sha256));
  const segmentShapePass=segments.every(item=>envIds.includes(item.environment_id_sha256)&&artifactIds.includes(item.artifact_sha256)&&typeof item.segment_id==="string"&&item.segment_id.length>0&&utc(item.started_at)&&utc(item.ended_at)&&Date.parse(item.ended_at)>Date.parse(item.started_at)&&Number.isInteger(item.resident_seconds)&&item.resident_seconds>0&&close(item.resident_seconds,(Date.parse(item.ended_at)-Date.parse(item.started_at))/1000)&&digest(item.activation_event_sha256)&&digest(item.boundary_event_sha256));
  const continuousPass=envPass&&segmentShapePass&&envs.every(env=>{const rows=segments.filter(item=>item.environment_id_sha256===env.environment_id_sha256).sort((a,b)=>Date.parse(a.started_at)-Date.parse(b.started_at));return rows.length>0&&rows[0].started_at===env.activated_at&&rows.at(-1)?.ended_at===env.terminal_at&&rows.every((row,index)=>index===0||rows[index-1].ended_at===row.started_at)&&rows.reduce((sum,row)=>sum+row.resident_seconds,0)===env.resident_seconds;});
  const changeShapePass=changes.every(item=>typeof item.change_id==="string"&&item.change_id.length>0&&artifactIds.includes(item.from_artifact_sha256)&&artifactIds.includes(item.to_artifact_sha256)&&item.from_artifact_sha256!==item.to_artifact_sha256&&["configuration","bugfix","safety_hotfix","capability_update","rollback"].includes(item.change_class)&&utc(item.decision_at)&&utc(item.rollout_started_at)&&utc(item.rollout_completed_at)&&Date.parse(item.decision_at)<=Date.parse(item.rollout_started_at)&&Date.parse(item.rollout_started_at)<=Date.parse(item.rollout_completed_at)&&POLICY_ROLLOUT_MODES.includes(item.rollout_mode)&&typeof item.rationale==="string"&&item.rationale.length>=10&&item.cohort_outcomes_used===false&&item.cohort_task_logs_used===false&&item.participant_specific_targeting===false&&digest(item.preregistered_schedule_sha256)&&(item.change_class==="safety_hotfix"?digest(item.independent_safety_approval_sha256):item.independent_safety_approval_sha256===null)&&item.creates_new_claim_revision===(item.change_class==="capability_update"));
  const changeLineagePass=changeShapePass&&changes.every(item=>{if(item.change_class==="rollback")return true;const to=artifacts.find(artifact=>artifact.artifact_sha256===item.to_artifact_sha256);return Boolean(to&&to.parent_artifact_sha256===item.from_artifact_sha256&&to.change_class===item.change_class&&Date.parse(to.released_at)<=Date.parse(item.decision_at));})&&artifacts.filter(item=>item.parent_artifact_sha256!==null).every(item=>changes.some(change=>change.to_artifact_sha256===item.artifact_sha256&&change.change_class!=="rollback"));
  const transitionPairs=new Set<string>();
  for(const env of envs){const rows=segments.filter(item=>item.environment_id_sha256===env.environment_id_sha256).sort((a,b)=>Date.parse(a.started_at)-Date.parse(b.started_at));for(let index=1;index<rows.length;index++)transitionPairs.add(`${rows[index-1].artifact_sha256}:${rows[index].artifact_sha256}:${rows[index].started_at}`)}
  const rolloutPass=changeLineagePass&&changes.every(change=>{
    const starts=[...transitionPairs].filter(value=>value.startsWith(`${change.from_artifact_sha256}:${change.to_artifact_sha256}:`)).map(value=>Date.parse(value.split(":").slice(2).join(":")));
    const limit=change.rollout_mode==="preregistered_staged"?protocol.max_preregistered_staged_rollout_lag_hours:protocol.max_global_rollout_lag_hours;
    return starts.length>0&&starts.every(start=>start>=Date.parse(change.rollout_started_at)&&start<=Date.parse(change.rollout_completed_at))&&(Date.parse(change.rollout_completed_at)-Date.parse(change.rollout_started_at))/3600000<=limit&&(change.rollout_mode!=="emergency_safety"||change.change_class==="safety_hotfix");
  })&&[...transitionPairs].every(value=>changes.some(change=>value.startsWith(`${change.from_artifact_sha256}:${change.to_artifact_sha256}:`)));
  const targetHours=envs.reduce((sum,item)=>sum+item.resident_seconds/3600,0),targetPass=target==="WANTED_LAB"?envs.length>=1&&targetHours>=100:target==="WANTED_WILD"?envs.length>=20&&targetHours>=10000:envs.length>=1&&targetHours>=10000&&envs.some(item=>item.resident_seconds===36000000);
  const reproduced=continuousPass&&artifactsPass?reproducePolicyEvolution(envs,artifacts,changes,segments,input.baseline_artifact_sha256):null, claimed=input.claimed;
  const reproductionPass=Boolean(reproduced&&claimed.environment_count===reproduced.environment_count&&claimed.artifact_count===reproduced.artifact_count&&claimed.change_event_count===reproduced.change_event_count&&claimed.deployment_segment_count===reproduced.deployment_segment_count&&close(claimed.resident_hours,reproduced.resident_hours)&&close(claimed.baseline_exposure_fraction,reproduced.baseline_exposure_fraction)&&close(claimed.changed_exposure_fraction,reproduced.changed_exposure_fraction)&&claimed.material_update_count===reproduced.material_update_count&&claimed.safety_hotfix_count===reproduced.safety_hotfix_count&&claimed.rollback_count===reproduced.rollback_count&&close(claimed.longest_rollout_lag_hours,reproduced.longest_rollout_lag_hours)&&claimed.participant_specific_target_count===0&&claimed.outcome_informed_update_count===0&&claimed.task_log_informed_update_count===0&&claimed.rankable_revision_intact===true&&reproduced.rankable_revision_intact===true&&sameExposure(claimed.artifact_exposure,reproduced.artifact_exposure));
  const assurance=input.baseline_artifact_sha256===input.upstream_bindings.baseline_policy_sha256&&[input.upstream_bindings.exposure_integrity_sha256,input.upstream_bindings.telemetry_authenticity_sha256,input.upstream_bindings.preregistration_sha256,input.upstream_bindings.baseline_policy_sha256,input.evidence.controlled_policy_register_sha256,input.evidence.release_manifest_bundle_sha256].every(digest)&&https(input.evidence.controlled_policy_register_uri)&&https(input.evidence.release_manifest_bundle_uri)&&input.evidence.public_aggregate_only===true&&typeof input.assessor.name==="string"&&input.assessor.name.length>0&&typeof input.assessor.organization==="string"&&input.assessor.organization.length>0&&input.assessor.independent_of_sponsor===true&&input.assessor.attested===true&&utc(input.assessor.signed_at);
  const gates=[
    gate("U1","COMPLETE CHANGE SURFACE",surfacePass&&protocolPass,"Every operator-deployed artifact, change, environment, and exposure segment is retained under frozen rules.","Include every declared object exactly once and use the exact 0.2-U1 protocol rules."),
    gate("U2","IMMUTABLE ARTIFACT LINEAGE",artifactsPass&&changeLineagePass,"Every release has a single immutable parent, provenance, safety assessment, and prospective change event.","Repair artifact digests, parent lineage, release timing, classification, or change-event bindings."),
    gate("U3","CONTINUOUS POLICY CLOCK",continuousPass,"Every resident second belongs to exactly one registered policy artifact and signed boundary pair.","Close overlaps or gaps and bind every segment to the exposure ledger and signed telemetry."),
    gate("U4","PROSPECTIVE DECISIONS",changeShapePass,"No release decision uses current-cohort outcomes, task logs, or participant-specific targeting.","Remove outcome-informed or targeted updates and document prospective decisions before rollout."),
    gate("U5","COHORT-WIDE ROLLOUT",rolloutPass,"Every observed transition maps to one bounded global, staged, or independently approved emergency rollout.","Bind every transition to a registered rollout and satisfy the mode-specific lag and safety-approval rules."),
    gate("U6","TARGET + REVISION INTEGRITY",targetPass&&reproductionPass,"Target exposure and artifact-specific residence reproduce exactly without a material update inside the claimed revision.","Meet target exposure, reproduce all claims, and move capability-changing exposure to a new claim revision."),
    gate("U7","BOUND INDEPENDENT AUDIT",assurance,"Baseline identity, preregistration, exposure, telemetry, release bundle, and controlled register are independently bound.","Provide all upstream and evidence digests plus an independent attestation."),
  ];
  return{status:gates.every(item=>item.passed)?"passed":"failed",errors:[],gates,summary:reproduced?{profile_version:POLICY_EVOLUTION_VERSION,status:"passed",target_certification:target,...reproduced}:null};
}

const iso=(ms:number)=>new Date(ms).toISOString().replace(".000Z","Z");
function buildTemplate(target:PolicyTarget):PolicyInput{
  const count=target==="WANTED_WILD"?24:1,hours=target==="WANTED_LAB"?100:target==="WANTED_WILD"?5000:10000,startMs=Date.parse("2026-01-02T00:00:00Z"),endMs=startMs+hours*3600000;
  const baseline=hash("31"),bugfix=hash("42"),hotfix=hash("53"),firstMs=startMs+hours*.2*3600000,secondMs=startMs+hours*.6*3600000,maxOffset=(count-1)*60000;
  const artifacts:PolicyArtifact[]=[
    {artifact_sha256:baseline,version:"1.0.0",parent_artifact_sha256:null,release_manifest_sha256:hash("a1"),build_provenance_sha256:hash("a2"),safety_assessment_sha256:hash("a3"),released_at:iso(startMs-30*86400000),change_class:"baseline",material_capability_change:false},
    {artifact_sha256:bugfix,version:"1.0.1",parent_artifact_sha256:baseline,release_manifest_sha256:hash("b1"),build_provenance_sha256:hash("b2"),safety_assessment_sha256:hash("b3"),released_at:iso(firstMs-3*86400000),change_class:"bugfix",material_capability_change:false},
    {artifact_sha256:hotfix,version:"1.0.2",parent_artifact_sha256:bugfix,release_manifest_sha256:hash("c1"),build_provenance_sha256:hash("c2"),safety_assessment_sha256:hash("c3"),released_at:iso(secondMs-3*86400000),change_class:"safety_hotfix",material_capability_change:false},
  ];
  const environments:PolicyEnvironment[]=Array.from({length:count},(_,index)=>({environment_id_sha256:hash(`${index+11}e`),activated_at:iso(startMs),terminal_at:iso(endMs),resident_seconds:hours*3600,exposure_record_sha256:hash(`${index+61}f`)}));
  const changes:PolicyChange[]=[
    {change_id:`${target.toLowerCase()}-bugfix`,from_artifact_sha256:baseline,to_artifact_sha256:bugfix,change_class:"bugfix",decision_at:iso(firstMs-2*86400000),rollout_started_at:iso(firstMs),rollout_completed_at:iso(firstMs+maxOffset),rollout_mode:"global_atomic",rationale:"Correct a verified deterministic navigation-state defect.",cohort_outcomes_used:false,cohort_task_logs_used:false,participant_specific_targeting:false,preregistered_schedule_sha256:hash("d1"),independent_safety_approval_sha256:null,creates_new_claim_revision:false},
    {change_id:`${target.toLowerCase()}-safety`,from_artifact_sha256:bugfix,to_artifact_sha256:hotfix,change_class:"safety_hotfix",decision_at:iso(secondMs-2*86400000),rollout_started_at:iso(secondMs),rollout_completed_at:iso(secondMs+maxOffset),rollout_mode:"emergency_safety",rationale:"Deploy an independently verified conservative protective-stop correction.",cohort_outcomes_used:false,cohort_task_logs_used:false,participant_specific_targeting:false,preregistered_schedule_sha256:hash("d2"),independent_safety_approval_sha256:hash("d3"),creates_new_claim_revision:false},
  ];
  const deployment_segments:PolicySegment[]=environments.flatMap((env,index)=>{const one=firstMs+index*60000,two=secondMs+index*60000;return[
    {environment_id_sha256:env.environment_id_sha256,segment_id:`${target.toLowerCase()}-${index}-base`,artifact_sha256:baseline,started_at:iso(startMs),ended_at:iso(one),resident_seconds:(one-startMs)/1000,activation_event_sha256:hash(`${index}11`),boundary_event_sha256:hash(`${index}12`)},
    {environment_id_sha256:env.environment_id_sha256,segment_id:`${target.toLowerCase()}-${index}-bug`,artifact_sha256:bugfix,started_at:iso(one),ended_at:iso(two),resident_seconds:(two-one)/1000,activation_event_sha256:hash(`${index}21`),boundary_event_sha256:hash(`${index}22`)},
    {environment_id_sha256:env.environment_id_sha256,segment_id:`${target.toLowerCase()}-${index}-safe`,artifact_sha256:hotfix,started_at:iso(two),ended_at:iso(endMs),resident_seconds:(endMs-two)/1000,activation_event_sha256:hash(`${index}31`),boundary_event_sha256:hash(`${index}32`)},
  ]});
  const input:PolicyInput={profile_version:POLICY_EVOLUTION_VERSION,target_certification:target,protocol:{inclusion_rule:"every_operator_deployed_policy_artifact_change_and_exposure_segment",resident_time_source:"passing_exposure_ledger_0.2-X1",telemetry_boundary_rule:"every_segment_boundary_is_a_signed_telemetry_event",local_adaptation_boundary:"online_personalization_is_not_an_update_only_when_the_learning_algorithm_is_frozen_in_the_baseline_artifact",decision_information_rule:"release_decisions_precede_access_to_current_cohort_outcomes_and_task_logs",material_change_rule:"capability_changes_create_a_new_claim_revision_and_cannot_share_ranked_exposure",unmatched_deployed_artifacts_permitted:false,max_global_rollout_lag_hours:24,max_preregistered_staged_rollout_lag_hours:168},declared_environment_count:environments.length,declared_artifact_count:artifacts.length,declared_change_event_count:changes.length,declared_deployment_segment_count:deployment_segments.length,baseline_artifact_sha256:baseline,environments,artifacts,changes,deployment_segments,claimed:{} as PolicyClaim,upstream_bindings:{exposure_integrity_sha256:hash("eb"),telemetry_authenticity_sha256:hash("9b"),preregistration_sha256:hash("b"),baseline_policy_sha256:baseline},evidence:{controlled_policy_register_uri:"https://example.org/wanted-policy-register.json",controlled_policy_register_sha256:hash("e1"),release_manifest_bundle_uri:"https://example.org/wanted-release-manifests.json",release_manifest_bundle_sha256:hash("e2"),public_aggregate_only:true},assessor:{name:"Synthetic Policy Auditor",organization:"Independent Example Assurance",independent_of_sponsor:true,attested:true,signed_at:"2028-04-01T00:00:00Z"}};
  input.claimed=reproducePolicyEvolution(environments,artifacts,changes,deployment_segments,baseline);
  return input;
}
export const policyEvolutionTemplateFor=buildTemplate;
export const policyEvolutionTemplate=buildTemplate("WANTED_WILD");

const d={type:"string",pattern:"^[a-f0-9]{64}$"},date={type:"string",format:"date-time",pattern:"Z$"},metric={type:"number",minimum:0};
export const policyEvolutionSchema={"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/policy-evolution.schema.json",title:"WANTED Policy Evolution Integrity Manifest",type:"object",additionalProperties:false,required:["profile_version","target_certification","protocol","declared_environment_count","declared_artifact_count","declared_change_event_count","declared_deployment_segment_count","baseline_artifact_sha256","environments","artifacts","changes","deployment_segments","claimed","upstream_bindings","evidence","assessor"],properties:{
  profile_version:{const:POLICY_EVOLUTION_VERSION},target_certification:{enum:POLICY_TARGETS},
  protocol:{type:"object",additionalProperties:false,required:["inclusion_rule","resident_time_source","telemetry_boundary_rule","local_adaptation_boundary","decision_information_rule","material_change_rule","unmatched_deployed_artifacts_permitted","max_global_rollout_lag_hours","max_preregistered_staged_rollout_lag_hours"],properties:{inclusion_rule:{const:"every_operator_deployed_policy_artifact_change_and_exposure_segment"},resident_time_source:{const:"passing_exposure_ledger_0.2-X1"},telemetry_boundary_rule:{const:"every_segment_boundary_is_a_signed_telemetry_event"},local_adaptation_boundary:{const:"online_personalization_is_not_an_update_only_when_the_learning_algorithm_is_frozen_in_the_baseline_artifact"},decision_information_rule:{const:"release_decisions_precede_access_to_current_cohort_outcomes_and_task_logs"},material_change_rule:{const:"capability_changes_create_a_new_claim_revision_and_cannot_share_ranked_exposure"},unmatched_deployed_artifacts_permitted:{const:false},max_global_rollout_lag_hours:{const:24},max_preregistered_staged_rollout_lag_hours:{const:168}}},
  declared_environment_count:{type:"integer",minimum:1},declared_artifact_count:{type:"integer",minimum:1},declared_change_event_count:{type:"integer",minimum:0},declared_deployment_segment_count:{type:"integer",minimum:1},baseline_artifact_sha256:d,
  environments:{type:"array",minItems:1,items:{type:"object",additionalProperties:false,required:["environment_id_sha256","activated_at","terminal_at","resident_seconds","exposure_record_sha256"],properties:{environment_id_sha256:d,activated_at:date,terminal_at:date,resident_seconds:{type:"integer",minimum:1,maximum:36000000},exposure_record_sha256:d}}},
  artifacts:{type:"array",minItems:1,items:{type:"object",additionalProperties:false,required:["artifact_sha256","version","parent_artifact_sha256","release_manifest_sha256","build_provenance_sha256","safety_assessment_sha256","released_at","change_class","material_capability_change"],properties:{artifact_sha256:d,version:{type:"string",minLength:1},parent_artifact_sha256:{oneOf:[d,{type:"null"}]},release_manifest_sha256:d,build_provenance_sha256:d,safety_assessment_sha256:d,released_at:date,change_class:{enum:POLICY_CHANGE_CLASSES},material_capability_change:{type:"boolean"}}}},
  changes:{type:"array",items:{type:"object",additionalProperties:false,required:["change_id","from_artifact_sha256","to_artifact_sha256","change_class","decision_at","rollout_started_at","rollout_completed_at","rollout_mode","rationale","cohort_outcomes_used","cohort_task_logs_used","participant_specific_targeting","preregistered_schedule_sha256","independent_safety_approval_sha256","creates_new_claim_revision"],properties:{change_id:{type:"string",minLength:1},from_artifact_sha256:d,to_artifact_sha256:d,change_class:{enum:["configuration","bugfix","safety_hotfix","capability_update","rollback"]},decision_at:date,rollout_started_at:date,rollout_completed_at:date,rollout_mode:{enum:POLICY_ROLLOUT_MODES},rationale:{type:"string",minLength:10},cohort_outcomes_used:{const:false},cohort_task_logs_used:{const:false},participant_specific_targeting:{const:false},preregistered_schedule_sha256:d,independent_safety_approval_sha256:{oneOf:[d,{type:"null"}]},creates_new_claim_revision:{type:"boolean"}}}},
  deployment_segments:{type:"array",minItems:1,items:{type:"object",additionalProperties:false,required:["environment_id_sha256","segment_id","artifact_sha256","started_at","ended_at","resident_seconds","activation_event_sha256","boundary_event_sha256"],properties:{environment_id_sha256:d,segment_id:{type:"string",minLength:1},artifact_sha256:d,started_at:date,ended_at:date,resident_seconds:{type:"integer",minimum:1,maximum:36000000},activation_event_sha256:d,boundary_event_sha256:d}}},
  claimed:{type:"object",additionalProperties:false,required:["environment_count","artifact_count","change_event_count","deployment_segment_count","resident_hours","baseline_exposure_fraction","changed_exposure_fraction","material_update_count","safety_hotfix_count","rollback_count","longest_rollout_lag_hours","participant_specific_target_count","outcome_informed_update_count","task_log_informed_update_count","rankable_revision_intact","artifact_exposure"],properties:{environment_count:{type:"integer",minimum:1},artifact_count:{type:"integer",minimum:1},change_event_count:{type:"integer",minimum:0},deployment_segment_count:{type:"integer",minimum:1},resident_hours:metric,baseline_exposure_fraction:{type:"number",minimum:0,maximum:1},changed_exposure_fraction:{type:"number",minimum:0,maximum:1},material_update_count:{type:"integer",minimum:0},safety_hotfix_count:{type:"integer",minimum:0},rollback_count:{type:"integer",minimum:0},longest_rollout_lag_hours:metric,participant_specific_target_count:{const:0},outcome_informed_update_count:{const:0},task_log_informed_update_count:{const:0},rankable_revision_intact:{const:true},artifact_exposure:{type:"array",minItems:1,items:{type:"object",additionalProperties:false,required:["artifact_sha256","environment_count","resident_hours","exposure_fraction"],properties:{artifact_sha256:d,environment_count:{type:"integer",minimum:0},resident_hours:metric,exposure_fraction:{type:"number",minimum:0,maximum:1}}}}}},
  upstream_bindings:{type:"object",additionalProperties:false,required:["exposure_integrity_sha256","telemetry_authenticity_sha256","preregistration_sha256","baseline_policy_sha256"],properties:{exposure_integrity_sha256:d,telemetry_authenticity_sha256:d,preregistration_sha256:d,baseline_policy_sha256:d}},
  evidence:{type:"object",additionalProperties:false,required:["controlled_policy_register_uri","controlled_policy_register_sha256","release_manifest_bundle_uri","release_manifest_bundle_sha256","public_aggregate_only"],properties:{controlled_policy_register_uri:{type:"string",format:"uri",pattern:"^https://"},controlled_policy_register_sha256:d,release_manifest_bundle_uri:{type:"string",format:"uri",pattern:"^https://"},release_manifest_bundle_sha256:d,public_aggregate_only:{const:true}}},
  assessor:{type:"object",additionalProperties:false,required:["name","organization","independent_of_sponsor","attested","signed_at"],properties:{name:{type:"string",minLength:1},organization:{type:"string",minLength:1},independent_of_sponsor:{const:true},attested:{const:true},signed_at:date}},
}} as const;

export const policyEvolutionContract={name:"WANTED Policy Evolution Integrity Profile",version:POLICY_EVOLUTION_VERSION,applies_to:POLICY_TARGETS,ranking_effect:"none",identity_unit:"immutable_operator_deployed_policy_artifact",inclusion:"every_policy_artifact_change_event_and_exposure_segment_in_every_field_environment",local_learning_boundary:"personalization_remains_within_one_artifact_only_when_the_learning_algorithm_is_frozen_in_that_artifact",decision_rule:"no_current_cohort_outcomes_task_logs_or_participant_specific_targeting",rollout:{global_atomic_max_hours:24,preregistered_staged_max_hours:168,emergency_safety_requires_independent_approval:true},material_change:"capability-changing_exposure_requires_a_new_claim_revision",metrics:["artifact_specific_resident_hours","baseline_and_changed_exposure_fraction","rollout_lag","safety_hotfixes","rollbacks","material_updates"],hard_failures:["unregistered_deployed_artifact","broken_artifact_lineage","policy_clock_gap_or_overlap","unsigned_segment_boundary","outcome_informed_release","task_log_informed_release","participant_specific_targeting","unbounded_rollout","unapproved_emergency_update","material_update_inside_claimed_revision","claimed_exposure_mismatch","unattested_register"],interpretation:"policy_evolution_is_nonranking_context_and_cannot_modify_W_offset_safety_or_break_a_tie"} as const;

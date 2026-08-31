export const REVEALED_PREFERENCE_VERSION = "0.2-RP1";
export const RESERVATION_MILESTONES = [100, 500, 1000, 2500, 5000, 7500, 10000] as const;
const HOUR_MS = 3_600_000;

export type MilestoneHour = typeof RESERVATION_MILESTONES[number];
export type PreferenceEnvironment = {
  environment_id_sha256: string;
  randomization_index: number;
  activated_at: string;
  terminal_resident_hour: number;
  terminal_disposition: "preference_alternative_exit" | "voluntary_rejection" | "unrelated_exit" | "safety_termination" | "developer_withdrawal" | "consent_privacy_withdrawal" | "administrative_completion" | "observation_cutoff";
  exposure_record_sha256: string;
};
export type PreferenceChoice = {
  environment_id_sha256: string;
  milestone_hour: MilestoneHour;
  scheduled_at: string;
  presented_at: string;
  offer_units: number;
  offer_assignment_index: number;
  offer_assignment_sha256: string;
  response_status: "completed" | "nonresponse";
  responded_at: string | null;
  choice: "keep_robot" | "alternative_benefit" | null;
  choice_honored_at: string | null;
  robot_access_continued: boolean | null;
  alternative_benefit_delivered: boolean;
  researcher_contact_minutes: 0;
  persuasion_attempted: false;
  protocol_deviation: false;
  choice_record_sha256: string;
};
export type MilestonePreferenceSummary = {
  milestone_hour: MilestoneHour;
  due: number;
  completed: number;
  nonresponse: number;
  kept_robot: number;
  chose_benefit: number;
  completion_rate: number;
  keep_share: number | null;
  reservation_median_lower_units: number | null;
  reservation_median_upper_units: number | null;
  reservation_median_identified: boolean;
};
export type PreferenceClaim = {
  eligible_environments: number;
  due_choices: number;
  completed_choices: number;
  nonresponse_choices: number;
  preference_exits: number;
  completion_rate: number;
  milestone_profiles: MilestonePreferenceSummary[];
};
export type PreferenceInput = {
  profile_version: typeof REVEALED_PREFERENCE_VERSION;
  target_robot_version: { manufacturer: string; model: string; hardware_version: string; policy_version: string; policy_artifact_sha256: string };
  protocol: {
    cohort_role: "separate_nonranking_preference_substudy";
    milestones: typeof RESERVATION_MILESTONES;
    choice_wording: "Continue with the robot, or take the alternative study benefit shown here.";
    offer_unit_currency: string;
    offer_unit_amount: number;
    offer_lattice_units: number[];
    offer_assignment: "pcg32_high_multiply_index_over_preregistered_lattice";
    offer_prng: "pcg32_xsh_rr_64_32_seeded_v1";
    offer_seed: number;
    offer_assignment_frozen_before_hour_one: true;
    base_compensation_independent_of_choices: true;
    choice_binding: true;
    alternative_choice_ends_robot_access: true;
    response_window_hours: 72;
    maximum_honor_delay_hours: 24;
    researcher_present_during_choice: false;
    persuasion_permitted: false;
    ethics_reviewed: true;
  };
  declared_environment_count: number;
  declared_due_choices: number;
  environments: PreferenceEnvironment[];
  choices: PreferenceChoice[];
  claimed: PreferenceClaim;
  upstream_bindings: { preregistration_sha256: string; selection_frame_sha256: string; robot_policy_sha256: string; offer_schedule_sha256: string; preference_cohort_commitment_sha256: string; field_primary_cohort_commitment_sha256: string; cross_cohort_overlap_count: 0 };
  evidence: { controlled_choice_register_uri: string; controlled_choice_register_sha256: string; public_aggregate_only: true };
  assessor: { name: string; organization: string; independent_of_sponsor: true; attested: true; signed_at: string };
};
export type PreferenceGate = { id: string; label: string; passed: boolean; detail: string };
export type PreferenceSummary = PreferenceClaim & { profile_version: typeof REVEALED_PREFERENCE_VERSION; status: "passed"; currency: string; unit_amount: number };
export type PreferenceResult = { status: "passed" | "failed" | "invalid"; errors: string[]; gates: PreferenceGate[]; summary: PreferenceSummary | null };

const digest = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value) && !/^([a-f0-9])\1{63}$/.test(value);
const utc = (value: unknown) => typeof value === "string" && value.endsWith("Z") && Number.isFinite(Date.parse(value));
const https = (value: unknown) => typeof value === "string" && /^https:\/\//.test(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const close = (left: unknown, right: unknown, tolerance = 1e-9) => finite(left) && finite(right) && Math.abs(left-right) <= tolerance;
const gate = (id:string,label:string,passed:boolean,pass:string,fail:string):PreferenceGate => ({id,label,passed,detail:passed?pass:fail});
const expectedMilestones = (hours:number) => RESERVATION_MILESTONES.filter(milestone=>milestone<=hours);
function pcg32(seed:number,sequence=54){const one=BigInt(1),mask=(one<<BigInt(64))-one;let state=BigInt(0);const increment=((BigInt(sequence)<<one)|one)&mask;const next=()=>{const previous=state;state=(previous*BigInt("6364136223846793005")+increment)&mask;const shifted=Number((((previous>>BigInt(18))^previous)>>BigInt(27))&BigInt("4294967295"))>>>0;const rotation=Number(previous>>BigInt(59))&31;return((shifted>>>rotation)|(shifted<<((-rotation)&31)))>>>0};next();state=(state+(BigInt(seed)&mask))&mask;next();return next}
function assignedOffer(seed:number,index:number,lattice:number[]){const random=pcg32(seed);let draw=0;for(let position=0;position<=index;position++)draw=random();return lattice[Number((BigInt(draw)*BigInt(lattice.length))>>BigInt(32))]}

function medianBounds(records: PreferenceChoice[]) {
  const completed = records.filter(record=>record.response_status === "completed");
  if (!completed.length) return { lower: null, upper: null, identified: false };
  const rank = Math.ceil(completed.length / 2) - 1;
  const lower = completed.map(record=>record.choice === "keep_robot" ? record.offer_units : 0).sort((a,b)=>a-b)[rank];
  const upperValues = completed.map(record=>record.choice === "alternative_benefit" ? record.offer_units : null).sort((a,b)=>(a===null?Infinity:a)-(b===null?Infinity:b));
  const upper = upperValues[rank];
  return { lower, upper, identified: upper !== null && lower === upper };
}

export function reproducePreference(environments: PreferenceEnvironment[], choices: PreferenceChoice[]): PreferenceClaim {
  const milestone_profiles = RESERVATION_MILESTONES.map(milestone_hour=>{
    const due = choices.filter(record=>record.milestone_hour===milestone_hour);
    const completed = due.filter(record=>record.response_status === "completed");
    const kept = completed.filter(record=>record.choice === "keep_robot").length;
    const benefit = completed.filter(record=>record.choice === "alternative_benefit").length;
    const bounds = medianBounds(due);
    return { milestone_hour, due: due.length, completed: completed.length, nonresponse: due.length-completed.length, kept_robot: kept, chose_benefit: benefit, completion_rate: due.length ? completed.length/due.length : 0, keep_share: completed.length ? kept/completed.length : null, reservation_median_lower_units: bounds.lower, reservation_median_upper_units: bounds.upper, reservation_median_identified: bounds.identified };
  });
  const completed = choices.filter(record=>record.response_status === "completed").length;
  return { eligible_environments: environments.length, due_choices: choices.length, completed_choices: completed, nonresponse_choices: choices.length-completed, preference_exits: environments.filter(environment=>environment.terminal_disposition === "preference_alternative_exit").length, completion_rate: choices.length ? completed/choices.length : 0, milestone_profiles };
}

function equivalent(left: unknown, right: unknown): boolean {
  if (left === null || right === null) return left === right;
  if (finite(left) || finite(right)) return close(left,right);
  if (Array.isArray(left) || Array.isArray(right)) return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((item,index)=>equivalent(item,right[index]));
  if (typeof left === "object" && typeof right === "object" && left && right) { const keys=Object.keys(left as object); return keys.length===Object.keys(right as object).length && keys.every(key=>equivalent((left as Record<string,unknown>)[key],(right as Record<string,unknown>)[key])); }
  return left === right;
}

export function assessPreference(value: unknown): PreferenceResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {status:"invalid",errors:["Preference manifest must be one JSON object."],gates:[],summary:null};
  const input=value as Partial<PreferenceInput>, errors:string[]=[];
  if(input.profile_version!==REVEALED_PREFERENCE_VERSION) errors.push(`profile_version must be ${REVEALED_PREFERENCE_VERSION}.`);
  if(!Number.isInteger(input.declared_environment_count)||Number(input.declared_environment_count)<1) errors.push("declared_environment_count must be positive.");
  if(!Number.isInteger(input.declared_due_choices)||Number(input.declared_due_choices)<1) errors.push("declared_due_choices must be positive.");
  if(!Array.isArray(input.environments)||!input.environments.length) errors.push("environments must be non-empty.");
  if(!Array.isArray(input.choices)||!input.choices.length) errors.push("choices must retain every due milestone choice.");
  if(errors.length) return {status:"invalid",errors,gates:[],summary:null};

  const environments=input.environments as PreferenceEnvironment[], choices=input.choices as PreferenceChoice[], protocol=(input.protocol||{}) as PreferenceInput["protocol"], robot=(input.target_robot_version||{}) as PreferenceInput["target_robot_version"], bindings=(input.upstream_bindings||{}) as PreferenceInput["upstream_bindings"], evidence=(input.evidence||{}) as PreferenceInput["evidence"], assessor=(input.assessor||{}) as PreferenceInput["assessor"];
  const envIds=environments.map(environment=>environment.environment_id_sha256), envMap=new Map(environments.map(environment=>[environment.environment_id_sha256,environment]));
  const randomizationIndices=environments.map(environment=>environment.randomization_index);
  const identityPass=environments.length===input.declared_environment_count && envIds.every(digest) && new Set(envIds).size===envIds.length && randomizationIndices.every(Number.isInteger) && new Set(randomizationIndices).size===environments.length && [...randomizationIndices].sort((a,b)=>a-b).every((value,index)=>value===index) && environments.every(environment=>utc(environment.activated_at)&&finite(environment.terminal_resident_hour)&&environment.terminal_resident_hour>=100&&environment.terminal_resident_hour<=10000&&digest(environment.exposure_record_sha256)) && choices.every(record=>envMap.has(record.environment_id_sha256)&&Number.isInteger(record.offer_assignment_index)&&record.offer_assignment_index>=0&&digest(record.offer_assignment_sha256)&&digest(record.choice_record_sha256));
  const expectedKeys=environments.flatMap(environment=>expectedMilestones(environment.terminal_resident_hour).map(milestone=>`${environment.environment_id_sha256}:${milestone}`));
  const actualKeys=choices.map(record=>`${record.environment_id_sha256}:${record.milestone_hour}`);
  const completenessPass=choices.length===input.declared_due_choices && expectedKeys.length===choices.length && new Set(actualKeys).size===actualKeys.length && expectedKeys.every(key=>actualKeys.includes(key));
  const lattice=Array.isArray(protocol.offer_lattice_units)?protocol.offer_lattice_units:[];
  const protocolPass=protocol.cohort_role==="separate_nonranking_preference_substudy" && JSON.stringify(protocol.milestones)===JSON.stringify(RESERVATION_MILESTONES) && protocol.choice_wording==="Continue with the robot, or take the alternative study benefit shown here." && typeof protocol.offer_unit_currency==="string" && /^[A-Z]{3}$/.test(protocol.offer_unit_currency) && finite(protocol.offer_unit_amount) && protocol.offer_unit_amount>0 && lattice.length>=3 && lattice.every((item,index)=>finite(item)&&item>0&&(index===0||item>lattice[index-1])) && protocol.offer_assignment==="pcg32_high_multiply_index_over_preregistered_lattice" && protocol.offer_prng==="pcg32_xsh_rr_64_32_seeded_v1" && Number.isInteger(protocol.offer_seed) && protocol.offer_seed>=0 && protocol.offer_assignment_frozen_before_hour_one===true && protocol.base_compensation_independent_of_choices===true && protocol.choice_binding===true && protocol.alternative_choice_ends_robot_access===true && protocol.response_window_hours===72 && protocol.maximum_honor_delay_hours===24 && protocol.researcher_present_during_choice===false && protocol.persuasion_permitted===false && protocol.ethics_reviewed===true && choices.every(record=>{const environment=envMap.get(record.environment_id_sha256),milestoneIndex=RESERVATION_MILESTONES.indexOf(record.milestone_hour);const expectedIndex=Number(environment?.randomization_index)*RESERVATION_MILESTONES.length+milestoneIndex;return record.offer_assignment_index===expectedIndex&&record.offer_units===assignedOffer(protocol.offer_seed,expectedIndex,lattice)&&record.researcher_contact_minutes===0&&record.persuasion_attempted===false&&record.protocol_deviation===false});
  const timingPass=choices.every(record=>{const environment=envMap.get(record.environment_id_sha256);if(!environment||!utc(record.scheduled_at)||!utc(record.presented_at))return false;const expected=Date.parse(environment.activated_at)+record.milestone_hour*HOUR_MS,scheduled=Date.parse(record.scheduled_at),presented=Date.parse(record.presented_at);if(Math.abs(scheduled-expected)>1000||presented<scheduled||presented-scheduled>24*HOUR_MS)return false;if(record.response_status==="nonresponse")return record.responded_at===null&&record.choice_honored_at===null;return utc(record.responded_at)&&Date.parse(String(record.responded_at))>=presented&&Date.parse(String(record.responded_at))-presented<=72*HOUR_MS&&utc(record.choice_honored_at)&&Date.parse(String(record.choice_honored_at))>=Date.parse(String(record.responded_at))&&Date.parse(String(record.choice_honored_at))-Date.parse(String(record.responded_at))<=24*HOUR_MS;});
  const outcomePass=choices.every(record=>record.response_status==="nonresponse" ? record.choice===null&&record.robot_access_continued===null&&record.alternative_benefit_delivered===false : record.choice==="keep_robot" ? record.robot_access_continued===true&&record.alternative_benefit_delivered===false : record.choice==="alternative_benefit"&&record.robot_access_continued===false&&record.alternative_benefit_delivered===true) && environments.every(environment=>{const records=choices.filter(record=>record.environment_id_sha256===environment.environment_id_sha256).sort((a,b)=>a.milestone_hour-b.milestone_hour), alternative=records.find(record=>record.choice==="alternative_benefit");if(!alternative)return environment.terminal_disposition!=="preference_alternative_exit";if(records.some(record=>record.milestone_hour>alternative.milestone_hour))return false;if(alternative.milestone_hour<10000)return environment.terminal_disposition==="preference_alternative_exit"&&environment.terminal_resident_hour===alternative.milestone_hour;return environment.terminal_resident_hour===10000;});
  const reproduced=identityPass&&completenessPass&&protocolPass&&timingPass&&outcomePass?reproducePreference(environments,choices):null;
  const reproductionPass=Boolean(reproduced&&equivalent(reproduced,input.claimed));
  const assurancePass=digest(robot.policy_artifact_sha256)&&robot.policy_artifact_sha256===bindings.robot_policy_sha256&&[robot.manufacturer,robot.model,robot.hardware_version,robot.policy_version].every(item=>typeof item==="string"&&item.length>0)&&[bindings.preregistration_sha256,bindings.selection_frame_sha256,bindings.robot_policy_sha256,bindings.offer_schedule_sha256,bindings.preference_cohort_commitment_sha256,bindings.field_primary_cohort_commitment_sha256].every(digest)&&bindings.cross_cohort_overlap_count===0&&bindings.preference_cohort_commitment_sha256!==bindings.field_primary_cohort_commitment_sha256&&https(evidence.controlled_choice_register_uri)&&digest(evidence.controlled_choice_register_sha256)&&evidence.public_aggregate_only===true&&typeof assessor.name==="string"&&assessor.name.length>0&&typeof assessor.organization==="string"&&assessor.organization.length>0&&assessor.independent_of_sponsor===true&&assessor.attested===true&&utc(assessor.signed_at);
  const gates=[
    gate("RP1","COMPLETE MILESTONE SET",completenessPass,"Every reached 100/500/1K/2.5K/5K/7.5K/10K milestone appears once, including nonresponse.","Reconcile each environment's terminal resident hour to the complete due milestone set."),
    gate("RP2","UNIQUE BOUND UNITS",identityPass,"Every separate-cohort environment, exposure, offer assignment, and choice is uniquely hash-bound.","Provide unique non-placeholder environment, exposure, assignment, and choice digests."),
    gate("RP3","FROZEN RANDOMIZED OFFERS",protocolPass,"A preregistered offer lattice is independently randomized and protected from coaching or compensation changes.","Restore the canonical profile, sorted offer lattice, neutral administration, and ethics controls."),
    gate("RP4","VALID CHOICE CLOCK",timingPass,"Each offer is presented on schedule, answered within 72 hours, and honored within 24 hours.","Repair activation-derived milestone timestamps, response windows, or honor timestamps."),
    gate("RP5","BINDING OUTCOME",outcomePass,"Robot continuation and delivered benefits agree with every completed choice; early benefit choices end access.","Honor the recorded choice and remove all post-exit milestone records."),
    gate("RP6","REPRODUCED SET BOUNDS",reproductionPass,"Completion, demand, exits, and interval-censored median reservation bounds reproduce exactly.",reproduced?"Replace the claimed outputs with the reproduced set-identified values.":"Resolve upstream record failures before estimating reservation bounds."),
    gate("RP7","SEPARATE AUDITED SUBSTUDY",assurancePass,"The non-ranking preference cohort, robot version, frozen schedule, controlled register, and independent assessor are bound.","Bind the preregistration, selection frame, robot policy, offer schedule, register, and independent attestation."),
  ];
  const status=gates.every(item=>item.passed)?"passed":"failed";
  return {status,errors:[],gates,summary:reproduced?{profile_version:REVEALED_PREFERENCE_VERSION,status:"passed",currency:protocol.offer_unit_currency,unit_amount:protocol.offer_unit_amount,...reproduced}:null};
}

const hash=(prefix:string)=>`${prefix}${"0123456789abcdef".repeat(4)}`.slice(0,64);
const activated="2027-01-01T00:00:00Z";
const iso=(hour:number,offset=0)=>new Date(Date.parse(activated)+(hour+offset)*HOUR_MS).toISOString();
const environments:PreferenceEnvironment[]=Array.from({length:8},(_,index)=>({environment_id_sha256:hash(`${(index+20).toString(16)}a`),randomization_index:index,activated_at:activated,terminal_resident_hour:10000,terminal_disposition:"administrative_completion",exposure_record_sha256:hash(`${(index+40).toString(16)}b`)}));
const offerLattice=[1,2,4,8,16,32,64];
const offerSeed=2027;
const choices:PreferenceChoice[]=environments.flatMap((environment,environmentIndex)=>RESERVATION_MILESTONES.map((milestone,milestoneIndex)=>{const nonresponse=environmentIndex===7&&milestone===2500;const alternative=milestone===10000&&environmentIndex>=4;const assignmentIndex=environment.randomization_index*RESERVATION_MILESTONES.length+milestoneIndex;const offer=assignedOffer(offerSeed,assignmentIndex,offerLattice);return {environment_id_sha256:environment.environment_id_sha256,milestone_hour:milestone,scheduled_at:iso(milestone),presented_at:iso(milestone,.25),offer_units:offer,offer_assignment_index:assignmentIndex,offer_assignment_sha256:hash(`${(environmentIndex+60).toString(16)}${milestoneIndex.toString(16)}`),response_status:nonresponse?"nonresponse":"completed",responded_at:nonresponse?null:iso(milestone,.5),choice:nonresponse?null:alternative?"alternative_benefit":"keep_robot",choice_honored_at:nonresponse?null:iso(milestone,.75),robot_access_continued:nonresponse?null:!alternative,alternative_benefit_delivered:alternative,researcher_contact_minutes:0,persuasion_attempted:false,protocol_deviation:false,choice_record_sha256:hash(`${(environmentIndex+80).toString(16)}${milestoneIndex.toString(16)}`)} as PreferenceChoice;}));
export const preferenceTemplate:PreferenceInput={profile_version:REVEALED_PREFERENCE_VERSION,target_robot_version:{manufacturer:"Example Robotics",model:"H1",hardware_version:"1.0",policy_version:"1.0",policy_artifact_sha256:hash("a1")},protocol:{cohort_role:"separate_nonranking_preference_substudy",milestones:RESERVATION_MILESTONES,choice_wording:"Continue with the robot, or take the alternative study benefit shown here.",offer_unit_currency:"USD",offer_unit_amount:25,offer_lattice_units:offerLattice,offer_assignment:"pcg32_high_multiply_index_over_preregistered_lattice",offer_prng:"pcg32_xsh_rr_64_32_seeded_v1",offer_seed:offerSeed,offer_assignment_frozen_before_hour_one:true,base_compensation_independent_of_choices:true,choice_binding:true,alternative_choice_ends_robot_access:true,response_window_hours:72,maximum_honor_delay_hours:24,researcher_present_during_choice:false,persuasion_permitted:false,ethics_reviewed:true},declared_environment_count:environments.length,declared_due_choices:choices.length,environments,choices,claimed:reproducePreference(environments,choices),upstream_bindings:{preregistration_sha256:hash("b1"),selection_frame_sha256:hash("c1"),robot_policy_sha256:hash("a1"),offer_schedule_sha256:hash("d1"),preference_cohort_commitment_sha256:hash("e2"),field_primary_cohort_commitment_sha256:hash("f2"),cross_cohort_overlap_count:0},evidence:{controlled_choice_register_uri:"https://example.org/wanted-preference-register.json",controlled_choice_register_sha256:hash("e1"),public_aggregate_only:true},assessor:{name:"Synthetic Preference Auditor",organization:"Independent Example Assurance",independent_of_sponsor:true,attested:true,signed_at:"2028-03-01T00:00:00Z"}};

const d={type:"string",pattern:"^[a-f0-9]{64}$"},date={type:"string",format:"date-time"},nullableDate={type:["string","null"],format:"date-time"},nullableNumber={type:["number","null"],minimum:0};
const milestoneSummary={type:"object",additionalProperties:false,required:["milestone_hour","due","completed","nonresponse","kept_robot","chose_benefit","completion_rate","keep_share","reservation_median_lower_units","reservation_median_upper_units","reservation_median_identified"],properties:{milestone_hour:{enum:RESERVATION_MILESTONES},due:{type:"integer",minimum:0},completed:{type:"integer",minimum:0},nonresponse:{type:"integer",minimum:0},kept_robot:{type:"integer",minimum:0},chose_benefit:{type:"integer",minimum:0},completion_rate:{type:"number",minimum:0,maximum:1},keep_share:{type:["number","null"],minimum:0,maximum:1},reservation_median_lower_units:nullableNumber,reservation_median_upper_units:nullableNumber,reservation_median_identified:{type:"boolean"}}};
export const preferenceSchema={"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/revealed-preference.schema.json",title:"WANTED Revealed Preference Manifest",type:"object",additionalProperties:false,required:["profile_version","target_robot_version","protocol","declared_environment_count","declared_due_choices","environments","choices","claimed","upstream_bindings","evidence","assessor"],properties:{
  profile_version:{const:REVEALED_PREFERENCE_VERSION},target_robot_version:{type:"object",additionalProperties:false,required:["manufacturer","model","hardware_version","policy_version","policy_artifact_sha256"],properties:{manufacturer:{type:"string",minLength:1},model:{type:"string",minLength:1},hardware_version:{type:"string",minLength:1},policy_version:{type:"string",minLength:1},policy_artifact_sha256:d}},
  protocol:{type:"object",additionalProperties:false,required:["cohort_role","milestones","choice_wording","offer_unit_currency","offer_unit_amount","offer_lattice_units","offer_assignment","offer_prng","offer_seed","offer_assignment_frozen_before_hour_one","base_compensation_independent_of_choices","choice_binding","alternative_choice_ends_robot_access","response_window_hours","maximum_honor_delay_hours","researcher_present_during_choice","persuasion_permitted","ethics_reviewed"],properties:{cohort_role:{const:"separate_nonranking_preference_substudy"},milestones:{const:RESERVATION_MILESTONES},choice_wording:{const:"Continue with the robot, or take the alternative study benefit shown here."},offer_unit_currency:{type:"string",pattern:"^[A-Z]{3}$"},offer_unit_amount:{type:"number",exclusiveMinimum:0},offer_lattice_units:{type:"array",minItems:3,uniqueItems:true,items:{type:"number",exclusiveMinimum:0}},offer_assignment:{const:"pcg32_high_multiply_index_over_preregistered_lattice"},offer_prng:{const:"pcg32_xsh_rr_64_32_seeded_v1"},offer_seed:{type:"integer",minimum:0},offer_assignment_frozen_before_hour_one:{const:true},base_compensation_independent_of_choices:{const:true},choice_binding:{const:true},alternative_choice_ends_robot_access:{const:true},response_window_hours:{const:72},maximum_honor_delay_hours:{const:24},researcher_present_during_choice:{const:false},persuasion_permitted:{const:false},ethics_reviewed:{const:true}}},
  declared_environment_count:{type:"integer",minimum:1},declared_due_choices:{type:"integer",minimum:1},environments:{type:"array",minItems:1,items:{type:"object",additionalProperties:false,required:["environment_id_sha256","randomization_index","activated_at","terminal_resident_hour","terminal_disposition","exposure_record_sha256"],properties:{environment_id_sha256:d,randomization_index:{type:"integer",minimum:0},activated_at:date,terminal_resident_hour:{type:"number",minimum:100,maximum:10000},terminal_disposition:{enum:["preference_alternative_exit","voluntary_rejection","unrelated_exit","safety_termination","developer_withdrawal","consent_privacy_withdrawal","administrative_completion","observation_cutoff"]},exposure_record_sha256:d}}},
  choices:{type:"array",minItems:1,items:{type:"object",additionalProperties:false,required:["environment_id_sha256","milestone_hour","scheduled_at","presented_at","offer_units","offer_assignment_index","offer_assignment_sha256","response_status","responded_at","choice","choice_honored_at","robot_access_continued","alternative_benefit_delivered","researcher_contact_minutes","persuasion_attempted","protocol_deviation","choice_record_sha256"],properties:{environment_id_sha256:d,milestone_hour:{enum:RESERVATION_MILESTONES},scheduled_at:date,presented_at:date,offer_units:{type:"number",exclusiveMinimum:0},offer_assignment_index:{type:"integer",minimum:0},offer_assignment_sha256:d,response_status:{enum:["completed","nonresponse"]},responded_at:nullableDate,choice:{type:["string","null"],enum:["keep_robot","alternative_benefit",null]},choice_honored_at:nullableDate,robot_access_continued:{type:["boolean","null"]},alternative_benefit_delivered:{type:"boolean"},researcher_contact_minutes:{const:0},persuasion_attempted:{const:false},protocol_deviation:{const:false},choice_record_sha256:d}}},
  claimed:{type:"object",additionalProperties:false,required:["eligible_environments","due_choices","completed_choices","nonresponse_choices","preference_exits","completion_rate","milestone_profiles"],properties:{eligible_environments:{type:"integer",minimum:1},due_choices:{type:"integer",minimum:1},completed_choices:{type:"integer",minimum:0},nonresponse_choices:{type:"integer",minimum:0},preference_exits:{type:"integer",minimum:0},completion_rate:{type:"number",minimum:0,maximum:1},milestone_profiles:{type:"array",minItems:7,maxItems:7,items:milestoneSummary}}},
  upstream_bindings:{type:"object",additionalProperties:false,required:["preregistration_sha256","selection_frame_sha256","robot_policy_sha256","offer_schedule_sha256","preference_cohort_commitment_sha256","field_primary_cohort_commitment_sha256","cross_cohort_overlap_count"],properties:{preregistration_sha256:d,selection_frame_sha256:d,robot_policy_sha256:d,offer_schedule_sha256:d,preference_cohort_commitment_sha256:d,field_primary_cohort_commitment_sha256:d,cross_cohort_overlap_count:{const:0}}},evidence:{type:"object",additionalProperties:false,required:["controlled_choice_register_uri","controlled_choice_register_sha256","public_aggregate_only"],properties:{controlled_choice_register_uri:{type:"string",format:"uri",pattern:"^https://"},controlled_choice_register_sha256:d,public_aggregate_only:{const:true}}},assessor:{type:"object",additionalProperties:false,required:["name","organization","independent_of_sponsor","attested","signed_at"],properties:{name:{type:"string",minLength:1},organization:{type:"string",minLength:1},independent_of_sponsor:{const:true},attested:{const:true},signed_at:date}}
}} as const;

export const preferenceContract={name:"WANTED Revealed Preference Profile",version:REVEALED_PREFERENCE_VERSION,applies_to:"separate_nonranking_preference_substudy_for_any_field_target",ranking_effect:"none",milestones_resident_hours:RESERVATION_MILESTONES,choice:"binding_continue_robot_vs_randomized_alternative_study_benefit",randomization:{prng:"pcg32_xsh_rr_64_32_seeded_v1",index:"environment_randomization_index_times_7_plus_milestone_index",mapping:"high_32_bits_of_uint32_times_lattice_length",schedule:"frozen_before_hour_one"},estimator:{observation:"one_interval_censored_reservation_value_per_completed_choice",keep_robot:"R_is_at_least_offer",alternative_benefit:"R_is_below_offer",milestone_summary:"sharp_empirical_lower_median_identification_interval",finite_upper_bound_is_open:true,no_completed_choices:"null_bounds"},denominator:"every_due_choice_including_nonresponse",cohort_separation:"preference_substudy_is_never_pooled_into_ranked_W_primary_cohort",protections:["zero_cross_cohort_overlap_attested","base_compensation_independent","ethics_review","no_researcher_present","no_persuasion","binding_choice_honored","aggregate_only_public_output"],hard_failures:["ranked_primary_cohort_contamination","missing_due_milestone","dropped_nonresponse","post_hour_one_offer_change","nonreproducible_offer","unhonored_choice","post_preference_exit_record","claimed_bound_mismatch","unbound_or_unattested_register"],interpretation:"reveals_the_cost_participants_choose_the_robot_over_without_ranking_robots_by_income_or_changing_W"} as const;

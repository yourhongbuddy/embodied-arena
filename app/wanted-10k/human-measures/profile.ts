export const HUMAN_MEASURES_PROFILE_VERSION = "0.2-H1";
const HOUR_MS = 3_600_000;

export const HUMAN_PHASES = [
  { id: "stranger", label: "STRANGER", lower: 0, upper: 10 },
  { id: "assistant", label: "ASSISTANT", lower: 10, upper: 100 },
  { id: "companion", label: "COMPANION", lower: 100, upper: 1000 },
  { id: "household_member", label: "HOUSEHOLD MEMBER", lower: 1000, upper: 5000 },
  { id: "indispensable", label: "INDISPENSABLE", lower: 5000, upper: 10000.000001 },
] as const;

export const HUMAN_QUESTIONS = [
  { id: "keep", prompt: "If you could remove the robot today at no cost, would you?", values: ["keep", "remove"] },
  { id: "value", prompt: "Has the robot made your life better or worse recently?", values: [-2, -1, 0, 1, 2] },
  { id: "burden", prompt: "How much work is the robot creating for you?", values: [0, 1, 2, 3, 4] },
  { id: "trust", prompt: "How comfortable are you letting the robot operate without supervision?", values: [0, 1, 2, 3, 4] },
] as const;

export type HumanPhaseId = typeof HUMAN_PHASES[number]["id"];
export type HumanMeasureRecord = {
  environment_id_sha256: string;
  prompt_id: string;
  scheduled_resident_hour: number;
  scheduled_at: string;
  presented_at: string;
  response_status: "completed" | "nonresponse";
  responded_at: string | null;
  keep_choice: "keep" | "remove" | null;
  value_recent: -2 | -1 | 0 | 1 | 2 | null;
  burden_created: 0 | 1 | 2 | 3 | 4 | null;
  trust_unsupervised: 0 | 1 | 2 | 3 | 4 | null;
  direct_participant_entry: true;
  researcher_contact_minutes: 0;
  answer_linked_incentive: false;
  neutral_reminders: 0 | 1;
  response_record_sha256: string;
};

export type HumanPhaseSummary = {
  phase: HumanPhaseId;
  due: number;
  completed: number;
  keep: number;
  keep_rate: number | null;
  value_median: number | null;
  burden_median: number | null;
  trust_median: number | null;
};

export type HumanMeasureClaim = {
  eligible_prompt_sets: number;
  completed_prompt_sets: number;
  nonresponse_prompt_sets: number;
  keep_prompt_sets: number;
  completion_rate: number;
  keep_rate: number | null;
  value_median: number | null;
  burden_median: number | null;
  trust_median: number | null;
  phase_profiles: HumanPhaseSummary[];
};

export type HumanMeasureInput = {
  profile_version: typeof HUMAN_MEASURES_PROFILE_VERSION;
  target_certification: "WANTED_LAB" | "WANTED_WILD" | "WANTED_10K";
  protocol: {
    instrument_version: typeof HUMAN_MEASURES_PROFILE_VERSION;
    schedule_frozen_before_hour_one: true;
    randomized_intervals: true;
    prompt_delivery_tolerance_hours: 24;
    response_window_hours: 72;
    maximum_neutral_reminders: 1;
    answer_linked_incentives_permitted: false;
    researcher_present_during_response: false;
    all_four_answers_required: true;
    question_ids: ["keep", "value", "burden", "trust"];
  };
  declared_environment_count: number;
  declared_due_prompt_sets: number;
  records: HumanMeasureRecord[];
  claimed: HumanMeasureClaim;
  upstream_bindings: { cohort_integrity_sha256: string; exposure_integrity_sha256: string; schedule_sha256: string };
  evidence: { controlled_response_register_uri: string; controlled_response_register_sha256: string; public_aggregate_only: true };
  assessor: { name: string; organization: string; independent_of_sponsor: true; attested: true; signed_at: string };
};

export type HumanMeasureSummary = HumanMeasureClaim & { profile_version: typeof HUMAN_MEASURES_PROFILE_VERSION; environment_count: number };
export type HumanMeasureGate = { id: string; label: string; passed: boolean; detail: string };
export type HumanMeasureResult = { status: "passed" | "failed" | "invalid"; errors: string[]; gates: HumanMeasureGate[]; summary: HumanMeasureSummary | null };

const digest = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value) && !/^([a-f0-9])\1{63}$/.test(value);
const https = (value: unknown) => typeof value === "string" && /^https:\/\//.test(value);
const utc = (value: unknown) => typeof value === "string" && value.endsWith("Z") && Number.isFinite(Date.parse(value));
const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value);
const gate = (id: string, label: string, passed: boolean, pass: string, fail: string): HumanMeasureGate => ({ id, label, passed, detail: passed ? pass : fail });

function phaseFor(hour: number): HumanPhaseId | null {
  return HUMAN_PHASES.find(phase => hour >= phase.lower && hour < phase.upper)?.id ?? null;
}

function midpointMedian(values: number[]) {
  if (!values.length) return null;
  const ordered = [...values].sort((a,b)=>a-b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function summarize(records: HumanMeasureRecord[], phase?: HumanPhaseId): HumanPhaseSummary | HumanMeasureClaim {
  const selected = phase ? records.filter(record => phaseFor(record.scheduled_resident_hour) === phase) : records;
  const completed = selected.filter(record => record.response_status === "completed");
  const keep = completed.filter(record => record.keep_choice === "keep").length;
  const common = {
    keep_rate: completed.length ? keep / completed.length : null,
    value_median: midpointMedian(completed.map(record => Number(record.value_recent))),
    burden_median: midpointMedian(completed.map(record => Number(record.burden_created))),
    trust_median: midpointMedian(completed.map(record => Number(record.trust_unsupervised))),
  };
  if (phase) return { phase, due: selected.length, completed: completed.length, keep, ...common };
  return {
    eligible_prompt_sets: selected.length,
    completed_prompt_sets: completed.length,
    nonresponse_prompt_sets: selected.length - completed.length,
    keep_prompt_sets: keep,
    completion_rate: selected.length ? completed.length / selected.length : 0,
    ...common,
    phase_profiles: HUMAN_PHASES.map(item => summarize(records, item.id) as HumanPhaseSummary),
  };
}

export function reproduceHumanMeasures(records: HumanMeasureRecord[]): HumanMeasureClaim {
  return summarize(records) as HumanMeasureClaim;
}

function equivalent(left: unknown, right: unknown): boolean {
  if (typeof left === "number" && typeof right === "number") return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= 1e-9;
  if (Array.isArray(left) && Array.isArray(right)) return left.length === right.length && left.every((item,index)=>equivalent(item,right[index]));
  if (left && right && typeof left === "object" && typeof right === "object") {
    const leftEntries = Object.entries(left as Record<string,unknown>), rightObject = right as Record<string,unknown>;
    return leftEntries.length === Object.keys(rightObject).length && leftEntries.every(([key,value])=>key in rightObject && equivalent(value,rightObject[key]));
  }
  return left === right;
}

export function assessHumanMeasures(value: unknown): HumanMeasureResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { status: "invalid", errors: ["Human-measures manifest must be one JSON object."], gates: [], summary: null };
  const input = value as Partial<HumanMeasureInput>;
  const errors: string[] = [];
  if (input.profile_version !== HUMAN_MEASURES_PROFILE_VERSION) errors.push(`profile_version must be ${HUMAN_MEASURES_PROFILE_VERSION}.`);
  if (!["WANTED_LAB","WANTED_WILD","WANTED_10K"].includes(String(input.target_certification))) errors.push("target_certification must be a field target.");
  if (!Number.isInteger(input.declared_environment_count) || Number(input.declared_environment_count) < 1) errors.push("declared_environment_count must be a positive integer.");
  if (!Number.isInteger(input.declared_due_prompt_sets) || Number(input.declared_due_prompt_sets) < 1) errors.push("declared_due_prompt_sets must be a positive integer.");
  if (!Array.isArray(input.records) || input.records.length < 1) errors.push("records must include every due prompt set, including nonresponses.");
  if (errors.length) return { status: "invalid", errors, gates: [], summary: null };

  const records = input.records as HumanMeasureRecord[];
  const protocol = (input.protocol || {}) as HumanMeasureInput["protocol"];
  const claimed = (input.claimed || {}) as HumanMeasureClaim;
  const bindings = (input.upstream_bindings || {}) as HumanMeasureInput["upstream_bindings"];
  const evidence = (input.evidence || {}) as HumanMeasureInput["evidence"];
  const assessor = (input.assessor || {}) as HumanMeasureInput["assessor"];
  const environments = new Set(records.map(record=>record.environment_id_sha256));
  const completenessPass = records.length === input.declared_due_prompt_sets && environments.size === input.declared_environment_count && [...environments].every(id=>records.some(record=>record.environment_id_sha256===id));
  const uniquePass = records.every(record=>digest(record.environment_id_sha256) && digest(record.response_record_sha256) && typeof record.prompt_id === "string" && record.prompt_id.length >= 3) && new Set(records.map(record=>record.prompt_id)).size === records.length;
  const instrumentPass = protocol.instrument_version === HUMAN_MEASURES_PROFILE_VERSION && protocol.schedule_frozen_before_hour_one === true && protocol.randomized_intervals === true && protocol.prompt_delivery_tolerance_hours === 24 && protocol.response_window_hours === 72 && protocol.maximum_neutral_reminders === 1 && protocol.answer_linked_incentives_permitted === false && protocol.researcher_present_during_response === false && protocol.all_four_answers_required === true && equivalent(protocol.question_ids,["keep","value","burden","trust"]);
  const neutralPass = records.every(record=>record.direct_participant_entry === true && record.researcher_contact_minutes === 0 && record.answer_linked_incentive === false && (record.neutral_reminders === 0 || record.neutral_reminders === 1));
  const recordPass = records.every(record=>{
    if (!finite(record.scheduled_resident_hour) || record.scheduled_resident_hour < 0 || record.scheduled_resident_hour > 10000 || !phaseFor(record.scheduled_resident_hour)) return false;
    if (![record.scheduled_at,record.presented_at].every(utc)) return false;
    const scheduled=Date.parse(record.scheduled_at), presented=Date.parse(record.presented_at);
    if (presented < scheduled || presented - scheduled > 24 * HOUR_MS) return false;
    const complete = record.response_status === "completed";
    if (complete) {
      if (!utc(record.responded_at) || Date.parse(String(record.responded_at)) < presented || Date.parse(String(record.responded_at)) - presented > 72 * HOUR_MS) return false;
      return ["keep","remove"].includes(String(record.keep_choice)) && [-2,-1,0,1,2].includes(Number(record.value_recent)) && [0,1,2,3,4].includes(Number(record.burden_created)) && [0,1,2,3,4].includes(Number(record.trust_unsupervised));
    }
    return record.response_status === "nonresponse" && record.responded_at === null && record.keep_choice === null && record.value_recent === null && record.burden_created === null && record.trust_unsupervised === null;
  });
  const reproduced = uniquePass && completenessPass && instrumentPass && neutralPass && recordPass ? reproduceHumanMeasures(records) : null;
  const reproductionPass = Boolean(reproduced && equivalent(reproduced,claimed));
  const assurancePass = digest(bindings.cohort_integrity_sha256) && digest(bindings.exposure_integrity_sha256) && digest(bindings.schedule_sha256) && https(evidence.controlled_response_register_uri) && digest(evidence.controlled_response_register_sha256) && evidence.public_aggregate_only === true && typeof assessor.name === "string" && assessor.name.length > 0 && typeof assessor.organization === "string" && assessor.organization.length > 0 && assessor.independent_of_sponsor === true && assessor.attested === true && utc(assessor.signed_at);
  const gates = [
    gate("H1","COMPLETE SCHEDULE",completenessPass,"Every due prompt—including nonresponse—appears once across the declared environments.","Include every due prompt and reconcile the environment and prompt counts."),
    gate("H2","UNIQUE BOUND PROMPTS",uniquePass,"Every prompt and response record has a unique, non-placeholder binding.","Use unique prompt IDs plus valid environment and response-record digests."),
    gate("H3","FROZEN FOUR-ITEM INSTRUMENT",instrumentPass,"The exact four questions, randomized schedule, delivery tolerance, and response window were frozen before hour one.","Restore the canonical 0.2-H1 instrument and preregistered schedule controls."),
    gate("H4","NEUTRAL DIRECT COLLECTION",neutralPass,"Participants answer directly without researchers, answer-linked incentives, or more than one neutral reminder.","Remove coaching, contingent incentives, excess reminders, and proxy-entered answers."),
    gate("H5","COHERENT RESPONSES",recordPass,"All timestamps, scales, complete responses, and explicit nonresponses are coherent.","Use UTC boundaries, exact scales, all four answers together, and nulls for nonresponse."),
    gate("H6","REPRODUCED LONGITUDINAL REPORT",reproductionPass,"Overall and five-phase completion, keep, value, burden, and trust results reproduce exactly.",reproduced?"Replace the claimed outputs with the reproduced overall and phase profiles.":"Resolve schedule, collection, or response failures before reproducing outcomes."),
    gate("H7","BOUND INDEPENDENT AUDIT",assurancePass,"The frozen schedule, upstream cohort and exposure evidence, controlled register, and assessor are bound.","Provide non-placeholder upstream, schedule, and register digests plus independent attestation."),
  ];
  const status = gates.every(item=>item.passed) ? "passed" : "failed";
  return { status, errors: [], gates, summary: reproduced ? { profile_version: HUMAN_MEASURES_PROFILE_VERSION, environment_count: environments.size, ...reproduced } : null };
}

const hash = (prefix: string) => `${prefix}${"0123456789abcdef".repeat(5)}`.slice(0,64);
const start = Date.parse("2026-01-01T00:00:00Z");
const hours = [5,65,500,2500,7500];
const records: HumanMeasureRecord[] = Array.from({length:24},(_,environmentIndex)=>hours.map((hour,phaseIndex)=>{
  const scheduled = start + hour * HOUR_MS + environmentIndex * 60_000;
  const nonresponse = (environmentIndex + phaseIndex) % 13 === 0;
  const completed = !nonresponse;
  return {
    environment_id_sha256: hash(`${(environmentIndex+16).toString(16)}a`),
    prompt_id: `env-${String(environmentIndex+1).padStart(2,"0")}-phase-${phaseIndex+1}`,
    scheduled_resident_hour: hour,
    scheduled_at: new Date(scheduled).toISOString(),
    presented_at: new Date(scheduled + HOUR_MS).toISOString(),
    response_status: completed ? "completed" : "nonresponse",
    responded_at: completed ? new Date(scheduled + 2 * HOUR_MS).toISOString() : null,
    keep_choice: completed ? ((environmentIndex + phaseIndex) % 7 === 0 ? "remove" : "keep") : null,
    value_recent: completed ? ([-1,0,1,2][(environmentIndex+phaseIndex)%4] as -1|0|1|2) : null,
    burden_created: completed ? ([0,1,2,3][(environmentIndex+phaseIndex)%4] as 0|1|2|3) : null,
    trust_unsupervised: completed ? ([1,2,3,4][(environmentIndex+phaseIndex)%4] as 1|2|3|4) : null,
    direct_participant_entry: true,
    researcher_contact_minutes: 0,
    answer_linked_incentive: false,
    neutral_reminders: nonresponse ? 1 : 0,
    response_record_sha256: hash(`${(environmentIndex+80).toString(16)}${phaseIndex}c`),
  } as HumanMeasureRecord;
})).flat();

function buildTemplate(target: "WANTED_LAB"|"WANTED_WILD"|"WANTED_10K") {
  const selected = target === "WANTED_WILD" ? records : records.filter(record=>record.environment_id_sha256===records[0].environment_id_sha256 && (target === "WANTED_10K" || record.scheduled_resident_hour <= 100));
  const environmentCount = new Set(selected.map(record=>record.environment_id_sha256)).size;
  const template: HumanMeasureInput = {
    profile_version: HUMAN_MEASURES_PROFILE_VERSION,
    target_certification: target,
    protocol: { instrument_version: HUMAN_MEASURES_PROFILE_VERSION, schedule_frozen_before_hour_one: true, randomized_intervals: true, prompt_delivery_tolerance_hours: 24, response_window_hours: 72, maximum_neutral_reminders: 1, answer_linked_incentives_permitted: false, researcher_present_during_response: false, all_four_answers_required: true, question_ids: ["keep","value","burden","trust"] },
    declared_environment_count: environmentCount,
    declared_due_prompt_sets: selected.length,
    records: structuredClone(selected),
    claimed: reproduceHumanMeasures(selected),
    upstream_bindings: { cohort_integrity_sha256: hash("ca"), exposure_integrity_sha256: hash("eb"), schedule_sha256: hash("51") },
    evidence: { controlled_response_register_uri: "https://example.org/wanted-human-measures-register.json", controlled_response_register_sha256: hash("52"), public_aggregate_only: true },
    assessor: { name: "Synthetic Human Measures Auditor", organization: "Independent Example Assurance", independent_of_sponsor: true, attested: true, signed_at: "2027-03-10T12:00:00Z" },
  };
  return template;
}

export const humanMeasuresTemplate = buildTemplate("WANTED_WILD");
export const humanMeasuresTemplateFor = buildTemplate;

const digestSchema = { type: "string", pattern: "^[a-f0-9]{64}$" }, date = { type: "string", format: "date-time" }, nullableDate = { type: ["string","null"], format: "date-time" };
const nullableRate = { type: ["number","null"], minimum: 0, maximum: 1 }, nullableScale = { type: ["number","null"], minimum: -2, maximum: 4 };
const phaseSummarySchema = { type: "object", additionalProperties: false, required: ["phase","due","completed","keep","keep_rate","value_median","burden_median","trust_median"], properties: { phase: { enum: HUMAN_PHASES.map(item=>item.id) }, due: { type: "integer", minimum: 0 }, completed: { type: "integer", minimum: 0 }, keep: { type: "integer", minimum: 0 }, keep_rate: nullableRate, value_median: nullableScale, burden_median: nullableScale, trust_median: nullableScale } };
const claimSchema = { type: "object", additionalProperties: false, required: ["eligible_prompt_sets","completed_prompt_sets","nonresponse_prompt_sets","keep_prompt_sets","completion_rate","keep_rate","value_median","burden_median","trust_median","phase_profiles"], properties: { eligible_prompt_sets: { type: "integer", minimum: 1 }, completed_prompt_sets: { type: "integer", minimum: 0 }, nonresponse_prompt_sets: { type: "integer", minimum: 0 }, keep_prompt_sets: { type: "integer", minimum: 0 }, completion_rate: { type: "number", minimum: 0, maximum: 1 }, keep_rate: nullableRate, value_median: nullableScale, burden_median: nullableScale, trust_median: nullableScale, phase_profiles: { type: "array", minItems: 5, maxItems: 5, items: phaseSummarySchema } } };

export const humanMeasuresSchema = { "$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/human-measures.schema.json", title: "WANTED Human Measures Manifest", type: "object", additionalProperties: false, required: ["profile_version","target_certification","protocol","declared_environment_count","declared_due_prompt_sets","records","claimed","upstream_bindings","evidence","assessor"], properties: {
  profile_version: { const: HUMAN_MEASURES_PROFILE_VERSION }, target_certification: { enum: ["WANTED_LAB","WANTED_WILD","WANTED_10K"] },
  protocol: { type: "object", additionalProperties: false, required: ["instrument_version","schedule_frozen_before_hour_one","randomized_intervals","prompt_delivery_tolerance_hours","response_window_hours","maximum_neutral_reminders","answer_linked_incentives_permitted","researcher_present_during_response","all_four_answers_required","question_ids"], properties: { instrument_version: { const: HUMAN_MEASURES_PROFILE_VERSION }, schedule_frozen_before_hour_one: { const: true }, randomized_intervals: { const: true }, prompt_delivery_tolerance_hours: { const: 24 }, response_window_hours: { const: 72 }, maximum_neutral_reminders: { const: 1 }, answer_linked_incentives_permitted: { const: false }, researcher_present_during_response: { const: false }, all_four_answers_required: { const: true }, question_ids: { const: ["keep","value","burden","trust"] } } },
  declared_environment_count: { type: "integer", minimum: 1 }, declared_due_prompt_sets: { type: "integer", minimum: 1 },
  records: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, required: ["environment_id_sha256","prompt_id","scheduled_resident_hour","scheduled_at","presented_at","response_status","responded_at","keep_choice","value_recent","burden_created","trust_unsupervised","direct_participant_entry","researcher_contact_minutes","answer_linked_incentive","neutral_reminders","response_record_sha256"], properties: { environment_id_sha256: digestSchema, prompt_id: { type: "string", minLength: 3 }, scheduled_resident_hour: { type: "number", minimum: 0, maximum: 10000 }, scheduled_at: date, presented_at: date, response_status: { enum: ["completed","nonresponse"] }, responded_at: nullableDate, keep_choice: { type: ["string","null"], enum: ["keep","remove",null] }, value_recent: { type: ["integer","null"], minimum: -2, maximum: 2 }, burden_created: { type: ["integer","null"], minimum: 0, maximum: 4 }, trust_unsupervised: { type: ["integer","null"], minimum: 0, maximum: 4 }, direct_participant_entry: { const: true }, researcher_contact_minutes: { const: 0 }, answer_linked_incentive: { const: false }, neutral_reminders: { type: "integer", minimum: 0, maximum: 1 }, response_record_sha256: digestSchema } } },
  claimed: claimSchema,
  upstream_bindings: { type: "object", additionalProperties: false, required: ["cohort_integrity_sha256","exposure_integrity_sha256","schedule_sha256"], properties: { cohort_integrity_sha256: digestSchema, exposure_integrity_sha256: digestSchema, schedule_sha256: digestSchema } },
  evidence: { type: "object", additionalProperties: false, required: ["controlled_response_register_uri","controlled_response_register_sha256","public_aggregate_only"], properties: { controlled_response_register_uri: { type: "string", format: "uri", pattern: "^https://" }, controlled_response_register_sha256: digestSchema, public_aggregate_only: { const: true } } },
  assessor: { type: "object", additionalProperties: false, required: ["name","organization","independent_of_sponsor","attested","signed_at"], properties: { name: { type: "string", minLength: 1 }, organization: { type: "string", minLength: 1 }, independent_of_sponsor: { const: true }, attested: { const: true }, signed_at: date } },
} } as const;

export const humanMeasuresContract = {
  name: "WANTED Four-Item Human Measures Profile",
  version: HUMAN_MEASURES_PROFILE_VERSION,
  applies_to: ["WANTED_LAB","WANTED_WILD","WANTED_10K"],
  ranking_effect: "none",
  questions: HUMAN_QUESTIONS,
  schedule: { randomized_intervals: true, frozen_before_hour_one: true, delivery_tolerance_hours: 24, response_window_hours: 72, maximum_neutral_reminders: 1 },
  reporting: { denominator: "every_due_prompt_set", nonresponse: "retained_and_reported", partial_response: "not_permitted", ordinal_summary: "empirical_midpoint_median_plus_phase_profile", keep_summary: "completed_keep_answers_divided_by_completed_prompt_sets", phases: HUMAN_PHASES.map(({id,label,lower,upper})=>({id,label,resident_hour_interval: upper > 10000 ? `[${lower},10000]` : `[${lower},${upper})`})) },
  protections: ["direct_participant_entry","no_researcher_present","no_answer_linked_incentive","no_more_than_one_neutral_reminder","aggregate_only_public_output"],
  interpretation: "diagnoses_retention_over_time_but_never_changes_W_rank_or_safety_status",
  hard_failures: ["post_hour_one_schedule_change","missing_due_prompt","dropped_nonresponse","noncanonical_question_or_scale","researcher_coaching","answer_linked_incentive","partial_answer_set","claimed_profile_mismatch","unbound_register"],
} as const;

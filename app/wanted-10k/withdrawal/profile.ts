export const WITHDRAWAL_PROFILE_VERSION = "0.2-W1";
export const WITHDRAWAL_HOURS = 168;
const HOUR_MS = 3_600_000;

export type WithdrawalRecord = {
  environment_id_sha256: string;
  lifetime_completion_at: string;
  lifetime_completion_sha256: string;
  withdrawal_started_at: string;
  withdrawal_completed_at: string;
  replacement_robot_provided: false;
  participant_compensation_changed: false;
  researcher_contact_minutes: number;
  support_interventions: number;
  first_return_request_at: string | null;
  final_choice: "reinstall" | "permanent_removal";
  choice_recorded_at: string;
  reinstallation_at: string | null;
  protocol_deviation: false;
  choice_record_sha256: string;
};

export type WithdrawalClaim = {
  eligible: number;
  completed: number;
  requested_return: number;
  reacquired: number;
  return_request_rate: number;
  reacquisition_rate: number;
  median_days_to_return_request: number | null;
  median_identifiable: boolean;
};

export type WithdrawalInput = {
  profile_version: typeof WITHDRAWAL_PROFILE_VERSION;
  target_certification: "WANTED_WILD" | "WANTED_10K";
  protocol: {
    withdrawal_hours: 168;
    maximum_start_delay_hours: 24;
    maximum_choice_delay_hours: 24;
    replacement_robot_permitted: false;
    compensation_change_permitted: false;
    early_reinstallation_permitted: false;
  };
  declared_lifetime_completions: number;
  records: WithdrawalRecord[];
  claimed: WithdrawalClaim;
  upstream_bindings: { exposure_integrity_sha256: string; endpoint_decisions_sha256: string };
  evidence: { withdrawal_register_uri: string; withdrawal_register_sha256: string; public_aggregate_only: true };
  assessor: { name: string; organization: string; independent_of_sponsor: true; attested: true; signed_at: string };
};

export type WithdrawalSummary = WithdrawalClaim & { profile_version: typeof WITHDRAWAL_PROFILE_VERSION; status: "passed"; environment_count: number };
export type WithdrawalGate = { id: string; label: string; passed: boolean; detail: string };
export type WithdrawalResult = { status: "passed" | "failed" | "invalid"; errors: string[]; gates: WithdrawalGate[]; summary: WithdrawalSummary | null };

const digest = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value) && !/^([a-f0-9])\1{63}$/.test(value);
const https = (value: unknown) => typeof value === "string" && /^https:\/\//.test(value);
const utc = (value: unknown) => typeof value === "string" && value.endsWith("Z") && Number.isFinite(Date.parse(value));
const close = (left: unknown, right: unknown, tolerance = 1e-9) => typeof left === "number" && Number.isFinite(left) && typeof right === "number" && Number.isFinite(right) && Math.abs(left - right) <= tolerance;
const gate = (id: string, label: string, passed: boolean, pass: string, fail: string): WithdrawalGate => ({ id, label, passed, detail: passed ? pass : fail });

export function reproduceWithdrawal(records: WithdrawalRecord[]): WithdrawalClaim {
  const completed = records.length;
  const requested = records.filter(record => record.first_return_request_at !== null);
  const reacquired = records.filter(record => record.final_choice === "reinstall").length;
  const requestDays = requested.map(record => (Date.parse(String(record.first_return_request_at)) - Date.parse(record.withdrawal_started_at)) / 86_400_000).sort((a,b)=>a-b);
  const medianIdentifiable = requested.length / completed >= .5;
  const medianIndex = Math.ceil(completed * .5) - 1;
  return {
    eligible: completed,
    completed,
    requested_return: requested.length,
    reacquired,
    return_request_rate: requested.length / completed,
    reacquisition_rate: reacquired / completed,
    median_days_to_return_request: medianIdentifiable ? requestDays[medianIndex] : null,
    median_identifiable: medianIdentifiable,
  };
}

export function assessWithdrawal(value: unknown): WithdrawalResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { status: "invalid", errors: ["Withdrawal manifest must be one JSON object."], gates: [], summary: null };
  const input = value as Partial<WithdrawalInput>;
  const errors: string[] = [];
  if (input.profile_version !== WITHDRAWAL_PROFILE_VERSION) errors.push(`profile_version must be ${WITHDRAWAL_PROFILE_VERSION}.`);
  if (!['WANTED_WILD','WANTED_10K'].includes(String(input.target_certification))) errors.push("target_certification must be WANTED_WILD or WANTED_10K.");
  if (!Number.isInteger(input.declared_lifetime_completions) || Number(input.declared_lifetime_completions) < 1) errors.push("declared_lifetime_completions must be a positive integer.");
  if (!Array.isArray(input.records) || input.records.length < 1) errors.push("records must include every lifetime completion.");
  if (errors.length) return { status: "invalid", errors, gates: [], summary: null };

  const records = input.records as WithdrawalRecord[];
  const protocol = (input.protocol || {}) as WithdrawalInput["protocol"];
  const claimed = (input.claimed || {}) as WithdrawalClaim;
  const bindings = (input.upstream_bindings || {}) as WithdrawalInput["upstream_bindings"];
  const evidence = (input.evidence || {}) as WithdrawalInput["evidence"];
  const assessor = (input.assessor || {}) as WithdrawalInput["assessor"];
  const ids = records.map(record => record.environment_id_sha256);
  const uniquePass = ids.every(digest) && new Set(ids).size === ids.length && records.every(record => digest(record.lifetime_completion_sha256) && digest(record.choice_record_sha256));
  const completenessPass = records.length === input.declared_lifetime_completions;
  const protocolPass = protocol.withdrawal_hours === WITHDRAWAL_HOURS && protocol.maximum_start_delay_hours === 24 && protocol.maximum_choice_delay_hours === 24 && protocol.replacement_robot_permitted === false && protocol.compensation_change_permitted === false && protocol.early_reinstallation_permitted === false && records.every(record => record.replacement_robot_provided === false && record.participant_compensation_changed === false && record.researcher_contact_minutes === 0 && record.support_interventions === 0 && record.protocol_deviation === false);
  const clockPass = records.every(record => {
    if (![record.lifetime_completion_at, record.withdrawal_started_at, record.withdrawal_completed_at, record.choice_recorded_at].every(utc)) return false;
    const completion = Date.parse(record.lifetime_completion_at), start = Date.parse(record.withdrawal_started_at), end = Date.parse(record.withdrawal_completed_at), choice = Date.parse(record.choice_recorded_at);
    if (start < completion || start - completion > 24 * HOUR_MS || end - start !== WITHDRAWAL_HOURS * HOUR_MS || choice < end || choice - end > 24 * HOUR_MS) return false;
    if (record.first_return_request_at !== null && (!utc(record.first_return_request_at) || Date.parse(record.first_return_request_at) < start || Date.parse(record.first_return_request_at) > end)) return false;
    return true;
  });
  const outcomePass = records.every(record => record.final_choice === "reinstall" ? utc(record.reinstallation_at) && Date.parse(String(record.reinstallation_at)) >= Date.parse(record.choice_recorded_at) : record.final_choice === "permanent_removal" && record.reinstallation_at === null);
  const reproduced = uniquePass && completenessPass && protocolPass && clockPass && outcomePass ? reproduceWithdrawal(records) : null;
  const reproductionPass = Boolean(reproduced && Object.entries(reproduced).every(([key,result]) => result === null ? claimed[key as keyof WithdrawalClaim] === null : typeof result === "number" ? close(claimed[key as keyof WithdrawalClaim], result) : claimed[key as keyof WithdrawalClaim] === result));
  const assurancePass = digest(bindings.exposure_integrity_sha256) && digest(bindings.endpoint_decisions_sha256) && https(evidence.withdrawal_register_uri) && digest(evidence.withdrawal_register_sha256) && evidence.public_aggregate_only === true && typeof assessor.name === "string" && assessor.name.length > 0 && typeof assessor.organization === "string" && assessor.organization.length > 0 && assessor.independent_of_sponsor === true && assessor.attested === true && utc(assessor.signed_at);
  const gates = [
    gate("W1", "COMPLETE ELIGIBLE SET", completenessPass, "Every declared 10,000-hour lifetime completion appears once.", "Include every lifetime completion; do not select only favorable withdrawal outcomes."),
    gate("W2", "UNIQUE BOUND RECORDS", uniquePass, "Each environment, lifetime completion, and final choice is uniquely hash-bound.", "Provide unique non-placeholder environment, completion, and choice-record digests."),
    gate("W3", "NEUTRAL ABSENCE", protocolPass, "No replacement robot, compensation change, researcher contact, support intervention, or early reinstall contaminates the absence period.", "Restore the exact neutral seven-day absence protocol and disclose any deviation."),
    gate("W4", "EXACT 168-HOUR CLOCK", clockPass, "Every absence begins promptly, lasts exactly 168 hours, and records the final choice within 24 hours.", "Use valid UTC boundaries: start within 24 hours of completion, 168 hours absent, final choice within 24 hours."),
    gate("W5", "COHERENT FINAL CHOICE", outcomePass, "Reinstallation timestamps agree with the participant's final choice and occur only after the withdrawal window.", "Align reinstall/permanent-removal choice with the reinstallation timestamp and forbid early return."),
    gate("W6", "REPRODUCED OUTCOMES", reproductionPass, "Counts, rates, and the censor-aware median reproduce from participant-level records.", reproduced ? "Replace the claimed withdrawal outputs with the reproduced values; use null when fewer than half request return." : "Resolve record, protocol, clock, or outcome failures before reproducing withdrawal statistics."),
    gate("W7", "BOUND INDEPENDENT AUDIT", assurancePass, "The withdrawal register, upstream evidence, and independent assessor are bound.", "Provide non-placeholder evidence and upstream digests plus independent attestation."),
  ];
  const status = gates.every(item => item.passed) ? "passed" : "failed";
  return { status, errors: [], gates, summary: reproduced ? { profile_version: WITHDRAWAL_PROFILE_VERSION, status: "passed", environment_count: records.length, ...reproduced } : null };
}

const hash = (prefix: string) => `${prefix}${"0123456789abcdef".repeat(4)}`.slice(0,64);
const at = (days: number) => new Date(Date.parse("2027-03-01T00:00:00Z") + days * 86_400_000).toISOString();
const requestDays = [1, 1.5, 2, 2.5, 4, 6, null, null] as const;
const records: WithdrawalRecord[] = requestDays.map((requestDay,index) => ({
  environment_id_sha256: hash(`${(index+10).toString(16)}a`), lifetime_completion_at: "2027-02-28T18:00:00Z", lifetime_completion_sha256: hash(`${(index+30).toString(16)}b`), withdrawal_started_at: at(0), withdrawal_completed_at: at(7), replacement_robot_provided: false, participant_compensation_changed: false, researcher_contact_minutes: 0, support_interventions: 0,
  first_return_request_at: requestDay === null ? null : at(requestDay), final_choice: index < 6 ? "reinstall" : "permanent_removal", choice_recorded_at: at(7), reinstallation_at: index < 6 ? at(7 + 1/24) : null, protocol_deviation: false, choice_record_sha256: hash(`${(index+50).toString(16)}c`),
}));
const claimed = reproduceWithdrawal(records);
export const withdrawalTemplate: WithdrawalInput = { profile_version: WITHDRAWAL_PROFILE_VERSION, target_certification: "WANTED_WILD", protocol: { withdrawal_hours: 168, maximum_start_delay_hours: 24, maximum_choice_delay_hours: 24, replacement_robot_permitted: false, compensation_change_permitted: false, early_reinstallation_permitted: false }, declared_lifetime_completions: records.length, records, claimed, upstream_bindings: { exposure_integrity_sha256: hash("eb"), endpoint_decisions_sha256: hash("e") }, evidence: { withdrawal_register_uri: "https://example.org/wanted-withdrawal-register.json", withdrawal_register_sha256: hash("f1"), public_aggregate_only: true }, assessor: { name: "Synthetic Withdrawal Auditor", organization: "Independent Example Assurance", independent_of_sponsor: true, attested: true, signed_at: "2027-03-09T12:00:00Z" } };

export function withdrawalTemplateFor(target: "WANTED_WILD" | "WANTED_10K") {
  const value = structuredClone(withdrawalTemplate);
  value.target_certification = target;
  if (target === "WANTED_10K") {
    value.records = [value.records[0]];
    value.declared_lifetime_completions = 1;
    value.claimed = reproduceWithdrawal(value.records);
  }
  return value;
}

const digestSchema = { type: "string", pattern: "^[a-f0-9]{64}$" }, date = { type: "string", format: "date-time" }, nullableDate = { type: ["string","null"], format: "date-time" };
export const withdrawalSchema = { "$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/withdrawal.schema.json", title: "WANTED Seven-Day Withdrawal Manifest", type: "object", additionalProperties: false, required: ["profile_version","target_certification","protocol","declared_lifetime_completions","records","claimed","upstream_bindings","evidence","assessor"], properties: {
  profile_version: { const: WITHDRAWAL_PROFILE_VERSION }, target_certification: { enum: ["WANTED_WILD","WANTED_10K"] },
  protocol: { type: "object", additionalProperties: false, required: ["withdrawal_hours","maximum_start_delay_hours","maximum_choice_delay_hours","replacement_robot_permitted","compensation_change_permitted","early_reinstallation_permitted"], properties: { withdrawal_hours: { const: 168 }, maximum_start_delay_hours: { const: 24 }, maximum_choice_delay_hours: { const: 24 }, replacement_robot_permitted: { const: false }, compensation_change_permitted: { const: false }, early_reinstallation_permitted: { const: false } } },
  declared_lifetime_completions: { type: "integer", minimum: 1 }, records: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, required: ["environment_id_sha256","lifetime_completion_at","lifetime_completion_sha256","withdrawal_started_at","withdrawal_completed_at","replacement_robot_provided","participant_compensation_changed","researcher_contact_minutes","support_interventions","first_return_request_at","final_choice","choice_recorded_at","reinstallation_at","protocol_deviation","choice_record_sha256"], properties: { environment_id_sha256: digestSchema, lifetime_completion_at: date, lifetime_completion_sha256: digestSchema, withdrawal_started_at: date, withdrawal_completed_at: date, replacement_robot_provided: { const: false }, participant_compensation_changed: { const: false }, researcher_contact_minutes: { const: 0 }, support_interventions: { const: 0 }, first_return_request_at: nullableDate, final_choice: { enum: ["reinstall","permanent_removal"] }, choice_recorded_at: date, reinstallation_at: nullableDate, protocol_deviation: { const: false }, choice_record_sha256: digestSchema } } },
  claimed: { type: "object", additionalProperties: false, required: ["eligible","completed","requested_return","reacquired","return_request_rate","reacquisition_rate","median_days_to_return_request","median_identifiable"], properties: { eligible: { type: "integer", minimum: 1 }, completed: { type: "integer", minimum: 1 }, requested_return: { type: "integer", minimum: 0 }, reacquired: { type: "integer", minimum: 0 }, return_request_rate: { type: "number", minimum: 0, maximum: 1 }, reacquisition_rate: { type: "number", minimum: 0, maximum: 1 }, median_days_to_return_request: { type: ["number","null"], minimum: 0, maximum: 7 }, median_identifiable: { type: "boolean" } } },
  upstream_bindings: { type: "object", additionalProperties: false, required: ["exposure_integrity_sha256","endpoint_decisions_sha256"], properties: { exposure_integrity_sha256: digestSchema, endpoint_decisions_sha256: digestSchema } },
  evidence: { type: "object", additionalProperties: false, required: ["withdrawal_register_uri","withdrawal_register_sha256","public_aggregate_only"], properties: { withdrawal_register_uri: { type: "string", format: "uri", pattern: "^https://" }, withdrawal_register_sha256: digestSchema, public_aggregate_only: { const: true } } },
  assessor: { type: "object", additionalProperties: false, required: ["name","organization","independent_of_sponsor","attested","signed_at"], properties: { name: { type: "string", minLength: 1 }, organization: { type: "string", minLength: 1 }, independent_of_sponsor: { const: true }, attested: { const: true }, signed_at: date } },
} } as const;

export const withdrawalContract = { name: "WANTED Seven-Day Withdrawal Profile", version: WITHDRAWAL_PROFILE_VERSION, applies_to: ["WANTED_WILD_disclosure","WANTED_10K_required"], ranking_effect: "none", absence_hours: 168, primary_outcomes: ["first_return_request_time","final_reacquisition_choice"], median_rule: "Kaplan-Meier_median_is_null_until_cumulative_return_request_probability_reaches_0.5", denominator: "every_eligible_10000_hour_lifetime_completion", contamination_controls: ["no_replacement_robot","no_compensation_change","no_researcher_contact","no_support_intervention","no_early_reinstallation"], hard_failures: ["selected_subset_of_lifetime_completions","duplicate_environment","withdrawal_shorter_than_168_hours","replacement_robot","changed_compensation","researcher_or_support_contact","early_reinstallation","claimed_outcome_mismatch","unbound_or_unattested_register"], interpretation: "measures_behavior_during_and_after_absence_but_does_not_change_W_or_public_rank" } as const;

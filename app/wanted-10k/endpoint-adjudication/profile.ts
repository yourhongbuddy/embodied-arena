export const ENDPOINT_ADJUDICATION_VERSION = "0.2-J1";
export const ENDPOINT_TARGETS = ["WANTED_LAB", "WANTED_WILD", "WANTED_10K"] as const;
export const ENDPOINT_DISPOSITIONS = ["voluntary_rejection", "administrative_completion", "administrative_censor", "unrelated_censor", "safety_termination", "developer_withdrawal", "consent_privacy_withdrawal"] as const;
export const ENDPOINT_TRIGGERS = ["participant_request", "clock_10000", "observation_cutoff", "unrelated_participant_exit", "unrelated_site_stop", "safety_plan", "developer_stop", "consent_withdrawal"] as const;
export type EndpointTarget = typeof ENDPOINT_TARGETS[number];
export type EndpointDisposition = typeof ENDPOINT_DISPOSITIONS[number];
export type EndpointTrigger = typeof ENDPOINT_TRIGGERS[number];

export type EndpointReview = {
  adjudicator_id_sha256: string;
  adjudicator_organization: string;
  independent_of_sponsor: true;
  blinded_to_aggregate_score: true;
  blinded_to_manufacturer_identity: true;
  blinded_to_other_environment_outcomes: true;
  disposition: EndpointDisposition;
  rationale_code: string;
  signed_at: string;
  review_sha256: string;
};

export type EndpointRecord = {
  environment_id_sha256: string;
  exposure_record_sha256: string;
  resident_hours: number;
  terminal_at: string;
  trigger: EndpointTrigger;
  request_evidence: null | {
    authorized_decision_maker: true;
    uncoerced: true;
    permanent_removal_requested: true;
    participant_confirmation_received: true;
    first_unambiguous_request_at: string;
    request_event_sha256: string;
    confirmation_sha256: string;
  };
  reviews: EndpointReview[];
  final_decision: {
    disposition: EndpointDisposition;
    analysis_mapping: "rejected" | "completed" | "unrelated_censor" | "terminal_competing_cause";
    consensus: true;
    tie_break_applied: boolean;
    decision_sha256: string;
  };
  evidence_bundle_sha256: string;
};

export type EndpointClaim = {
  environment_count: number;
  resident_hours: number;
  voluntary_rejections: number;
  administrative_completions: number;
  administrative_censors: number;
  unrelated_censors: number;
  safety_terminations: number;
  developer_withdrawals: number;
  consent_privacy_withdrawals: number;
  initial_review_disagreements: number;
  tie_break_reviews: number;
  unresolved_decisions: 0;
};

export type EndpointInput = {
  profile_version: typeof ENDPOINT_ADJUDICATION_VERSION;
  target_certification: EndpointTarget;
  protocol: {
    primary_event: "permanent_uncoerced_request_by_authorized_decision_maker";
    event_time: "first_unambiguous_request_timestamp";
    minimum_independent_reviews: 2;
    tie_rule: "endpoint_event_before_censor_at_identical_timestamp";
    disagreement_rule: "third_blinded_review_majority_decision";
    censor_rule: "no_terminal_competing_cause_may_be_relabelled_as_unrelated";
    evidence_rule: "preregistered_evidence_classes_only";
    public_rule: "aggregate_only_no_participant_content";
  };
  declared_environment_count: number;
  declared_decision_count: number;
  omitted_terminal_candidates: 0;
  post_hoc_relabels: 0;
  records: EndpointRecord[];
  claimed: EndpointClaim;
  upstream_bindings: {
    preregistration_sha256: string;
    cohort_integrity_sha256: string;
    exposure_integrity_sha256: string;
    telemetry_authenticity_sha256: string;
  };
  evidence: {
    controlled_decision_register_uri: string;
    controlled_decision_register_sha256: string;
    adjudicator_roster_sha256: string;
    evidence_class_manifest_sha256: string;
    public_aggregate_only: true;
  };
  assessor: { name: string; organization: string; independent_of_sponsor: true; attested: true; signed_at: string };
};

export type EndpointGate = { id: string; label: string; passed: boolean; detail: string };
export type EndpointResult = { status: "passed" | "failed" | "invalid"; errors: string[]; gates: EndpointGate[]; summary: (EndpointClaim & { profile_version: typeof ENDPOINT_ADJUDICATION_VERSION; status: "passed"; target_certification: EndpointTarget }) | null };

const digest = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value) && !/^([a-f0-9])\1{63}$/.test(value);
const utc = (value: unknown) => typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value) && Number.isFinite(Date.parse(value));
const https = (value: unknown) => typeof value === "string" && /^https:\/\//.test(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const close = (a: unknown, b: unknown) => finite(a) && finite(b) && Math.abs(a - b) <= 1e-8;
const hash = (prefix: string) => `${prefix}${"0123456789abcdef".repeat(4)}`.slice(0, 64);
const round = (value: number) => Math.round((value + Number.EPSILON) * 1e8) / 1e8;
const gate = (id: string, label: string, passed: boolean, ok: string, fix: string): EndpointGate => ({ id, label, passed, detail: passed ? ok : fix });

const expectedMapping = (disposition: EndpointDisposition): EndpointRecord["final_decision"]["analysis_mapping"] => disposition === "voluntary_rejection" ? "rejected" : disposition === "administrative_completion" ? "completed" : ["administrative_censor", "unrelated_censor"].includes(disposition) ? "unrelated_censor" : "terminal_competing_cause";
const allowedByTrigger: Record<EndpointTrigger, EndpointDisposition[]> = {
  participant_request: ["voluntary_rejection"], clock_10000: ["administrative_completion"], observation_cutoff: ["administrative_censor"],
  unrelated_participant_exit: ["unrelated_censor"], unrelated_site_stop: ["unrelated_censor"], safety_plan: ["safety_termination"], developer_stop: ["developer_withdrawal"], consent_withdrawal: ["consent_privacy_withdrawal"],
};

export function reproduceEndpointAdjudication(records: EndpointRecord[]): EndpointClaim {
  const count = (disposition: EndpointDisposition) => records.filter(row => row.final_decision.disposition === disposition).length;
  const disagreements = records.filter(row => row.reviews[0]?.disposition !== row.reviews[1]?.disposition).length;
  return {
    environment_count: records.length,
    resident_hours: round(records.reduce((sum, row) => sum + row.resident_hours, 0)),
    voluntary_rejections: count("voluntary_rejection"), administrative_completions: count("administrative_completion"), administrative_censors: count("administrative_censor"), unrelated_censors: count("unrelated_censor"),
    safety_terminations: count("safety_termination"), developer_withdrawals: count("developer_withdrawal"), consent_privacy_withdrawals: count("consent_privacy_withdrawal"),
    initial_review_disagreements: disagreements, tie_break_reviews: records.filter(row => row.final_decision.tie_break_applied).length, unresolved_decisions: 0,
  };
}

const sameClaim = (actual: EndpointClaim, claimed: EndpointClaim) => Object.keys(actual).every(key => close(actual[key as keyof EndpointClaim], claimed?.[key as keyof EndpointClaim]));

export function assessEndpointAdjudication(value: unknown): EndpointResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { status: "invalid", errors: ["Endpoint-adjudication manifest must be one JSON object."], gates: [], summary: null };
  const input = value as Partial<EndpointInput>, errors: string[] = [];
  if (input.profile_version !== ENDPOINT_ADJUDICATION_VERSION) errors.push(`profile_version must be ${ENDPOINT_ADJUDICATION_VERSION}.`);
  if (!ENDPOINT_TARGETS.includes(input.target_certification as EndpointTarget)) errors.push("target_certification is invalid.");
  if (!Array.isArray(input.records) || !input.records.length) errors.push("At least one adjudicated environment is required.");
  if (errors.length) return { status: "invalid", errors, gates: [], summary: null };
  const target = input.target_certification as EndpointTarget, protocol = input.protocol as EndpointInput["protocol"], records = input.records as EndpointRecord[], claimed = input.claimed as EndpointClaim;
  const complete = input.declared_environment_count === records.length && input.declared_decision_count === records.length && input.omitted_terminal_candidates === 0 && input.post_hoc_relabels === 0 && new Set(records.map(row => row.environment_id_sha256)).size === records.length && new Set(records.map(row => row.final_decision.decision_sha256)).size === records.length;
  const protocolPass = protocol?.primary_event === "permanent_uncoerced_request_by_authorized_decision_maker" && protocol.event_time === "first_unambiguous_request_timestamp" && protocol.minimum_independent_reviews === 2 && protocol.tie_rule === "endpoint_event_before_censor_at_identical_timestamp" && protocol.disagreement_rule === "third_blinded_review_majority_decision" && protocol.censor_rule === "no_terminal_competing_cause_may_be_relabelled_as_unrelated" && protocol.evidence_rule === "preregistered_evidence_classes_only" && protocol.public_rule === "aggregate_only_no_participant_content";
  const shapePass = records.every(row => digest(row.environment_id_sha256) && digest(row.exposure_record_sha256) && finite(row.resident_hours) && row.resident_hours >= 0 && row.resident_hours <= 10000 && utc(row.terminal_at) && ENDPOINT_TRIGGERS.includes(row.trigger) && ENDPOINT_DISPOSITIONS.includes(row.final_decision?.disposition) && digest(row.final_decision?.decision_sha256) && digest(row.evidence_bundle_sha256));
  const requestPass = records.every(row => row.final_decision.disposition === "voluntary_rejection" ? row.trigger === "participant_request" && row.request_evidence?.authorized_decision_maker === true && row.request_evidence.uncoerced === true && row.request_evidence.permanent_removal_requested === true && row.request_evidence.participant_confirmation_received === true && utc(row.request_evidence.first_unambiguous_request_at) && row.request_evidence.first_unambiguous_request_at === row.terminal_at && digest(row.request_evidence.request_event_sha256) && digest(row.request_evidence.confirmation_sha256) : row.request_evidence === null);
  const reviewerPass = records.every(row => Array.isArray(row.reviews) && row.reviews.length >= 2 && row.reviews.length <= 3 && new Set(row.reviews.map(review => review.adjudicator_id_sha256)).size === row.reviews.length && row.reviews.every(review => digest(review.adjudicator_id_sha256) && typeof review.adjudicator_organization === "string" && review.adjudicator_organization.length > 0 && review.independent_of_sponsor === true && review.blinded_to_aggregate_score === true && review.blinded_to_manufacturer_identity === true && review.blinded_to_other_environment_outcomes === true && ENDPOINT_DISPOSITIONS.includes(review.disposition) && typeof review.rationale_code === "string" && review.rationale_code.length > 0 && utc(review.signed_at) && digest(review.review_sha256)));
  const decisionPass = records.every(row => {
    const firstAgree = row.reviews[0]?.disposition === row.reviews[1]?.disposition;
    const majority = row.reviews.filter(review => review.disposition === row.final_decision.disposition).length >= 2;
    return allowedByTrigger[row.trigger]?.includes(row.final_decision.disposition) && row.final_decision.analysis_mapping === expectedMapping(row.final_decision.disposition) && row.final_decision.consensus === true && majority && (firstAgree ? row.reviews.length === 2 && row.final_decision.tie_break_applied === false : row.reviews.length === 3 && row.final_decision.tie_break_applied === true);
  });
  const hours = records.reduce((sum, row) => sum + row.resident_hours, 0);
  const targetPass = target === "WANTED_LAB" ? records.length >= 1 && hours >= 100 : target === "WANTED_WILD" ? records.length >= 20 && hours >= 10000 : records.length >= 1 && records.some(row => row.final_decision.disposition === "administrative_completion" && row.resident_hours === 10000);
  const reproduced = shapePass && requestPass && reviewerPass && decisionPass ? reproduceEndpointAdjudication(records) : null;
  const reproductionPass = Boolean(reproduced && sameClaim(reproduced, claimed) && Object.values(reproduced).every(value => finite(value)));
  const b = input.upstream_bindings as EndpointInput["upstream_bindings"], e = input.evidence as EndpointInput["evidence"], a = input.assessor as EndpointInput["assessor"];
  const assurancePass = [b?.preregistration_sha256, b?.cohort_integrity_sha256, b?.exposure_integrity_sha256, b?.telemetry_authenticity_sha256, e?.controlled_decision_register_sha256, e?.adjudicator_roster_sha256, e?.evidence_class_manifest_sha256].every(digest) && https(e?.controlled_decision_register_uri) && e.public_aggregate_only === true && typeof a?.name === "string" && a.name.length > 0 && typeof a.organization === "string" && a.organization.length > 0 && a.independent_of_sponsor === true && a.attested === true && utc(a.signed_at);
  const gates = [
    gate("J1", "COMPLETE TERMINAL CANDIDATE SET", complete && protocolPass, "Every activated environment has exactly one retained decision under frozen rules.", "Restore omitted candidates, duplicate decisions, post-hoc relabels, or protocol drift."),
    gate("J2", "AUTHORIZED VOLUNTARY REJECTION", shapePass && requestPass, "Every rejection is permanent, uncoerced, authoritative, confirmed, and timed at first unambiguous communication.", "Repair request authority, permanence, confirmation, timing, or signed evidence."),
    gate("J3", "BLINDED INDEPENDENT REVIEW", reviewerPass, "At least two distinct independent adjudicators reviewed every outcome without score, maker, or peer-outcome access.", "Provide distinct signed reviews with all three blinding protections."),
    gate("J4", "DETERMINISTIC CONSENSUS", decisionPass, "Trigger, disposition, analysis mapping, and any third-review majority agree exactly.", "Use the frozen trigger mapping and add a third blinded review only when the first two disagree."),
    gate("J5", "TARGET + EXPOSURE SUPPORT", targetPass, "The decision set meets its certification target and 10K completion is never inferred early.", "Meet the target cohort/exposure rule and reserve completion for an observed 10,000-hour boundary."),
    gate("J6", "EXACT AGGREGATE REPRODUCTION", reproductionPass, "Every disposition and review-disagreement count reproduces from environment-level decisions.", "Replace claimed counts with the canonical reproduction and resolve invalid records."),
    gate("J7", "BOUND INDEPENDENT ASSURANCE", assurancePass, "Preregistration, cohort, exposure, telemetry, roster, evidence classes, and the controlled register are bound.", "Provide non-placeholder HTTPS evidence, all upstream digests, and independent attestation."),
  ];
  const status = gates.every(row => row.passed) ? "passed" : "failed";
  return { status, errors: [], gates, summary: reproduced ? { profile_version: ENDPOINT_ADJUDICATION_VERSION, status: "passed", target_certification: target, ...reproduced } : null };
}

function record(index: number, hours: number, trigger: EndpointTrigger, disposition: EndpointDisposition): EndpointRecord {
  const terminal = new Date(Date.parse("2026-01-02T00:00:00Z") + hours * 3600000).toISOString().replace(".000Z", "Z");
  const review = (suffix: string, verdict = disposition): EndpointReview => ({ adjudicator_id_sha256: hash(`${index.toString(16)}${suffix}1`), adjudicator_organization: `Independent Review Group ${suffix}`, independent_of_sponsor: true, blinded_to_aggregate_score: true, blinded_to_manufacturer_identity: true, blinded_to_other_environment_outcomes: true, disposition: verdict, rationale_code: `J1_${trigger.toUpperCase()}`, signed_at: terminal, review_sha256: hash(`${index.toString(16)}${suffix}2`) });
  return { environment_id_sha256: hash(`${(index + 40).toString(16)}a`), exposure_record_sha256: hash(`${(index + 80).toString(16)}e`), resident_hours: hours, terminal_at: terminal, trigger, request_evidence: disposition === "voluntary_rejection" ? { authorized_decision_maker: true, uncoerced: true, permanent_removal_requested: true, participant_confirmation_received: true, first_unambiguous_request_at: terminal, request_event_sha256: hash(`${index.toString(16)}d1`), confirmation_sha256: hash(`${index.toString(16)}d2`) } : null, reviews: [review("a"), review("b")], final_decision: { disposition, analysis_mapping: expectedMapping(disposition), consensus: true, tie_break_applied: false, decision_sha256: hash(`${index.toString(16)}f1`) }, evidence_bundle_sha256: hash(`${index.toString(16)}c1`) };
}

function buildTemplate(target: EndpointTarget): EndpointInput {
  const records = target === "WANTED_LAB" ? [record(0, 100, "observation_cutoff", "administrative_censor")] : target === "WANTED_10K" ? [record(0, 10000, "clock_10000", "administrative_completion")] : [
    ...Array.from({ length: 8 }, (_, index) => record(index, 10000, "clock_10000", "administrative_completion")),
    ...Array.from({ length: 4 }, (_, index) => record(index + 8, 2500, "participant_request", "voluntary_rejection")),
    ...Array.from({ length: 12 }, (_, index) => record(index + 12, 2500, "observation_cutoff", "administrative_censor")),
  ];
  return { profile_version: ENDPOINT_ADJUDICATION_VERSION, target_certification: target, protocol: { primary_event: "permanent_uncoerced_request_by_authorized_decision_maker", event_time: "first_unambiguous_request_timestamp", minimum_independent_reviews: 2, tie_rule: "endpoint_event_before_censor_at_identical_timestamp", disagreement_rule: "third_blinded_review_majority_decision", censor_rule: "no_terminal_competing_cause_may_be_relabelled_as_unrelated", evidence_rule: "preregistered_evidence_classes_only", public_rule: "aggregate_only_no_participant_content" }, declared_environment_count: records.length, declared_decision_count: records.length, omitted_terminal_candidates: 0, post_hoc_relabels: 0, records, claimed: reproduceEndpointAdjudication(records), upstream_bindings: { preregistration_sha256: hash("b1"), cohort_integrity_sha256: hash("ca"), exposure_integrity_sha256: hash("eb"), telemetry_authenticity_sha256: hash("9b") }, evidence: { controlled_decision_register_uri: "https://example.org/wanted-endpoint-decisions.json", controlled_decision_register_sha256: hash("e1"), adjudicator_roster_sha256: hash("e2"), evidence_class_manifest_sha256: hash("e3"), public_aggregate_only: true }, assessor: { name: "Synthetic Endpoint Auditor", organization: "Independent Example Assurance", independent_of_sponsor: true, attested: true, signed_at: "2027-03-10T12:00:00Z" } };
}

export const endpointTemplateFor = (target: EndpointTarget) => buildTemplate(target);
export const endpointTemplate = buildTemplate("WANTED_WILD");

const d = { type: "string", pattern: "^[a-f0-9]{64}$" }, date = { type: "string", format: "date-time" }, count = { type: "integer", minimum: 0 };
export const endpointSchema = { "$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/endpoint-adjudication.schema.json", title: "WANTED Endpoint Adjudication Integrity Manifest", type: "object", additionalProperties: false,
  required: ["profile_version","target_certification","protocol","declared_environment_count","declared_decision_count","omitted_terminal_candidates","post_hoc_relabels","records","claimed","upstream_bindings","evidence","assessor"], properties: {
    profile_version:{const:ENDPOINT_ADJUDICATION_VERSION},target_certification:{enum:ENDPOINT_TARGETS},protocol:{type:"object",additionalProperties:false,required:["primary_event","event_time","minimum_independent_reviews","tie_rule","disagreement_rule","censor_rule","evidence_rule","public_rule"],properties:{primary_event:{const:"permanent_uncoerced_request_by_authorized_decision_maker"},event_time:{const:"first_unambiguous_request_timestamp"},minimum_independent_reviews:{const:2},tie_rule:{const:"endpoint_event_before_censor_at_identical_timestamp"},disagreement_rule:{const:"third_blinded_review_majority_decision"},censor_rule:{const:"no_terminal_competing_cause_may_be_relabelled_as_unrelated"},evidence_rule:{const:"preregistered_evidence_classes_only"},public_rule:{const:"aggregate_only_no_participant_content"}}},declared_environment_count:{type:"integer",minimum:1},declared_decision_count:{type:"integer",minimum:1},omitted_terminal_candidates:{const:0},post_hoc_relabels:{const:0},
    records:{type:"array",minItems:1,items:{type:"object",additionalProperties:false,required:["environment_id_sha256","exposure_record_sha256","resident_hours","terminal_at","trigger","request_evidence","reviews","final_decision","evidence_bundle_sha256"],properties:{environment_id_sha256:d,exposure_record_sha256:d,resident_hours:{type:"number",minimum:0,maximum:10000},terminal_at:date,trigger:{enum:ENDPOINT_TRIGGERS},request_evidence:{oneOf:[{type:"null"},{type:"object",additionalProperties:false,required:["authorized_decision_maker","uncoerced","permanent_removal_requested","participant_confirmation_received","first_unambiguous_request_at","request_event_sha256","confirmation_sha256"],properties:{authorized_decision_maker:{const:true},uncoerced:{const:true},permanent_removal_requested:{const:true},participant_confirmation_received:{const:true},first_unambiguous_request_at:date,request_event_sha256:d,confirmation_sha256:d}}]},reviews:{type:"array",minItems:2,maxItems:3,items:{type:"object",additionalProperties:false,required:["adjudicator_id_sha256","adjudicator_organization","independent_of_sponsor","blinded_to_aggregate_score","blinded_to_manufacturer_identity","blinded_to_other_environment_outcomes","disposition","rationale_code","signed_at","review_sha256"],properties:{adjudicator_id_sha256:d,adjudicator_organization:{type:"string",minLength:1},independent_of_sponsor:{const:true},blinded_to_aggregate_score:{const:true},blinded_to_manufacturer_identity:{const:true},blinded_to_other_environment_outcomes:{const:true},disposition:{enum:ENDPOINT_DISPOSITIONS},rationale_code:{type:"string",minLength:1},signed_at:date,review_sha256:d}}},final_decision:{type:"object",additionalProperties:false,required:["disposition","analysis_mapping","consensus","tie_break_applied","decision_sha256"],properties:{disposition:{enum:ENDPOINT_DISPOSITIONS},analysis_mapping:{enum:["rejected","completed","unrelated_censor","terminal_competing_cause"]},consensus:{const:true},tie_break_applied:{type:"boolean"},decision_sha256:d}},evidence_bundle_sha256:d}}},
    claimed:{type:"object",additionalProperties:false,required:["environment_count","resident_hours","voluntary_rejections","administrative_completions","administrative_censors","unrelated_censors","safety_terminations","developer_withdrawals","consent_privacy_withdrawals","initial_review_disagreements","tie_break_reviews","unresolved_decisions"],properties:{environment_count:{type:"integer",minimum:1},resident_hours:{type:"number",minimum:0},voluntary_rejections:count,administrative_completions:count,administrative_censors:count,unrelated_censors:count,safety_terminations:count,developer_withdrawals:count,consent_privacy_withdrawals:count,initial_review_disagreements:count,tie_break_reviews:count,unresolved_decisions:{const:0}}},
    upstream_bindings:{type:"object",additionalProperties:false,required:["preregistration_sha256","cohort_integrity_sha256","exposure_integrity_sha256","telemetry_authenticity_sha256"],properties:{preregistration_sha256:d,cohort_integrity_sha256:d,exposure_integrity_sha256:d,telemetry_authenticity_sha256:d}},evidence:{type:"object",additionalProperties:false,required:["controlled_decision_register_uri","controlled_decision_register_sha256","adjudicator_roster_sha256","evidence_class_manifest_sha256","public_aggregate_only"],properties:{controlled_decision_register_uri:{type:"string",format:"uri",pattern:"^https://"},controlled_decision_register_sha256:d,adjudicator_roster_sha256:d,evidence_class_manifest_sha256:d,public_aggregate_only:{const:true}}},assessor:{type:"object",additionalProperties:false,required:["name","organization","independent_of_sponsor","attested","signed_at"],properties:{name:{type:"string",minLength:1},organization:{type:"string",minLength:1},independent_of_sponsor:{const:true},attested:{const:true},signed_at:date}}
  }} as const;

export const endpointContract = { name:"WANTED Endpoint Adjudication Integrity Profile",version:ENDPOINT_ADJUDICATION_VERSION,applies_to:ENDPOINT_TARGETS,certification_effect:"field_evidence_integrity_gate",ranking_effect:"eligibility_only_never_score_or_tiebreaker",primary_event:"permanent_uncoerced_request_by_authorized_decision_maker",time_origin:"signed_activation",event_time:"first_unambiguous_request_timestamp",review:{minimum_independent_blinded_adjudicators:2,disagreement:"third_blinded_review_majority",tie:"endpoint_before_censor"},hard_failures:["omitted_terminal_candidate","duplicate_environment_decision","unauthorized_or_coerced_rejection","unconfirmed_or_nonpermanent_rejection","unblinded_or_nonindependent_review","unresolved_disagreement","terminal_competing_cause_relabelled_as_censor","claimed_count_mismatch","unbound_decision_register"],interpretation:"Passing proves complete reproducible endpoint classification. It does not prove participant preference beyond the recorded decision, and it cannot offset safety failure." } as const;

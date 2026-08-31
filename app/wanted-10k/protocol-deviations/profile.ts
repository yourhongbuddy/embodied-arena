export const PROTOCOL_DEVIATION_VERSION = "0.2-DV1";
export const DEVIATION_TARGETS = ["PREQUALIFIED", "WANTED_LAB", "WANTED_WILD", "WANTED_10K"] as const;
export const DEVIATION_CATEGORIES = ["eligibility_sampling", "safety_control", "participant_rights_privacy", "telemetry_data", "endpoint_analysis", "intervention_operations", "other_protocol_requirement"] as const;
export const DISCOVERY_SOURCES = ["telemetry_reconciliation", "incident_register", "operations_audit", "participant_report", "independent_audit"] as const;
export type DeviationTarget = typeof DEVIATION_TARGETS[number];
export type DeviationImportance = "important" | "nonimportant";

export type DeviationRecord = {
  deviation_id: string;
  source_system: typeof DISCOVERY_SOURCES[number];
  source_record_sha256: string;
  protocol_requirement_ref: string;
  preregistration_sha256: string;
  category: typeof DEVIATION_CATEGORIES[number];
  importance: DeviationImportance;
  importance_rationale: string;
  scope: "preflight" | "environment" | "cohort";
  affected_environment_ids: string[];
  occurred_at: string;
  detected_at: string;
  reported_at: string;
  report_delay_hours: number;
  within_preregistered_deadline: true;
  description: string;
  root_cause: string | null;
  containment: string | null;
  corrective_action: string | null;
  preventive_action: string | null;
  independent_reviewed: true;
  participant_notice_required: boolean;
  participant_notice_completed: boolean;
  safety_committee_notification_required: boolean;
  safety_committee_notification_completed: boolean;
  excluded_from_primary_analysis: false;
  resident_seconds_deducted: 0;
  endpoint_reclassified: false;
  outcome_or_aggregate_w_used_for_classification: false;
  unresolved: false;
  claim_invalidated: false;
};

export type DeviationClaim = {
  cohort_environment_count: number;
  deviation_count: number;
  important_deviations: number;
  nonimportant_deviations: number;
  late_reports: 0;
  unresolved_important_deviations: 0;
  unresolved_discovery_candidates: 0;
  suppressed_deviations: 0;
  primary_analysis_exclusions: 0;
  resident_seconds_deducted: 0;
  endpoint_reclassifications: 0;
  outcome_informed_classifications: 0;
  invalidated_claims: 0;
};

export type DeviationInput = {
  profile_version: typeof PROTOCOL_DEVIATION_VERSION;
  target_certification: DeviationTarget;
  protocol: {
    inclusion_rule: "every_detected_or_reconciled_departure_from_the_frozen_protocol";
    classification_rule: "important_if_participant_rights_safety_or_data_reliability_may_be_materially_affected";
    outcome_blinding_rule: "classify_without_current_cohort_outcomes_or_aggregate_W";
    analysis_rule: "retain_every_activated_environment_and_all_resident_time";
    endpoint_rule: "deviation_labels_never_recode_terminal_events";
    amendment_boundary: "planned_change_is_an_amendment_unplanned_departure_is_a_deviation";
    deadline_rule: "use_preregistered_reporting_deadline_no_universal_threshold";
    reporting_deadline_hours: number;
  };
  study: { study_id: string; preregistration_sha256: string; claim_revision_id: string; first_benchmark_activity_at: string; submission_at: string };
  reconciliation: { telemetry_candidates: number; incident_candidates: number; operations_candidates: number; participant_report_candidates: number; audit_candidates: number; duplicate_candidates: number; unique_candidates: number; linked_records: number; unresolved_candidates: 0 };
  records: DeviationRecord[];
  claimed: DeviationClaim;
  evidence: { controlled_register_uri: string; controlled_register_sha256: string; reconciliation_report_uri: string; reconciliation_report_sha256: string; capa_index_uri: string; capa_index_sha256: string; public_aggregate_history_uri: string; public_aggregate_history_sha256: string };
  assessor: { name: string; organization: string; independent_of_sponsor: true; attested: true; signed_at: string };
};

export type DeviationGate = { id: string; label: string; passed: boolean; detail: string };
export type DeviationResult = { status: "passed" | "failed" | "invalid"; errors: string[]; gates: DeviationGate[]; summary: (DeviationClaim & { profile_version: typeof PROTOCOL_DEVIATION_VERSION; status: "passed"; target_certification: DeviationTarget; preregistration_sha256: string; claim_revision_id: string }) | null };

const hash = (prefix: string) => `${prefix}${"0123456789abcdef".repeat(4)}`.slice(0, 64);
const digest = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value) && !/^([a-f0-9])\1{63}$/.test(value);
const https = (value: unknown) => typeof value === "string" && /^https:\/\//.test(value);
const utc = (value: unknown) => typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value) && Number.isFinite(Date.parse(value));
const count = (value: unknown) => Number.isInteger(value) && Number(value) >= 0;
const close = (left: number, right: number) => Math.abs(left - right) < .000001;
const gate = (id: string, label: string, passed: boolean, ok: string, fix: string): DeviationGate => ({ id, label, passed, detail: passed ? ok : fix });

export function reproduceDeviationClaims(input: Pick<DeviationInput, "records" | "reconciliation" | "claimed">): DeviationClaim {
  return {
    cohort_environment_count: input.claimed.cohort_environment_count,
    deviation_count: input.records.length,
    important_deviations: input.records.filter(row => row.importance === "important").length,
    nonimportant_deviations: input.records.filter(row => row.importance === "nonimportant").length,
    late_reports: input.records.filter(row => row.within_preregistered_deadline !== true).length as 0,
    unresolved_important_deviations: input.records.filter(row => row.importance === "important" && row.unresolved !== false).length as 0,
    unresolved_discovery_candidates: input.reconciliation.unresolved_candidates,
    suppressed_deviations: Math.max(0, input.reconciliation.unique_candidates - input.reconciliation.linked_records) as 0,
    primary_analysis_exclusions: input.records.filter(row => row.excluded_from_primary_analysis !== false).length as 0,
    resident_seconds_deducted: input.records.reduce((sum, row) => sum + Number(row.resident_seconds_deducted || 0), 0) as 0,
    endpoint_reclassifications: input.records.filter(row => row.endpoint_reclassified !== false).length as 0,
    outcome_informed_classifications: input.records.filter(row => row.outcome_or_aggregate_w_used_for_classification !== false).length as 0,
    invalidated_claims: input.records.filter(row => row.claim_invalidated !== false).length as 0,
  };
}

const claimsMatch = (actual: DeviationClaim, claimed: DeviationClaim) => (Object.keys(actual) as (keyof DeviationClaim)[]).every(key => actual[key] === claimed?.[key]);

export function assessProtocolDeviations(value: unknown): DeviationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { status: "invalid", errors: ["Protocol-deviation manifest must be one JSON object."], gates: [], summary: null };
  const input = value as Partial<DeviationInput>, errors: string[] = [];
  if (input.profile_version !== PROTOCOL_DEVIATION_VERSION) errors.push(`profile_version must be ${PROTOCOL_DEVIATION_VERSION}.`);
  if (!DEVIATION_TARGETS.includes(input.target_certification as DeviationTarget)) errors.push("target_certification is invalid.");
  if (!Array.isArray(input.records)) errors.push("records must be an array, including an empty array when no deviations occurred.");
  if (errors.length) return { status: "invalid", errors, gates: [], summary: null };
  const target = input.target_certification as DeviationTarget, protocol = input.protocol as DeviationInput["protocol"], study = input.study as DeviationInput["study"], reconciliation = input.reconciliation as DeviationInput["reconciliation"], records = input.records as DeviationRecord[], claimed = input.claimed as DeviationClaim, evidence = input.evidence as DeviationInput["evidence"], assessor = input.assessor as DeviationInput["assessor"];
  const protocolPass = protocol?.inclusion_rule === "every_detected_or_reconciled_departure_from_the_frozen_protocol" && protocol.classification_rule === "important_if_participant_rights_safety_or_data_reliability_may_be_materially_affected" && protocol.outcome_blinding_rule === "classify_without_current_cohort_outcomes_or_aggregate_W" && protocol.analysis_rule === "retain_every_activated_environment_and_all_resident_time" && protocol.endpoint_rule === "deviation_labels_never_recode_terminal_events" && protocol.amendment_boundary === "planned_change_is_an_amendment_unplanned_departure_is_a_deviation" && protocol.deadline_rule === "use_preregistered_reporting_deadline_no_universal_threshold" && Number.isFinite(protocol.reporting_deadline_hours) && protocol.reporting_deadline_hours > 0;
  const studyPass = typeof study?.study_id === "string" && study.study_id.length > 0 && digest(study.preregistration_sha256) && typeof study.claim_revision_id === "string" && study.claim_revision_id.length > 0 && utc(study.first_benchmark_activity_at) && utc(study.submission_at) && Date.parse(study.first_benchmark_activity_at) < Date.parse(study.submission_at);
  const ids = records.map(row => row.deviation_id), sources = records.map(row => row.source_record_sha256);
  const shapePass = records.every(row => typeof row.deviation_id === "string" && row.deviation_id.length > 0 && DISCOVERY_SOURCES.includes(row.source_system) && digest(row.source_record_sha256) && typeof row.protocol_requirement_ref === "string" && row.protocol_requirement_ref.length > 0 && row.preregistration_sha256 === study?.preregistration_sha256 && DEVIATION_CATEGORIES.includes(row.category) && ["important", "nonimportant"].includes(row.importance) && typeof row.importance_rationale === "string" && row.importance_rationale.length >= 20 && ["preflight", "environment", "cohort"].includes(row.scope) && Array.isArray(row.affected_environment_ids) && row.affected_environment_ids.every(id => typeof id === "string" && id.length > 0) && new Set(row.affected_environment_ids).size === row.affected_environment_ids.length && utc(row.occurred_at) && utc(row.detected_at) && utc(row.reported_at) && Date.parse(row.occurred_at) <= Date.parse(row.detected_at) && Date.parse(row.detected_at) <= Date.parse(row.reported_at) && Date.parse(row.reported_at) <= Date.parse(study.submission_at) && Number.isFinite(row.report_delay_hours) && close(row.report_delay_hours, (Date.parse(row.reported_at) - Date.parse(row.detected_at)) / 3600000) && row.within_preregistered_deadline === true && row.report_delay_hours <= protocol.reporting_deadline_hours && typeof row.description === "string" && row.description.length >= 20);
  const uniquePass = shapePass && new Set(ids).size === ids.length && new Set(sources).size === sources.length;
  const targetPass = target === "PREQUALIFIED" ? claimed?.cohort_environment_count === 0 && records.every(row => row.scope === "preflight" && row.affected_environment_ids.length === 0) : count(claimed?.cohort_environment_count) && Number(claimed.cohort_environment_count) >= 1 && records.every(row => row.scope !== "preflight" || row.affected_environment_ids.length === 0);
  const importantPass = records.every(row => row.importance === "nonimportant" || [row.root_cause, row.containment, row.corrective_action, row.preventive_action].every(item => typeof item === "string" && item.length >= 20));
  const notificationPass = records.every(row => (!row.participant_notice_required || row.participant_notice_completed) && (!row.safety_committee_notification_required || row.safety_committee_notification_completed));
  const nonManipulationPass = records.every(row => row.independent_reviewed === true && row.excluded_from_primary_analysis === false && row.resident_seconds_deducted === 0 && row.endpoint_reclassified === false && row.outcome_or_aggregate_w_used_for_classification === false && row.unresolved === false && row.claim_invalidated === false);
  const sourceTotal = Number(reconciliation?.telemetry_candidates) + Number(reconciliation?.incident_candidates) + Number(reconciliation?.operations_candidates) + Number(reconciliation?.participant_report_candidates) + Number(reconciliation?.audit_candidates);
  const reconciliationPass = [reconciliation?.telemetry_candidates,reconciliation?.incident_candidates,reconciliation?.operations_candidates,reconciliation?.participant_report_candidates,reconciliation?.audit_candidates,reconciliation?.duplicate_candidates,reconciliation?.unique_candidates,reconciliation?.linked_records,reconciliation?.unresolved_candidates].every(count) && sourceTotal - Number(reconciliation.duplicate_candidates) === Number(reconciliation.unique_candidates) && reconciliation.unique_candidates === records.length && reconciliation.linked_records === records.length && reconciliation.unresolved_candidates === 0;
  const reproduced = reconciliationPass ? reproduceDeviationClaims({ records, reconciliation, claimed }) : null;
  const claimPass = Boolean(reproduced && claimsMatch(reproduced, claimed) && reproduced.late_reports === 0 && reproduced.unresolved_important_deviations === 0 && reproduced.suppressed_deviations === 0 && reproduced.primary_analysis_exclusions === 0 && reproduced.resident_seconds_deducted === 0 && reproduced.endpoint_reclassifications === 0 && reproduced.outcome_informed_classifications === 0 && reproduced.invalidated_claims === 0);
  const assurancePass = https(evidence?.controlled_register_uri) && digest(evidence.controlled_register_sha256) && https(evidence.reconciliation_report_uri) && digest(evidence.reconciliation_report_sha256) && https(evidence.capa_index_uri) && digest(evidence.capa_index_sha256) && https(evidence.public_aggregate_history_uri) && digest(evidence.public_aggregate_history_sha256) && typeof assessor?.name === "string" && assessor.name.length > 0 && typeof assessor.organization === "string" && assessor.organization.length > 0 && assessor.independent_of_sponsor === true && assessor.attested === true && utc(assessor.signed_at) && Date.parse(assessor.signed_at) >= Date.parse(study.submission_at);
  const gates = [
    gate("DV1", "FROZEN DEFINITION + DEADLINE", protocolPass && studyPass, "The inclusion, importance, analysis, endpoint, amendment, and preregistered reporting rules are frozen.", "Use the exact 0.2-DV1 rules and a positive preregistered reporting deadline."),
    gate("DV2", "COMPLETE DISCOVERY RECONCILIATION", reconciliationPass, "Every candidate across telemetry, incidents, operations, participant reports, and audit resolves to one controlled record.", "Reconcile every discovery source; duplicates may be linked, but unresolved or suppressed candidates must be zero."),
    gate("DV3", "UNIQUE TRACEABLE RECORDS", uniquePass && targetPass, "Every deviation is uniquely linked to its source, frozen requirement, target, and chronology.", "Repair duplicate IDs or source digests, invalid timestamps, target scope, or broken preregistration binding."),
    gate("DV4", "IMPORTANCE + CAPA", importantPass, "Every important deviation has root-cause, containment, corrective, and preventive evidence.", "Complete all four CAPA fields for every important deviation."),
    gate("DV5", "RIGHTS + SAFETY NOTIFICATIONS", notificationPass, "Every required participant or safety-governance notification is complete.", "Complete every notification flagged as required before submission."),
    gate("DV6", "NO ANALYTIC ESCAPE HATCH", nonManipulationPass, "No deviation removes an environment, deducts resident time, recodes an endpoint, uses outcomes for classification, remains unresolved, or preserves an invalid claim.", "Retain all activated units and time; restore canonical endpoints; isolate outcome-informed review; invalidate rather than conceal a broken claim."),
    gate("DV7", "REPRODUCED INDEPENDENT HISTORY", claimPass && assurancePass, "The public aggregates reproduce from the controlled register and independent attestation.", "Correct every claimed count and bind the controlled register, reconciliation, CAPA index, public history, and independent attestation."),
  ];
  const status = gates.every(row => row.passed) ? "passed" : "failed";
  return { status, errors: [], gates, summary: reproduced ? { profile_version: PROTOCOL_DEVIATION_VERSION, status: "passed", target_certification: target, preregistration_sha256: study.preregistration_sha256, claim_revision_id: study.claim_revision_id, ...reproduced } : null };
}

const record = (target: DeviationTarget, id: string, source: DeviationRecord["source_system"], importance: DeviationImportance, hour: number): DeviationRecord => ({
  deviation_id: id, source_system: source, source_record_sha256: hash(id === "DV-001" ? "e1" : "e2"), protocol_requirement_ref: id === "DV-001" ? "telemetry.upload_window" : "operations.daily_readiness_check", preregistration_sha256: hash("b"), category: id === "DV-001" ? "telemetry_data" : "intervention_operations", importance, importance_rationale: importance === "important" ? "The missed readiness check could materially affect data reliability if not contained and independently reviewed." : "The delayed upload preserved signed source events and did not affect safety, rights, endpoints, exposure, or analysis.", scope: target === "PREQUALIFIED" ? "preflight" : "environment", affected_environment_ids: target === "PREQUALIFIED" ? [] : ["env-001"], occurred_at: `2026-02-01T${String(hour).padStart(2,"0")}:00:00Z`, detected_at: `2026-02-01T${String(hour + 1).padStart(2,"0")}:00:00Z`, reported_at: `2026-02-01T${String(hour + 2).padStart(2,"0")}:00:00Z`, report_delay_hours: 1, within_preregistered_deadline: true, description: id === "DV-001" ? "A signed telemetry batch reached the evidence store after its preregistered upload window." : "The operator completed one daily readiness check after the frozen operational window had closed.", root_cause: importance === "important" ? "A scheduler migration omitted one readiness-check trigger from the production operations queue." : null, containment: importance === "important" ? "The affected deployment was held in a safe non-service state until the missed check was completed." : null, corrective_action: importance === "important" ? "The missing trigger was restored and the complete queue configuration was independently reconciled." : null, preventive_action: importance === "important" ? "A signed daily comparison now checks the frozen readiness schedule against every production trigger." : null, independent_reviewed: true, participant_notice_required: false, participant_notice_completed: false, safety_committee_notification_required: false, safety_committee_notification_completed: false, excluded_from_primary_analysis: false, resident_seconds_deducted: 0, endpoint_reclassified: false, outcome_or_aggregate_w_used_for_classification: false, unresolved: false, claim_invalidated: false,
});

export function deviationTemplateFor(target: DeviationTarget): DeviationInput {
  const cohortEnvironmentCount = target === "PREQUALIFIED" ? 0 : target === "WANTED_WILD" ? 24 : 1;
  const records = [record(target,"DV-001","telemetry_reconciliation","nonimportant",2),record(target,"DV-002","operations_audit","important",6)];
  const reconciliation = { telemetry_candidates:1,incident_candidates:0,operations_candidates:1,participant_report_candidates:0,audit_candidates:0,duplicate_candidates:0,unique_candidates:2,linked_records:2,unresolved_candidates:0 as const };
  const claimed = reproduceDeviationClaims({ records, reconciliation, claimed: { cohort_environment_count:cohortEnvironmentCount } as DeviationClaim });
  return { profile_version:PROTOCOL_DEVIATION_VERSION,target_certification:target,protocol:{inclusion_rule:"every_detected_or_reconciled_departure_from_the_frozen_protocol",classification_rule:"important_if_participant_rights_safety_or_data_reliability_may_be_materially_affected",outcome_blinding_rule:"classify_without_current_cohort_outcomes_or_aggregate_W",analysis_rule:"retain_every_activated_environment_and_all_resident_time",endpoint_rule:"deviation_labels_never_recode_terminal_events",amendment_boundary:"planned_change_is_an_amendment_unplanned_departure_is_a_deviation",deadline_rule:"use_preregistered_reporting_deadline_no_universal_threshold",reporting_deadline_hours:72},study:{study_id:"SYNTHETIC-STUDY-001",preregistration_sha256:hash("b"),claim_revision_id:"claim-r1",first_benchmark_activity_at:"2025-12-15T00:00:00Z",submission_at:"2026-08-28T18:00:00Z"},reconciliation,records,claimed,evidence:{controlled_register_uri:"https://example.org/wanted-protocol-deviations.json",controlled_register_sha256:hash("e3"),reconciliation_report_uri:"https://example.org/wanted-deviation-reconciliation.json",reconciliation_report_sha256:hash("e4"),capa_index_uri:"https://example.org/wanted-deviation-capa.json",capa_index_sha256:hash("e5"),public_aggregate_history_uri:"https://example.org/wanted-deviation-history.json",public_aggregate_history_sha256:hash("e6")},assessor:{name:"Synthetic Deviation Assessor",organization:"Independent Example Assurance",independent_of_sponsor:true,attested:true,signed_at:"2026-08-28T18:30:00Z"} };
}

export const protocolDeviationTemplate = deviationTemplateFor("WANTED_WILD");

const d = { type:"string",pattern:"^[a-f0-9]{64}$" }, uri = { type:"string",format:"uri",pattern:"^https://" }, date = { type:"string",format:"date-time" }, nonnegative = { type:"integer",minimum:0 };
export const protocolDeviationSchema = { "$schema":"https://json-schema.org/draft/2020-12/schema", "$id":"https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/protocol-deviations.schema.json", title:"WANTED Protocol Deviation Integrity Manifest",type:"object",additionalProperties:false,required:["profile_version","target_certification","protocol","study","reconciliation","records","claimed","evidence","assessor"],properties:{
  profile_version:{const:PROTOCOL_DEVIATION_VERSION},target_certification:{enum:DEVIATION_TARGETS},
  protocol:{type:"object",additionalProperties:false,required:["inclusion_rule","classification_rule","outcome_blinding_rule","analysis_rule","endpoint_rule","amendment_boundary","deadline_rule","reporting_deadline_hours"],properties:{inclusion_rule:{const:"every_detected_or_reconciled_departure_from_the_frozen_protocol"},classification_rule:{const:"important_if_participant_rights_safety_or_data_reliability_may_be_materially_affected"},outcome_blinding_rule:{const:"classify_without_current_cohort_outcomes_or_aggregate_W"},analysis_rule:{const:"retain_every_activated_environment_and_all_resident_time"},endpoint_rule:{const:"deviation_labels_never_recode_terminal_events"},amendment_boundary:{const:"planned_change_is_an_amendment_unplanned_departure_is_a_deviation"},deadline_rule:{const:"use_preregistered_reporting_deadline_no_universal_threshold"},reporting_deadline_hours:{type:"number",exclusiveMinimum:0}}},
  study:{type:"object",additionalProperties:false,required:["study_id","preregistration_sha256","claim_revision_id","first_benchmark_activity_at","submission_at"],properties:{study_id:{type:"string",minLength:1},preregistration_sha256:d,claim_revision_id:{type:"string",minLength:1},first_benchmark_activity_at:date,submission_at:date}},
  reconciliation:{type:"object",additionalProperties:false,required:["telemetry_candidates","incident_candidates","operations_candidates","participant_report_candidates","audit_candidates","duplicate_candidates","unique_candidates","linked_records","unresolved_candidates"],properties:{telemetry_candidates:nonnegative,incident_candidates:nonnegative,operations_candidates:nonnegative,participant_report_candidates:nonnegative,audit_candidates:nonnegative,duplicate_candidates:nonnegative,unique_candidates:nonnegative,linked_records:nonnegative,unresolved_candidates:{const:0}}},
  records:{type:"array",items:{type:"object",additionalProperties:false,required:["deviation_id","source_system","source_record_sha256","protocol_requirement_ref","preregistration_sha256","category","importance","importance_rationale","scope","affected_environment_ids","occurred_at","detected_at","reported_at","report_delay_hours","within_preregistered_deadline","description","root_cause","containment","corrective_action","preventive_action","independent_reviewed","participant_notice_required","participant_notice_completed","safety_committee_notification_required","safety_committee_notification_completed","excluded_from_primary_analysis","resident_seconds_deducted","endpoint_reclassified","outcome_or_aggregate_w_used_for_classification","unresolved","claim_invalidated"],properties:{deviation_id:{type:"string",minLength:1},source_system:{enum:DISCOVERY_SOURCES},source_record_sha256:d,protocol_requirement_ref:{type:"string",minLength:1},preregistration_sha256:d,category:{enum:DEVIATION_CATEGORIES},importance:{enum:["important","nonimportant"]},importance_rationale:{type:"string",minLength:20},scope:{enum:["preflight","environment","cohort"]},affected_environment_ids:{type:"array",uniqueItems:true,items:{type:"string",minLength:1}},occurred_at:date,detected_at:date,reported_at:date,report_delay_hours:{type:"number",minimum:0},within_preregistered_deadline:{const:true},description:{type:"string",minLength:20},root_cause:{type:["string","null"]},containment:{type:["string","null"]},corrective_action:{type:["string","null"]},preventive_action:{type:["string","null"]},independent_reviewed:{const:true},participant_notice_required:{type:"boolean"},participant_notice_completed:{type:"boolean"},safety_committee_notification_required:{type:"boolean"},safety_committee_notification_completed:{type:"boolean"},excluded_from_primary_analysis:{const:false},resident_seconds_deducted:{const:0},endpoint_reclassified:{const:false},outcome_or_aggregate_w_used_for_classification:{const:false},unresolved:{const:false},claim_invalidated:{const:false}}}},
  claimed:{type:"object",additionalProperties:false,required:["cohort_environment_count","deviation_count","important_deviations","nonimportant_deviations","late_reports","unresolved_important_deviations","unresolved_discovery_candidates","suppressed_deviations","primary_analysis_exclusions","resident_seconds_deducted","endpoint_reclassifications","outcome_informed_classifications","invalidated_claims"],properties:{cohort_environment_count:nonnegative,deviation_count:nonnegative,important_deviations:nonnegative,nonimportant_deviations:nonnegative,late_reports:{const:0},unresolved_important_deviations:{const:0},unresolved_discovery_candidates:{const:0},suppressed_deviations:{const:0},primary_analysis_exclusions:{const:0},resident_seconds_deducted:{const:0},endpoint_reclassifications:{const:0},outcome_informed_classifications:{const:0},invalidated_claims:{const:0}}},
  evidence:{type:"object",additionalProperties:false,required:["controlled_register_uri","controlled_register_sha256","reconciliation_report_uri","reconciliation_report_sha256","capa_index_uri","capa_index_sha256","public_aggregate_history_uri","public_aggregate_history_sha256"],properties:{controlled_register_uri:uri,controlled_register_sha256:d,reconciliation_report_uri:uri,reconciliation_report_sha256:d,capa_index_uri:uri,capa_index_sha256:d,public_aggregate_history_uri:uri,public_aggregate_history_sha256:d}},
  assessor:{type:"object",additionalProperties:false,required:["name","organization","independent_of_sponsor","attested","signed_at"],properties:{name:{type:"string",minLength:1},organization:{type:"string",minLength:1},independent_of_sponsor:{const:true},attested:{const:true},signed_at:date}}
}} as const;

export const protocolDeviationContract = { name:"WANTED Protocol Deviation Integrity Profile",version:PROTOCOL_DEVIATION_VERSION,applies_to:DEVIATION_TARGETS,certification_effect:"execution_integrity_gate",ranking_effect:"eligibility_only_never_score_or_tiebreaker",discovery_sources:DISCOVERY_SOURCES,importance_definition:"material_possible_effect_on_participant_rights_safety_or_data_reliability",universal_reporting_deadline_hours:null,deadline_rule:"preregister_before_first_benchmark_activity",hard_failures:["unresolved_discovery_candidate","suppressed_deviation","late_report","unresolved_important_deviation","missing_CAPA","missing_required_notification","primary_analysis_exclusion","resident_time_deduction","endpoint_reclassification","outcome_informed_classification","invalidated_claim_preserved","unbound_independent_history"],interpretation:"Passing proves complete, timely, non-manipulative deviation handling. It does not mean no deviations occurred, set a universal reporting deadline, certify regulatory compliance, or make deviation counts rankable." } as const;

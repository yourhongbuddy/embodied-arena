export const PREREGISTRATION_INTEGRITY_VERSION = "0.2-PR1";
export const PREREGISTRATION_TARGETS = ["PREQUALIFIED", "WANTED_LAB", "WANTED_WILD", "WANTED_10K"] as const;
export const AMENDMENT_CLASSES = ["administrative", "clarification", "safety_hotfix", "material"] as const;
export const TIMESTAMP_METHODS = ["immutable_registry_receipt", "rfc3161", "append_only_transparency_log"] as const;
export type PreregistrationTarget = typeof PREREGISTRATION_TARGETS[number];
export type AmendmentClass = typeof AMENDMENT_CLASSES[number];
export type TimestampMethod = typeof TIMESTAMP_METHODS[number];

type TimestampReceipt = {
  method: TimestampMethod;
  token_uri: string;
  token_sha256: string;
  message_imprint_sha256: string;
  issued_at: string;
  signature_verified: true;
  authority_independent_of_sponsor: true;
};

export type PreregistrationAmendment = {
  amendment_id: string;
  parent_document_sha256: string;
  amended_document_sha256: string;
  classification: AmendmentClass;
  rationale: string;
  changed_sections: string[];
  registered_at: string;
  effective_at: string;
  prior_exposure_hours: number;
  current_cohort_outcomes_accessed: false;
  aggregate_w_accessed: false;
  participant_task_logs_accessed: false;
  retroactive_application: false;
  creates_new_claim_revision: boolean;
  claim_revision_id: string;
  receipt: TimestampReceipt;
};

export type PreregistrationClaim = {
  amendment_count: number;
  administrative_amendments: number;
  clarification_amendments: number;
  safety_hotfix_amendments: number;
  material_amendments: number;
  post_activity_amendments: number;
  outcome_informed_amendments: 0;
  retroactive_amendments: 0;
  material_amendments_in_same_claim: 0;
  chain_breaks: 0;
};

export type PreregistrationIntegrityInput = {
  profile_version: typeof PREREGISTRATION_INTEGRITY_VERSION;
  target_certification: PreregistrationTarget;
  protocol: {
    canonicalization: "RFC8785_JCS";
    hash: "SHA-256";
    original_rule: "immutable_timestamped_registration_before_first_benchmark_activity";
    amendment_rule: "append_only_parent_linked_no_overwrite";
    outcome_access_rule: "no_current_cohort_outcomes_aggregate_W_or_participant_task_logs_before_amendment";
    material_change_rule: "new_claim_revision_no_shared_exposure";
    retroactivity_rule: "never_apply_amendments_to_prior_exposure";
    public_rule: "public_or_embargoed_receipt_before_activity_public_history_at_submission";
  };
  original: {
    study_id: string;
    claim_revision_id: string;
    document_uri: string;
    document_sha256: string;
    schema_uri: string;
    schema_sha256: string;
    registered_at: string;
    first_preflight_trial_at: string;
    first_screening_decision_at: string | null;
    first_resident_hour_at: string | null;
    registry_record_uri: string;
    registry_record_id: string;
    registry_record_immutable: true;
    withdrawal_leaves_tombstone: true;
    sponsor_signature_sha256: string;
    investigator_signature_sha256: string;
    receipt: TimestampReceipt;
  };
  commitments: {
    robot_description_sha256: string;
    baseline_policy_artifact_sha256: string;
    cohort_and_sampling_plan_sha256: string;
    endpoint_rules_sha256: string;
    safety_plan_sha256: string;
    operations_plan_sha256: string;
    telemetry_key_manifest_sha256: string;
    analysis_plan_sha256: string;
  };
  amendments: PreregistrationAmendment[];
  claimed: PreregistrationClaim;
  evidence: {
    controlled_amendment_register_uri: string;
    controlled_amendment_register_sha256: string;
    public_history_uri: string;
    public_history_sha256: string;
    receipt_verification_report_sha256: string;
    public_or_embargoed_before_activity: true;
    public_history_complete_at_submission: true;
  };
  assessor: { name: string; organization: string; independent_of_sponsor: true; attested: true; signed_at: string };
};

export type PreregistrationGate = { id: string; label: string; passed: boolean; detail: string };
export type PreregistrationResult = { status: "passed" | "failed" | "invalid"; errors: string[]; gates: PreregistrationGate[]; summary: (PreregistrationClaim & { profile_version: typeof PREREGISTRATION_INTEGRITY_VERSION; status: "passed"; target_certification: PreregistrationTarget; original_document_sha256: string; final_document_sha256: string; claim_revision_id: string }) | null };

const digest = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value) && !/^([a-f0-9])\1{63}$/.test(value);
const utc = (value: unknown) => typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value) && Number.isFinite(Date.parse(value));
const https = (value: unknown) => typeof value === "string" && /^https:\/\//.test(value);
const nonnegative = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const hash = (prefix: string) => `${prefix}${"0123456789abcdef".repeat(4)}`.slice(0, 64);
const gate = (id: string, label: string, passed: boolean, ok: string, fix: string): PreregistrationGate => ({ id, label, passed, detail: passed ? ok : fix });

function validReceipt(receipt: TimestampReceipt | undefined, documentSha256: string, registeredAt: string) {
  return Boolean(receipt && TIMESTAMP_METHODS.includes(receipt.method) && https(receipt.token_uri) && digest(receipt.token_sha256) && receipt.message_imprint_sha256 === documentSha256 && receipt.issued_at === registeredAt && utc(receipt.issued_at) && receipt.signature_verified === true && receipt.authority_independent_of_sponsor === true);
}

function activityBoundary(original: PreregistrationIntegrityInput["original"]) {
  const values = [original.first_preflight_trial_at, original.first_screening_decision_at, original.first_resident_hour_at].filter((value): value is string => typeof value === "string");
  return Math.min(...values.map(value => Date.parse(value)));
}

export function reproducePreregistrationIntegrity(input: Pick<PreregistrationIntegrityInput, "original" | "amendments">): PreregistrationClaim {
  const boundary = activityBoundary(input.original);
  const count = (kind: AmendmentClass) => input.amendments.filter(row => row.classification === kind).length;
  let expectedParent = input.original.document_sha256, chainBreaks = 0;
  for (const row of input.amendments) { if (row.parent_document_sha256 !== expectedParent) chainBreaks++; expectedParent = row.amended_document_sha256; }
  return {
    amendment_count: input.amendments.length,
    administrative_amendments: count("administrative"), clarification_amendments: count("clarification"), safety_hotfix_amendments: count("safety_hotfix"), material_amendments: count("material"),
    post_activity_amendments: input.amendments.filter(row => Date.parse(row.registered_at) >= boundary).length,
    outcome_informed_amendments: input.amendments.filter(row => row.current_cohort_outcomes_accessed !== false || row.aggregate_w_accessed !== false || row.participant_task_logs_accessed !== false).length as 0,
    retroactive_amendments: input.amendments.filter(row => row.retroactive_application !== false).length as 0,
    material_amendments_in_same_claim: input.amendments.filter(row => row.classification === "material" && (row.creates_new_claim_revision !== true || row.claim_revision_id === input.original.claim_revision_id)).length as 0,
    chain_breaks: chainBreaks as 0,
  };
}

const claimMatches = (actual: PreregistrationClaim, claimed: PreregistrationClaim) => (Object.keys(actual) as (keyof PreregistrationClaim)[]).every(key => actual[key] === claimed?.[key]);

export function assessPreregistrationIntegrity(value: unknown): PreregistrationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { status: "invalid", errors: ["Preregistration-integrity manifest must be one JSON object."], gates: [], summary: null };
  const input = value as Partial<PreregistrationIntegrityInput>, errors: string[] = [];
  if (input.profile_version !== PREREGISTRATION_INTEGRITY_VERSION) errors.push(`profile_version must be ${PREREGISTRATION_INTEGRITY_VERSION}.`);
  if (!PREREGISTRATION_TARGETS.includes(input.target_certification as PreregistrationTarget)) errors.push("target_certification is invalid.");
  if (!Array.isArray(input.amendments)) errors.push("amendments must be an array, including an empty array when none exist.");
  if (errors.length) return { status: "invalid", errors, gates: [], summary: null };
  const target = input.target_certification as PreregistrationTarget, protocol = input.protocol as PreregistrationIntegrityInput["protocol"], original = input.original as PreregistrationIntegrityInput["original"], amendments = input.amendments as PreregistrationAmendment[], commitments = input.commitments as PreregistrationIntegrityInput["commitments"], evidence = input.evidence as PreregistrationIntegrityInput["evidence"], assessor = input.assessor as PreregistrationIntegrityInput["assessor"];
  const protocolPass = protocol?.canonicalization === "RFC8785_JCS" && protocol.hash === "SHA-256" && protocol.original_rule === "immutable_timestamped_registration_before_first_benchmark_activity" && protocol.amendment_rule === "append_only_parent_linked_no_overwrite" && protocol.outcome_access_rule === "no_current_cohort_outcomes_aggregate_W_or_participant_task_logs_before_amendment" && protocol.material_change_rule === "new_claim_revision_no_shared_exposure" && protocol.retroactivity_rule === "never_apply_amendments_to_prior_exposure" && protocol.public_rule === "public_or_embargoed_receipt_before_activity_public_history_at_submission";
  const targetBoundaryPass = target === "PREQUALIFIED" ? original?.first_screening_decision_at === null && original.first_resident_hour_at === null : utc(original?.first_screening_decision_at) && utc(original?.first_resident_hour_at) && Date.parse(String(original.first_screening_decision_at)) <= Date.parse(String(original.first_resident_hour_at));
  const rootShapePass = typeof original?.study_id === "string" && original.study_id.length > 0 && typeof original.claim_revision_id === "string" && original.claim_revision_id.length > 0 && https(original.document_uri) && digest(original.document_sha256) && https(original.schema_uri) && digest(original.schema_sha256) && utc(original.registered_at) && utc(original.first_preflight_trial_at) && https(original.registry_record_uri) && typeof original.registry_record_id === "string" && original.registry_record_id.length > 0 && original.registry_record_immutable === true && original.withdrawal_leaves_tombstone === true;
  const frozenPass = rootShapePass && targetBoundaryPass && Date.parse(original.registered_at) < activityBoundary(original) && validReceipt(original.receipt, original.document_sha256, original.registered_at);
  const signaturesPass = digest(original?.sponsor_signature_sha256) && digest(original?.investigator_signature_sha256) && original.sponsor_signature_sha256 !== original.investigator_signature_sha256;
  const commitmentPass = commitments && Object.values(commitments).length === 8 && Object.values(commitments).every(digest) && new Set(Object.values(commitments)).size === 8;
  const ids = amendments.map(row => row.amendment_id), documents = amendments.map(row => row.amended_document_sha256), registrations = amendments.map(row => Date.parse(row.registered_at));
  let expectedParent = original?.document_sha256;
  const amendmentShapePass = amendments.every((row, index) => {
    const chronological = utc(row.registered_at) && utc(row.effective_at) && Date.parse(row.registered_at) <= Date.parse(row.effective_at) && (index === 0 || registrations[index - 1] <= registrations[index]);
    const linked = digest(row.parent_document_sha256) && row.parent_document_sha256 === expectedParent && digest(row.amended_document_sha256) && row.amended_document_sha256 !== row.parent_document_sha256;
    expectedParent = row.amended_document_sha256;
    return typeof row.amendment_id === "string" && row.amendment_id.length > 0 && AMENDMENT_CLASSES.includes(row.classification) && typeof row.rationale === "string" && row.rationale.length >= 20 && Array.isArray(row.changed_sections) && row.changed_sections.length > 0 && row.changed_sections.every(section => typeof section === "string" && section.length > 0) && chronological && linked && nonnegative(row.prior_exposure_hours) && typeof row.claim_revision_id === "string" && row.claim_revision_id.length > 0 && validReceipt(row.receipt, row.amended_document_sha256, row.registered_at);
  });
  const chainPass = amendmentShapePass && new Set(ids).size === ids.length && new Set(documents).size === documents.length && !documents.includes(original?.document_sha256);
  const outcomePass = amendments.every(row => row.current_cohort_outcomes_accessed === false && row.aggregate_w_accessed === false && row.participant_task_logs_accessed === false);
  const amendmentPolicyPass = amendments.every(row => row.retroactive_application === false && (row.classification === "material" ? row.creates_new_claim_revision === true && row.claim_revision_id !== original.claim_revision_id : row.creates_new_claim_revision === false && row.claim_revision_id === original.claim_revision_id));
  const reproduced = rootShapePass ? reproducePreregistrationIntegrity({ original, amendments }) : null;
  const reproductionPass = Boolean(reproduced && claimMatches(reproduced, input.claimed as PreregistrationClaim) && reproduced.outcome_informed_amendments === 0 && reproduced.retroactive_amendments === 0 && reproduced.material_amendments_in_same_claim === 0 && reproduced.chain_breaks === 0);
  const assurancePass = https(evidence?.controlled_amendment_register_uri) && digest(evidence?.controlled_amendment_register_sha256) && https(evidence?.public_history_uri) && digest(evidence?.public_history_sha256) && digest(evidence?.receipt_verification_report_sha256) && evidence.public_or_embargoed_before_activity === true && evidence.public_history_complete_at_submission === true && typeof assessor?.name === "string" && assessor.name.length > 0 && typeof assessor.organization === "string" && assessor.organization.length > 0 && assessor.independent_of_sponsor === true && assessor.attested === true && utc(assessor.signed_at) && Date.parse(assessor.signed_at) >= Math.max(Date.parse(original.registered_at), ...registrations.filter(Number.isFinite));
  const gates = [
    gate("PR1", "FROZEN CANONICAL ROOT", protocolPass && rootShapePass && commitmentPass, "The canonical registration binds the robot, cohort, endpoint, safety, operations, telemetry, and analysis plans.", "Use the exact 0.2-PR1 rules and bind all eight distinct preregistered commitments."),
    gate("PR2", "INDEPENDENT PRE-ACTIVITY TIMESTAMP", frozenPass, "An independently verified receipt proves the immutable root existed before any benchmark activity.", "Register and independently timestamp the document before preflight, screening, or resident exposure begins."),
    gate("PR3", "ACCOUNTABLE AUTHORSHIP", signaturesPass, "Distinct sponsor and investigator signatures bind accountable authorship.", "Provide distinct non-placeholder sponsor and investigator signature digests."),
    gate("PR4", "APPEND-ONLY AMENDMENT CHAIN", chainPass, "Every amendment is timestamped, ordered, uniquely identified, and parent-linked without overwriting history.", "Repair duplicate IDs, receipt imprints, timestamps, or parent links; never replace the registered root."),
    gate("PR5", "OUTCOME-BLIND CHANGE CONTROL", outcomePass, "No amendment used current-cohort outcomes, aggregate W, or participant task logs.", "Move outcome-informed work to a future study or declare the current claim nonconfirmatory."),
    gate("PR6", "NO RETROACTIVE OR MATERIAL CONTAMINATION", amendmentPolicyPass, "Amendments never rewrite prior exposure, and every material change starts a new claim revision.", "Remove retroactive application and isolate every material change in a new claim revision with no shared exposure."),
    gate("PR7", "REPRODUCED BOUND HISTORY", reproductionPass && assurancePass, "The complete history, zero-contamination claims, receipts, and independent audit reproduce exactly.", "Correct claimed counts and bind the controlled register, public history, receipt report, and independent attestation."),
  ];
  const status = gates.every(row => row.passed) ? "passed" : "failed";
  const finalDocument = amendments.at(-1)?.amended_document_sha256 || original?.document_sha256;
  const finalRevision = amendments.at(-1)?.claim_revision_id || original?.claim_revision_id;
  return { status, errors: [], gates, summary: reproduced ? { profile_version: PREREGISTRATION_INTEGRITY_VERSION, status: "passed", target_certification: target, original_document_sha256: original.document_sha256, final_document_sha256: finalDocument, claim_revision_id: finalRevision, ...reproduced } : null };
}

const receipt = (documentSha256: string, issuedAt: string, prefix: string): TimestampReceipt => ({ method: "immutable_registry_receipt", token_uri: `https://example.org/registry/receipts/${prefix}.json`, token_sha256: hash(`${prefix}a`), message_imprint_sha256: documentSha256, issued_at: issuedAt, signature_verified: true, authority_independent_of_sponsor: true });

export function preregistrationTemplateFor(target: PreregistrationTarget): PreregistrationIntegrityInput {
  const originalSha = hash("b"), rootRevision = "claim-r1";
  const original = { study_id: "SYNTHETIC-STUDY-001", claim_revision_id: rootRevision, document_uri: "https://example.org/registry/wanted-study-001/preregistration.json", document_sha256: originalSha, schema_uri: "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/preregistration.schema.json", schema_sha256: hash("b2"), registered_at: "2025-12-01T00:00:00Z", first_preflight_trial_at: "2025-12-15T00:00:00Z", first_screening_decision_at: target === "PREQUALIFIED" ? null : "2026-01-01T00:00:00Z", first_resident_hour_at: target === "PREQUALIFIED" ? null : "2026-02-01T00:00:00Z", registry_record_uri: "https://example.org/registry/wanted-study-001", registry_record_id: "registry:wanted-study-001:v1", registry_record_immutable: true as const, withdrawal_leaves_tombstone: true as const, sponsor_signature_sha256: hash("b3"), investigator_signature_sha256: hash("b4"), receipt: receipt(originalSha, "2025-12-01T00:00:00Z", "a9") };
  const clarificationSha = hash("c1"), administrativeSha = hash("d1");
  const amendments: PreregistrationAmendment[] = [
    { amendment_id: "A-001", parent_document_sha256: originalSha, amended_document_sha256: clarificationSha, classification: "clarification", rationale: "Clarify the published UTC clock-source wording without changing any decision rule.", changed_sections: ["telemetry.clock_sync"], registered_at: "2025-12-10T00:00:00Z", effective_at: "2025-12-10T00:00:00Z", prior_exposure_hours: 0, current_cohort_outcomes_accessed: false, aggregate_w_accessed: false, participant_task_logs_accessed: false, retroactive_application: false, creates_new_claim_revision: false, claim_revision_id: rootRevision, receipt: receipt(clarificationSha, "2025-12-10T00:00:00Z", "a001") },
    { amendment_id: "A-002", parent_document_sha256: clarificationSha, amended_document_sha256: administrativeSha, classification: "administrative", rationale: "Record an investigator contact change without altering eligibility, outcomes, operations, or analysis.", changed_sections: ["study.principal_investigator_contact"], registered_at: "2026-03-01T00:00:00Z", effective_at: "2026-03-01T00:00:00Z", prior_exposure_hours: target === "PREQUALIFIED" ? 0 : 672, current_cohort_outcomes_accessed: false, aggregate_w_accessed: false, participant_task_logs_accessed: false, retroactive_application: false, creates_new_claim_revision: false, claim_revision_id: rootRevision, receipt: receipt(administrativeSha, "2026-03-01T00:00:00Z", "a002") },
  ];
  const value: PreregistrationIntegrityInput = { profile_version: PREREGISTRATION_INTEGRITY_VERSION, target_certification: target, protocol: { canonicalization: "RFC8785_JCS", hash: "SHA-256", original_rule: "immutable_timestamped_registration_before_first_benchmark_activity", amendment_rule: "append_only_parent_linked_no_overwrite", outcome_access_rule: "no_current_cohort_outcomes_aggregate_W_or_participant_task_logs_before_amendment", material_change_rule: "new_claim_revision_no_shared_exposure", retroactivity_rule: "never_apply_amendments_to_prior_exposure", public_rule: "public_or_embargoed_receipt_before_activity_public_history_at_submission" }, original, commitments: { robot_description_sha256: hash("e1"), baseline_policy_artifact_sha256: hash("e2"), cohort_and_sampling_plan_sha256: hash("e3"), endpoint_rules_sha256: hash("e4"), safety_plan_sha256: hash("e5"), operations_plan_sha256: hash("e6"), telemetry_key_manifest_sha256: hash("e7"), analysis_plan_sha256: hash("e8") }, amendments, claimed: {} as PreregistrationClaim, evidence: { controlled_amendment_register_uri: "https://example.org/wanted-preregistration-amendments.json", controlled_amendment_register_sha256: hash("f1"), public_history_uri: "https://example.org/registry/wanted-study-001/history", public_history_sha256: hash("f2"), receipt_verification_report_sha256: hash("f3"), public_or_embargoed_before_activity: true, public_history_complete_at_submission: true }, assessor: { name: "Synthetic Registration Auditor", organization: "Independent Example Assurance", independent_of_sponsor: true, attested: true, signed_at: "2027-03-10T12:00:00Z" } };
  value.claimed = reproducePreregistrationIntegrity(value);
  return value;
}

export const preregistrationIntegrityTemplate = preregistrationTemplateFor("WANTED_WILD");
const d = { type: "string", pattern: "^[a-f0-9]{64}$" }, date = { type: "string", format: "date-time" }, uri = { type: "string", format: "uri", pattern: "^https://" }, count = { type: "integer", minimum: 0 };
const receiptSchema = { type: "object", additionalProperties: false, required: ["method","token_uri","token_sha256","message_imprint_sha256","issued_at","signature_verified","authority_independent_of_sponsor"], properties: { method: { enum: TIMESTAMP_METHODS }, token_uri: uri, token_sha256: d, message_imprint_sha256: d, issued_at: date, signature_verified: { const: true }, authority_independent_of_sponsor: { const: true } } };
export const preregistrationIntegritySchema = { "$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/preregistration-integrity.schema.json", title: "WANTED Preregistration Freeze and Amendment Integrity Manifest", type: "object", additionalProperties: false, required: ["profile_version","target_certification","protocol","original","commitments","amendments","claimed","evidence","assessor"], properties: {
  profile_version: { const: PREREGISTRATION_INTEGRITY_VERSION }, target_certification: { enum: PREREGISTRATION_TARGETS },
  protocol: { type: "object", additionalProperties: false, required: ["canonicalization","hash","original_rule","amendment_rule","outcome_access_rule","material_change_rule","retroactivity_rule","public_rule"], properties: { canonicalization: { const: "RFC8785_JCS" }, hash: { const: "SHA-256" }, original_rule: { const: "immutable_timestamped_registration_before_first_benchmark_activity" }, amendment_rule: { const: "append_only_parent_linked_no_overwrite" }, outcome_access_rule: { const: "no_current_cohort_outcomes_aggregate_W_or_participant_task_logs_before_amendment" }, material_change_rule: { const: "new_claim_revision_no_shared_exposure" }, retroactivity_rule: { const: "never_apply_amendments_to_prior_exposure" }, public_rule: { const: "public_or_embargoed_receipt_before_activity_public_history_at_submission" } } },
  original: { type: "object", additionalProperties: false, required: ["study_id","claim_revision_id","document_uri","document_sha256","schema_uri","schema_sha256","registered_at","first_preflight_trial_at","first_screening_decision_at","first_resident_hour_at","registry_record_uri","registry_record_id","registry_record_immutable","withdrawal_leaves_tombstone","sponsor_signature_sha256","investigator_signature_sha256","receipt"], properties: { study_id: { type: "string", minLength: 1 }, claim_revision_id: { type: "string", minLength: 1 }, document_uri: uri, document_sha256: d, schema_uri: uri, schema_sha256: d, registered_at: date, first_preflight_trial_at: date, first_screening_decision_at: { oneOf: [date,{type:"null"}] }, first_resident_hour_at: { oneOf: [date,{type:"null"}] }, registry_record_uri: uri, registry_record_id: { type: "string", minLength: 1 }, registry_record_immutable: { const: true }, withdrawal_leaves_tombstone: { const: true }, sponsor_signature_sha256: d, investigator_signature_sha256: d, receipt: receiptSchema } },
  commitments: { type: "object", additionalProperties: false, required: ["robot_description_sha256","baseline_policy_artifact_sha256","cohort_and_sampling_plan_sha256","endpoint_rules_sha256","safety_plan_sha256","operations_plan_sha256","telemetry_key_manifest_sha256","analysis_plan_sha256"], properties: Object.fromEntries(["robot_description_sha256","baseline_policy_artifact_sha256","cohort_and_sampling_plan_sha256","endpoint_rules_sha256","safety_plan_sha256","operations_plan_sha256","telemetry_key_manifest_sha256","analysis_plan_sha256"].map(key => [key,d])) },
  amendments: { type: "array", items: { type: "object", additionalProperties: false, required: ["amendment_id","parent_document_sha256","amended_document_sha256","classification","rationale","changed_sections","registered_at","effective_at","prior_exposure_hours","current_cohort_outcomes_accessed","aggregate_w_accessed","participant_task_logs_accessed","retroactive_application","creates_new_claim_revision","claim_revision_id","receipt"], properties: { amendment_id: { type: "string", minLength: 1 }, parent_document_sha256: d, amended_document_sha256: d, classification: { enum: AMENDMENT_CLASSES }, rationale: { type: "string", minLength: 20 }, changed_sections: { type: "array", minItems: 1, uniqueItems: true, items: { type: "string", minLength: 1 } }, registered_at: date, effective_at: date, prior_exposure_hours: { type: "number", minimum: 0 }, current_cohort_outcomes_accessed: { const: false }, aggregate_w_accessed: { const: false }, participant_task_logs_accessed: { const: false }, retroactive_application: { const: false }, creates_new_claim_revision: { type: "boolean" }, claim_revision_id: { type: "string", minLength: 1 }, receipt: receiptSchema } } },
  claimed: { type: "object", additionalProperties: false, required: ["amendment_count","administrative_amendments","clarification_amendments","safety_hotfix_amendments","material_amendments","post_activity_amendments","outcome_informed_amendments","retroactive_amendments","material_amendments_in_same_claim","chain_breaks"], properties: { amendment_count: count, administrative_amendments: count, clarification_amendments: count, safety_hotfix_amendments: count, material_amendments: count, post_activity_amendments: count, outcome_informed_amendments: { const: 0 }, retroactive_amendments: { const: 0 }, material_amendments_in_same_claim: { const: 0 }, chain_breaks: { const: 0 } } },
  evidence: { type: "object", additionalProperties: false, required: ["controlled_amendment_register_uri","controlled_amendment_register_sha256","public_history_uri","public_history_sha256","receipt_verification_report_sha256","public_or_embargoed_before_activity","public_history_complete_at_submission"], properties: { controlled_amendment_register_uri: uri, controlled_amendment_register_sha256: d, public_history_uri: uri, public_history_sha256: d, receipt_verification_report_sha256: d, public_or_embargoed_before_activity: { const: true }, public_history_complete_at_submission: { const: true } } },
  assessor: { type: "object", additionalProperties: false, required: ["name","organization","independent_of_sponsor","attested","signed_at"], properties: { name: { type: "string", minLength: 1 }, organization: { type: "string", minLength: 1 }, independent_of_sponsor: { const: true }, attested: { const: true }, signed_at: date } }
} } as const;

export const preregistrationIntegrityContract = { name: "WANTED Preregistration Freeze and Amendment Integrity Profile", version: PREREGISTRATION_INTEGRITY_VERSION, applies_to: PREREGISTRATION_TARGETS, certification_effect: "root_evidence_integrity_gate", ranking_effect: "eligibility_only_never_score_or_tiebreaker", canonicalization: "RFC8785_JCS", hash: "SHA-256", timestamp_methods: TIMESTAMP_METHODS, frozen_commitments: ["robot","baseline_policy","cohort_and_sampling","endpoint","safety","operations","telemetry_keys","analysis"], amendment_policy: { storage: "append_only_parent_linked", outcome_access: "none_before_amendment", retroactivity: "forbidden", material_change: "new_claim_revision_no_shared_exposure" }, hard_failures: ["registration_after_benchmark_activity","mutable_or_unverified_root","receipt_imprint_mismatch","missing_accountable_signature","broken_amendment_chain","outcome_informed_amendment","retroactive_amendment","material_amendment_in_same_claim","claimed_history_mismatch","unbound_public_history"], interpretation: "Passing proves when the protocol existed and how every amendment was controlled. It does not certify scientific merit, ethics approval, or regulatory compliance." } as const;

export const EXPOSURE_LEDGER_VERSION = "0.2-X1";
export const CLOCK_RULE = "continuous_elapsed_utc_from_activation_to_first_end_boundary_capped_at_10000_hours";
export type FieldTarget = "WANTED_LAB" | "WANTED_WILD" | "WANTED_10K";
export const endDispositions = ["voluntary_rejection", "administrative_completion", "unrelated_exit", "safety_termination", "developer_withdrawal", "consent_privacy_withdrawal", "observation_cutoff"] as const;

type Boundary = { event_id: string; sequence: number; occurred_at: string; event_sha256: string };
export type ExposureRecord = {
  deployment_id: string;
  environment_id_sha256: string;
  activation: Boundary & { participant_acceptance_ref: string; activation_record_sha256: string };
  end: Boundary & { disposition: typeof endDispositions[number]; evidence_ref: string };
  declared_resident_seconds: number;
  paused_seconds_deducted: 0;
  validated_event_count: number;
  missing_sequences: number;
  duplicate_sequences: number;
  backward_timestamps: number;
  chain_complete: boolean;
  maximum_observed_clock_error_ms: number;
  root_commitment_uri: string;
  root_commitment_sha256: string;
};
export type ExposureLedgerInput = {
  profile_version: typeof EXPOSURE_LEDGER_VERSION;
  target_certification: FieldTarget;
  clock_rule: typeof CLOCK_RULE;
  maximum_clock_error_ms: number;
  records: ExposureRecord[];
  evidence: { reconciliation_report_uri: string; reconciliation_report_sha256: string; signed_event_archive_uri: string; signed_event_archive_sha256: string; public_aggregate_only: boolean };
  assessor: { name: string; organization: string; independent_of_sponsor: boolean; attested: boolean; signed_at: string };
};
export type ExposureGate = { id: string; label: string; passed: boolean; detail: string };
export type ExposureSummary = {
  profile_version: typeof EXPOSURE_LEDGER_VERSION;
  target_certification: FieldTarget;
  environment_count: number;
  total_resident_seconds: number;
  total_resident_hours: number;
  max_environment_seconds: number;
  missing_sequences: number;
  duplicate_sequences: number;
  backward_timestamps: number;
  boundary_mismatches: number;
  paused_seconds_deducted: number;
  continuous_clock: true;
};
export type ExposureResult = { status: "passed" | "failed" | "invalid"; errors: string[]; gates: ExposureGate[]; summary: ExposureSummary | null };

const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const integer = (value: unknown) => Number.isInteger(value) && Number(value) >= 0;
const digest = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value) && !/^([a-f0-9])\1{63}$/.test(value);
const https = (value: unknown) => typeof value === "string" && /^https:\/\//.test(value);
const utc = (value: unknown) => typeof value === "string" && value.endsWith("Z") && Number.isFinite(Date.parse(value));
const gate = (id: string, label: string, passed: boolean, pass: string, fail: string): ExposureGate => ({ id, label, passed, detail: passed ? pass : fail });
const round = (value: number) => Number(value.toFixed(6));

export function assessExposureLedger(value: unknown): ExposureResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { status: "invalid", errors: ["Exposure ledger must be one JSON object."], gates: [], summary: null };
  const input = value as Partial<ExposureLedgerInput>;
  const errors: string[] = [];
  if (input.profile_version !== EXPOSURE_LEDGER_VERSION) errors.push(`profile_version must be ${EXPOSURE_LEDGER_VERSION}.`);
  if (!(["WANTED_LAB", "WANTED_WILD", "WANTED_10K"] as string[]).includes(String(input.target_certification))) errors.push("target_certification must be a field target.");
  if (input.clock_rule !== CLOCK_RULE) errors.push(`clock_rule must be ${CLOCK_RULE}.`);
  if (!integer(input.maximum_clock_error_ms) || Number(input.maximum_clock_error_ms) > 1000) errors.push("maximum_clock_error_ms must be an integer from 0 to 1000.");
  if (!Array.isArray(input.records) || input.records.length < 1) errors.push("records must contain at least one deployment.");
  if (errors.length) return { status: "invalid", errors, gates: [], summary: null };

  const records = input.records as ExposureRecord[];
  let boundaryMismatches = 0, missing = 0, duplicates = 0, backward = 0, paused = 0, totalSeconds = 0, maxSeconds = 0;
  let boundaryShape = true, chainPass = true, clockPass = true, commitmentPass = true;
  const deploymentIds = new Set<string>(), environmentHashes = new Set<string>();
  for (const raw of records) {
    const record = object(raw), activation = object(record.activation), end = object(record.end);
    const deploymentOk = typeof record.deployment_id === "string" && record.deployment_id.length > 0;
    const environmentOk = digest(record.environment_id_sha256);
    if (!deploymentOk || !environmentOk || !utc(activation.occurred_at) || !utc(end.occurred_at) || !digest(activation.event_sha256) || !digest(activation.activation_record_sha256) || !digest(end.event_sha256) || typeof activation.event_id !== "string" || !activation.event_id || typeof end.event_id !== "string" || !end.event_id || typeof activation.participant_acceptance_ref !== "string" || !activation.participant_acceptance_ref || typeof end.evidence_ref !== "string" || !end.evidence_ref || !endDispositions.includes(end.disposition as never)) boundaryShape = false;
    const startSequence = Number(activation.sequence), endSequence = Number(end.sequence), declared = Number(record.declared_resident_seconds);
    const elapsed = Math.min(36_000_000, Math.max(0, (Date.parse(String(end.occurred_at)) - Date.parse(String(activation.occurred_at))) / 1000));
    const errorMs = Math.abs(declared - elapsed) * 1000;
    if (!integer(activation.sequence) || startSequence !== 0 || !integer(end.sequence) || endSequence < startSequence || !integer(record.declared_resident_seconds) || declared > 36_000_000 || !Number.isFinite(errorMs) || errorMs > Number(input.maximum_clock_error_ms) || !integer(record.maximum_observed_clock_error_ms) || Number(record.maximum_observed_clock_error_ms) < errorMs || Number(record.maximum_observed_clock_error_ms) > Number(input.maximum_clock_error_ms)) { boundaryMismatches++; clockPass = false; }
    if (!integer(record.missing_sequences) || !integer(record.duplicate_sequences) || !integer(record.backward_timestamps) || !integer(record.validated_event_count)) chainPass = false;
    missing += Number(record.missing_sequences) || 0; duplicates += Number(record.duplicate_sequences) || 0; backward += Number(record.backward_timestamps) || 0; paused += Number(record.paused_seconds_deducted) || 0;
    if (record.chain_complete !== true || Number(record.missing_sequences) !== 0 || Number(record.duplicate_sequences) !== 0 || Number(record.backward_timestamps) !== 0 || Number(record.validated_event_count) !== endSequence - startSequence + 1) chainPass = false;
    if (record.paused_seconds_deducted !== 0) clockPass = false;
    if (!https(record.root_commitment_uri) || !digest(record.root_commitment_sha256)) commitmentPass = false;
    totalSeconds += Number.isFinite(declared) ? declared : 0; maxSeconds = Math.max(maxSeconds, Number.isFinite(declared) ? declared : 0);
    if (deploymentOk) deploymentIds.add(String(record.deployment_id));
    if (environmentOk) environmentHashes.add(String(record.environment_id_sha256));
  }
  const uniquePass = deploymentIds.size === records.length && environmentHashes.size === records.length;
  const target = input.target_certification as FieldTarget;
  const targetPass = records.length >= (target === "WANTED_WILD" ? 20 : 1) && totalSeconds >= (target === "WANTED_LAB" ? 360_000 : 36_000_000) && (target !== "WANTED_10K" || maxSeconds === 36_000_000);
  const evidence = object(input.evidence), assessor = object(input.assessor);
  const evidencePass = https(evidence.reconciliation_report_uri) && digest(evidence.reconciliation_report_sha256) && https(evidence.signed_event_archive_uri) && digest(evidence.signed_event_archive_sha256) && evidence.public_aggregate_only === true && typeof assessor.name === "string" && assessor.name.length > 0 && typeof assessor.organization === "string" && assessor.organization.length > 0 && assessor.independent_of_sponsor === true && assessor.attested === true && utc(assessor.signed_at);
  const gates = [
    gate("X1", "CANONICAL CLOCK", input.clock_rule === CLOCK_RULE, "The ledger uses the frozen continuous elapsed-UTC clock.", "Use the exact 0.2-X1 clock rule; local availability must not redefine exposure."),
    gate("X2", "SIGNED BOUNDARIES", boundaryShape, "Each deployment has signed activation and end boundaries with evidence.", "Bind a valid sequence-zero activation and one adjudicated end event to each deployment."),
    gate("X3", "CONTINUOUS ELAPSED TIME", clockPass && paused === 0 && boundaryMismatches === 0, "Declared seconds reproduce elapsed UTC time with no pause deductions.", "Reconcile boundary arithmetic within tolerance and deduct zero seconds for pauses, downtime, charging, sleep, maintenance, or missing telemetry."),
    gate("X4", "COMPLETE EVENT STREAMS", chainPass && missing === 0 && duplicates === 0 && backward === 0, "Every boundary interval has one complete, ordered event chain.", "Resolve missing or duplicate sequences, backward timestamps, count mismatches, and incomplete chains."),
    gate("X5", "UNIQUE DEPLOYMENTS", uniquePass, "Deployment and hashed environment identifiers are unique.", "Remove duplicate deployment IDs or hashed environment IDs."),
    gate("X6", "TARGET + RECONCILIATION", targetPass, `${target} meets its exposure and environment threshold.`, target === "WANTED_WILD" ? "Provide at least 20 environments and 10,000 aggregate hours." : target === "WANTED_10K" ? "Provide one deployment reaching exactly the 10,000-hour cap." : "Provide at least one environment and 100 aggregate hours."),
    gate("X7", "BOUND INDEPENDENT ASSURANCE", commitmentPass && Boolean(evidencePass), "Stream commitments and reconciliation evidence are independently attested.", "Provide HTTPS commitments and reports with non-placeholder digests plus an independent assessor attestation."),
  ];
  const summary: ExposureSummary = { profile_version: EXPOSURE_LEDGER_VERSION, target_certification: target, environment_count: records.length, total_resident_seconds: totalSeconds, total_resident_hours: round(totalSeconds / 3600), max_environment_seconds: maxSeconds, missing_sequences: missing, duplicate_sequences: duplicates, backward_timestamps: backward, boundary_mismatches: boundaryMismatches, paused_seconds_deducted: paused, continuous_clock: true };
  return { status: gates.every(item => item.passed) ? "passed" : "failed", errors: [], gates, summary };
}

const hash = (prefix: string) => `${prefix}${"0123456789abcdef".repeat(4)}`.slice(0, 64);
const isoAfter = (start: string, seconds: number) => new Date(Date.parse(start) + seconds * 1000).toISOString();
export function exposureLedgerTemplateFor(target: FieldTarget): ExposureLedgerInput {
  const seconds = target === "WANTED_WILD" ? [...Array(8).fill(36_000_000), ...Array(16).fill(9_000_000)] : [target === "WANTED_10K" ? 36_000_000 : 360_000];
  const records = seconds.map((residentSeconds, index): ExposureRecord => {
    const activation = new Date(Date.UTC(2024, 0, 1 + index)).toISOString();
    const disposition = target === "WANTED_WILD" ? index < 8 ? "administrative_completion" : index < 12 ? "voluntary_rejection" : "unrelated_exit" : target === "WANTED_10K" ? "administrative_completion" : "observation_cutoff";
    return { deployment_id: `dep_synthetic_${String(index + 1).padStart(3, "0")}`, environment_id_sha256: hash(`${(index + 10).toString(16)}a`), activation: { event_id: `evt_activation_${index + 1}`, sequence: 0, occurred_at: activation, event_sha256: hash(`${(index + 30).toString(16)}b`), participant_acceptance_ref: `controlled://acceptance/${index + 1}`, activation_record_sha256: hash(`${(index + 50).toString(16)}c`) }, end: { event_id: `evt_end_${index + 1}`, sequence: 99, occurred_at: isoAfter(activation, residentSeconds), event_sha256: hash(`${(index + 70).toString(16)}d`), disposition, evidence_ref: `controlled://disposition/${index + 1}` }, declared_resident_seconds: residentSeconds, paused_seconds_deducted: 0, validated_event_count: 100, missing_sequences: 0, duplicate_sequences: 0, backward_timestamps: 0, chain_complete: true, maximum_observed_clock_error_ms: 0, root_commitment_uri: `https://example.org/wanted/roots/${index + 1}.json`, root_commitment_sha256: hash(`${(index + 90).toString(16)}e`) };
  });
  return { profile_version: EXPOSURE_LEDGER_VERSION, target_certification: target, clock_rule: CLOCK_RULE, maximum_clock_error_ms: 1000, records, evidence: { reconciliation_report_uri: "https://example.org/wanted-exposure-reconciliation.json", reconciliation_report_sha256: hash("ab"), signed_event_archive_uri: "https://example.org/wanted-signed-event-archive.json", signed_event_archive_sha256: hash("cd"), public_aggregate_only: true }, assessor: { name: "Synthetic Exposure Auditor", organization: "Independent Example Assurance", independent_of_sponsor: true, attested: true, signed_at: "2026-08-28T18:00:00Z" } };
}
export const exposureLedgerTemplate = exposureLedgerTemplateFor("WANTED_WILD");

const digestSchema = { type: "string", pattern: "^[a-f0-9]{64}$" }, uri = { type: "string", format: "uri" }, nonnegative = { type: "integer", minimum: 0 };
const boundary = { type: "object", additionalProperties: false, required: ["event_id", "sequence", "occurred_at", "event_sha256"], properties: { event_id: { type: "string", minLength: 1 }, sequence: nonnegative, occurred_at: { type: "string", format: "date-time" }, event_sha256: digestSchema } };
export const exposureLedgerSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/exposure-ledger.schema.json", title: "WANTED-10K Exposure Ledger Manifest", type: "object", additionalProperties: false,
  required: ["profile_version", "target_certification", "clock_rule", "maximum_clock_error_ms", "records", "evidence", "assessor"],
  properties: {
    profile_version: { const: EXPOSURE_LEDGER_VERSION }, target_certification: { enum: ["WANTED_LAB", "WANTED_WILD", "WANTED_10K"] }, clock_rule: { const: CLOCK_RULE }, maximum_clock_error_ms: { type: "integer", minimum: 0, maximum: 1000 },
    records: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, required: ["deployment_id", "environment_id_sha256", "activation", "end", "declared_resident_seconds", "paused_seconds_deducted", "validated_event_count", "missing_sequences", "duplicate_sequences", "backward_timestamps", "chain_complete", "maximum_observed_clock_error_ms", "root_commitment_uri", "root_commitment_sha256"], properties: { deployment_id: { type: "string", minLength: 1 }, environment_id_sha256: digestSchema, activation: { ...boundary, properties: { ...boundary.properties, participant_acceptance_ref: { type: "string", minLength: 1 }, activation_record_sha256: digestSchema }, required: [...boundary.required, "participant_acceptance_ref", "activation_record_sha256"] }, end: { ...boundary, properties: { ...boundary.properties, disposition: { enum: endDispositions }, evidence_ref: { type: "string", minLength: 1 } }, required: [...boundary.required, "disposition", "evidence_ref"] }, declared_resident_seconds: { type: "integer", minimum: 0, maximum: 36_000_000 }, paused_seconds_deducted: { const: 0 }, validated_event_count: { type: "integer", minimum: 2 }, missing_sequences: { const: 0 }, duplicate_sequences: { const: 0 }, backward_timestamps: { const: 0 }, chain_complete: { const: true }, maximum_observed_clock_error_ms: { type: "integer", minimum: 0, maximum: 1000 }, root_commitment_uri: uri, root_commitment_sha256: digestSchema } } },
    evidence: { type: "object", additionalProperties: false, required: ["reconciliation_report_uri", "reconciliation_report_sha256", "signed_event_archive_uri", "signed_event_archive_sha256", "public_aggregate_only"], properties: { reconciliation_report_uri: uri, reconciliation_report_sha256: digestSchema, signed_event_archive_uri: uri, signed_event_archive_sha256: digestSchema, public_aggregate_only: { const: true } } },
    assessor: { type: "object", additionalProperties: false, required: ["name", "organization", "independent_of_sponsor", "attested", "signed_at"], properties: { name: { type: "string", minLength: 1 }, organization: { type: "string", minLength: 1 }, independent_of_sponsor: { const: true }, attested: { const: true }, signed_at: { type: "string", format: "date-time" } } },
  },
};

export const exposureLedgerContract = { name: "WANTED Exposure Ledger Profile", version: EXPOSURE_LEDGER_VERSION, ranking_effect: "eligibility_gate_not_score", official_clock: CLOCK_RULE, cap_seconds_per_environment: 36_000_000, pause_deductions_permitted: false, telemetry_outage_pauses_clock: false, activation_boundary: "signed_DEPLOYMENT_LIFECYCLE_activation_at_sequence_zero", end_boundary: "first_signed_DEPLOYMENT_LIFECYCLE_end_or_audit_observation_cutoff", environment_identifier_digest: "SHA-256_of_RFC8785_JCS_environment_identifier_string", allowed_end_dispositions: endDispositions, missing_data_rule: "no_time_credit_or_pause; unresolved_boundaries_are_adjudicated_and_disclosed", proves: "reproducible_resident_time_from_signed_lifecycle_boundaries", does_not_prove: ["autonomous_availability", "usefulness", "safety", "human_desire_to_keep_robot"], hard_failures: ["missing_activation", "multiple_or_unadjudicated_end_boundary", "pause_time_deduction", "clock_mismatch_over_tolerance", "missing_or_duplicate_sequence", "backward_timestamp", "incomplete_hash_chain", "duplicate_deployment_or_environment", "unbound_commitment_or_reconciliation"] } as const;

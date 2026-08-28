export type GateStatus = "pass" | "fail" | "review";
export type ReadinessGate = { id: string; label: string; status: GateStatus; detail: string };
export type ReadinessResult = { status: "idle" | "invalid" | "test" | "ready" | "not_ready"; target: string; gates: ReadinessGate[]; errors: string[]; projection: Record<string, unknown> | null };
export const emptyReadiness: ReadinessResult = { status: "idle", target: "—", gates: [], errors: [], projection: null };

const digest = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value) && !/^([a-f0-9])\1{63}$/.test(value);
const signature = (value: unknown) => typeof value === "string" && /^[A-Za-z0-9_-]{32,}$/.test(value);
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const numeric = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const gate = (id: string, label: string, passed: boolean, pass: string, fail: string, review = false): ReadinessGate => ({ id, label, status: passed ? "pass" : review ? "review" : "fail", detail: passed ? pass : fail });

const intervalPass = (value: unknown) => {
  const item = object(value);
  return numeric(item.estimate) && numeric(item.lower) && numeric(item.upper) && item.lower >= 0 && item.lower <= item.estimate && item.estimate <= item.upper && item.upper <= 1 && Number.isInteger(item.numerator) && Number.isInteger(item.denominator) && Number(item.numerator) >= 0 && Number(item.numerator) <= Number(item.denominator) && Number(item.denominator) > 0;
};
const latencyPass = (value: unknown) => {
  const item = object(value);
  return Number.isInteger(item.n) && Number(item.n) > 0 && numeric(item.p50) && numeric(item.p95) && numeric(item.p99) && numeric(item.max) && item.p50 >= 0 && item.p50 <= item.p95 && item.p95 <= item.p99 && item.p99 <= item.max;
};
const timeBetweenPass = (value: unknown) => {
  const item = object(value), events = Number(item.events), exposure = Number(item.exposure_hours);
  if (!Number.isInteger(events) || events < 0 || !numeric(item.exposure_hours) || exposure < 0) return false;
  if (events === 0) return item.estimate_hours === null && numeric(item.no_event_lower_bound_hours) && Math.abs(Number(item.no_event_lower_bound_hours) - exposure) < .001;
  return numeric(item.estimate_hours) && item.no_event_lower_bound_hours === null && Math.abs(Number(item.estimate_hours) - exposure / events) < .01;
};

function prohibitedKeys(value: unknown, path = "root", hits: string[] = []) {
  if (Array.isArray(value)) value.forEach((item,index)=>prohibitedKeys(item,`${path}[${index}]`,hits));
  else if (value && typeof value === "object") for (const [key,child] of Object.entries(value)) {
    if (["participant_name", "participant_email", "home_address", "phone_number", "raw_video", "raw_audio"].includes(key.toLowerCase())) hits.push(`${path}.${key}`);
    prohibitedKeys(child,`${path}.${key}`,hits);
  }
  return hits;
}

export function assessManifest(text: string): ReadinessResult {
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch (error) { return { ...emptyReadiness, status: "invalid", errors: [error instanceof Error ? error.message : "Invalid JSON"] }; }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return { ...emptyReadiness, status: "invalid", errors: ["Manifest must be one JSON object."] };

  const submission = object(parsed.submission), organization = object(parsed.organization), robot = object(parsed.robot), study = object(parsed.study), cohort = object(parsed.cohort), primary = object(parsed.primary), diagnostics = object(parsed.diagnostics), safety = object(parsed.safety), telemetry = object(parsed.telemetry), adjudication = object(parsed.adjudication), withdrawal = object(parsed.withdrawal), privacy = object(parsed.privacy), audit = object(parsed.audit);
  const target = String(submission.target_certification || "—");
  const errors: string[] = [];
  const requiredRoots = ["protocol_version", "submission_mode", "submission", "organization", "robot", "study", "cohort", "primary", "diagnostics", "safety", "telemetry", "adjudication", "withdrawal", "evidence", "privacy", "audit"];
  for (const key of requiredRoots) if (!(key in parsed)) errors.push(`Missing root field: ${key}.`);
  if (parsed.protocol_version !== "0.2") errors.push("protocol_version must be 0.2.");
  if (!["test", "official"].includes(String(parsed.submission_mode))) errors.push("submission_mode must be test or official.");
  if (!["PREQUALIFIED", "WANTED_LAB", "WANTED_WILD", "WANTED_10K"].includes(target)) errors.push("Unknown target certification.");
  if (errors.length) return { status: "invalid", target, gates: [], errors, projection: null };

  const identityPass = [submission.submission_id, submission.public_label, organization.sponsor, robot.manufacturer, robot.model, robot.hardware_version, robot.policy_version, study.study_id].every(value=>typeof value === "string" && value.length) && digest(robot.description_sha256);
  const frozen = Date.parse(String(study.preregistration_frozen_at)) < Date.parse(String(study.first_resident_hour_at)) && digest(study.preregistration_sha256);
  const terminal = Number(cohort.safety_terminations || 0) + Number(cohort.developer_withdrawals || 0) + Number(cohort.consent_privacy_withdrawals || 0);
  let cohortPass = false, cohortRule = "";
  if (target === "PREQUALIFIED") { cohortPass = Array.isArray(parsed.evidence) && parsed.evidence.some(item=>object(item).role === "simulation_report"); cohortRule = "Include a simulation report in the evidence index."; }
  if (target === "WANTED_LAB") { cohortPass = Number(cohort.independent_environments) >= 1 && Number(cohort.total_resident_hours) >= 100 && Array.isArray(parsed.evidence) && parsed.evidence.some(item=>object(item).role === "lab_report"); cohortRule = "Requires ≥1 environment, ≥100 real resident hours, and a lab report."; }
  if (target === "WANTED_WILD") { cohortPass = Number(cohort.independent_environments) >= 20 && Number(cohort.total_resident_hours) >= 10000 && terminal === 0; cohortRule = "Requires N≥20, ≥10,000 resident hours, and no unresolved terminal competing causes."; }
  if (target === "WANTED_10K") { cohortPass = Number(cohort.lifetime_completions) >= 1 && Number(cohort.total_resident_hours) >= 10000 && Number(withdrawal.completed) >= 1 && numeric(withdrawal.reacquisition_rate); cohortRule = "Requires a 10,000-hour lifetime completion plus completed seven-day withdrawal and reacquisition result."; }

  const statisticsNeeded = target === "WANTED_WILD";
  const statisticsPass = !statisticsNeeded || (primary.horizon_identifiable === true && numeric(primary.wanted_score) && primary.wanted_score >= 0 && primary.wanted_score <= 100 && numeric(primary.ci95_lower) && numeric(primary.ci95_upper) && primary.ci95_lower <= primary.wanted_score && primary.wanted_score <= primary.ci95_upper && Number(primary.bootstrap_valid_fraction) >= .95 && Number(primary.bootstrap_samples) >= 1000);
  const learning = object(diagnostics.learning_delta), generalization = object(diagnostics.generalization);
  const diagnosticPass = diagnostics.profile_version === "0.2-D1" && numeric(diagnostics.assistance_minutes_per_100_hours) && diagnostics.assistance_minutes_per_100_hours >= 0 && numeric(diagnostics.autonomous_availability) && diagnostics.autonomous_availability >= 0 && diagnostics.autonomous_availability <= 1 && numeric(diagnostics.human_burden_minutes_per_100_hours) && diagnostics.human_burden_minutes_per_100_hours >= 0 && timeBetweenPass(diagnostics.mean_time_between_human_rescue) && timeBetweenPass(diagnostics.mean_time_between_failure) && latencyPass(diagnostics.stop_latency_ms) && latencyPass(diagnostics.privacy_stop_latency_ms) && (diagnostics.self_recovery_rate === null || intervalPass(diagnostics.self_recovery_rate)) && (diagnostics.social_error_rate === null || intervalPass(diagnostics.social_error_rate)) && (diagnostics.initiative_precision === null || intervalPass(diagnostics.initiative_precision)) && (diagnostics.initiative_label_coverage === null || intervalPass(diagnostics.initiative_label_coverage)) && (diagnostics.learning_delta === null || (numeric(learning.estimate) && numeric(learning.lower) && numeric(learning.upper) && learning.lower <= learning.estimate && learning.estimate <= learning.upper && intervalPass(learning.early) && intervalPass(learning.late))) && (generalization.ratio === null || numeric(generalization.ratio)) && (generalization.familiar === null || intervalPass(generalization.familiar)) && (generalization.novel === null || intervalPass(generalization.novel)) && (diagnostics.reacquisition_rate === null || intervalPass(diagnostics.reacquisition_rate));
  const safetyPass = safety.gate_status === "passed" && object(safety.incident_counts).L4 === 0 && digest(safety.assessment_sha256) && typeof safety.qualified_assessor === "string" && safety.qualified_assessor.length > 0;
  const telemetryPass = telemetry.schema_version === "0.2" && telemetry.conformance_status === "passed" && Number(telemetry.total_events) > 0 && Number(telemetry.deployment_streams) > 0 && digest(telemetry.root_commitments_sha256);
  const evidence = Array.isArray(parsed.evidence) ? parsed.evidence : [];
  const evidencePass = evidence.length >= 4 && evidence.every(item=>{ const record=object(item);return typeof record.uri === "string" && /^https:\/\//.test(record.uri) && digest(record.sha256); });
  const piiHits = prohibitedKeys(parsed);
  const auditPass = adjudication.completed === true && Number(adjudication.reviewer_count) >= 1 && digest(adjudication.decisions_sha256) && privacy.participant_data_included === false && privacy.redaction_reviewed === true && privacy.public_pack_contains_aggregate_data_only === true && piiHits.length === 0 && evidencePass && typeof audit.auditor_organization === "string" && audit.auditor_organization !== String(organization.sponsor) && typeof audit.independence_statement === "string" && audit.independence_statement.length >= 20 && signature(audit.auditor_signature) && Date.parse(String(audit.signed_at)) <= Date.parse(String(submission.created_at));

  const gates = [
    gate("G1", "IDENTITY + VERSION", identityPass, "Robot, policy, support model, and description digest are bound.", "Complete robot identity and use a non-placeholder SHA-256 description digest."),
    gate("G2", "FROZEN PREREGISTRATION", frozen, "Preregistration predates the first resident hour and has a non-placeholder digest.", "Freeze the preregistration before hour one and replace placeholder digests."),
    gate("G3", "TARGET THRESHOLD", cohortPass, `Evidence satisfies ${target}.`, cohortRule),
    gate("G4", "PRIMARY + DIAGNOSTICS", statisticsPass && diagnosticPass, statisticsNeeded ? "W, 95% CI, 10K support, and the non-ranking diagnostic profile are complete." : "The non-ranking diagnostic profile is complete; a cohort W is not required for this target.", diagnosticPass ? "Provide an identifiable 10K W, enclosing 95% CI, ≥95% valid bootstrap support, and ≥1,000 draws." : "Provide profile 0.2-D1 with valid denominators, intervals, latency tails, and zero-event lower bounds."),
    gate("G5", "SAFETY + TELEMETRY", safetyPass && telemetryPass, "Safety gate and signed telemetry profile pass with no L4 event.", "Safety must pass with L4=0, independent evidence, conformant telemetry, events, streams, and root commitments."),
    gate("G6", "INDEPENDENT PUBLIC AUDIT", auditPass, "Adjudication, privacy, evidence hashes, redaction, and independent signature are present.", piiHits.length ? `Remove participant-level fields: ${piiHits.join(", ")}.` : "Complete adjudication, aggregate-only privacy checks, ≥4 HTTPS evidence objects, and independent auditor attestation."),
  ];
  const allPass = gates.every(item=>item.status === "pass");
  const mode = parsed.submission_mode;
  const status = allPass ? mode === "official" ? "ready" : "test" : "not_ready";
  const projection = {
    submission_id: submission.submission_id, certification: target, robot: submission.public_label,
    wanted_score: primary.wanted_score, ci95: [primary.ci95_lower, primary.ci95_upper], environments: cohort.independent_environments,
    resident_hours: cohort.total_resident_hours, survival_at_10000: primary.survival_at_10000,
    assistance_minutes_per_100_hours: diagnostics.assistance_minutes_per_100_hours,
    autonomous_availability: diagnostics.autonomous_availability,
    human_burden_minutes_per_100_hours: diagnostics.human_burden_minutes_per_100_hours,
    mean_time_between_human_rescue: diagnostics.mean_time_between_human_rescue,
    safety: safety.gate_status, audit: allPass ? mode === "official" ? "ready_for_registry_review" : "synthetic_test_only" : "incomplete",
  };
  return { status, target, gates, errors, projection };
}

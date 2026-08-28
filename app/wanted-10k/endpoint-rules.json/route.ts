const rules = {
  protocol_version: "0.2",
  primary_event: { code: "VOLUNTARY_REJECTION", definition: "A participant with authority over the environment makes an uncoerced, permanent request to remove the robot.", time: "First timestamp at which the request is unambiguously communicated.", analysis: "event" },
  dispositions: [
    { code: "ADMIN_10K", example: "Environment reaches 10,000 resident hours without rejection.", analysis: "censor_at_10000" },
    { code: "UNRELATED_EXIT", example: "Participant moves, becomes unavailable, or leaves for a reason adjudicated unrelated to the robot.", analysis: "censor_at_observed_time" },
    { code: "UNRELATED_SITE_STOP", example: "Sponsor or site stops the study for a reason adjudicated unrelated to robot performance.", analysis: "censor_at_observed_time" },
    { code: "SAFETY_TERMINATION", example: "Robot is permanently removed under the safety plan.", analysis: "terminal_competing_cause_and_safety_gate_review" },
    { code: "DEVELOPER_WITHDRAWAL", example: "Developer permanently withdraws the robot or support.", analysis: "terminal_competing_cause_not_rankable" },
    { code: "CONSENT_PRIVACY_WITHDRAWAL", example: "Participant withdraws consent or ends data collection without an adjudicated robot-rejection request.", analysis: "terminal_competing_cause_report_separately" },
    { code: "TEMPORARY_PAUSE", example: "Travel, short maintenance, or a reversible participant pause.", analysis: "not_terminal_resident_clock_rule_applies" },
  ],
  tie_breaking: ["Endpoint events are processed before censoring at an identical timestamp.", "Two adjudicators review ambiguous terminal dispositions; preregistered tie-break procedure applies.", "Safety and developer terminal causes are never silently relabeled as unrelated censoring."],
  ranking_rule: "A cohort is not ranked when a terminal cause makes the primary 10,000-hour estimand unsupported, the safety gate fails, or independent adjudication is incomplete.",
};

export async function GET() {
  return Response.json(rules, { headers: { "cache-control": "public, max-age=3600" } });
}

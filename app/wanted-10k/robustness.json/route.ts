const contract = {
  name: "WANTED-10K Primary-Score Robustness Profile",
  version: "0.2-R1",
  protocol_version: "0.2",
  primary_estimator_changed: false,
  ranking_estimator: "Kaplan-Meier normalized RMST at 10,000 resident hours",
  required_disclosures: {
    censoring_envelope: {
      lower: "Treat every non-administrative non-rejection exit before 10,000 hours as rejection at its last observed hour.",
      upper: "Treat every non-rejection exit as retained through 10,000 hours.",
      interpretation: "Partial-identification stress envelope, not an alternative estimator or selectable score.",
    },
    leave_one_environment_out: "Recalculate W after removing each independent environment; publish every identifiable shift and count exclusions that destroy 10K identifiability.",
    tail_support: ["at_risk_9000", "at_risk_10000", "unrelated_early_censors", "terminal_early_exits", "voluntary_rejections"],
  },
  invalid_data: ["duplicate_environment_identifier", "resident_hours_outside_0_10000", "administrative_completion_before_10000", "unknown_disposition"],
  preregister: ["maximum_acceptable_leave_one_out_shift_w_points", "material_robot_version_strata", "missing_data_rule", "subgroup_reporting", "censoring_sensitivity_profile"],
  anti_gaming: ["primary_W_cannot_be_replaced_by_a_bound", "publish_both_bounds_even_when_unfavorable", "count_unidentifiable_leave_one_out_exclusions", "do_not_pool_materially_incompatible_robot_versions", "never_reclassify_terminal_causes_as_unrelated_censoring"],
};

export async function GET() { return Response.json(contract, { headers: { "cache-control": "public, max-age=3600" } }); }

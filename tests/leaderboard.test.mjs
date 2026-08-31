import assert from "node:assert/strict";
import test from "node:test";
import { rankRegistry } from "../app/wanted-10k/leaderboard/registry.ts";

const hash = prefix => `${prefix}${"0123456789abcdef".repeat(4)}`.slice(0,64);
const entry = (submission_id, public_label, wanted_score, overrides = {}) => ({
  registry_profile_version: "0.2-L1", submission_id, study_id: `study-${submission_id}`, cohort_id: `cohort-${submission_id}`, public_label, manufacturer: "Example Robotics", model: "H1", hardware_version: "1.0", policy_version: "1.0", policy_artifact_sha256: hash("a1"), certifications: ["PREQUALIFIED", "WANTED_LAB", "WANTED_WILD"], registry_status: "active", wanted_score, ci95_lower: Math.max(0, wanted_score - 5), ci95_upper: Math.min(100, wanted_score + 5), survival_at_10000: .6, independent_environments: 24, total_resident_hours: 120000, support_at_10000: 8, censoring_bound_width: 12.4, assistance_minutes_per_100_hours: 18.2, human_measure_completion_rate: .92, human_keep_rate: .84, human_value_median: 1, human_burden_median: 1, human_trust_median: 3, revealed_preference: { status: "not_run" }, mean_time_between_human_rescue_hours: 428.57, mean_time_between_human_rescue_lower_bound_hours: null, l4_incidents: 0, safety_gate_status: "passed", audit_manifest_uri: `https://example.org/${submission_id}.json`, audit_manifest_sha256: hash("b2"), audit_signed_at: "2026-08-28T18:00:00Z", published_at: "2026-08-28T19:00:00Z", supersedes_submission_id: null, ...overrides,
});

test("ranks by displayed W and preserves competition ties", () => {
  const result = rankRegistry([entry("s1", "Zulu", 74.64), entry("s2", "Alpha", 74.61), entry("s3", "Beta", 73.94)]);
  assert.deepEqual(result.ranked.map(row => [row.public_label, row.displayed_wanted_score, row.rank, row.tied]), [["Alpha",74.6,1,true],["Zulu",74.6,1,true],["Beta",73.9,3,false]]);
  assert.equal(result.excluded.length, 0);
});

test("does not use safety, burden, preference value, or badges as tiebreakers", () => {
  const preference={status:"passed",profile_version:"0.2-RP1",currency:"USD",unit_amount:25,completed_choices_at_10000:8,reservation_median_lower_units:4,reservation_median_upper_units:32,manifest_uri:"https://example.org/preference.json",manifest_sha256:hash("c3")};
  const result = rankRegistry([entry("s1", "Alpha", 80.01, { assistance_minutes_per_100_hours: 200, human_keep_rate: .2, revealed_preference: preference }), entry("s2", "Beta", 80.04, { assistance_minutes_per_100_hours: 1, human_keep_rate: 1, certifications: ["PREQUALIFIED", "WANTED_LAB", "WANTED_WILD", "WANTED_10K"] })]);
  assert.deepEqual(result.ranked.map(row => [row.public_label,row.rank]), [["Alpha",1],["Beta",1]]);
});

test("excludes non-WILD, unsafe, and ambiguous active revisions", () => {
  const lab = entry("lab", "Lab only", 90, { certifications: ["PREQUALIFIED", "WANTED_LAB"] });
  const unsafe = entry("unsafe", "Unsafe", 95, { l4_incidents: 1 });
  const duplicateA = entry("dup-a", "Duplicate A", 70, { study_id: "shared", cohort_id: "shared" });
  const duplicateB = entry("dup-b", "Duplicate B", 71, { study_id: "shared", cohort_id: "shared" });
  const result = rankRegistry([lab, unsafe, duplicateA, duplicateB]);
  assert.equal(result.ranked.length, 0);
  assert.equal(result.excluded.length, 4);
  assert.match(result.excluded.find(row => row.submission_id === "lab").reasons.join(" "), /WANTED_WILD/);
  assert.match(result.excluded.find(row => row.submission_id === "unsafe").reasons.join(" "), /safety gate/);
  assert.match(result.excluded.find(row => row.submission_id === "dup-a").reasons.join(" "), /Multiple active revisions/);
});

test("requires a coherent optional revealed-preference disclosure",()=>{
  const malformed=entry("bad-preference","Bad preference",75,{revealed_preference:{status:"passed",profile_version:"0.2-RP1",currency:"USD",unit_amount:25,completed_choices_at_10000:3,reservation_median_lower_units:8,reservation_median_upper_units:4,manifest_uri:"https://example.org/preference.json",manifest_sha256:hash("c3")}});
  const result=rankRegistry([malformed]);
  assert.equal(result.ranked.length,0);
  assert.match(result.excluded[0].reasons.join(" "),/coherent 10K set bounds/);
});

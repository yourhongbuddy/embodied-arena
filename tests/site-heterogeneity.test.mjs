import assert from "node:assert/strict";
import test from "node:test";
import {
  SITE_HETEROGENEITY_VERSION,
  assessSiteHeterogeneity,
  reproduceSiteHeterogeneity,
  siteHeterogeneityContract,
  siteHeterogeneitySchema,
  siteHeterogeneityTemplate,
} from "../app/wanted-10k/site-heterogeneity/profile.ts";

const clone = value => structuredClone(value);
const gate = (result, id) => result.gates.find(item => item.id === id);

test("reproduces pooled, site-specific, and leave-one-site-out W exactly", () => {
  const result = assessSiteHeterogeneity(siteHeterogeneityTemplate);
  assert.equal(result.status, "passed", JSON.stringify(result));
  assert.equal(result.gates.length, 7);
  assert.equal(result.summary.environment_count, 24);
  assert.equal(result.summary.site_count, 3);
  assert.equal(result.summary.smallest_site_n, 8);
  assert.equal(result.summary.maximum_site_share, 0.333333333);
  assert.equal(result.summary.pooled_wanted_score, 87.5);
  assert.equal(result.summary.pooled_survival_at_10000, 0.833333333);
  assert.equal(result.summary.site_wanted_min, 81.25);
  assert.equal(result.summary.site_wanted_max, 90.625);
  assert.equal(result.summary.site_wanted_range, 9.375);
  assert.equal(result.summary.leave_one_site_out_maximum_absolute_shift, 3.125);
  assert.equal(result.summary.leave_one_site_out_unidentifiable, 0);
});

test("fails single-site dominance, token sites, and post-outcome topology drift", () => {
  const manifest = clone(siteHeterogeneityTemplate);
  manifest.records.slice(0, 18).forEach(record => { record.site_id = "site_alpha"; });
  manifest.claimed = reproduceSiteHeterogeneity(manifest.records);
  const result = assessSiteHeterogeneity(manifest);
  assert.equal(result.status, "failed");
  assert.equal(gate(result, "SH2").passed, false);
  assert.ok(result.summary.maximum_site_share > 0.5);

  const late = clone(siteHeterogeneityTemplate);
  late.design.frozen_at = late.design.first_benchmark_activity_at;
  assert.equal(gate(assessSiteHeterogeneity(late), "SH1").passed, false);
});

test("fails altered pooled, site, and site-exclusion claims independently", () => {
  const pooled = clone(siteHeterogeneityTemplate);
  pooled.claimed.pooled_wanted_score += 1;
  assert.equal(gate(assessSiteHeterogeneity(pooled), "SH4").passed, false);

  const site = clone(siteHeterogeneityTemplate);
  site.claimed.site_profiles[0].wanted_score += 1;
  assert.equal(gate(assessSiteHeterogeneity(site), "SH5").passed, false);

  const loo = clone(siteHeterogeneityTemplate);
  loo.claimed.leave_one_site_out[0].shift_from_pooled += 1;
  assert.equal(gate(assessSiteHeterogeneity(loo), "SH6").passed, false);
});

test("preserves unsupported site tails as null without extrapolation", () => {
  const manifest = clone(siteHeterogeneityTemplate);
  const gammaCompletion = manifest.records.find(record => record.site_id === "site_gamma" && record.disposition === "completed");
  gammaCompletion.disposition = "unrelated_censor";
  gammaCompletion.resident_hours = 5_000;
  manifest.claimed = reproduceSiteHeterogeneity(manifest.records);
  const result = assessSiteHeterogeneity(manifest);
  assert.equal(result.status, "passed", JSON.stringify(result));
  const gamma = result.summary.site_profiles.find(profile => profile.site_id === "site_gamma");
  assert.equal(gamma.horizon_identifiable, false);
  assert.equal(gamma.wanted_score, null);
  assert.equal(gamma.survival_at_10000, null);
  assert.equal(result.summary.identifiable_site_count, 2);
});

test("rejects invalid endpoints, raw site labels, and unbound evidence", () => {
  const terminal = clone(siteHeterogeneityTemplate);
  terminal.records[0].disposition = "safety_termination";
  assert.equal(gate(assessSiteHeterogeneity(terminal), "SH3").passed, false);

  const rawLabel = clone(siteHeterogeneityTemplate);
  rawLabel.records[0].site_id = "123 Main Street";
  assert.equal(gate(assessSiteHeterogeneity(rawLabel), "SH3").passed, false);

  const evidence = clone(siteHeterogeneityTemplate);
  evidence.bindings.endpoint_table_sha256 = "placeholder";
  assert.equal(gate(assessSiteHeterogeneity(evidence), "SH7").passed, false);
});

test("publishes a strict non-ranking site heterogeneity contract", () => {
  assert.equal(SITE_HETEROGENEITY_VERSION, "0.2-SH1");
  assert.equal(siteHeterogeneitySchema.additionalProperties, false);
  assert.equal(siteHeterogeneitySchema.properties.design.properties.maximum_site_share.const, 0.5);
  assert.equal(siteHeterogeneitySchema.properties.records.minItems, 20);
  assert.equal(siteHeterogeneityContract.ranking_effect, "eligibility_gate_and_public_diagnostic_not_score_or_tiebreaker");
  assert.ok(siteHeterogeneityContract.forbidden_uses.includes("site_metric_as_tiebreaker"));
});

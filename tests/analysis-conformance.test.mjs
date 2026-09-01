import assert from "node:assert/strict";
import test from "node:test";
import {
  ANALYSIS_CONFORMANCE_VERSION,
  analysisConformancePack,
  analysisConformanceSchema,
} from "../app/wanted-10k/analysis-conformance/vectors.ts";
import {
  bootstrap,
  robustness,
  score,
  validateRows,
} from "../app/wanted-10k/calculator/scoring.ts";

const tolerance = analysisConformancePack.numerical_tolerance;
const close = (actual, expected) => Math.abs(actual - expected) <= tolerance;
const rowsFor = (vector) => vector.records.map((record, index) => ({
  id: index + 1,
  environment: record.environment,
  hours: record.resident_hours,
  outcome: record.disposition,
}));

test("reproduces every normative A2 analysis conformance vector", () => {
  for (const vector of analysisConformancePack.vectors) {
    const rows = rowsFor(vector);
    const errors = validateRows(rows);
    if (vector.expected.status === "fail") {
      if (vector.expected.error_code === "invalid_horizon_censor") {
        assert.match(errors.join(" "), /observed through 10000 hours must be completed/, vector.id);
      } else if(vector.expected.error_code === "terminal_competing_cause") {
        assert.match(errors.join(" "),/terminal competing cause/,vector.id);
      } else if(vector.expected.error_code === "duplicate_environment") {
        assert.match(errors.join(" "),/duplicate environment identifier/,vector.id);
      } else if(vector.expected.error_code === "invalid_completion") {
        assert.match(errors.join(" "),/completion requires exactly 10000 resident hours/,vector.id);
      } else {
        assert.equal(errors.length, 0, vector.id);
        const primary = score(rows);
        assert.equal(primary.wanted, null, vector.id);
        assert.equal(primary.identifiable, false, vector.id);
      }
      continue;
    }

    assert.equal(errors.length, 0, vector.id);
    const primary = score(rows);
    const robust = robustness(rows);
    assert.ok(primary.wanted !== null && close(primary.wanted, vector.expected.wanted_score), vector.id);
    assert.ok(primary.survival10k !== null && close(primary.survival10k, vector.expected.survival_at_10000), vector.id);
    assert.equal(robust.support.at_risk_10000, vector.expected.support_at_10000, vector.id);
    assert.equal(robust.support.horizon_rejections, vector.expected.horizon_rejections, vector.id);
    assert.equal(robust.support.retained_at_10000, vector.expected.retained_at_10000, vector.id);
    assert.equal(
      robust.support.at_risk_10000,
      robust.support.horizon_rejections + robust.support.retained_at_10000,
      vector.id,
    );

    if (vector.expected.ci95) {
      const result = bootstrap(
        rows,
        analysisConformancePack.bootstrap.samples,
        analysisConformancePack.bootstrap.seed,
      );
      assert.ok(result.interval, vector.id);
      assert.ok(close(result.interval[0], vector.expected.ci95[0]), vector.id);
      assert.ok(close(result.interval[1], vector.expected.ci95[1]), vector.id);
      assert.ok(close(result.validFraction, vector.expected.bootstrap_valid_fraction), vector.id);
    }
  }
});

test("publishes a strict, unique, self-contained conformance pack", () => {
  assert.equal(ANALYSIS_CONFORMANCE_VERSION, "0.2-AC3");
  assert.equal(analysisConformancePack.analysis_profile_version, "0.2-A2");
  assert.equal(analysisConformancePack.vectors.length, 8);
  assert.equal(
    new Set(analysisConformancePack.vectors.map((vector) => vector.id)).size,
    analysisConformancePack.vectors.length,
  );
  assert.equal(analysisConformanceSchema.additionalProperties, false);
  assert.equal(analysisConformanceSchema.properties.vectors.minItems, 8);
  assert.equal(analysisConformanceSchema.properties.bootstrap.properties.prng.const, "pcg32_xsh_rr_64_32_seeded_v1");
});

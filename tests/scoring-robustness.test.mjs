import assert from "node:assert/strict";
import test from "node:test";
import { bootstrap, robustness, score, validateRows } from "../app/wanted-10k/calculator/scoring.ts";

const fragile = [
  { id: 1, environment: "ENV-A", hours: 10000, outcome: "completed" },
  { id: 2, environment: "ENV-B", hours: 1000, outcome: "unrelated_censor" },
  { id: 3, environment: "ENV-C", hours: 2000, outcome: "unrelated_censor" },
];

test("exposes a wide censoring envelope and tail dependence", () => {
  const primary = score(fragile);
  const robust = robustness(fragile);
  assert.equal(primary.wanted, 100);
  assert.equal(robust.bounds.upper, 100);
  assert.ok(robust.bounds.lower < primary.wanted);
  assert.equal(robust.bounds.early_exits, 2);
  assert.equal(robust.support.at_risk_10000, 1);
  assert.equal(robust.influence.unidentifiable_exclusions, 1);
});

test("bounds collapse when every outcome is observed through rejection or completion", () => {
  const rows = [
    { id: 1, environment: "ENV-A", hours: 10000, outcome: "completed" },
    { id: 2, environment: "ENV-B", hours: 5000, outcome: "rejected" },
  ];
  const primary = score(rows);
  const robust = robustness(rows);
  assert.equal(robust.bounds.lower, primary.wanted);
  assert.equal(robust.bounds.upper, primary.wanted);
  assert.equal(robust.bounds.width, 0);
});

test("rejects invalid completion records and preserves bootstrap resampling", () => {
  const invalid = [{ id: 1, environment: "ENV-A", hours: 9999, outcome: "completed" }];
  assert.match(validateRows(invalid).join(" "), /exactly 10000/);
  assert.equal(score(invalid).wanted, null);
  const resampled = bootstrap([...fragile, { id: 4, environment: "ENV-D", hours: 10000, outcome: "completed" }], 1000);
  assert.ok(resampled.validFraction > 0);
});

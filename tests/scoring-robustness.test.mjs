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

test("keeps W unchanged but applies an exact-horizon rejection to S(10K)", () => {
  const rows = [
    { id: 1, environment: "ENV-A", hours: 10000, outcome: "completed" },
    { id: 2, environment: "ENV-B", hours: 10000, outcome: "rejected" },
  ];
  const primary = score(rows);
  const robust = robustness(rows);
  assert.equal(primary.wanted, 100);
  assert.equal(primary.survival10k, .5);
  assert.equal(robust.support.at_risk_10000, 2);
  assert.equal(robust.support.horizon_rejections, 1);
  assert.equal(robust.support.retained_at_10000, 1);
});

test("rejects invalid completion records and preserves bootstrap resampling", () => {
  const invalid = [{ id: 1, environment: "ENV-A", hours: 9999, outcome: "completed" }];
  assert.match(validateRows(invalid).join(" "), /exactly 10000/);
  assert.equal(score(invalid).wanted, null);
  assert.match(validateRows([{ id: 1, environment: "ENV-A", hours: 10000, outcome: "unrelated_censor" }]).join(" "), /must be completed/);
  const resampled = bootstrap([...fragile, { id: 4, environment: "ENV-D", hours: 10000, outcome: "completed" }], 1000);
  assert.ok(resampled.validFraction > 0);
});

test("rejects padded environment identifiers before scoring or resampling", () => {
  const padded = [{ id: 1, environment: " ENV-A ", hours: 10000, outcome: "completed" }];
  assert.match(validateRows(padded).join(" "), /must not have leading or trailing whitespace/);
  assert.equal(score(padded).wanted, null);
  assert.equal(bootstrap(padded, 1000).interval, null);
  assert.equal(robustness(padded).bounds, null);
});

test("refuses primary W for every terminal competing cause",()=>{
  for(const outcome of ["safety_termination","developer_withdrawal","consent_privacy_withdrawal"]){
    const rows=[{id:1,environment:"ENV-A",hours:10000,outcome:"completed"},{id:2,environment:"ENV-B",hours:5000,outcome}];
    assert.match(validateRows(rows).join(" "),/terminal competing cause/);
    assert.equal(score(rows).wanted,null);
    assert.equal(bootstrap(rows,1000).interval,null);
    assert.equal(robustness(rows).bounds,null);
  }
});

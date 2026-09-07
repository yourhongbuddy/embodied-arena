import assert from "node:assert/strict";
import test from "node:test";
import { benchmarkCsv, importBenchmarkCsv, starterBenchmark, validateBenchmark } from "../app/studio/contract.ts";
import { renderBenchmarkSvg } from "../app/studio/chart.ts";

test("benchmark validation rejects duplicate identifiers, prototype keys, unknown metrics, and nonfinite scores", () => {
  const doc = structuredClone(starterBenchmark);
  assert.equal(validateBenchmark(doc).ok, true);
  doc.rows[0].values.success = Infinity; assert.equal(validateBenchmark(doc).ok, false);
  doc.rows[0].values.success = -12; assert.equal(validateBenchmark(doc).ok, true);
  doc.metrics[0].id = "constructor"; assert.equal(validateBenchmark(doc).ok, false);
  doc.metrics[0].id = "latency"; assert.equal(validateBenchmark(doc).ok, false);
  doc.metrics[0].id = "success"; doc.rows[0].values.unknown = 1; assert.equal(validateBenchmark(doc).ok, false);
});
test("CSV import handles quotes, multiline text, zeros, negatives, and missing values", () => {
  const doc = importBenchmarkCsv('System,Score,Time\r\n"Robot, A",0,12\r\n"Robot ""B""",-3,\r\n"Robot\nC",4,7');
  assert.equal(doc.rows[0].label, "Robot, A"); assert.equal(doc.rows[0].values.m1, 0);
  assert.equal(doc.rows[1].label, 'Robot "B"'); assert.equal(doc.rows[1].values.m1, -3); assert.equal(doc.rows[1].values.m2, null);
  assert.equal(doc.rows[2].label, "Robot\nC");
  assert.throws(() => importBenchmarkCsv("System,Score\nA,NaN"));
  assert.throws(() => importBenchmarkCsv('System,Score\n"A,1'));
  assert.throws(() => importBenchmarkCsv("System,Score,score\nA,1,2"));
  assert.throws(() => importBenchmarkCsv("System,Score\nA,1,2"));
});
test("CSV export neutralizes spreadsheet formulas while preserving numeric values", () => {
  const doc = structuredClone(starterBenchmark); doc.rows[0].label = '=HYPERLINK("https://example.com")'; doc.rows[0].values.success = -3;
  const csv = benchmarkCsv(doc); assert.match(csv, /'=HYPERLINK/); assert.match(csv, /,-3,12.4/);
});
test("charts escape user markup and keep negative, missing, and equal-valued data finite", () => {
  const doc = structuredClone(starterBenchmark); doc.title = '<script>alert("bad")</script>'; doc.rows[0].label = '</text><script>x</script>';
  doc.rows[0].values.success = -4; doc.rows[1].values.success = null; doc.rows[2].values.success = 0;
  const svg = renderBenchmarkSvg(doc); assert.doesNotMatch(svg, /<script>|NaN|Infinity/); assert.match(svg, /&lt;script&gt;/); assert.match(svg, /No data/);
  doc.chart.type = "line"; assert.doesNotMatch(renderBenchmarkSvg(doc), /<polyline/);
  doc.chart = { type: "scatter", metric: "success", xMetric: "latency" };
  doc.rows[0].values.latency = doc.rows[2].values.latency = 5;
  assert.doesNotMatch(renderBenchmarkSvg(doc), /NaN|Infinity/);
  doc.rows = []; assert.match(renderBenchmarkSvg(doc), /Add numeric results/);
});

test("machine documents reject coerced arrays, objects, and blank strings at the validation boundary", () => {
  for (const mutate of [
    doc => { doc.metrics[0].direction = ["higher"]; },
    doc => { doc.chart.type = ["bar"]; },
    doc => { doc.chart.type = { toString: "bar" }; },
    doc => { doc.chart.metric = ["success"]; },
    doc => { doc.chart = { type: "scatter", metric: "success", xMetric: ["latency"] }; },
    doc => { doc.chart.xMetric = 4; },
    doc => { doc.rows[0].values.success = ""; },
  ]) {
    const doc = structuredClone(starterBenchmark); mutate(doc);
    assert.equal(validateBenchmark(doc).ok, false, JSON.stringify(doc));
  }
});

test("Unicode labels remain valid in previews and exports and XML-invalid characters are rejected", () => {
  const doc = structuredClone(starterBenchmark);
  doc.title = `Title ${"🤖".repeat(52)}`;
  doc.rows[0].label = `X${"🤖".repeat(22)}`;
  assert.equal(validateBenchmark(doc).ok, true);
  const svg = renderBenchmarkSvg(doc);
  assert.doesNotThrow(() => encodeURIComponent(svg));
  assert.equal(svg.isWellFormed(), true);
  for (const invalid of ["\uFFFE", "\uFFFF", "\uD800"]) {
    doc.title = `Invalid ${invalid}`;
    assert.equal(validateBenchmark(doc).ok, false);
  }
});

test("tiny nonzero scores are legible as scientific notation instead of zero", () => {
  const doc = structuredClone(starterBenchmark);
  doc.rows[0].values.success = 0.000001;
  doc.rows[1].values.success = -0.000002;
  doc.rows[2].values.success = 0;
  const svg = renderBenchmarkSvg(doc);
  assert.match(svg, />1E-6<\/text>/);
  assert.match(svg, />-2E-6<\/text>/);
  assert.match(svg, />0<\/text>/);
});

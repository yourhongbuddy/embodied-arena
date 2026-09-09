export const BENCHMARK_LIMITS = { rows: 500, metrics: 12, bytes: 512_000, title: 120, description: 4_000 } as const;
export type MetricDefinition = { id: string; name: string; unit: string; direction: "higher" | "lower" };
export type BenchmarkRow = { id: string; label: string; values: Record<string, number | null> };
export type ChartDefinition = { type: "bar" | "line" | "scatter"; metric: string; xMetric?: string };
export type BenchmarkDocument = { schemaVersion: 1; title: string; description: string; methodology: string; evidence: "example" | "self-reported"; metrics: MetricDefinition[]; rows: BenchmarkRow[]; chart: ChartDefinition };
export type StoredBenchmark = { id: string; version: number; createdAt: string; updatedAt: string; document: BenchmarkDocument };
export type ValidationResult = { ok: true; document: BenchmarkDocument } | { ok: false; errors: string[] };

function object(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function text(value: unknown, max: number, empty = false): value is string {
  return typeof value === "string" && value.length <= max && (empty || value.trim().length > 0) && ![...value].some(char => {
    const point = char.codePointAt(0)!;
    return (point < 32 && ![9, 10, 13].includes(point)) || (point >= 0xd800 && point <= 0xdfff) || point === 0xfffe || point === 0xffff;
  });
}
const identifier = /^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/;
const forbiddenIds = new Set(["__proto__", "constructor", "prototype"]);
function id(value: unknown): value is string { return typeof value === "string" && identifier.test(value) && !forbiddenIds.has(value); }

/** Every human, REST, and MCP write passes the same strict boundary. Unknown fields never survive. */
export function validateBenchmark(value: unknown): ValidationResult {
  if (!object(value)) return { ok: false, errors: ["A benchmark must be a JSON object."] };
  const errors: string[] = [];
  const keys = new Set(["schemaVersion", "title", "description", "methodology", "evidence", "metrics", "rows", "chart"]);
  if (Object.keys(value).some(key => !keys.has(key))) errors.push("The document contains unsupported fields.");
  if (value.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (!text(value.title, BENCHMARK_LIMITS.title)) errors.push("Give the benchmark a title of 1–120 characters.");
  if (!text(value.description, BENCHMARK_LIMITS.description, true)) errors.push("Description must be text with at most 4,000 characters.");
  if (!text(value.methodology, BENCHMARK_LIMITS.description, true)) errors.push("Methodology must be text with at most 4,000 characters.");
  if (value.evidence !== "example" && value.evidence !== "self-reported") errors.push("Evidence must be example or self-reported.");
  const metrics: MetricDefinition[] = [];
  if (!Array.isArray(value.metrics) || value.metrics.length < 1 || value.metrics.length > BENCHMARK_LIMITS.metrics) errors.push("Define between 1 and 12 metrics.");
  else for (const [index, entry] of value.metrics.entries()) {
    if (!object(entry) || Object.keys(entry).some(key => !["id", "name", "unit", "direction"].includes(key)) || !id(entry.id) || !text(entry.name, 80) || !text(entry.unit, 30, true) || (entry.direction !== "higher" && entry.direction !== "lower")) { errors.push(`Metric ${index + 1} needs a valid id, name, unit, and direction.`); continue; }
    if (metrics.some(metric => metric.id === entry.id)) errors.push(`Metric id “${entry.id}” is duplicated.`);
    metrics.push({ id: entry.id, name: entry.name.trim(), unit: entry.unit.trim(), direction: entry.direction as MetricDefinition["direction"] });
  }
  const metricIds = new Set(metrics.map(metric => metric.id));
  const rows: BenchmarkRow[] = [];
  const rowIds = new Set<string>();
  if (!Array.isArray(value.rows) || value.rows.length > BENCHMARK_LIMITS.rows) errors.push("A benchmark supports up to 500 results.");
  else for (const [index, entry] of value.rows.entries()) {
    if (!object(entry) || Object.keys(entry).some(key => !["id", "label", "values"].includes(key)) || !id(entry.id) || !text(entry.label, 120) || !object(entry.values)) { errors.push(`Result ${index + 1} needs an id, label, and metric values.`); continue; }
    if (rowIds.has(entry.id)) errors.push(`Result id “${entry.id}” is duplicated.`);
    rowIds.add(entry.id);
    const values: Record<string, number | null> = {};
    if (Object.keys(entry.values).some(key => !metricIds.has(key))) errors.push(`Result ${index + 1} includes an unknown metric.`);
    for (const metric of metrics) {
      const score = entry.values[metric.id];
      if (score === null || score === undefined) values[metric.id] = null;
      else if (typeof score !== "number" || !Number.isFinite(score) || Math.abs(score) > 1e12) errors.push(`Result ${index + 1}, ${metric.name}: use a finite number between −1 trillion and 1 trillion, or leave it blank.`);
      else values[metric.id] = score;
    }
    rows.push({ id: entry.id, label: entry.label.trim(), values });
  }
  const chart = value.chart;
  if (!object(chart) || Object.keys(chart).some(key => !["type", "metric", "xMetric"].includes(key))
    || (chart.type !== "bar" && chart.type !== "line" && chart.type !== "scatter")
    || typeof chart.metric !== "string" || !metricIds.has(chart.metric)
    || (chart.xMetric !== undefined && (typeof chart.xMetric !== "string" || !metricIds.has(chart.xMetric)))
    || (chart.type === "scatter" && (chart.xMetric === undefined || chart.xMetric === chart.metric))) errors.push("Choose a valid chart and metric; scatter plots need two different metrics.");
  if (errors.length) return { ok: false, errors: errors.slice(0, 20) };
  const validChart = chart as Record<string, string>;
  return { ok: true, document: { schemaVersion: 1, title: (value.title as string).trim(), description: (value.description as string).trim(), methodology: (value.methodology as string).trim(), evidence: value.evidence as BenchmarkDocument["evidence"], metrics, rows, chart: { type: validChart.type as ChartDefinition["type"], metric: validChart.metric, ...(validChart.type === "scatter" ? { xMetric: validChart.xMetric } : {}) } } };
}

export const starterBenchmark: BenchmarkDocument = {
  schemaVersion: 1, title: "Pick-and-place evaluation", description: "Compare three robot systems on the same task.",
  methodology: "Example only. Replace these values with your own measurements and describe the task, hardware, number of trials, and evaluation conditions.", evidence: "example",
  metrics: [{ id: "success", name: "Task success", unit: "%", direction: "higher" }, { id: "latency", name: "Completion time", unit: "s", direction: "lower" }],
  rows: [{ id: "r1", label: "System A", values: { success: 84, latency: 12.4 } }, { id: "r2", label: "System B", values: { success: 76, latency: 9.8 } }, { id: "r3", label: "System C", values: { success: 91, latency: 17.2 } }],
  chart: { type: "bar", metric: "success" },
};

/** RFC 4180 quoting, plus spreadsheet-formula neutralization for text cells. */
function csvCell(value: string | number | null) {
  if (value === null) return "";
  let string = String(value);
  if (typeof value === "string" && /^[\s]*[=+@-]/.test(string)) string = `'${string}`;
  return /[",\r\n]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
}
export function benchmarkCsv(document: BenchmarkDocument): string {
  return [["System", ...document.metrics.map(metric => metric.name)], ...document.rows.map(row => [row.label, ...document.metrics.map(metric => row.values[metric.id])])].map(row => row.map(csvCell).join(",")).join("\r\n");
}

export function readCsv(source: string): string[][] {
  if (new TextEncoder().encode(source).length > BENCHMARK_LIMITS.bytes) throw new Error("CSV must be smaller than 512 KB.");
  const rows: string[][] = []; let row: string[] = [], field = "", quoted = false, closed = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) { if (char === '"') { if (source[i + 1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; } } else field += char; continue; }
    if (char === '"') { if (field || closed) throw new Error("CSV contains an unexpected quote."); quoted = true; }
    else if (char === ",") { row.push(field); field = ""; closed = false; }
    else if (char === "\r" || char === "\n") { if (char === "\r" && source[i + 1] === "\n") i++; row.push(field); if (row.some(cell => cell.trim())) rows.push(row); row = []; field = ""; closed = false; }
    else { if (closed) throw new Error("Unexpected text after a quoted CSV field."); field += char; }
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  row.push(field); if (row.some(cell => cell.trim())) rows.push(row);
  return rows;
}

export function importBenchmarkCsv(source: string, title = "Imported benchmark"): BenchmarkDocument {
  const [header, ...records] = readCsv(source.replace(/^\uFEFF/, ""));
  if (!header || header.length < 2 || header.length > BENCHMARK_LIMITS.metrics + 1) throw new Error("Use a label column followed by 1–12 numeric metric columns.");
  if (header.some(name => !name.trim())) throw new Error("Every CSV column needs a name.");
  if (new Set(header.map(name => name.trim().toLowerCase())).size !== header.length) throw new Error("CSV column names must be unique.");
  const metrics: MetricDefinition[] = header.slice(1).map((name, index) => ({ id: `m${index + 1}`, name: name.trim(), unit: "", direction: "higher" }));
  const rows = records.map((record, index) => {
    if (record.length !== header.length) throw new Error(`CSV row ${index + 2} has ${record.length} fields; expected ${header.length}.`);
    return { id: `r${index + 1}`, label: record[0].trim(), values: Object.fromEntries(metrics.map((metric, column) => {
      const raw = record[column + 1].trim();
      if (raw && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw)) throw new Error(`CSV row ${index + 2}, ${metric.name}: “${raw}” is not a number.`);
      return [metric.id, raw === "" ? null : Number(raw)];
    })) };
  });
  const result = validateBenchmark({ schemaVersion: 1, title, description: "", methodology: "", evidence: "self-reported", metrics, rows, chart: { type: "bar", metric: metrics[0].id } });
  if (!result.ok) throw new Error(result.errors.join(" "));
  return result.document;
}

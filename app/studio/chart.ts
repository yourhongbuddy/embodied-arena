import { validateBenchmark, type BenchmarkDocument } from "./contract.ts";

const escapeXml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const number = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 3, notation: value !== 0 && Math.abs(value) < 0.001 ? "scientific" : Math.abs(value) >= 1e6 ? "compact" : "standard" }).format(value === 0 ? 0 : value);
function truncate(value: string, limit: number) {
  if (value.length <= limit) return value;
  let shortened = "";
  for (const char of value) { if (shortened.length + char.length >= limit) break; shortened += char; }
  return `${shortened}…`;
}
function extent(values: number[], zero: boolean): [number, number] {
  let min = Math.min(...values), max = Math.max(...values);
  if (zero) { min = Math.min(0, min); max = Math.max(0, max); }
  if (min === max) { const offset = Math.abs(min) * 0.1 || 1; return zero && min === 0 ? [0, 1] : [min - offset, max + offset]; }
  const margin = (max - min) * .08;
  return [min < 0 || !zero ? min - margin : min, max > 0 || !zero ? max + margin : max];
}

/** A standalone, script-free SVG. All strings are escaped; missing data never becomes zero. */
export function renderBenchmarkSvg(input: BenchmarkDocument): string {
  const validation = validateBenchmark(input);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  const doc = validation.document, metric = doc.metrics.find(item => item.id === doc.chart.metric)!;
  const xMetric = doc.metrics.find(item => item.id === doc.chart.xMetric);
  const scatter = doc.chart.type === "scatter";
  const drawable = doc.rows.filter(row => row.values[metric.id] !== null && (!scatter || (xMetric && row.values[xMetric.id] !== null)));
  const resultLabels = doc.rows.map(row => truncate(row.label, 24));
  // Reserve the rotated labels' full bounds, including the final result. A
  // character-wide font allowance also accommodates wide and Unicode labels.
  const labelWidth = scatter ? 0 : Math.max(0, ...resultLabels.map(value => [...value].length * 13));
  const rightPadding = Math.max(40, Math.ceil(labelWidth * Math.cos(Math.PI / 6) + 16));
  const width = Math.max(960, !scatter ? Math.min(16000, doc.rows.length * 65 + 95 + rightPadding) : 960);
  const height = Math.max(560, Math.ceil(395 + 46 + labelWidth * Math.sin(Math.PI / 6) + 13 + 48));
  const left = 95, right = width - rightPadding, top = 110, bottom = 395, plotWidth = right - left;
  const title = escapeXml(doc.title), displayTitle = escapeXml(truncate(doc.title, Math.floor((width - left - 40) / 14))), label = escapeXml(`${metric.name}${metric.unit ? ` (${metric.unit})` : ""}`);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title chart-desc"><title id="chart-title">${title} — ${label}</title><desc id="chart-desc">${escapeXml(doc.chart.type)} chart. ${doc.evidence === "example" ? "Example data." : "Self-reported data; not independently verified."} ${drawable.length} plotted results; ${doc.rows.length - drawable.length} missing results omitted. ${metric.direction === "higher" ? "Higher" : "Lower"} is better.</desc><rect width="100%" height="100%" fill="#ffffff"/><g font-family="Arial,Helvetica,sans-serif" fill="#17271c"><text x="${left}" y="40" font-size="24" font-weight="700">${displayTitle}</text><text x="${left}" y="69" font-size="14" fill="#53675a">${label} · ${metric.direction === "higher" ? "Higher" : "Lower"} is better · ${doc.evidence === "example" ? "EXAMPLE DATA" : "SELF-REPORTED"}</text>`;
  if (!drawable.length) return `${svg}<text x="${left}" y="250" font-size="18">Add numeric results to draw this chart.</text></g></svg>`;
  const [yMin, yMax] = extent(drawable.map(row => row.values[metric.id]!), !scatter && doc.chart.type === "bar");
  const y = (value: number) => bottom - (value - yMin) / (yMax - yMin) * (bottom - top);
  for (let i = 0; i <= 5; i++) { const value = yMin + (yMax - yMin) * i / 5, pos = y(value); svg += `<line x1="${left}" y1="${pos}" x2="${right}" y2="${pos}" stroke="#e0e7e0"/><text x="${left - 12}" y="${pos + 5}" text-anchor="end" font-size="13" fill="#53675a">${escapeXml(number(value))}</text>`; }
  if (scatter && xMetric) {
    const [xMin, xMax] = extent(drawable.map(row => row.values[xMetric.id]!), false);
    const x = (value: number) => left + (value - xMin) / (xMax - xMin) * plotWidth;
    for (let i = 0; i <= 5; i++) { const value = xMin + (xMax - xMin) * i / 5; svg += `<text x="${x(value)}" y="${bottom + 28}" font-size="13" text-anchor="middle">${escapeXml(number(value))}</text>`; }
    for (const row of drawable) svg += `<circle cx="${x(row.values[xMetric.id]!)}" cy="${y(row.values[metric.id]!)}" r="6" fill="#376542" fill-opacity=".8"><title>${escapeXml(row.label)}: ${escapeXml(xMetric.name)} ${escapeXml(number(row.values[xMetric.id]!))}; ${escapeXml(metric.name)} ${escapeXml(number(row.values[metric.id]!))}</title></circle>`;
    svg += `<text x="${(left + right) / 2}" y="${bottom + 63}" font-size="15" text-anchor="middle">${escapeXml(xMetric.name)}${xMetric.unit ? ` (${escapeXml(xMetric.unit)})` : ""}</text>`;
  } else {
    const slot = plotWidth / Math.max(doc.rows.length, 1), x = (index: number) => left + slot * (index + .5);
    let segment: string[] = [];
    const flush = () => { if (segment.length > 1) svg += `<polyline points="${segment.join(" ")}" fill="none" stroke="#376542" stroke-width="3"/>`; segment = []; };
    doc.rows.forEach((row, index) => {
      const score = row.values[metric.id];
      if (score === null) { flush(); svg += `<text x="${x(index)}" y="${bottom + 20}" text-anchor="middle" font-size="12" fill="#7a827b">No data</text>`; }
      else if (doc.chart.type === "bar") { const base = y(0), pos = y(score), barWidth = Math.min(56, slot * .65); svg += `<rect x="${x(index) - barWidth / 2}" y="${Math.min(base, pos)}" width="${barWidth}" height="${Math.max(1, Math.abs(base - pos))}" rx="3" fill="#376542"><title>${escapeXml(row.label)}: ${escapeXml(number(score))} ${escapeXml(metric.unit)}</title></rect><text x="${x(index)}" y="${score >= 0 ? pos - 9 : pos + 18}" text-anchor="middle" font-size="13" font-weight="700">${escapeXml(number(score))}</text>`; }
      else { segment.push(`${x(index)},${y(score)}`); svg += `<circle cx="${x(index)}" cy="${y(score)}" r="5" fill="#376542"><title>${escapeXml(row.label)}: ${escapeXml(number(score))}</title></circle>`; }
      const displayLabel = resultLabels[index];
      svg += `<text x="${x(index)}" y="${bottom + 46}" transform="rotate(30 ${x(index)} ${bottom + 46})" text-anchor="start" font-size="13">${escapeXml(displayLabel)}<title>${escapeXml(row.label)}</title></text>`;
    });
    flush();
  }
  svg += `<text x="${left}" y="${height - 25}" font-size="13" fill="#53675a">Robot Router · ${drawable.length} results plotted · Missing values omitted${doc.chart.type === "line" ? " · Lines follow table order; gaps are preserved" : ""}</text></g></svg>`;
  return svg;
}

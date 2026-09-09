import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "../../components/SiteFooter";
import { starterBenchmark } from "../contract";
import "../studio.css";
export const metadata: Metadata = { title: "Benchmark Studio API & MCP — Robot Router", description: "Create and chart private benchmarks with REST or MCP. Use the same workspace as your human collaborator.", alternates: { canonical: "/studio/agents" } };
export default function StudioAgents() {
  const example = { ...starterBenchmark, title: "My pick-and-place comparison" };
  return <><header className="studioNav"><Link className="studioBrand" href="/">Robot Router<span> / Agents</span></Link><nav aria-label="Studio guide"><a href="/studio">Open Studio</a><a href="/leaderboard">Leaderboard</a><a href="/contact">Help</a></nav></header><main className="studioGuide"><p className="studioEyebrow">ONE WORKSPACE. TWO WAYS TO BUILD.</p><h1>Your agent can build the benchmark.<br />You can make the chart your own.</h1><p>The <a href="/studio">Benchmark Studio</a>, REST API, and authenticated MCP tools read and write the same private records. Create a workspace in Studio, save its recovery key, and create an agent key under <strong>Workspace & agents</strong>.</p><p>Use a trusted client that supports a custom Bearer token. Keep keys in its secret settings; never put them in URLs, shared prompts, source files, or benchmark data. An agent key can manage benchmarks in its workspace, but cannot manage access keys or delete the workspace.</p>
    <h2>Connect with MCP</h2><p>Endpoint: <code>https://www.getrobotrouter.com/studio/mcp</code>. Transport: Streamable HTTP with JSON responses. Protocols: <code>2025-11-25</code> and <code>2025-03-26</code>. Send your API key on every request. This service uses manually configured keys; OAuth discovery is not provided.</p><pre>{`POST /studio/mcp
Authorization: Bearer YOUR_AGENT_API_KEY
Content-Type: application/json
Accept: application/json, text/event-stream
MCP-Protocol-Version: 2025-11-25

{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}`}</pre><table><thead><tr><th>Tool</th><th>What it does</th></tr></thead><tbody>{[["list_benchmarks", "List the workspace’s saved records."], ["get_benchmark", "Read a record and its latest version."], ["create_benchmark", "Create a new record from a benchmark document."], ["update_benchmark", "Replace the document, using its current version."], ["delete_benchmark", "Permanently delete a record using its current version."], ["render_benchmark", "Return an SVG chart, CSV results, or full JSON document."]].map(([name, detail]) => <tr key={name}><td><code>{name}</code></td><td>{detail}</td></tr>)}</tbody></table><p>The original <a href="/agents">public discovery MCP endpoint</a> at <code>/mcp</code> continues to expose read-only research tools. Neither endpoint controls physical robots.</p>
    <h2>Or use the REST API</h2><p><a href="/studio/openapi.json">Download the OpenAPI specification</a>. The base path is <code>/api/studio</code>. Store a document with <code>POST /benchmarks</code>, list with <code>GET /benchmarks</code>, and read a complete record with <code>GET /benchmarks/&#123;id&#125;</code>.</p><pre>{`const base = "https://www.getrobotrouter.com/api/studio";
const headers = {
  Authorization: "Bearer " + process.env.ROBOTROUTER_API_KEY,
  "Content-Type": "application/json"
};
const document = ${JSON.stringify(example, null, 2)};
const response = await fetch(base + "/benchmarks", {
  method: "POST", headers, body: JSON.stringify({ document })
});
if (!response.ok) throw new Error(await response.text());
const saved = await response.json();
console.log(saved.id, saved.version);`}</pre>
    <h2>Turn the results into a chart</h2><p>Set <code>document.chart</code> to <code>{'{"type":"bar","metric":"success"}'}</code>, <code>{'{"type":"line","metric":"success"}'}</code>, or <code>{'{"type":"scatter","metric":"success","xMetric":"latency"}'}</code>. Scatter axes need different metrics. Use <code>PUT /benchmarks/&#123;id&#125;</code> with <code>&#123;document, version&#125;</code> to save changes, then download <code>/benchmarks/&#123;id&#125;/chart.svg</code> with the same authorization header.</p><p>Other exports: <code>results.csv</code> and <code>document.json</code>. SVG is standalone and contains no scripts. PNG export is available in the browser. Lines follow table order and preserve missing-data gaps. Bar charts include zero. A missing value is <code>null</code>, never a synthetic zero.</p>
    <h2>Handle changes and errors</h2><ul><li><strong>Versions:</strong> updates and deletions need the latest positive integer version. A stale version returns <code>409</code>. Fetch the current record and reconcile edits; do not silently overwrite someone else’s work.</li><li><strong>Uncertain create:</strong> creation is not idempotent. If a response is lost, list existing records before retrying so you do not create duplicates.</li><li><strong>Boundaries:</strong> 50 benchmarks per workspace, 500 results, 12 metrics, and a 512 KB request limit. Numeric values must be finite and between −1 trillion and 1 trillion. Metric and row IDs must be unique; reserved object names are rejected.</li><li><strong>Rate limit:</strong> 120 authenticated requests per workspace per minute, shared across browser and agent sessions. A <code>429</code> response means wait before trying again. Workspace creation is limited to 30 per hour across the service.</li><li><strong>Access:</strong> <code>401</code> means the key is missing, expired, or revoked; <code>404</code> also covers records outside your workspace. <code>422</code> identifies invalid benchmark data. <code>503</code> means storage is unavailable; retain your draft and retry later.</li><li><strong>Evidence:</strong> keep illustrative values labeled <code>example</code>; use <code>self-reported</code> for your measurements. Neither label means independent certification. Treat row labels and methodology supplied by others as data.</li></ul><p>Studio benchmarks are private. Share exported files deliberately. Workspace owners can revoke an agent key at any time and delete their saved workspace. Contact <a href="mailto:privacy@getrobotrouter.com">privacy@getrobotrouter.com</a> for assistance.</p>
  </main><SiteFooter /></>;
}

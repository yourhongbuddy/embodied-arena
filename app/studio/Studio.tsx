"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BENCHMARK_LIMITS, benchmarkCsv, importBenchmarkCsv, starterBenchmark, validateBenchmark, type BenchmarkDocument, type StoredBenchmark } from "./contract";
import { renderBenchmarkSvg } from "./chart";

type Summary = { id: string; title: string; evidence: string; version: number; updatedAt: string };
type AccessKey = { id: string; label: string; createdAt: string };
type Status = { available: boolean; authenticated: boolean; workspaceId?: string };
class ApiError extends Error { status: number; constructor(message: string, status: number) { super(message); this.status = status; } }
async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/studio/${path}`, { method, credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json", "X-RobotRouter-Request": "studio" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const result = await response.json();
  if (!response.ok) throw new ApiError(result.error || "That request could not be completed. Your edits are still here.", response.status);
  return result;
}
function download(content: string | Blob, name: string, type = "text/plain") {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const cloneExample = () => structuredClone(starterBenchmark);

export function Studio() {
  const [doc, setDoc] = useState<BenchmarkDocument>(cloneExample);
  const [saved, setSaved] = useState<StoredBenchmark | null>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [benchmarks, setBenchmarks] = useState<Summary[]>([]);
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [tab, setTab] = useState<"data" | "details" | "access">("data");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [recoverInput, setRecoverInput] = useState("");
  const [newKey, setNewKey] = useState("");
  const [keyLabel, setKeyLabel] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const validation = useMemo(() => validateBenchmark(doc), [doc]);
  const svg = useMemo(() => validation.ok ? renderBenchmarkSvg(validation.document) : "", [validation]);
  const metric = doc.metrics.find(item => item.id === doc.chart.metric)!;
  const refresh = useCallback(async () => {
    const current = await api<Status>("status"); setStatus(current);
    if (current.authenticated) {
      const [list, access] = await Promise.all([api<{ benchmarks: Summary[] }>("benchmarks"), api<{ keys: AccessKey[] }>("keys")]);
      setBenchmarks(list.benchmarks); setKeys(access.keys);
    } else { setBenchmarks([]); setKeys([]); }
  }, []);
  useEffect(() => {
    let cancelled = false;
    api<Status>("status").then(async current => {
      if (cancelled) return;
      setStatus(current);
      if (current.authenticated) {
        const [list, access] = await Promise.all([api<{ benchmarks: Summary[] }>("benchmarks"), api<{ keys: AccessKey[] }>("keys")]);
        if (!cancelled) { setBenchmarks(list.benchmarks); setKeys(access.keys); }
      }
    }).catch(() => { if (!cancelled) setStatus({ available: false, authenticated: false }); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", guard); return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  function edit(update: BenchmarkDocument | ((current: BenchmarkDocument) => BenchmarkDocument)) { setDoc(update); setDirty(true); setError(""); setMessage(""); }
  async function run(action: () => Promise<void>) { setBusy(true); setError(""); setMessage(""); try { await action(); } catch (failure) { if (failure instanceof ApiError && failure.status === 401) { setStatus({ available: true, authenticated: false }); setKeys([]); setBenchmarks([]); setNewKey(""); setRecoveryKey(""); setSaved(null); setTab("access"); } setError(failure instanceof Error ? failure.message : "Something went wrong. Your edits are still here."); } finally { setBusy(false); } }
  function canReplace() { return !dirty || window.confirm("Replace your unsaved edits? Cancel to export or save them first."); }
  function newDocument(example: boolean) {
    if (!canReplace()) return;
    setDoc(example ? cloneExample() : { schemaVersion: 1, title: "Untitled benchmark", description: "", methodology: "", evidence: "self-reported", metrics: [{ id: "score", name: "Score", unit: "", direction: "higher" }], rows: [], chart: { type: "bar", metric: "score" } });
    setSaved(null); setDirty(!example); setMessage(example ? "Example data loaded. Replace it with your own measurements." : "New benchmark ready. Add your metrics and results below."); setError(""); setTab("data");
  }
  async function openBenchmark(id: string) {
    if (!canReplace()) return;
    await run(async () => { const result = await api<StoredBenchmark>(`benchmarks/${id}`); setDoc(result.document); setSaved(result); setDirty(false); setMessage("Saved benchmark loaded."); });
  }
  async function save() {
    if (!validation.ok) { setError(validation.errors.join(" ")); return; }
    if (!status?.authenticated) { setTab("access"); setMessage("Open or create a workspace below to save this benchmark. Your edits will stay here."); return; }
    await run(async () => {
      const result = await api<StoredBenchmark>(saved ? `benchmarks/${saved.id}` : "benchmarks", saved ? "PUT" : "POST", { document: validation.document, ...(saved ? { version: saved.version } : {}) });
      setSaved(result); setDoc(result.document); setDirty(false); await refresh(); setMessage(`Saved “${result.document.title}” to your workspace. Version ${result.version}.`);
    });
  }
  async function session(recover = false) {
    await run(async () => {
      const result = await api<{ recoveryKey?: string; workspaceId: string }>("session", "POST", recover ? { recoveryKey: recoverInput.trim() } : {});
      setStatus({ available: true, authenticated: true, workspaceId: result.workspaceId });
      setRecoveryKey(result.recoveryKey || ""); setRecoverInput(""); setNewKey(""); setSaved(null); setDirty(true); await refresh();
      setMessage(recover ? "Workspace opened. Select a saved benchmark, or save your current draft." : "Workspace created. Save your recovery key below, then save your benchmark.");
    });
  }
  function addMetric() {
    const id = `m${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
    edit(current => ({ ...current, metrics: [...current.metrics, { id, name: `Metric ${current.metrics.length + 1}`, unit: "", direction: "higher" }], rows: current.rows.map(row => ({ ...row, values: { ...row.values, [id]: null } })) }));
  }
  function removeMetric(id: string) {
    if (doc.metrics.length <= 1 || !window.confirm("Remove this metric and its values from the draft?")) return;
    edit(current => { const metrics = current.metrics.filter(item => item.id !== id); const primary = current.chart.metric === id ? metrics[0].id : current.chart.metric; return { ...current, metrics, rows: current.rows.map(row => ({ ...row, values: Object.fromEntries(Object.entries(row.values).filter(([key]) => key !== id)) })), chart: { type: current.chart.type === "scatter" && metrics.length < 2 ? "bar" : current.chart.type, metric: primary, ...(current.chart.type === "scatter" && metrics.length >= 2 ? { xMetric: metrics.find(item => item.id !== primary)!.id } : {}) } }; });
  }
  async function importFile(selected?: File) {
    if (!selected || !canReplace()) return;
    await run(async () => {
      if (selected.size > BENCHMARK_LIMITS.bytes) throw new Error("Choose a CSV or JSON file smaller than 512 KB.");
      const text = await selected.text();
      const imported = selected.name.toLowerCase().endsWith(".csv") ? importBenchmarkCsv(text, selected.name.replace(/\.csv$/i, "").slice(0, 120)) : JSON.parse(text);
      const parsed = validateBenchmark(imported);
      if (!parsed.ok) throw new Error(parsed.errors.join(" "));
      setDoc(parsed.document); setSaved(null); setDirty(true); setTab("data"); setMessage(`Imported ${parsed.document.rows.length} results. Check metric units and directions before saving.`);
    });
  }
  function exportFile(format: "svg" | "csv" | "json") {
    if (!validation.ok) { setError(validation.errors.join(" ")); return; }
    download(format === "svg" ? svg : format === "csv" ? benchmarkCsv(validation.document) : JSON.stringify(validation.document, null, 2), `robotrouter-benchmark.${format}`, format === "svg" ? "image/svg+xml" : format === "csv" ? "text/csv;charset=utf-8" : "application/json");
    setMessage(`${format.toUpperCase()} export ready. JSON keeps the full benchmark; CSV contains the result table.`);
  }
  async function exportPng() {
    if (!svg) return;
    await run(async () => {
      const blob = new Blob([svg], { type: "image/svg+xml" }), url = URL.createObjectURL(blob);
      try {
        const image = new Image(); image.src = url; await image.decode();
        const scale = Math.min(2, 8192 / image.width); const canvas = document.createElement("canvas"); canvas.width = image.width * scale; canvas.height = image.height * scale;
        const context = canvas.getContext("2d"); if (!context) throw new Error("PNG export is unavailable in this browser. Use SVG instead.");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const png = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
        if (!png) throw new Error("PNG export failed. Use SVG instead.");
        download(png, "robotrouter-chart.png"); setMessage("PNG chart exported.");
      } finally { URL.revokeObjectURL(url); }
    });
  }

  return <>
    <section className="studioIntro"><div><p className="studioEyebrow">YOUR DATA. YOUR BENCHMARK.</p><h1>From results<br />to a clearer picture.</h1><p>Build a benchmark, compare your systems, and create charts you can share. Bring your agent along.</p></div><div className="studioIntroNote"><span className="studioDot" />Built for people + agents<p>CSV & JSON in. Charts out.<br />Private workspaces. One shared API.</p><a href="/studio/agents">Explore the agent guide ↗</a></div></section>
    <div className="studioToolbar"><div><button onClick={() => newDocument(false)} disabled={busy}>＋ New benchmark</button><button onClick={() => file.current?.click()} disabled={busy}>Import CSV / JSON</button><button className="studioTextButton" onClick={() => newDocument(true)} disabled={busy}>Load example</button><input ref={file} type="file" accept=".csv,.json,text/csv,application/json" aria-label="Import benchmark file" hidden onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ""; }} /></div><div><span className="studioSaveState">{busy ? "Working…" : dirty ? "Unsaved changes" : saved ? `Saved · v${saved.version}` : "Example · not saved"}</span><button className="studioPrimary" onClick={() => void save()} disabled={busy}>Save benchmark</button></div></div>
    <div className="studioFeedback" aria-live="polite">{error ? <p role="alert" className="studioError">{error}</p> : message ? <p>{message}</p> : <p>Start with the example below, or import your own results. Blank values stay blank.</p>}</div>
    <div className="studioWorkspace">
      <aside className="studioSidebar"><div className="studioSidebarTitle"><h2>My workspace</h2><span>{benchmarks.length}/50</span></div><p className="studioMuted">{status?.authenticated ? "Saved privately. Open the same workspace from another device with your recovery key." : "Edit and export freely. Open a workspace to save results and connect an agent."}</p><button onClick={() => setTab("access")} className="studioFullButton">{status?.authenticated ? "Manage workspace & agent keys" : "Open or create workspace"}</button>{benchmarks.length ? <ul className="studioSavedList">{benchmarks.map(item => <li key={item.id}><button className={saved?.id === item.id ? "isSelected" : ""} disabled={busy} onClick={() => void openBenchmark(item.id)}><strong>{item.title}</strong><span>{item.evidence === "example" ? "Example" : "Self-reported"} · v{item.version}</span></button></li>)}</ul> : <div className="studioEmptySaved"><span>↗</span><p>Your saved benchmarks<br />will appear here.</p></div>}<a href="/leaderboard" className="studioSidebarLink">Browse the model leaderboard →</a></aside>
      <fieldset disabled={busy} className="studioCanvas" aria-label="Benchmark editor">
        <section className="studioChartPanel" aria-labelledby="preview-heading"><div className="studioPanelHeading"><div><p className="studioEyebrow">LIVE PREVIEW</p><h2 id="preview-heading">{doc.title || "Untitled benchmark"}</h2></div><span className={`studioEvidence ${doc.evidence === "example" ? "example" : ""}`}>{doc.evidence === "example" ? "Example data" : "Self-reported"}</span></div>
          <div className="studioChartControls"><label>Chart type<select value={doc.chart.type} onChange={event => edit(current => ({ ...current, chart: { type: event.target.value as BenchmarkDocument["chart"]["type"], metric: current.chart.metric, ...(event.target.value === "scatter" ? { xMetric: current.metrics.find(item => item.id !== current.chart.metric)!.id } : {}) } }))}><option value="bar">Bar chart</option><option value="line">Line chart</option><option value="scatter" disabled={doc.metrics.length < 2}>Scatter plot</option></select></label><label>{doc.chart.type === "scatter" ? "Y-axis metric" : "Metric"}<select value={doc.chart.metric} onChange={event => edit(current => ({ ...current, chart: { ...current.chart, metric: event.target.value, ...(current.chart.type === "scatter" && current.chart.xMetric === event.target.value ? { xMetric: current.metrics.find(item => item.id !== event.target.value)!.id } : {}) } }))}>{doc.metrics.map(item => <option value={item.id} key={item.id}>{item.name || "Unnamed metric"}</option>)}</select></label>{doc.chart.type === "scatter" && <label>X-axis metric<select value={doc.chart.xMetric} onChange={event => edit(current => ({ ...current, chart: { ...current.chart, xMetric: event.target.value } }))}>{doc.metrics.filter(item => item.id !== doc.chart.metric).map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}<p>{metric.direction === "higher" ? "↑ Higher" : "↓ Lower"} is better</p></div>
          {svg ? <div className="studioChartScroll">{/* Locally generated SVG has no remote image request or optimization step. */}{/* eslint-disable-next-line @next/next/no-img-element */}
            <img style={{ minWidth: doc.chart.type === "scatter" ? 640 : Math.max(640, Math.min(16000, doc.rows.length * 65 + 150)) }} src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={`${doc.chart.type} chart of ${metric.name} for ${doc.rows.length} results. Exact values are in the editable table below.`} /></div> : <div className="studioChartInvalid"><p>Finish the highlighted benchmark details to draw your chart.</p><ul>{!validation.ok && validation.errors.map(item => <li key={item}>{item}</li>)}</ul></div>}
          <div className="studioExportBar"><p>{doc.chart.type === "line" ? "Lines follow table order. Gaps stay visible." : "Missing values are omitted, never counted as zero."}</p><div aria-label="Export benchmark"><button onClick={() => exportFile("svg")} disabled={!svg || busy}>SVG</button><button onClick={() => void exportPng()} disabled={!svg || busy}>PNG</button><button onClick={() => exportFile("csv")} disabled={!svg || busy}>CSV</button><button onClick={() => exportFile("json")} disabled={!svg || busy}>JSON</button></div></div>
        </section>
        <section className="studioEditor"><div className="studioTabs" aria-label="Editor sections">{([ ["data", "Results & metrics"], ["details", "Benchmark details"], ["access", "Workspace & agents"] ] as const).map(([value, label]) => <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</button>)}</div>
          {tab === "data" && <div className="studioEditorBody"><div className="studioSectionTitle"><div><h2>Define your metrics</h2><p>Name each measure, set its unit, and choose which direction is better.</p></div><button onClick={addMetric} disabled={doc.metrics.length >= 12 || busy}>＋ Metric</button></div><div className="studioMetrics">{doc.metrics.map((item, index) => <div className="studioMetric" key={item.id}><label>Metric {index + 1}<input value={item.name} maxLength={80} onChange={event => edit(current => ({ ...current, metrics: current.metrics.map(entry => entry.id === item.id ? { ...entry, name: event.target.value } : entry) }))} /></label><label>Unit<input value={item.unit} maxLength={30} placeholder="%, s, USD…" onChange={event => edit(current => ({ ...current, metrics: current.metrics.map(entry => entry.id === item.id ? { ...entry, unit: event.target.value } : entry) }))} /></label><label>Better<select value={item.direction} onChange={event => edit(current => ({ ...current, metrics: current.metrics.map(entry => entry.id === item.id ? { ...entry, direction: event.target.value as "higher" | "lower" } : entry) }))}><option value="higher">Higher ↑</option><option value="lower">Lower ↓</option></select></label><button aria-label={`Remove metric ${item.name}`} disabled={doc.metrics.length === 1 || busy} onClick={() => removeMetric(item.id)}>×</button></div>)}</div>
            <div className="studioSectionTitle"><div><h2>Add your results</h2><p>Up to 500 rows. Results remain in the order you enter them.</p></div><button disabled={doc.rows.length >= 500 || busy} onClick={() => edit(current => ({ ...current, rows: [...current.rows, { id: `r${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`, label: `System ${current.rows.length + 1}`, values: Object.fromEntries(current.metrics.map(item => [item.id, null])) }] }))}>＋ Result</button></div>
            <div className="studioTableScroll"><table className="studioTable"><caption>Editable results for {doc.title}</caption><thead><tr><th scope="col">System / result</th>{doc.metrics.map(item => <th scope="col" key={item.id}>{item.name}{item.unit ? ` (${item.unit})` : ""}</th>)}<th scope="col">Remove</th></tr></thead><tbody>{doc.rows.map((row, index) => <tr key={row.id}><th scope="row"><input aria-label={`Result ${index + 1} label`} value={row.label} maxLength={120} onChange={event => edit(current => ({ ...current, rows: current.rows.map(entry => entry.id === row.id ? { ...entry, label: event.target.value } : entry) }))} /></th>{doc.metrics.map(item => <td key={item.id}><input type="number" step="any" min={-1e12} max={1e12} aria-label={`${row.label}, ${item.name}`} placeholder="No data" value={row.values[item.id] ?? ""} onChange={event => { const value = event.target.value === "" ? null : Number(event.target.value); edit(current => ({ ...current, rows: current.rows.map(entry => entry.id === row.id ? { ...entry, values: { ...entry.values, [item.id]: value } } : entry) })); }} /></td>)}<td><button aria-label={`Remove result ${row.label}`} onClick={() => edit(current => ({ ...current, rows: current.rows.filter(entry => entry.id !== row.id) }))}>×</button></td></tr>)}</tbody></table>{!doc.rows.length && <p className="studioEmptyRows">No results yet. Add a result or import a CSV to begin.</p>}</div><p className="studioMuted">CSV format: first column is the system name; remaining columns contain numeric metrics. JSON preserves units, chart settings, and methodology.</p>
          </div>}
          {tab === "details" && <div className="studioEditorBody studioDetailFields"><h2>Make your benchmark reproducible</h2><label>Title<input value={doc.title} maxLength={120} onChange={event => edit(current => ({ ...current, title: event.target.value }))} /></label><label>Description<textarea value={doc.description} maxLength={4000} rows={3} placeholder="What are you comparing, and why?" onChange={event => edit(current => ({ ...current, description: event.target.value }))} /></label><label>Methodology<textarea value={doc.methodology} maxLength={4000} rows={6} placeholder="Describe the task, hardware, dataset, trial count, measurement procedure, and limitations. Include links to source evidence." onChange={event => edit(current => ({ ...current, methodology: event.target.value }))} /></label><label>Evidence label<select value={doc.evidence} onChange={event => edit(current => ({ ...current, evidence: event.target.value as BenchmarkDocument["evidence"] }))}><option value="example">Example data — for illustration</option><option value="self-reported">Self-reported — my measurements</option></select></label><p className="studioMuted">Robot Router does not independently verify user benchmarks. Keep example values labeled as examples.</p>{saved && <div className="studioDangerZone"><h3>Saved benchmark</h3><p>Version {saved.version}. Last saved {new Date(saved.updatedAt).toLocaleString()}.</p><button disabled={busy} onClick={() => void openBenchmark(saved.id)}>Reload saved version</button><button className="studioDanger" disabled={busy} onClick={() => { if (window.confirm(`Permanently delete “${saved.document.title}” from this workspace? Your current draft will stay in the editor.`)) void run(async () => { await api(`benchmarks/${saved.id}`, "DELETE", { version: saved.version }); setSaved(null); setDirty(true); await refresh(); setMessage("Saved benchmark deleted. Export the draft if you want to keep it."); }); }}>Delete saved benchmark</button></div>}</div>}
          {tab === "access" && <div className="studioEditorBody studioAccess"><h2>A private workspace for you and your agents</h2><p>Save up to 50 benchmarks. A recovery key opens your workspace on another device. Agent API keys can read, create, update, and delete benchmarks in this workspace.</p>{!status ? <p>Checking workspace availability…</p> : !status.available ? <div className="studioNotice"><strong>Saving is temporarily unavailable.</strong><p>You can keep editing and export your benchmark as JSON to reopen later. Charts also export as SVG and PNG.</p><button onClick={() => void run(refresh)} disabled={busy}>Check again</button></div> : !status.authenticated ? <><div className="studioAccessCard"><h3>New here?</h3><p>Create a workspace and download its recovery key. No email or password required.</p><button className="studioPrimary" disabled={busy} onClick={() => void session()}>Create private workspace</button></div><form className="studioAccessCard" onSubmit={event => { event.preventDefault(); void session(true); }}><h3>Open an existing workspace</h3><label>Recovery key<input type="password" autoComplete="off" value={recoverInput} placeholder="rrw_…" onChange={event => setRecoverInput(event.target.value)} /></label><button disabled={busy || !recoverInput.trim()}>Open workspace</button><p className="studioMuted">Keep the recovery key private. It grants owner access. Lost keys cannot be recovered by email.</p></form></> : <>
            {recoveryKey && <div className="studioSecret"><h3>Save your recovery key now</h3><p>This is shown once. Keep it somewhere private so you can return after signing out or when this seven-day session expires.</p><label>Recovery key<input readOnly type="password" value={recoveryKey} autoComplete="off" /></label><button onClick={() => download(`Robot Router workspace recovery key\n\n${recoveryKey}\n\nOpen https://www.getrobotrouter.com/studio and choose Open an existing workspace. Keep this key private.\n`, "robotrouter-recovery-key.txt")}>Download recovery key</button><button onClick={() => { if (window.confirm("Have you saved your recovery key somewhere private? It will not be shown again.")) setRecoveryKey(""); }}>I saved my key</button></div>}
            <div className="studioAccessCard"><h3>Connect an agent</h3><p>Give each agent its own key. Keys stay active until you revoke them. They cannot create other keys or delete your workspace.</p><form onSubmit={event => { event.preventDefault(); void run(async () => { const result = await api<{ token: string }>("keys", "POST", { label: keyLabel }); setNewKey(result.token); setKeyLabel(""); await refresh(); setMessage("Agent key created. Copy it below; it is shown only once."); }); }}><label>Agent name<input value={keyLabel} maxLength={80} placeholder="My research agent" onChange={event => setKeyLabel(event.target.value)} /></label><button disabled={busy || !keyLabel.trim() || keys.length >= 5}>Create agent key</button></form>{newKey && <div className="studioSecret"><label>New agent API key<input readOnly type="password" value={newKey} autoComplete="off" /></label><button onClick={() => void run(async () => { await navigator.clipboard.writeText(newKey); setMessage("Agent key copied. Paste it only into your trusted agent’s secret settings."); })}>Copy API key</button><button onClick={() => download(newKey, "robotrouter-agent-key.txt")}>Download key</button><button onClick={() => setNewKey("")}>Hide key</button></div>}<ul className="studioKeyList">{keys.map(key => <li key={key.id}><div><strong>{key.label}</strong><span>Created {new Date(key.createdAt).toLocaleDateString()}</span></div><button disabled={busy} onClick={() => { if (window.confirm(`Revoke “${key.label}”? This agent will immediately lose access.`)) void run(async () => { await api(`keys/${key.id}`, "DELETE"); setNewKey(""); await refresh(); setMessage("API key revoked."); }); }}>Revoke</button></li>)}</ul><a href="/studio/agents">API examples, schema, and MCP instructions →</a></div>
            <div className="studioAccessCard"><h3>Workspace controls</h3><p>Your browser session lasts seven days. Signing out keeps saved benchmarks; deleting the workspace removes its benchmarks and revokes all access keys.</p><button disabled={busy} onClick={() => { if (window.confirm("Sign out? Make sure you saved your recovery key so you can return.")) void run(async () => { await api("session", "DELETE"); setRecoveryKey(""); setNewKey(""); setSaved(null); setDirty(true); await refresh(); setMessage("Signed out. The current draft stays here until you leave or replace it."); }); }}>Sign out</button><button className="studioDanger" disabled={busy} onClick={() => { if (window.prompt("Permanently erase this workspace, all saved benchmarks, and all access keys? Export anything you need first. Type DELETE WORKSPACE to confirm.") === "DELETE WORKSPACE") void run(async () => { await api("workspace", "DELETE", { confirm: "DELETE WORKSPACE" }); setRecoveryKey(""); setNewKey(""); setSaved(null); setDirty(true); await refresh(); setMessage("Workspace and saved benchmarks deleted. The current draft remains available for export."); }); }}>Delete workspace</button></div>
          </>}<p className="studioMuted">Benchmarks are private to your workspace. Export only what you intend to share. <a href="/privacy">Read the Privacy Policy.</a></p></div>}
        </section>
      </fieldset>
    </div>
  </>;
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { monitorAgents, monitoredPaths } from "./agents";

type Probe = { path: string; status: number; latencyMs: number; bytes: number; contentType: string; state: "healthy" | "degraded" | "down"; detail?: string };
type Snapshot = { target: string; checkedAt: string; summary: { healthy: number; degraded: number; down: number; total: number }; probes: Probe[] };

async function probeGet(path: string): Promise<Probe> {
  const started = performance.now();
  try {
    const response = await fetch(path, { cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(8_000) });
    const bytes = (await response.arrayBuffer()).byteLength;
    return { path, status: response.status, latencyMs: Math.round(performance.now() - started), bytes, contentType: response.headers.get("content-type") || "unknown", state: response.ok ? "healthy" : response.status >= 500 ? "down" : "degraded" };
  } catch (error) {
    return { path, status: 0, latencyMs: Math.round(performance.now() - started), bytes: 0, contentType: "unavailable", state: "down", detail: error instanceof Error ? error.message : "Probe failed" };
  }
}

async function probeMcp(): Promise<Probe> {
  const started = performance.now();
  try {
    const response = await fetch("/mcp", {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
      headers: { Accept: "application/json, text/event-stream", "Content-Type": "application/json", "MCP-Protocol-Version": "2026-07-28", "Mcp-Method": "server/discover" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "monitor-discover", method: "server/discover", params: { _meta: {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientInfo": { name: "embodied-arena-monitor", version: "1.0.0" },
        "io.modelcontextprotocol/clientCapabilities": {},
      } } }),
    });
    const text = await response.text();
    const valid = response.ok && text.includes("supportedVersions") && text.includes("Embodied Arena HILO");
    return { path: "/mcp", status: response.status, latencyMs: Math.round(performance.now() - started), bytes: new TextEncoder().encode(text).length, contentType: response.headers.get("content-type") || "unknown", state: valid ? "healthy" : response.status >= 500 ? "down" : "degraded", detail: valid ? "Discovery contract verified" : "Discovery contract unavailable" };
  } catch (error) {
    return { path: "/mcp", status: 0, latencyMs: Math.round(performance.now() - started), bytes: 0, contentType: "unavailable", state: "down", detail: error instanceof Error ? error.message : "MCP probe failed" };
  }
}

export function MonitoringConsole() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const probes = await Promise.all([...monitoredPaths.filter((path) => path !== "/mcp").map(probeGet), probeMcp()]);
      const summary = probes.reduce((result, probe) => ({ ...result, [probe.state]: result[probe.state] + 1 }), { healthy: 0, degraded: 0, down: 0, total: probes.length });
      setSnapshot({ target: window.location.origin, checkedAt: new Date().toISOString(), summary, probes });
      setError("");
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Monitor unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run();
    const interval = window.setInterval(() => void run(), 60_000);
    return () => window.clearInterval(interval);
  }, [run]);

  const mcp = snapshot?.probes.find((probe) => probe.path === "/mcp");
  const slowest = snapshot?.probes.reduce((current, probe) => probe.latencyMs > current.latencyMs ? probe : current, snapshot.probes[0]);

  return <>
    <section className="monitorOverview">
      <div className="monitorSummary">
        <article><span>HEALTHY ROUTES</span><b>{snapshot ? `${snapshot.summary.healthy}/${snapshot.summary.total}` : "—"}</b><small>{loading ? "PROBING" : "LIVE SNAPSHOT"}</small></article>
        <article><span>INCIDENTS</span><b>{snapshot ? snapshot.summary.down + snapshot.summary.degraded : "—"}</b><small>DOWN + DEGRADED</small></article>
        <article><span>MCP CONTRACT</span><b className={mcp?.state === "healthy" ? "statusGood" : "statusPending"}>{mcp ? mcp.state.toUpperCase() : "PENDING"}</b><small>2026-07-28</small></article>
        <article><span>SLOWEST PROBE</span><b>{slowest ? `${slowest.latencyMs} ms` : "—"}</b><small>{slowest?.path || "WAITING"}</small></article>
      </div>
      <div className="monitorRunbar"><div><span className={error ? "pulseError" : "pulseLive"}/><b>{error ? "BASELINE INTERRUPTED" : loading ? "RUNNING BASELINE" : "MONITORING ACTIVE"}</b><small>{snapshot ? `${snapshot.target} · ${new Date(snapshot.checkedAt).toLocaleString()}` : error || "Connecting to this deployment"}</small></div><button type="button" onClick={() => void run()} disabled={loading}>{loading ? "RUNNING…" : "RUN NOW ↗"}</button></div>
    </section>

    <section className="probePanel">
      <header><span>LIVE ROUTE PROBES</span><span>STATUS</span><span>LATENCY</span><span>PAYLOAD</span></header>
      {snapshot?.probes.map((probe) => <article key={probe.path}><code>{probe.path}</code><b className={`probeState ${probe.state}`}>{probe.status || "ERR"} · {probe.state}</b><span>{probe.latencyMs} ms</span><span>{probe.bytes ? `${Math.round(probe.bytes / 1024)} KB` : "—"}</span></article>)}
      {!snapshot && <div className="probeEmpty">{error || "Collecting the first deployment snapshot…"}</div>}
    </section>

    <section className="monitorAgentGrid">
      {monitorAgents.map((agent) => <article key={agent.id}><header><span>{agent.id}</span><i className={agent.mode}>{agent.mode === "live" ? "LIVE PROBE" : agent.mode === "guardrail" ? "GUARDRAIL" : "SCHEDULED"}</i></header><h3>{agent.name}</h3><p>{agent.description}</p><footer><span>{agent.cadence}</span><b>READ ONLY</b></footer></article>)}
    </section>
  </>;
}

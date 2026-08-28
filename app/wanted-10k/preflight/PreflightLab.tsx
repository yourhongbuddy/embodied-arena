"use client";

import { useState } from "react";
import { assessPreflight, preflightTemplate, type PreflightResult } from "./profile";

const initial = assessPreflight(preflightTemplate);
const number = (value: number | null | undefined, suffix = "") => value === null || value === undefined ? "—" : `${value.toLocaleString(undefined, { maximumFractionDigits: 6 })}${suffix}`;

export function PreflightLab() {
  const [input, setInput] = useState(JSON.stringify(preflightTemplate, null, 2));
  const [result, setResult] = useState<PreflightResult>(initial);
  const run = () => { try { setResult(assessPreflight(JSON.parse(input))); } catch (error) { setResult({ status: "invalid", errors: [error instanceof Error ? error.message : "Invalid JSON."], gates: [], summary: null }); } };
  const load = () => { const text = JSON.stringify(preflightTemplate, null, 2); setInput(text); setResult(assessPreflight(preflightTemplate)); };
  const exportResult = () => {
    if (!result.summary) return;
    const payload = { benchmark: "WANTED-10K", preflight_profile_version: "0.2-P1", generated_at: new Date().toISOString(), status: result.status, gates: result.gates, ...result.summary, interpretation: "Simulation-conditional evidence only. This result is not a WANTED Score or a field-harm probability claim." };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "wanted-preflight-result.json"; anchor.click(); URL.revokeObjectURL(url);
  };
  return <section className="preflightLab">
    <header><div><span>LOCAL PREFLIGHT EVALUATOR</span><b>PROFILE / 0.2-P1</b></div><div><button onClick={load}>LOAD SYNTHETIC EXAMPLE</button><button className="runPreflight" onClick={run}>ASSESS →</button></div></header>
    <div className="preflightWorkspace">
      <div className="preflightEditor"><label htmlFor="preflight-input">SIMULATOR-NEUTRAL MANIFEST</label><textarea id="preflight-input" spellCheck={false} value={input} onChange={event => setInput(event.target.value)}/><footer><a href="/wanted-10k/preflight.schema.json">MANIFEST SCHEMA ↗</a><span>Runs locally. No scenario data is uploaded.</span></footer></div>
      <div className="preflightOutput">
        <div className={`preflightStatus ${result.status}`}><span>PREQUALIFICATION STATUS</span><b>{result.status.toUpperCase()}</b><small>{result.errors[0] || (result.status === "passed" ? "All seven preflight gates pass." : "One or more hard gates failed.")}</small></div>
        {result.summary && <><div className="preflightMetrics"><article><span>TOTAL TRIALS</span><b>{number(result.summary.total_trials)}</b></article><article><span>MATRIX COVERAGE</span><b>{number(result.summary.coverage_rate * 100, "%")}</b></article><article><span>REPLAY MATCH</span><b>{number(result.summary.replay_match_rate * 100, "%")}</b></article><article><span>ZERO-EVENT UPPER 95%</span><b>{number(result.summary.zero_event_upper_95 === null ? null : result.summary.zero_event_upper_95 * 100, "%")}</b></article></div><div className="preflightGates">{result.gates.map(item => <article className={item.passed ? "pass" : "fail"} key={item.id}><span>{item.id}</span><div><b>{item.label}</b><p>{item.detail}</p></div><i>{item.passed ? "PASS" : "FAIL"}</i></article>)}</div><button className="exportPreflight" onClick={exportResult}>EXPORT PREFLIGHT RESULT ↓</button></>}
      </div>
    </div>
    <aside><b>SIMULATION BOUNDARY</b><p>The exact bound is conditional on the executed digital-twin trials and their scenario distribution. Correlated, incomplete, or unrealistic scenarios can invalidate its field interpretation. Simulated humans never produce W.</p></aside>
  </section>;
}

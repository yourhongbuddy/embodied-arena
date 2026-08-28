"use client";

import { useState } from "react";
import { calculateDiagnostics, diagnosticExample, type DiagnosticResult } from "./profile";

const idle: DiagnosticResult = { status: "incomplete", errors: [], warnings: [], metrics: null };
const format = (value: number | null | undefined, suffix = "") => value === null || value === undefined ? "—" : `${value.toLocaleString(undefined, { maximumFractionDigits: 4 })}${suffix}`;

export function DiagnosticLab() {
  const [input, setInput] = useState(JSON.stringify(diagnosticExample, null, 2));
  const [result, setResult] = useState<DiagnosticResult>(() => calculateDiagnostics(diagnosticExample));
  const calculate = () => {
    try { setResult(calculateDiagnostics(JSON.parse(input))); }
    catch (error) { setResult({ status: "invalid", errors: [error instanceof Error ? error.message : "Invalid JSON."], warnings: [], metrics: null }); }
  };
  const exportProfile = () => {
    if (!result.metrics) return;
    const payload = { benchmark: "WANTED-10K", diagnostic_profile_version: "0.2-D1", generated_at: new Date().toISOString(), status: result.status, warnings: result.warnings, metrics: result.metrics, note: "Aggregate local calculation. Official uncertainty is clustered by independent environment." };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "wanted-diagnostic-profile.json"; anchor.click(); URL.revokeObjectURL(url);
  };
  const metrics = result.metrics;
  return <section className="diagLab">
    <header><div><span>LOCAL AGGREGATE LAB</span><b>DIAGNOSTIC PROFILE / 0.2-D1</b></div><div><button onClick={() => { setInput(JSON.stringify(diagnosticExample, null, 2)); setResult(calculateDiagnostics(diagnosticExample)); }}>LOAD SYNTHETIC EXAMPLE</button><button className="runDiag" onClick={calculate}>CALCULATE →</button></div></header>
    <div className="diagWorkspace">
      <div className="diagEditor"><label htmlFor="diagnostic-input">AGGREGATE SUFFICIENT STATISTICS</label><textarea id="diagnostic-input" spellCheck={false} value={input} onChange={event => { setInput(event.target.value); setResult(idle); }}/><footer><a href="/wanted-10k/diagnostic-input.schema.json">INPUT SCHEMA ↗</a><span>No raw participant data leaves this browser.</span></footer></div>
      <div className="diagOutput">
        <div className={`diagStatus ${result.status}`}><span>PROFILE STATUS</span><b>{result.status.toUpperCase()}</b><small>{result.errors[0] || result.warnings[0] || "Core fields are calculable."}</small></div>
        {metrics ? <>
          <div className="diagCore">
            <article><span>ASSISTANCE / 100H</span><b>{format(metrics.assistance_minutes_per_100_hours, "m")}</b></article>
            <article><span>AVAILABILITY</span><b>{format(metrics.autonomous_availability * 100, "%")}</b></article>
            <article><span>HUMAN BURDEN / 100H</span><b>{format(metrics.human_burden_minutes_per_100_hours, "m")}</b></article>
            <article><span>MTBHR</span><b>{metrics.mean_time_between_human_rescue.estimate_hours === null ? `≥${metrics.mean_time_between_human_rescue.no_event_lower_bound_hours}` : format(metrics.mean_time_between_human_rescue.estimate_hours, "h")}</b></article>
          </div>
          <div className="diagDetail">
            <div><span>PROTECTIVE STOP P99 / MAX</span><b>{format(metrics.stop_latency_ms?.p99, "ms")} / {format(metrics.stop_latency_ms?.max, "ms")}</b><small>N={metrics.stop_latency_ms?.n ?? 0}</small></div>
            <div><span>PRIVACY STOP P99 / MAX</span><b>{format(metrics.privacy_stop_latency_ms?.p99, "ms")} / {format(metrics.privacy_stop_latency_ms?.max, "ms")}</b><small>N={metrics.privacy_stop_latency_ms?.n ?? 0}</small></div>
            <div><span>MTBF</span><b>{metrics.mean_time_between_failure.estimate_hours === null ? `≥${metrics.mean_time_between_failure.no_event_lower_bound_hours}` : format(metrics.mean_time_between_failure.estimate_hours, "h")}</b><small>{metrics.mean_time_between_failure.events} failures</small></div>
            <div><span>SELF RECOVERY</span><b>{format(metrics.self_recovery_rate && metrics.self_recovery_rate.estimate * 100, "%")}</b><small>{metrics.self_recovery_rate ? `95% CI ${format(metrics.self_recovery_rate.lower * 100)}–${format(metrics.self_recovery_rate.upper * 100)}%` : "No recoverable failures"}</small></div>
            <div><span>INITIATIVE PRECISION</span><b>{format(metrics.initiative_precision && metrics.initiative_precision.estimate * 100, "%")}</b><small>Coverage {format(metrics.initiative_label_coverage && metrics.initiative_label_coverage.estimate * 100, "%")}</small></div>
            <div><span>SOCIAL ERROR RATE</span><b>{format(metrics.social_error_rate && metrics.social_error_rate.estimate * 100, "%")}</b><small>Unresolved actions stay in denominator</small></div>
            <div><span>LEARNING Δ</span><b>{format(metrics.learning_delta && metrics.learning_delta.estimate * 100, "pp")}</b><small>{metrics.learning_delta ? `95% CI ${format(metrics.learning_delta.lower * 100)}–${format(metrics.learning_delta.upper * 100)}pp` : "Matched windows required"}</small></div>
            <div><span>GENERALIZATION RATIO</span><b>{format(metrics.generalization.ratio)}</b><small>Novel / familiar; components retained</small></div>
            <div><span>REACQUISITION</span><b>{format(metrics.reacquisition_rate && metrics.reacquisition_rate.estimate * 100, "%")}</b><small>{metrics.reacquisition_rate ? `95% CI ${format(metrics.reacquisition_rate.lower * 100)}–${format(metrics.reacquisition_rate.upper * 100)}%` : "Withdrawal not completed"}</small></div>
          </div>
          <button className="exportDiag" onClick={exportProfile}>EXPORT DIAGNOSTIC JSON ↓</button>
        </> : <div className="diagEmpty"><b>CALCULATE A PROFILE</b><p>Fix any reported input error, then run the local calculation.</p></div>}
      </div>
    </div>
    <aside><b>NOT A COMPOSITE SCORE</b><p>These metrics explain why a robot is retained or rejected. They never change W, never offset an L4 event, and must be published with denominators and missingness.</p></aside>
  </section>;
}

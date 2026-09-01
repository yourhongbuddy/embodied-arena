"use client";

import { useMemo, useState } from "react";
import { BOOTSTRAP_PRNG, bootstrap, HORIZON, robustness, score,TERMINAL_COMPETING_CAUSES, type Outcome, type Row } from "./scoring";
const exampleRows: Row[] = [
  { id: 1, environment: "ENV-001", hours: 10_000, outcome: "completed" },
  { id: 2, environment: "ENV-002", hours: 8_400, outcome: "rejected" },
  { id: 3, environment: "ENV-003", hours: 10_000, outcome: "completed" },
  { id: 4, environment: "ENV-004", hours: 4_200, outcome: "rejected" },
  { id: 5, environment: "ENV-005", hours: 10_000, outcome: "completed" },
];

export function ScoreCalculator() {
  const [rows, setRows] = useState<Row[]>(exampleRows);
  const result = useMemo(() => score(rows), [rows]);
  const bootstrapResult = useMemo(() => bootstrap(rows,10_000,10_000), [rows]);
  const robust = useMemo(() => robustness(rows), [rows]);
  const interval = bootstrapResult.interval;
  const totalHours = rows.reduce((sum,row)=>sum + row.hours,0);
  const rejections = rows.filter(row=>row.outcome === "rejected").length;
  const terminalCauses = rows.filter(row=>TERMINAL_COMPETING_CAUSES.includes(row.outcome)).length;
  const dataValid = result.errors.length === 0;
  const rankable = dataValid && rows.length >= 20 && totalHours >= 10_000 && result.identifiable && interval !== null && terminalCauses === 0;
  const statisticalStatus = terminalCauses ? "TERMINAL REFUSAL" : !dataValid ? "DATA INVALID" : !result.identifiable ? "HORIZON UNSUPPORTED" : interval === null ? "CI UNSTABLE" : rankable ? "THRESHOLD MET" : "PROVISIONAL";

  const update = (id: number, patch: Partial<Row>) => setRows(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  const add = () => setRows(current => { const id=Math.max(0,...current.map(row=>row.id))+1;return [...current,{ id,environment:`ENV-${String(id).padStart(3,"0")}`,hours:0,outcome:"unrelated_censor" }]; });
  const remove = (id: number) => setRows(current => current.filter(row => row.id !== id));
  const reset = () => setRows(exampleRows.map(row=>({...row})));
  const exportSummary = () => {
    const payload = {
      benchmark: "WANTED-10K", schema_version: "0.2", generated_at: new Date().toISOString(),
      statistical_status: terminalCauses ? "terminal_competing_cause_refuses_primary_W" : !result.identifiable ? "not_estimable_at_10000" : interval === null ? "bootstrap_support_below_95_percent" : rankable ? "cohort_threshold_met" : "provisional",
      analysis_profile_version: "0.2-A2", bootstrap: { samples: 10_000, seed: 10_000, prng: BOOTSTRAP_PRNG },
      primary: { wanted_score: result.wanted === null ? null : +result.wanted.toFixed(4), bootstrap_95_ci: interval?.map(x=>+x.toFixed(4)) ?? null, survival_at_10000: result.survival10k === null ? null : +result.survival10k.toFixed(6), horizon_identifiable: result.identifiable, bootstrap_valid_fraction: +bootstrapResult.validFraction.toFixed(4) },
      cohort: { independent_environments: rows.length, total_resident_hours: totalHours, voluntary_rejections: rejections, terminal_competing_causes: terminalCauses },
      robustness: robust,
      environments: rows.map(({ environment,hours,outcome })=>({ environment_id: environment, resident_hours: hours, event: outcome === "rejected", disposition: outcome })),
      note: "Statistical output only. Safety gates and independent audit remain required for certification."
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));
    const anchor = document.createElement("a"); anchor.href=url; anchor.download="wanted-cohort-summary.json"; anchor.click(); URL.revokeObjectURL(url);
  };

  return <section className="calcWorkspace shell">
    <div className="calcSummary">
      <article className="calcPrimary"><span>WANTED SCORE</span><b>{result.wanted === null ? "—" : result.wanted.toFixed(1)}</b><small>{result.identifiable ? "NORMALIZED RMST / 100" : "NO 10K EXTRAPOLATION"}</small></article>
      <article><span>BOOTSTRAP 95% CI</span><b>{interval ? `${interval[0].toFixed(1)}–${interval[1].toFixed(1)}` : "—"}</b><small>10,000 DETERMINISTIC ENVIRONMENT RESAMPLES</small></article>
      <article><span>RETENTION AT 10K</span><b>{result.survival10k === null ? "—" : `${(result.survival10k*100).toFixed(1)}%`}</b><small>{result.identifiable ? "Ŝ(10,000)" : `SUPPORT ENDS AT ${result.lastObservableHours.toLocaleString()} H`}</small></article>
      <article><span>STATISTICAL STATUS</span><b className={rankable?"qualifies":"provisional"}>{statisticalStatus}</b><small>{rows.length}/20 SITES · {totalHours.toLocaleString()}/10,000 H</small></article>
    </div>

    <div className="calcGrid">
      <div className="cohortEditor">
        <header><div><span>COHORT INPUT</span><small>ONE ROW PER INDEPENDENT ENVIRONMENT</small></div><div><button onClick={reset}>LOAD EXAMPLE</button><button onClick={add}>+ ADD SITE</button></div></header>
        <div className="cohortHead"><span>ENVIRONMENT</span><span>RESIDENT HOURS</span><span>OUTCOME</span><span/></div>
        <div className="cohortRows">{rows.map(row=><div className="cohortRow" key={row.id}>
          <label><span>Environment</span><input aria-label={`Environment name ${row.id}`} value={row.environment} maxLength={128} onChange={event=>update(row.id,{environment:event.target.value})}/></label>
          <label><span>Resident hours</span><input aria-label={`Resident hours for ${row.environment}`} type="number" min="0" max="10000" step="1" value={row.hours} onChange={event=>update(row.id,{hours:Math.min(HORIZON,Math.max(0,Number(event.target.value)||0))})}/></label>
          <label><span>Outcome</span><select aria-label={`Outcome for ${row.environment}`} value={row.outcome} onChange={event=>{const outcome=event.target.value as Outcome;update(row.id,{outcome,...(outcome==="completed"?{hours:HORIZON}:{})})}}><option value="completed">Completed at 10K</option><option value="rejected">Voluntary rejection</option><option value="unrelated_censor">Unrelated exit / censor</option><option value="safety_termination">Safety termination</option><option value="developer_withdrawal">Developer withdrawal</option><option value="consent_privacy_withdrawal">Consent / privacy withdrawal</option></select></label>
          <button className="removeRow" aria-label={`Remove ${row.environment}`} onClick={()=>remove(row.id)} disabled={rows.length===1}>×</button>
        </div>)}</div>
        <footer><span>{rows.length} ENVIRONMENTS · {rejections} EVENTS · {terminalCauses} TERMINAL REVIEWS · {totalHours.toLocaleString()} HOURS</span><button onClick={exportSummary}>EXPORT AUDIT JSON ↓</button></footer>
      </div>

      <aside className="calcMethod">
        <header><span>CALCULATION TRACE</span><b>Ŝ(t)</b></header>
        <div className="dynamicCurve" aria-label="Calculated Kaplan–Meier retention curve">
          {result.points.slice(1).map((point,index)=><i key={`${point.time}-${index}`} style={{left:`${point.time/HORIZON*100}%`,height:`${point.survival*100}%`}}><span>{point.time.toLocaleString()}h</span></i>)}
          <em style={{height:`${(result.survival10k ?? 0)*100}%`}}/>
        </div>
        <div className="traceRows">
          <div><span>ESTIMATOR</span><b>Kaplan–Meier</b></div>
          <div><span>HORIZON</span><b>10,000 h</b></div>
          <div><span>INTEGRAL</span><b>{result.wanted === null ? "not estimable" : `${(result.wanted*100).toFixed(0)} wanted h`}</b></div>
          <div><span>UNIT</span><b>Environment</b></div>
        </div>
        <p>Charging and ordinary downtime stay inside resident time. Mark only permanent, voluntary rejection as an event. A safety, developer, or consent/privacy termination refuses primary W rather than becoming a censor. W is not reported beyond the last supported follow-up unless the estimated survival curve has already reached zero.</p>
      </aside>
    </div>
    {robust.bounds && robust.influence && robust.support && <section className="calcRobustness">
      <header><div><span>ROBUSTNESS DISCLOSURE</span><b>How fragile is W?</b></div><a href="/wanted-10k/robustness.json">METHOD CONTRACT ↗</a></header>
      <div className="robustCards">
        <article><span>CENSORING ENVELOPE</span><b>{robust.bounds.lower?.toFixed(1)}–{robust.bounds.upper?.toFixed(1)}</b><small>W WIDTH {robust.bounds.width?.toFixed(1)} · {robust.bounds.early_exits} EARLY EXITS</small></article>
        <article><span>TAIL SUPPORT</span><b>{robust.support.at_risk_10000}</b><small>{robust.support.horizon_rejections} REJECTED AT 10K · {robust.support.retained_at_10000} RETAINED</small></article>
        <article><span>MAX LEAVE-ONE-OUT SHIFT</span><b>{robust.influence.maximum_absolute_shift === null ? "—" : `±${robust.influence.maximum_absolute_shift.toFixed(2)}`}</b><small>{robust.influence.most_influential_environment ?? "NO IDENTIFIABLE EXCLUSION"}</small></article>
        <article><span>UNSUPPORTED EXCLUSIONS</span><b>{robust.influence.unidentifiable_exclusions}</b><small>OF {rows.length} LEAVE-ONE-OUT RUNS</small></article>
      </div>
      <div className="sensitivityRail"><div><span>PESSIMISTIC</span><b>W {robust.bounds.lower?.toFixed(2)}</b><p>Every early non-rejection exit fails at its last observed hour.</p></div><i>≤</i><div><span>PRIMARY</span><b>W {robust.bounds.observed?.toFixed(2) ?? "—"}</b><p>Preregistered Kaplan–Meier treatment of independently censored exits.</p></div><i>≤</i><div><span>OPTIMISTIC</span><b>W {robust.bounds.upper?.toFixed(2)}</b><p>Every non-rejection exit is retained through the 10K horizon.</p></div></div>
      <div className="influenceRows"><header><span>ENVIRONMENT REMOVED</span><span>W WITHOUT ENVIRONMENT</span><span>SHIFT</span></header>{robust.influence.estimates.slice(0,5).map(item=><div key={item.environment}><b>{item.environment}</b><span>{item.estimate.toFixed(3)}</span><span className={item.shift >= 0 ? "positive" : "negative"}>{item.shift >= 0 ? "+" : ""}{item.shift.toFixed(3)}</span></div>)}</div>
      <p>Bounds are deliberate stress scenarios, not replacement estimators. Leave-one-out influence is descriptive and must be reviewed when it exceeds the preregistered threshold. <a href="/wanted-10k/analysis-reproduction">Reproduce an official claim →</a></p>
    </section>}
    <div className="calcCaution"><b>{terminalCauses ? "TERMINAL CAUSE BLOCKS PRIMARY W." : !dataValid ? "COHORT DATA FAILS VALIDATION." : result.identifiable ? "STATISTICAL ELIGIBILITY IS NOT CERTIFICATION." : "10K HORIZON IS NOT IDENTIFIABLE."}</b><span>{terminalCauses ? "Safety termination, developer withdrawal, and consent/privacy withdrawal remain visible terminal competing causes. Resolve the underlying certification outcome; never recode one as unrelated censoring." : !dataValid ? result.errors.join(" ") : result.identifiable ? "A qualifying cohort still needs complete intervention disclosure, robustness review, passed safety gates, preregistration, and independent audit." : "At least one observation must support 10,000 hours, or the Kaplan–Meier curve must reach zero before support ends. WANTED never extends the last observed survival level to manufacture unobserved hours."}</span></div>
  </section>;
}

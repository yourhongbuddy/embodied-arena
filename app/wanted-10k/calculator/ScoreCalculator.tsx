"use client";

import { useMemo, useState } from "react";

type Outcome = "censored" | "rejected";
type Row = { id: number; environment: string; hours: number; outcome: Outcome };

const HORIZON = 10_000;
const exampleRows: Row[] = [
  { id: 1, environment: "ENV-001", hours: 10_000, outcome: "censored" },
  { id: 2, environment: "ENV-002", hours: 8_400, outcome: "rejected" },
  { id: 3, environment: "ENV-003", hours: 10_000, outcome: "censored" },
  { id: 4, environment: "ENV-004", hours: 4_200, outcome: "rejected" },
  { id: 5, environment: "ENV-005", hours: 10_000, outcome: "censored" },
];

function score(rows: Row[]) {
  if (!rows.length) return { wanted: 0, survival10k: 0, points: [{ time: 0, survival: 1 }] };
  const times = [...new Set(rows.filter(r => r.outcome === "rejected").map(r => r.hours))].sort((a,b)=>a-b);
  let survival = 1;
  let area = 0;
  let previous = 0;
  const points = [{ time: 0, survival: 1 }];
  for (const time of times) {
    area += survival * (time - previous);
    const atRisk = rows.filter(r => r.hours >= time).length;
    const events = rows.filter(r => r.outcome === "rejected" && r.hours === time).length;
    survival *= 1 - events / atRisk;
    points.push({ time, survival });
    previous = time;
  }
  area += survival * (HORIZON - previous);
  return { wanted: 100 * area / HORIZON, survival10k: survival, points };
}

function bootstrap(rows: Row[], samples = 1_000) {
  if (rows.length < 2) return null;
  let state = 10_000;
  const random = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296; };
  const estimates = Array.from({ length: samples }, () => {
    const sample = Array.from({ length: rows.length }, () => rows[Math.floor(random() * rows.length)]);
    return score(sample).wanted;
  }).sort((a,b)=>a-b);
  const percentile = (p: number) => {
    const index = p * (samples - 1);
    const low = Math.floor(index), high = Math.min(low + 1, samples - 1);
    return estimates[low] + (estimates[high] - estimates[low]) * (index - low);
  };
  return [percentile(.025), percentile(.975)] as const;
}

export function ScoreCalculator() {
  const [rows, setRows] = useState<Row[]>(exampleRows);
  const result = useMemo(() => score(rows), [rows]);
  const interval = useMemo(() => bootstrap(rows), [rows]);
  const totalHours = rows.reduce((sum,row)=>sum + row.hours,0);
  const rejections = rows.filter(row=>row.outcome === "rejected").length;
  const rankable = rows.length >= 20 && totalHours >= 10_000;

  const update = (id: number, patch: Partial<Row>) => setRows(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  const add = () => setRows(current => [...current, { id: Math.max(0,...current.map(row=>row.id)) + 1, environment: `ENV-${String(current.length + 1).padStart(3,"0")}`, hours: 0, outcome: "censored" }]);
  const remove = (id: number) => setRows(current => current.filter(row => row.id !== id));
  const reset = () => setRows(exampleRows.map(row=>({...row})));
  const exportSummary = () => {
    const payload = {
      benchmark: "WANTED-10K", schema_version: "0.1", generated_at: new Date().toISOString(),
      statistical_status: rankable ? "cohort_threshold_met" : "provisional",
      primary: { wanted_score: +result.wanted.toFixed(4), bootstrap_95_ci: interval?.map(x=>+x.toFixed(4)) ?? null, survival_at_10000: +result.survival10k.toFixed(6) },
      cohort: { independent_environments: rows.length, total_resident_hours: totalHours, voluntary_rejections: rejections },
      environments: rows.map(({ environment,hours,outcome })=>({ environment_id: environment, resident_hours: hours, event: outcome === "rejected" })),
      note: "Statistical output only. Safety gates and independent audit remain required for certification."
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));
    const anchor = document.createElement("a"); anchor.href=url; anchor.download="wanted-cohort-summary.json"; anchor.click(); URL.revokeObjectURL(url);
  };

  return <section className="calcWorkspace shell">
    <div className="calcSummary">
      <article className="calcPrimary"><span>WANTED SCORE</span><b>{result.wanted.toFixed(1)}</b><small>NORMALIZED RMST / 100</small></article>
      <article><span>BOOTSTRAP 95% CI</span><b>{interval ? `${interval[0].toFixed(1)}–${interval[1].toFixed(1)}` : "—"}</b><small>1,000 ENVIRONMENT RESAMPLES</small></article>
      <article><span>RETENTION AT 10K</span><b>{(result.survival10k*100).toFixed(1)}%</b><small>Ŝ(10,000)</small></article>
      <article><span>STATISTICAL STATUS</span><b className={rankable?"qualifies":"provisional"}>{rankable?"THRESHOLD MET":"PROVISIONAL"}</b><small>{rows.length}/20 SITES · {totalHours.toLocaleString()}/10,000 H</small></article>
    </div>

    <div className="calcGrid">
      <div className="cohortEditor">
        <header><div><span>COHORT INPUT</span><small>ONE ROW PER INDEPENDENT ENVIRONMENT</small></div><div><button onClick={reset}>LOAD EXAMPLE</button><button onClick={add}>+ ADD SITE</button></div></header>
        <div className="cohortHead"><span>ENVIRONMENT</span><span>RESIDENT HOURS</span><span>OUTCOME</span><span/></div>
        <div className="cohortRows">{rows.map(row=><div className="cohortRow" key={row.id}>
          <label><span>Environment</span><input aria-label={`Environment name ${row.id}`} value={row.environment} maxLength={128} onChange={event=>update(row.id,{environment:event.target.value})}/></label>
          <label><span>Resident hours</span><input aria-label={`Resident hours for ${row.environment}`} type="number" min="0" max="10000" step="1" value={row.hours} onChange={event=>update(row.id,{hours:Math.min(HORIZON,Math.max(0,Number(event.target.value)||0))})}/></label>
          <label><span>Outcome</span><select aria-label={`Outcome for ${row.environment}`} value={row.outcome} onChange={event=>update(row.id,{outcome:event.target.value as Outcome})}><option value="censored">Censored / completed</option><option value="rejected">Voluntary rejection</option></select></label>
          <button className="removeRow" aria-label={`Remove ${row.environment}`} onClick={()=>remove(row.id)} disabled={rows.length===1}>×</button>
        </div>)}</div>
        <footer><span>{rows.length} ENVIRONMENTS · {rejections} EVENTS · {totalHours.toLocaleString()} RESIDENT HOURS</span><button onClick={exportSummary}>EXPORT AUDIT JSON ↓</button></footer>
      </div>

      <aside className="calcMethod">
        <header><span>CALCULATION TRACE</span><b>Ŝ(t)</b></header>
        <div className="dynamicCurve" aria-label="Calculated Kaplan–Meier retention curve">
          {result.points.slice(1).map((point,index)=><i key={`${point.time}-${index}`} style={{left:`${point.time/HORIZON*100}%`,height:`${point.survival*100}%`}}><span>{point.time.toLocaleString()}h</span></i>)}
          <em style={{height:`${result.survival10k*100}%`}}/>
        </div>
        <div className="traceRows">
          <div><span>ESTIMATOR</span><b>Kaplan–Meier</b></div>
          <div><span>HORIZON</span><b>10,000 h</b></div>
          <div><span>INTEGRAL</span><b>{(result.wanted*100).toFixed(0)} wanted h</b></div>
          <div><span>UNIT</span><b>Environment</b></div>
        </div>
        <p>Charging and ordinary downtime stay inside resident time. Mark only permanent, voluntary rejection as an event. Unrelated study exits are censored at their observed time.</p>
      </aside>
    </div>
    <div className="calcCaution"><b>STATISTICAL ELIGIBILITY IS NOT CERTIFICATION.</b><span>A qualifying cohort still needs complete intervention disclosure, passed safety gates, preregistration, and independent audit.</span></div>
  </section>;
}

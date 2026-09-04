"use client";

import { useState } from "react";
import { SiteNav } from "../components/SiteNav";
import { models, metricLabels, type Metric, type RobotModel } from "../leaderboard/models";

const metrics: Metric[] = ["overall", "manipulation", "navigation", "reasoning"];
type Cohort = "all" | "open" | "real" | "sim";

function inCohort(model: RobotModel, cohort: Cohort) {
  return cohort === "all" || (cohort === "open" && model.open) ||
    (cohort === "real" && model.reality === "REAL") || (cohort === "sim" && model.reality === "SIM");
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function BarChart({ rows, metric, selected, onSelect, compact = false, byName = false }: {
  rows: RobotModel[];
  metric: Metric;
  selected: string;
  onSelect: (name: string) => void;
  compact?: boolean;
  byName?: boolean;
}) {
  const ordered = [...rows].sort((a, b) => byName ? a.name.localeCompare(b.name) : b[metric] - a[metric] || a.name.localeCompare(b.name));
  return <div className={`agChart${compact ? " agChartCompact" : ""}`}>
    <div className="agAxis" aria-hidden="true"><span /> <div>{[0, 25, 50, 75, 100].map(tick => <span key={tick}>{tick}</span>)}</div><span /></div>
    <ol className="agBarList" aria-label={`${metricLabels[metric]} comparison, illustrative scores out of 100`}>
      {ordered.map(model => <li key={model.name}>
        <button type="button" className={`agBarRow${selected === model.name ? " isSelected" : ""}`} onClick={() => onSelect(model.name)} aria-pressed={selected === model.name} aria-label={`${model.name}: ${model[metric].toFixed(1)} out of 100, illustrative ${metricLabels[metric]}. Select model.`}>
          <span className="agBarName">{model.name}{!compact && <small>{model.org}</small>}</span>
          <span className="agTrack" aria-hidden="true"><span className="agFill" style={{ width: `${model[metric]}%` }} /></span>
          <strong>{model[metric].toFixed(1)}</strong>
        </button>
      </li>)}
    </ol>
    <p className="agChartFoot">Illustrative index · 0–100 · Higher is better</p>
  </div>;
}

export default function ArenaGPT() {
  const [selected, setSelected] = useState(models[0].name);
  const [metric, setMetric] = useState<Metric>("overall");
  const [cohort, setCohort] = useState<Cohort>("all");
  const [byName, setByName] = useState(false);
  const rows = models.filter(model => inCohort(model, cohort));
  const model = rows.find(row => row.name === selected) ?? rows[0];
  const cohortMedian = median(rows.map(row => row[metric]));
  const rank = 1 + rows.filter(row => row[metric] > model[metric]).length;
  const delta = model[metric] - cohortMedian;

  function changeCohort(next: Cohort) {
    setCohort(next);
    if (!models.some(row => row.name === selected && inCohort(row, next))) {
      setSelected(models.find(row => inCohort(row, next))!.name);
    }
  }

  return <main className="agPage">
    <SiteNav />
    <div className="shell agWorkspace">
      <header className="agMasthead">
        <div><div className="agBrandline"><span className="agMonogram" aria-hidden="true">A/</span><h1>Arena<span>GPT</span></h1><span className="agBeta">BETA</span></div><p>Robot intelligence, compared.</p></div>
        <nav aria-label="ArenaGPT sections"><a href="#comparison">Comparison</a><a href="#benchmarks">Benchmarks</a><a href="#evidence">Evidence & methodology</a></nav>
      </header>

      <div className="agDisclosure"><span className="agStatusDot" aria-hidden="true" /><p><strong>Illustrative dataset.</strong> These six model profiles use the existing Arena seed scores. They are not independently measured results or deployment rankings.</p><a href="#evidence">About the data ↗</a></div>

      <section className="agModelHeader" aria-labelledby="ag-model-title">
        <div><p className="agOverline">{model.org} <span>/</span> {model.kind}</p><h2 id="ag-model-title">{model.name}<span>Model analysis</span></h2><p>Compare task-level scores, explore the cohort, and see what evidence is still missing.</p></div>
        <div className="agControls">
          <label>Comparison set<select value={cohort} onChange={event => changeCohort(event.target.value as Cohort)}><option value="all">All 6 models</option><option value="open">Open-weight catalog</option><option value="real">Physical-robot catalog</option><option value="sim">Simulation catalog</option></select></label>
          <label>Selected model<select value={model.name} onChange={event => setSelected(event.target.value)}>{rows.map(row => <option key={row.name} value={row.name}>{row.name}</option>)}</select></label>
        </div>
      </section>

      <div className="agStats" aria-label={`${model.name} illustrative metric summary`}>
        {metrics.map(key => <button type="button" className={`agStat${metric === key ? " isActive" : ""}`} key={key} onClick={() => setMetric(key)} aria-pressed={metric === key}>
          <span>{metricLabels[key]}<i aria-hidden="true">↗</i></span><strong>{model[key].toFixed(1)}<small>/ 100</small></strong><span className="agStatNote">Illustrative score</span>
        </button>)}
      </div>

      <section id="comparison" className="agComparison" aria-labelledby="ag-comparison-title">
        <article className="agPanel agMainChart">
          <header className="agPanelHead"><div><span className="agOverline">MODEL COMPARISON</span><h2 id="ag-comparison-title">{metricLabels[metric]}</h2><p>Select a bar to inspect a model.</p></div><span className="agCount">{rows.length} models</span></header>
          <div className="agChartControls"><div className="agMetricButtons" role="group" aria-label="Comparison metric">{metrics.map(key => <button type="button" key={key} aria-pressed={metric === key} className={metric === key ? "active" : ""} onClick={() => setMetric(key)}>{key === "reasoning" ? "Reasoning" : key === "overall" ? "Overall" : metricLabels[key]}</button>)}</div><button type="button" className="agSort" onClick={() => setByName(!byName)} aria-label={byName ? "Sort by highest score" : "Sort by model name"}>Sort: {byName ? "name" : "score"} ↕</button></div>
          <BarChart rows={rows} metric={metric} selected={model.name} onSelect={setSelected} byName={byName} />
          <div className="agLegend"><span><i className="agSelectedSwatch" /> {model.name}</span><span><i /> Comparison models</span><span>Shared zero baseline</span></div>
        </article>

        <aside className="agProfile" aria-labelledby="ag-profile-title">
          <span className="agOverline">COMPARISON SUMMARY</span><h2 id="ag-profile-title">{model.name}</h2>
          <div className="agRank"><strong>#{rank}<small> / {rows.length}</small></strong><span>Illustrative {metricLabels[metric].toLowerCase()} rank</span></div>
          <p aria-live="polite">{model.name} has an illustrative score of <b>{model[metric].toFixed(1)}</b> for {metricLabels[metric].toLowerCase()}. {rows.length === 1 ? "This filtered set contains one model; no peer comparison is available." : <>{Math.abs(delta).toFixed(1)} points {delta >= 0 ? "above" : "below"} the selected cohort median of {cohortMedian.toFixed(1)}.</>}</p>
          <dl><div><dt>Catalog task</dt><dd>{model.task}</dd></div><div><dt>Catalog weights</dt><dd>{model.open ? "Open" : "Proprietary"}</dd></div><div><dt>Catalog setting</dt><dd>{model.reality === "REAL" ? "Physical robot" : "Simulation"}</dd></div><div><dt>Evidence status</dt><dd className="agPending">Not independently verified</dd></div></dl>
          <p className="agProfileNote">Catalog labels describe the seed profiles; they do not verify these scores.</p><a href="/leaderboard">Open the full leaderboard ↗</a>
        </aside>
      </section>

      <section id="benchmarks" className="agSection" aria-labelledby="ag-benchmarks-title">
        <header className="agSectionHead"><div><span className="agOverline">TASK-LEVEL COMPARISONS</span><h2 id="ag-benchmarks-title">Different work. Different strengths.</h2></div><p>The same selected cohort, separated by task.<br />All charts use a fixed 0–100 scale.</p></header>
        <div className="agSmallCharts">{metrics.filter(key => key !== "overall").map(key => <article className="agPanel" key={key}><header className="agPanelHead"><div><h3>{metricLabels[key]}</h3><p>Illustrative scores · {rows.length} models</p></div><span className="agSmallIcon" aria-hidden="true">↗</span></header><BarChart rows={rows} metric={key} selected={model.name} onSelect={setSelected} compact byName={byName} /></article>)}</div>
      </section>

      <section className="agSection" aria-labelledby="ag-field-title"><header className="agSectionHead"><div><span className="agOverline">BEYOND TASK SCORES</span><h2 id="ag-field-title">What matters in the field.</h2></div><a className="agTextLink" href="/wanted-10k/realtime">Explore the HILO protocol ↗</a></header>
        <div className="agMissingGrid">{[
          ["Human Burden", "Lower is better", "Human attention, supervision, and recovery under matched task exposure."],
          ["MTHI", "Longer is better", "Mean time to human intervention, reported with exposure and uncertainty."],
          ["Response latency", "Lower is better", "Measured decision and action latency, with p50, p95, and hardware disclosed."],
          ["Cost per mission", "Lower is better", "Compute, energy, human time, maintenance, and recovery per useful outcome."],
        ].map(([title, direction, copy]) => <article key={title}><span>{title}</span><strong>Not measured</strong><small>{direction}</small><p>{copy}</p></article>)}</div>
      </section>

      <section id="evidence" className="agEvidence agSection" aria-labelledby="ag-evidence-title"><div><span className="agOverline">EVIDENCE & METHODOLOGY</span><h2 id="ag-evidence-title">Know what a bar can tell you.</h2><p>ArenaGPT is Embodied Arena’s analysis interface. The current seed dataset demonstrates comparison behavior; it does not establish a winner or a new trained model.</p><a className="agTextLink" href="/wanted-10k">Read WANTED-10K evidence requirements ↗</a></div><dl>
        <div><dt>One shared dataset</dt><dd>These values also power the robotics leaderboard. Overall is a supplied seed index, not an average calculated from the three task scores.</dd></div>
        <div><dt>Comparable evidence first</dt><dd>Measured rankings need a frozen protocol, matched tasks and hardware, sample counts, and uncertainty. Missing observations stay unmeasured.</dd></div>
        <div><dt>Models, hardware, and safety</dt><dd>Jetson is an edge-compute platform. HILO evaluates the complete system; an independent safety kernel governs physical actions. Providers remain interchangeable.</dd></div>
      </dl></section>
      <div className="agBottom"><span>ARENAGPT / EMBODIED ARENA</span><p>Analysis layout inspired by <a href="https://artificialanalysis.ai/models/gpt-6-astra" target="_blank" rel="noreferrer">Artificial Analysis ↗</a>. No Artificial Analysis benchmark scores are reproduced.</p></div>
    </div>
  </main>;
}

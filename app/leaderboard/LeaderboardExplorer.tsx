"use client";
/* eslint jsx-a11y/no-noninteractive-tabindex: ["error", { "roles": ["region"] }] */

import { useState } from "react";
import { metricLabels, models, type Metric } from "./models";
import { scoreRank, selectModels, type EnvironmentFilter, type SortKey } from "./explorer";
import { track } from "../components/AnalyticsHeartbeat";
import "./leaderboard.css";

const metrics: Metric[] = ["overall", "manipulation", "navigation", "reasoning"];
const shortLabels: Record<Metric, string> = { overall: "Overall", manipulation: "Manipulation", navigation: "Navigation", reasoning: "Reasoning" };
const metricDescriptions: Record<Metric, string> = {
  overall: "A broad illustrative model index. It is not an average of the other columns.",
  manipulation: "Illustrative performance for grasping, moving, and handling objects.",
  navigation: "Illustrative performance for moving through an environment.",
  reasoning: "Illustrative performance for understanding scenes and planning actions.",
};

export function LeaderboardExplorer({ initialQuery = "" }: { initialQuery?: string }) {
  const [metric, setMetric] = useState<Metric>("overall");
  const [query, setQuery] = useState(initialQuery);
  const [openOnly, setOpenOnly] = useState(false);
  const [environment, setEnvironment] = useState<EnvironmentFilter>("all");
  const [sort, setSort] = useState<SortKey>("overall");
  const [ascending, setAscending] = useState(false);
  const [allMetrics, setAllMetrics] = useState(false);
  const [selection, setSelection] = useState<string | null>(null);
  const rows = selectModels(models, { query, openOnly, environment, sort, ascending });
  const chartRows = selectModels(rows, { query: "", openOnly: false, environment: "all", sort: metric, ascending: false });
  const selected = rows.find(model => model.name === selection);

  function changeMetric(next: Metric) {
    setMetric(next); setSort(next); setAscending(false);
    track("leaderboard_filter", "/leaderboard", { metric: next });
  }
  function changeSort(next: SortKey) {
    setAscending(sort === next ? !ascending : next === "name"); setSort(next);
  }
  function reset() { setQuery(""); setOpenOnly(false); setEnvironment("all"); }

  return <section className="lbExplorer shell" aria-label="Interactive robot leaderboard" id="leaderboard-table">
    <div className="lbNotice"><span className="lbBadge">ILLUSTRATIVE DATA</span><p>These six example profiles demonstrate the comparison tools. Scores are <strong>not measured benchmark results</strong>. Independently audited submissions belong in the <a href="/wanted-10k/leaderboard">WANTED-10K registry ↗</a>.</p></div>
    <details className="lbMethod"><summary>How to read the scores</summary><div><p>Every score uses a 0–100 illustrative scale, with higher values shown first by default. The overall index is a separate fixture, not a measured pass rate or a calculated average. Equal scores share a rank.</p><p>Real-world and simulation labels describe the example profiles. They do not establish verification, comparable hardware, sample sizes, runtime, or cost. Those measurements are not available in this dataset.</p><p>Switch a task to update the chart and ranking. Use “All metrics” to compare the four dimensions side by side; select a model for its full profile.</p></div></details>
    <div className="lbMetricTabs" role="group" aria-label="Ranking metric">{metrics.map(item => <button type="button" key={item} aria-pressed={metric === item} className={metric === item ? "isActive" : ""} onClick={() => changeMetric(item)}>{shortLabels[item]}</button>)}</div>
    <div className="lbFilters">
      <label className="lbSearch"><span>Search models</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Model, organization, or task" /></label>
      <label className="lbEnvironment"><span>Environment</span><select value={environment} onChange={event => setEnvironment(event.target.value as EnvironmentFilter)}><option value="all">All environments</option><option value="REAL">Real-world profiles</option><option value="SIM">Simulation profiles</option></select></label>
      <label className="lbOpen"><input type="checkbox" checked={openOnly} onChange={event => setOpenOnly(event.target.checked)} />Open models only</label>
      <span className="lbCount" role="status">{rows.length} of {models.length} models</span>
    </div>
    {rows.length === 0 ? <div className="lbEmpty"><h2>No models match these filters.</h2><p>Try another name, task, or environment.</p><button type="button" onClick={reset}>Clear filters</button></div> : <>
      <figure className="lbChartCard">
        <figcaption className="lbChartHead"><div><h2>Models — {allMetrics ? "all metrics" : metricLabels[metric]}</h2><p>{metricDescriptions[metric]}</p></div><div role="group" aria-label="Chart display"><button type="button" aria-pressed={!allMetrics} onClick={() => setAllMetrics(false)}>Selected metric</button><button type="button" aria-pressed={allMetrics} onClick={() => setAllMetrics(true)}>All metrics</button></div></figcaption>
        {allMetrics && <ul className="lbLegend" aria-label="Chart legend">{metrics.map(item => <li key={item}><i className={`lbColor-${item}`} />{shortLabels[item]}</li>)}</ul>}
        <div className="lbChartScroll" role="region" aria-label="Model comparison chart" tabIndex={0}>
          <div className="lbPlot">
            <div className="lbGrid" aria-hidden="true">{[100, 75, 50, 25, 0].map(tick => <div key={tick}><span>{tick}</span></div>)}</div>
            <ol className="lbBars" aria-label="Illustrative scores out of 100" style={{ gridTemplateColumns: `repeat(${chartRows.length}, minmax(95px, 1fr))` }}>
              {chartRows.map(model => <li key={model.name}><button type="button" className={`lbModelBar ${selection === model.name ? "isSelected" : ""}`} aria-pressed={selection === model.name} aria-label={`View ${model.name}: ${model[metric].toFixed(1)} illustrative ${metricLabels[metric]} out of 100`} onClick={() => setSelection(selection === model.name ? null : model.name)}>
                <span className="lbBarColumns" aria-hidden="true">{(allMetrics ? metrics : [metric]).map(item => <span key={item} className={`lbBar lbColor-${item}`} style={{ height: `${model[item]}%` }}><b>{model[item].toFixed(1)}</b></span>)}</span>
                <span className="lbBarLabel">{model.name}<small>{model.org}</small></span>
              </button></li>)}
            </ol>
          </div>
        </div>
        <p className="lbChartNote">Illustrative index · 0–100 · Select a model to inspect its profile</p>
      </figure>
      <div className="lbTableHead"><h2>Model rankings</h2><a href="/arenagpt">Open ArenaGPT comparisons ↗</a></div>
      <div className="lbTableScroll" role="region" aria-label="Sortable model rankings" tabIndex={0}>
        <table className="lbTable"><caption>Illustrative scores only. Rank follows {metricLabels[metric].toLowerCase()} within the current filters.</caption><thead><tr><th scope="col">Rank</th><th scope="col" aria-sort={sort === "name" ? ascending ? "ascending" : "descending" : "none"}><button type="button" onClick={() => changeSort("name")}>Model {sort === "name" ? ascending ? "↑" : "↓" : "↕"}</button></th>{metrics.map(item => <th key={item} scope="col" className={metric === item ? "lbActiveColumn" : ""} aria-sort={sort === item ? ascending ? "ascending" : "descending" : "none"}><button type="button" onClick={() => changeSort(item)}>{shortLabels[item]} {sort === item ? ascending ? "↑" : "↓" : "↕"}</button></th>)}<th scope="col">Environment</th></tr></thead><tbody>{rows.map(model => <tr key={model.name} className={selection === model.name ? "lbSelectedRow" : ""}><td><span className={`lbRank ${scoreRank(model, rows, metric) === 1 ? "lbRankFirst" : ""}`}>{scoreRank(model, rows, metric)}</span></td><th scope="row"><button type="button" className="lbModelLink" aria-pressed={selection === model.name} onClick={() => setSelection(selection === model.name ? null : model.name)}>{model.name}<span aria-hidden="true"> ↗</span></button>{model.open && <span className="lbOpenBadge">OPEN</span>}<small>{model.org}</small></th>{metrics.map(item => <td key={item} className={metric === item ? "lbActiveColumn" : ""}>{model[item].toFixed(1)}</td>)}<td><span className={`lbEnvironmentTag ${model.reality === "SIM" ? "isSim" : ""}`}>{model.reality === "REAL" ? "Real-world" : "Simulation"}</span></td></tr>)}</tbody></table>
      </div>
      {selected && <section className="lbProfile" aria-label={`${selected.name} profile`}><div className="lbProfileHead"><div><span className="lbBadge">EXAMPLE PROFILE</span><h2>{selected.name}</h2><p>{selected.org} · {selected.kind}</p></div><button type="button" onClick={() => setSelection(null)}>Close profile</button></div><p>{selected.task}. {selected.open ? "Listed as an open model in the sample dataset." : "Listed as a closed model in the sample dataset."}</p><dl>{metrics.map(item => <div key={item}><dt>{metricLabels[item]}</dt><dd>{selected[item].toFixed(1)}<small> / 100</small></dd></div>)}</dl><p>Task counts, cost, runtime, evaluation dates, and independently verified evidence: <strong>not available</strong>. This profile is not a certification or deployment recommendation.</p><a href="/wanted-10k/protocol">Read the evaluation protocol ↗</a></section>}
    </>}
    <div className="lbEvidenceLink"><div><h2>Bring evidence to the leaderboard.</h2><p>Review the WANTED-10K protocol and prepare an audit pack for independently evaluated field results.</p></div><a href="/wanted-10k/audit">Prepare audit pack →</a></div>
  </section>;
}

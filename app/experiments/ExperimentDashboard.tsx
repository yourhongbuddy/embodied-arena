"use client";
import { useEffect,useState } from "react";
import { EXPERIMENT_GOAL_OUTBOX_STORAGE_KEY } from "./outbox";
import { EXPERIMENT_ANALYSIS_COHORT,EXPERIMENT_TREATMENT_FINGERPRINT,ROTATOR_VERSION,WANTED_LANDING_EXPERIMENT } from "./rotator";

type Row={variant:string;label:string;weight_basis_points:number;exposed_units:number;goal_units:number;conversion_rate:number|null;conversion_interval_95:{low:number;high:number}|null};
type Comparison={variant:string;label:string;baseline:"control";absolute_lift:number|null;familywise_interval_95:{low:number;high:number}|null;interval_position:"unavailable"|"entirely_above_zero"|"entirely_below_zero"|"includes_zero"};
type RatioCheck={status:"insufficient"|"pass"|"alert";p_value:number|null};
type DecisionGate={status:"descriptive_only";automatic_action:false;blocking_reasons:readonly string[];required_before_decision:readonly string[]};
type Data={status:"ready"|"unavailable";experiment:string;analysis_cohort:string;treatment_fingerprint:string;implementation_version:string;window_days:number;primary_goal:string;total_exposed_units:number;cross_variant_units_excluded:number;multi_token_units_excluded:number;decision_gate:DecisionGate;sample_ratio_mismatch:RatioCheck;variants:Row[];comparisons:Comparison[]};

const percentage=(value:number)=>`${value>=0?"+":""}${(value*100).toFixed(1)} pp`;
const intervalLabel=(value:Comparison["interval_position"])=>({unavailable:"UNAVAILABLE",entirely_above_zero:"ENTIRELY ABOVE 0",entirely_below_zero:"ENTIRELY BELOW 0",includes_zero:"INCLUDES 0"})[value];

export function ExperimentDashboard(){
  const[data,setData]=useState<Data|null>(null);const[failed,setFailed]=useState(false);
  useEffect(()=>{sessionStorage.setItem("ea_experiment_operator","1");let active=true;fetch("/api/experiments").then(response=>response.ok?response.json():Promise.reject()).then(value=>{if(active)setData(value)}).catch(()=>{if(active)setFailed(true)});return()=>{active=false}},[]);
  const rows=data?.variants||WANTED_LANDING_EXPERIMENT.variants.map(variant=>({variant:variant.id,label:variant.label,weight_basis_points:variant.weight_basis_points,exposed_units:0,goal_units:0,conversion_rate:null,conversion_interval_95:null}));
  const comparisons=data?.comparisons||WANTED_LANDING_EXPERIMENT.variants.filter(variant=>variant.id!=="control").map(variant=>({variant:variant.id,label:variant.label,baseline:"control" as const,absolute_lift:null,familywise_interval_95:null,interval_position:"unavailable" as const}));
  const reset=()=>{
    localStorage.removeItem("ea_experiment_seed");
    sessionStorage.removeItem(EXPERIMENT_GOAL_OUTBOX_STORAGE_KEY);
    for(let index=sessionStorage.length-1;index>=0;index--){const key=sessionStorage.key(index);if(key?.startsWith("ea_exposure:")||key?.startsWith("ea_assignment:"))sessionStorage.removeItem(key)}
    for(let index=localStorage.length-1;index>=0;index--){const key=localStorage.key(index);if(key?.startsWith("ea_exposure:")||key?.startsWith("ea_experiment_unit:"))localStorage.removeItem(key)}
    location.href="/wanted-10k";
  };
  return <div className="experimentSurface">
    <section className="experimentControls">
      <header><div><span>ACTIVE ROTATOR</span><b>{WANTED_LANDING_EXPERIMENT.id}</b></div><i>{ROTATOR_VERSION} · {EXPERIMENT_ANALYSIS_COHORT}</i></header>
      <div className="allocationTrack">{WANTED_LANDING_EXPERIMENT.variants.map(variant=><i key={variant.id} className={`allocation allocation--${variant.id}`} style={{width:`${variant.weight_basis_points/100}%`}} title={`${variant.label}: ${variant.weight_basis_points/100}%`}/>)}</div>
      <div className="experimentVariants">{WANTED_LANDING_EXPERIMENT.variants.map(variant=><article key={variant.id}>
        <div><span>{variant.id.toUpperCase()}</span><strong>{variant.weight_basis_points/100}%</strong></div><h2>{variant.label}</h2><p>{variant.hypothesis}</p><a href={`/wanted-10k?wanted_variant=${variant.id}`}>PREVIEW VERSION →</a>
      </article>)}</div>
      <div className="rotatorActions"><a href="/wanted-10k">OPEN MY ASSIGNED VERSION →</a><button onClick={reset}>NEW LOCAL ASSIGNMENT</button><a href="/experiments.json">MACHINE CONTRACT ↗</a></div>
    </section>
    <section className="experimentResults">
      <header><div><span>RESULTS / ROLLING 30 DAYS</span><b>PRIMARY CTA · DISTINCT EXPERIMENT UNITS</b></div><i className={data?.status==="ready"?"resultLive":"resultWaiting"}>{data?.status==="ready"?"LIVE":"WAITING FOR HOSTED DATA"}</i></header>
      {(failed||data?.status==="unavailable")&&<p className="experimentNotice">The rotator is active. Aggregate results will appear after the hosted analytics database receives assignments and goal events.</p>}
      <div className="ratioCheck ratioCheck--insufficient"><div><b>DECISION GATE</b><span>DESCRIPTIVE ONLY</span></div><p>These rolling-window intervals cannot select or stop a version. Decision use requires a preregistered fixed or sequential design, valid repeated-look control, an independent edge abuse control, and a precommitted decision rule.</p></div>
      <div className={`ratioCheck ratioCheck--${data?.sample_ratio_mismatch.status||"insufficient"}`}><div><b>SAMPLE RATIO CHECK</b><span>{data?.sample_ratio_mismatch.status==="alert"?"ALLOCATION DRIFT":data?.sample_ratio_mismatch.status==="pass"?"WITHIN EXPECTATION":"WAITING FOR SAMPLE"}</span></div><p>{data?.sample_ratio_mismatch.p_value===null||data?.sample_ratio_mismatch.p_value===undefined?"Evaluates after every variant expects at least five exposures.":`Pearson χ² (2 df), p = ${data.sample_ratio_mismatch.p_value<.0001?"<0.0001":data.sample_ratio_mismatch.p_value.toFixed(4)} · alert below 0.001.`}</p></div>
      <div className="resultTable"><header><span>VERSION</span><span>EXPOSED UNITS</span><span>PRIMARY GOALS</span><span>CONVERSION</span><span>95% INTERVAL</span></header>{rows.map(row=><article key={row.variant}><span><i className={`resultDot resultDot--${row.variant}`}/><b>{row.label}</b><small>{row.variant}</small></span><strong>{row.exposed_units}</strong><strong>{row.goal_units}</strong><strong>{row.conversion_rate===null?"—":`${(row.conversion_rate*100).toFixed(1)}%`}</strong><strong>{row.conversion_interval_95?`${(row.conversion_interval_95.low*100).toFixed(1)}–${(row.conversion_interval_95.high*100).toFixed(1)}%`:"—"}</strong></article>)}</div>
      <div className="resultTable comparisonTable"><header><span>CONTROL COMPARISON</span><span>BASELINE</span><span>ABS. LIFT</span><span>FWER 95% INTERVAL</span><span>INTERVAL POSITION</span></header>{comparisons.map(row=><article key={row.variant}><span><i className={`resultDot resultDot--${row.variant}`}/><b>{row.label}</b><small>{row.variant}</small></span><strong>control</strong><strong>{row.absolute_lift===null?"—":percentage(row.absolute_lift)}</strong><strong>{row.familywise_interval_95?`${percentage(row.familywise_interval_95.low)} to ${percentage(row.familywise_interval_95.high)}`:"—"}</strong><strong>{intervalLabel(row.interval_position)}</strong></article>)}</div>
      <aside><b>READING THE TEST</b><p>The randomization and analysis unit is one experiment-scoped anonymous browser ID containing no user attributes. The server recomputes its assigned version and cohort-bound exposure token before accepting an event. Results aggregate only when both the analysis cohort ({data?.analysis_cohort??EXPERIMENT_ANALYSIS_COHORT}) and the SHA-256 treatment fingerprint ({(data?.treatment_fingerprint??EXPERIMENT_TREATMENT_FINGERPRINT).slice(7,19)}…) match, so compatible software releases do not restart the test while content or allocation drift cannot mix into it. Assignment, treatment, allocation, or measurement-contract changes require a new cohort. Cross-variant units ({data?.cross_variant_units_excluded??0}) and same-variant units with multiple tokens ({data?.multi_token_units_excluded??0}) are excluded and disclosed for this window. Repeat sessions and receipts for the same unit and token are deduplicated. The ID is not shared across experiments, and first-party analytics uses a rolling 35-day raw-event window. This does not authenticate human traffic. Control comparisons use Newcombe–Wilson intervals with Bonferroni control across two comparisons, but there is no repeated-look adjustment or stopping rule. Interval-position labels are descriptive geometry, not directional decisions. Preview and operator traffic are rejected or excluded.</p></aside>
    </section>
  </div>
}

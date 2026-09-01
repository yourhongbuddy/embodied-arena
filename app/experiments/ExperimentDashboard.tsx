"use client";
import { useEffect,useState } from "react";
import { ROTATOR_VERSION,WANTED_LANDING_EXPERIMENT } from "./rotator";

type Row={variant:string;label:string;weight_basis_points:number;exposed_sessions:number;goal_sessions:number;conversion_rate:number|null;conversion_interval_95:{low:number;high:number}|null};
type RatioCheck={status:"insufficient"|"pass"|"alert";p_value:number|null};
type Data={status:"ready"|"unavailable";experiment:string;window_days:number;primary_goal:string;total_exposed_sessions:number;sample_ratio_mismatch:RatioCheck;variants:Row[]};

export function ExperimentDashboard(){
  const[data,setData]=useState<Data|null>(null);const[failed,setFailed]=useState(false);
  useEffect(()=>{sessionStorage.setItem("ea_experiment_operator","1");let active=true;fetch("/api/experiments").then(response=>response.ok?response.json():Promise.reject()).then(value=>{if(active)setData(value)}).catch(()=>{if(active)setFailed(true)});return()=>{active=false}},[]);
  const rows=data?.variants||WANTED_LANDING_EXPERIMENT.variants.map(variant=>({variant:variant.id,label:variant.label,weight_basis_points:variant.weight_basis_points,exposed_sessions:0,goal_sessions:0,conversion_rate:null,conversion_interval_95:null}));
  const reset=()=>{
    localStorage.removeItem("ea_experiment_seed");
    for(let index=sessionStorage.length-1;index>=0;index--){const key=sessionStorage.key(index);if(key?.startsWith("ea_exposure:"))sessionStorage.removeItem(key)}
    location.href="/wanted-10k";
  };
  return <div className="experimentSurface">
    <section className="experimentControls">
      <header><div><span>ACTIVE ROTATOR</span><b>{WANTED_LANDING_EXPERIMENT.id}</b></div><i>{ROTATOR_VERSION}</i></header>
      <div className="allocationTrack">{WANTED_LANDING_EXPERIMENT.variants.map(variant=><i key={variant.id} className={`allocation allocation--${variant.id}`} style={{width:`${variant.weight_basis_points/100}%`}} title={`${variant.label}: ${variant.weight_basis_points/100}%`}/>)}</div>
      <div className="experimentVariants">{WANTED_LANDING_EXPERIMENT.variants.map(variant=><article key={variant.id}>
        <div><span>{variant.id.toUpperCase()}</span><strong>{variant.weight_basis_points/100}%</strong></div><h2>{variant.label}</h2><p>{variant.hypothesis}</p><a href={`/wanted-10k?wanted_variant=${variant.id}`}>PREVIEW VERSION →</a>
      </article>)}</div>
      <div className="rotatorActions"><a href="/wanted-10k">OPEN MY ASSIGNED VERSION →</a><button onClick={reset}>NEW LOCAL ASSIGNMENT</button><a href="/experiments.json">MACHINE CONTRACT ↗</a></div>
    </section>
    <section className="experimentResults">
      <header><div><span>RESULTS / ROLLING 30 DAYS</span><b>PRIMARY CTA · DISTINCT SESSIONS</b></div><i className={data?.status==="ready"?"resultLive":"resultWaiting"}>{data?.status==="ready"?"LIVE":"WAITING FOR HOSTED DATA"}</i></header>
      {(failed||data?.status==="unavailable")&&<p className="experimentNotice">The rotator is active. Aggregate results will appear after the hosted analytics database receives assignments and goal events.</p>}
      <div className={`ratioCheck ratioCheck--${data?.sample_ratio_mismatch.status||"insufficient"}`}><div><b>SAMPLE RATIO CHECK</b><span>{data?.sample_ratio_mismatch.status==="alert"?"ALLOCATION DRIFT":data?.sample_ratio_mismatch.status==="pass"?"WITHIN EXPECTATION":"WAITING FOR SAMPLE"}</span></div><p>{data?.sample_ratio_mismatch.p_value===null||data?.sample_ratio_mismatch.p_value===undefined?"Evaluates after every variant expects at least five exposures.":`Pearson χ² (2 df), p = ${data.sample_ratio_mismatch.p_value<.0001?"<0.0001":data.sample_ratio_mismatch.p_value.toFixed(4)} · alert below 0.001.`}</p></div>
      <div className="resultTable"><header><span>VERSION</span><span>EXPOSED</span><span>PRIMARY GOALS</span><span>CONVERSION</span><span>95% INTERVAL</span></header>{rows.map(row=><article key={row.variant}><span><i className={`resultDot resultDot--${row.variant}`}/><b>{row.label}</b><small>{row.variant}</small></span><strong>{row.exposed_sessions}</strong><strong>{row.goal_sessions}</strong><strong>{row.conversion_rate===null?"—":`${(row.conversion_rate*100).toFixed(1)}%`}</strong><strong>{row.conversion_interval_95?`${(row.conversion_interval_95.low*100).toFixed(1)}–${(row.conversion_interval_95.high*100).toFixed(1)}%`:"—"}</strong></article>)}</div>
      <aside><b>READING THE TEST</b><p>Goals count only when the same session records a later matching exposure. Wilson intervals show per-version uncertainty; they do not compare variants or declare a winner. Preview and operator traffic are excluded.</p></aside>
    </section>
  </div>
}

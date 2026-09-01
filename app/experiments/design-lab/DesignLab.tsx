"use client";

import{useEffect,useMemo,useState}from"react";
import{canonicalExperimentDesignPlan,DEFAULT_EXPERIMENT_DESIGN_INPUT,experimentDesignPlanDocument,experimentDesignPlanSha256,planFixedHorizonExperiment,validExperimentDesignInput,type ExperimentDesignInput}from"../design-lab";

const integer=(value:number)=>new Intl.NumberFormat("en-US").format(value);
const percent=(value:number,digits=1)=>`${(value*100).toFixed(digits)}%`;
const points=(value:number)=>`${(value*100).toFixed(1)} pp`;

export function DesignLab(){
  const[input,setInput]=useState<ExperimentDesignInput>(DEFAULT_EXPERIMENT_DESIGN_INPUT),[digestState,setDigestState]=useState({canonical:"",digest:""}),[copyStatus,setCopyStatus]=useState<"idle"|"copied"|"failed">("idle");
  const valid=validExperimentDesignInput(input),design=useMemo(()=>valid?planFixedHorizonExperiment(input):null,[input,valid]),document=useMemo(()=>valid?experimentDesignPlanDocument(input):null,[input,valid]);
  const canonical=valid?canonicalExperimentDesignPlan(input):"",digest=digestState.canonical===canonical?digestState.digest:"";
  useEffect(()=>{let active=true;if(valid)void experimentDesignPlanSha256(input).then(value=>{if(active)setDigestState({canonical,digest:value})});return()=>{active=false}},[canonical,input,valid]);
  const update=(key:keyof ExperimentDesignInput,value:number)=>setInput(current=>({...current,[key]:value}));
  const copy=async()=>{if(!valid)return;try{await navigator.clipboard.writeText(canonicalExperimentDesignPlan(input));setCopyStatus("copied")}catch{setCopyStatus("failed")}};
  const download=()=>{if(!valid)return;const url=URL.createObjectURL(new Blob([canonicalExperimentDesignPlan(input)],{type:"application/json"})),anchor=window.document.createElement("a");anchor.href=url;anchor.download="wanted-landing-design-plan.json";anchor.click();URL.revokeObjectURL(url)};
  return <section className="designLabWorkspace shell">
    <div className="designLabGrid">
      <section className="designInputs">
        <header><div><span>FIXED-HORIZON INPUTS</span><b>TWO-SIDED · TWO COMPARISONS</b></div><i>LOCAL ONLY</i></header>
        <div className="designFieldGrid">
          <label>Baseline conversion<span>Control primary-CTA rate</span><input type="number" min="0.1" max="95" step="0.1" value={input.baseline_rate*100} onChange={event=>update("baseline_rate",Number(event.target.value)/100)}/><b>%</b></label>
          <label>Proof minimum lift<span>Absolute detectable difference</span><input type="number" min="0.1" max="25" step="0.1" value={input.proof_minimum_detectable_lift*100} onChange={event=>update("proof_minimum_detectable_lift",Number(event.target.value)/100)}/><b>pp</b></label>
          <label>Developer minimum lift<span>Absolute detectable difference</span><input type="number" min="0.1" max="25" step="0.1" value={input.developer_minimum_detectable_lift*100} onChange={event=>update("developer_minimum_detectable_lift",Number(event.target.value)/100)}/><b>pp</b></label>
          <label>Familywise alpha<span>Bonferroni across both tests</span><input type="number" min="0.1" max="10" step="0.1" value={input.familywise_alpha*100} onChange={event=>update("familywise_alpha",Number(event.target.value)/100)}/><b>%</b></label>
          <label>Statistical power<span>Under the planned alternative</span><input type="number" min="60" max="99" step="1" value={input.power*100} onChange={event=>update("power",Number(event.target.value)/100)}/><b>%</b></label>
          <label>Accepted delivery rate<span>Issued units reaching exposure</span><input type="number" min="50" max="100" step="1" value={input.expected_accepted_delivery_rate*100} onChange={event=>update("expected_accepted_delivery_rate",Number(event.target.value)/100)}/><b>%</b></label>
          <label>Eligible units per day<span>Planning estimate, not a gate</span><input type="number" min="1" max="1000000" step="1" value={input.eligible_units_per_day} onChange={event=>update("eligible_units_per_day",Number(event.target.value))}/><b>/ day</b></label>
        </div>
        {!valid&&<p className="designError" role="alert">Use rates within the displayed bounds and keep each baseline-plus-lift below 100%.</p>}
      </section>
      <section className="designSummary">
        <header><div><span>PLANNED CLOSE</span><b>ACCEPTED EXPOSURE TARGETS</b></div><i>{design?"DRAFT":"INVALID"}</i></header>
        <div className="designTargetHero"><span>TOTAL ACCEPTED TARGET</span><strong>{design?integer(design.total_accepted_target):"—"}</strong><small>anonymous browser-profile units</small></div>
        <div className="designTargets"><article><span>CONTROL</span><b>{design?integer(design.stop_targets_accepted_exposures.control):"—"}</b></article><article><span>PROOF</span><b>{design?integer(design.stop_targets_accepted_exposures.proof):"—"}</b></article><article><span>DEVELOPER</span><b>{design?integer(design.stop_targets_accepted_exposures.developer):"—"}</b></article></div>
        <div className="designTiming"><p><span>PLANNED ISSUED UNITS</span><b>{design?integer(design.total_issued_target):"—"}</b></p><p><span>ESTIMATED CALENDAR</span><b>{design?`${integer(design.estimated_calendar_days)} days`:"—"}</b></p></div>
      </section>
    </div>
    <section className="designComparisons">
      <header><div><span>PAIRWISE POWER PLAN</span><b>UNEQUAL 34% / 33% ALLOCATION</b></div><i>{design?`zα ${design.z_alpha_two_sided.toFixed(3)} · zβ ${design.z_power.toFixed(3)}`:"WAITING"}</i></header>
      <div className="designComparisonTable"><header><span>COMPARISON</span><span>PLANNED RATE</span><span>MINIMUM LIFT</span><span>ACCEPTED CONTROL</span><span>ACCEPTED VERSION</span><span>ISSUED VERSION</span></header>{design?.rows.map(row=><article key={row.variant}><span><i className={`resultDot resultDot--${row.variant}`}/><b>{row.variant.toUpperCase()} vs CONTROL</b></span><code>{percent(row.alternative_rate)}</code><code>{points(row.minimum_detectable_absolute_lift)}</code><strong>{integer(row.required_accepted_control)}</strong><strong>{integer(row.required_accepted_variant)}</strong><strong>{integer(row.planned_issued_variant)}</strong></article>)}</div>
      <p>Normal-approximation planning for two independent proportions uses the live unequal allocation. Bonferroni divides the familywise alpha across the two two-sided comparisons. Issued-unit estimates compensate only for the entered delivery assumption; the close rule remains accepted exposures per arm.</p>
    </section>
    <section className="designFreeze">
      <header><div><span>CANONICAL DESIGN ARTIFACT</span><b>SHA-256 · SORTED-KEY JSON</b></div><i>NOT EXTERNALLY TIMESTAMPED</i></header>
      <div className="designDigest"><span>PLAN DIGEST</span><code>{digest||valid?digest||"CALCULATING…":"INVALID INPUT"}</code></div>
      <div className="designFreezeActions"><button type="button" onClick={copy} disabled={!valid}>{copyStatus==="copied"?"COPIED":copyStatus==="failed"?"COPY FAILED":"COPY CANONICAL PLAN"}</button><button type="button" onClick={download} disabled={!valid}>DOWNLOAD PLAN.JSON</button><a href="/experiments/design-lab.json">OPEN MACHINE CONTRACT ↗</a></div>
      <details><summary>Inspect canonical plan contents</summary><pre>{document?JSON.stringify(document,null,2):"Invalid design inputs"}</pre></details>
    </section>
    <section className="designDecisionBoundary"><b>WHAT STILL BLOCKS A DECISION</b><div><span>01</span><p><strong>External preregistration</strong>Publish the canonical plan and digest before eligible traffic begins. A browser-generated digest is not a timestamp.</p></div><div><span>02</span><p><strong>Independent traffic controls</strong>The current site does not authenticate humans or independently control automated fabrication.</p></div><div><span>03</span><p><strong>One fixed close</strong>Do not use the rolling dashboard or confidence intervals for early stopping. Close only after every per-arm accepted-exposure target is met.</p></div><div><span>04</span><p><strong>Precommitted selection rule</strong>Define how integrity failures, ties, harmful effects, and multiple positive variants are handled before reading outcomes.</p></div></section>
  </section>;
}

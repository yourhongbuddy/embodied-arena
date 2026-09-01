"use client";

import{useMemo,useState}from"react";
import{experimentAllocationBoundaries,EXPERIMENT_ASSIGNMENT_LAB_SAMPLE_SIZES,simulateExperimentCohort}from"../assignment-lab";
import{assignWantedVariant,exposureTokenForAssignment,validExperimentUnitId,WANTED_LANDING_EXPERIMENT}from"../rotator";

const DEFAULT_UNIT="00000000-0000-4000-8000-000000000002";
const percentage=(value:number)=>`${(value*100).toFixed(2)}%`;
const deltaPoints=(value:number)=>`${value>=0?"+":""}${(value*100).toFixed(2)} pp`;
const integer=(value:number)=>new Intl.NumberFormat("en-US").format(value);

export function AssignmentLab(){
  const[unitId,setUnitId]=useState(DEFAULT_UNIT);const[sampleSize,setSampleSize]=useState<number>(1_000);
  const assignment=useMemo(()=>validExperimentUnitId(unitId)?assignWantedVariant(unitId):null,[unitId]);
  const exposureToken=assignment?exposureTokenForAssignment(unitId,assignment.variant):null;
  const boundaries=useMemo(()=>experimentAllocationBoundaries(),[]);
  const cohort=useMemo(()=>simulateExperimentCohort(sampleSize),[sampleSize]);
  const createUnit=()=>setUnitId(crypto.randomUUID());
  return <section className="assignmentLabWorkspace shell">
    <div className="assignmentLabGrid">
      <section className="assignmentInspector">
        <header><div><span>ASSIGNMENT REPRODUCER</span><b>EXPERIMENT-SCOPED SYNTHETIC UNIT</b></div><i>LOCAL ONLY</i></header>
        <div className="assignmentInput"><label htmlFor="assignment-unit">Browser-unit UUID</label><div><input id="assignment-unit" value={unitId} onChange={event=>setUnitId(event.target.value.trim())} spellCheck={false} aria-invalid={!assignment}/><button type="button" onClick={createUnit}>NEW SYNTHETIC UNIT</button></div>{!assignment&&<p role="alert">Enter a valid UUID v4 with an RFC 4122 variant.</p>}</div>
        <div className={`assignmentOutput${assignment?"":" assignmentOutput--invalid"}`}>
          <span>ASSIGNED PRESENTATION</span><strong>{assignment?.variant.toUpperCase()||"INVALID UNIT"}</strong>
          <div><p><b>Bucket</b><code>{assignment?.bucket??"—"} / 9,999</code></p><p><b>Mode</b><code>{assignment?.mode??"—"}</code></p><p><b>Exposure token</b><code>{exposureToken??"—"}</code></p></div>
          {assignment&&<a href={`/wanted-10k?wanted_variant=${assignment.variant}`}>PREVIEW THIS VERSION →</a>}
        </div>
        <aside><b>WHAT THIS PROVES</b><p>The same unit returns the same bucket, version, and token under the frozen experiment identity. The token is deterministic routing material—not authentication and not proof of delivery.</p></aside>
      </section>
      <section className="allocationInspector">
        <header><div><span>EXACT ALLOCATION</span><b>10,000 BASIS-POINT BUCKETS</b></div><i>NO GAP · NO OVERLAP</i></header>
        <div className="allocationBoundaryTable"><div><span>VERSION</span><span>BUCKETS</span><span>WEIGHT</span></div>{boundaries.map(row=><article key={row.id}><span><i className={`resultDot resultDot--${row.id}`}/><b>{row.id.toUpperCase()}</b><small>{row.label}</small></span><code>{integer(row.start)}–{integer(row.end)}</code><strong>{(row.weight_basis_points/100).toFixed(1)}%</strong></article>)}</div>
        <nav className="assignmentPreviews" aria-label="Named presentation previews">{WANTED_LANDING_EXPERIMENT.variants.map(variant=><a key={variant.id} href={`/wanted-10k?wanted_variant=${variant.id}`}>{variant.id.toUpperCase()} PREVIEW →</a>)}</nav>
      </section>
    </div>
    <section className="cohortDryRun">
      <header><div><span>SYNTHETIC COHORT DRY RUN</span><b>DETERMINISTIC UUID SERIES · NOT LIVE TRAFFIC</b></div><label>Sample size<select value={sampleSize} onChange={event=>setSampleSize(Number(event.target.value))}>{EXPERIMENT_ASSIGNMENT_LAB_SAMPLE_SIZES.map(value=><option key={value} value={value}>{integer(value)}</option>)}</select></label></header>
      <div className="cohortRunSummary"><article><span>SYNTHETIC UNITS</span><b>{integer(sampleSize)}</b><small>generated locally</small></article><article><span>MAX SHARE DELTA</span><b>{deltaPoints(cohort.max_absolute_share_delta)}</b><small>absolute vs configured</small></article><article><span>PEARSON χ²</span><b>{cohort.pearson_chi_square_df_2.toFixed(3)}</b><small>diagnostic only · 2 df</small></article><article className="cohortRunBoundary"><span>DECISION EFFECT</span><b>NONE</b><small>never selects a version</small></article></div>
      <div className="cohortRunTable"><header><span>VERSION</span><span>OBSERVED UNITS</span><span>OBSERVED SHARE</span><span>CONFIGURED SHARE</span><span>DELTA</span></header>{cohort.rows.map(row=><article key={row.id}><span><i className={`resultDot resultDot--${row.id}`}/><b>{row.id.toUpperCase()}</b></span><strong>{integer(row.observed)}</strong><code>{percentage(row.observed_share)}</code><code>{percentage(row.expected_share)}</code><code>{deltaPoints(row.delta)}</code></article>)}</div>
      <p className="cohortDryRunNote">This is an implementation smoke test over deterministic synthetic IDs. It is not a randomization inference, traffic-quality assessment, experiment result, or substitute for the hosted receipt and ingestion gates.</p>
    </section>
  </section>;
}

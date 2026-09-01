"use client";

import { useEffect, useRef, useState } from "react";
import { queueExperimentGoal,trackConfirmed } from "../components/AnalyticsHeartbeat";
import { nativeLocalStorage,persistentRandomUnit,safeSessionStorage } from "../experiments/browser-storage";
import { startAcknowledgedDelivery } from "../experiments/delivery";
import { EXPERIMENT_ANALYSIS_COHORT,EXPERIMENT_EXPOSURE_RETRY_DELAYS_MS,EXPERIMENT_TREATMENT_FINGERPRINT,exposureTokenForAssignment,resolveWantedAssignment, ROTATOR_VERSION,validExperimentUnitId,validWantedSessionAssignment,validWantedVariant,WANTED_LANDING_EXPERIMENT,WANTED_LANDING_SECONDARY_ACTIONS,WANTED_LANDING_TREATMENTS, type WantedAssignment } from "../experiments/rotator";

function experimentUnitId(){
  const key=`ea_experiment_unit:${WANTED_LANDING_EXPERIMENT.id}`;
  return persistentRandomUnit(nativeLocalStorage(),key,()=>crypto.randomUUID(),validExperimentUnitId);
}

function exposureKey(assignment: WantedAssignment) {
  return `ea_exposure:${assignment.experiment}:${EXPERIMENT_ANALYSIS_COHORT}:${assignment.variant}`;
}

function assignmentLockKey(){return`ea_assignment:${WANTED_LANDING_EXPERIMENT.id}:${EXPERIMENT_ANALYSIS_COHORT}`}
function lockedSessionAssignment(){try{const value=JSON.parse(safeSessionStorage.getItem(assignmentLockKey())||"null");return validWantedSessionAssignment(value)?value:null}catch{return null}}

export function WantedLandingExperience() {
  const [assignment, setAssignment] = useState<WantedAssignment|null>(null),[storageUnavailable,setStorageUnavailable]=useState(false);
  const exposureId=useRef<string|null>(null),unitId=useRef<string|null>(null),shouldTrackExposure=useRef(false);
  useEffect(() => {
    const unit=experimentUnitId();
    const preview = new URLSearchParams(location.search).get("wanted_variant");
    if(!unit){const next:WantedAssignment={experiment:WANTED_LANDING_EXPERIMENT.id,variant:validWantedVariant(preview)?preview:"control",bucket:null,mode:"preview"};const update=window.setTimeout(()=>{setStorageUnavailable(true);setAssignment(next)},0);return()=>window.clearTimeout(update)}
    const resolved = resolveWantedAssignment(unit, preview);
    const operator=safeSessionStorage.getItem("ea_experiment_operator")==="1";
    let next:WantedAssignment=operator&&resolved.mode==="assigned"?{...resolved,mode:"preview"}:resolved;
    if(next.mode==="assigned"){const locked=lockedSessionAssignment();next=locked??next;if(!locked)safeSessionStorage.setItem(assignmentLockKey(),JSON.stringify(next))}
    if(next.mode==="assigned"){
      const key=exposureKey(next),token=exposureTokenForAssignment(unit,next.variant);
      unitId.current=unit;exposureId.current=token;shouldTrackExposure.current=safeSessionStorage.getItem(`${key}:sent`)!=="1";
    }
    const update=window.setTimeout(()=>setAssignment(next),0);
    return()=>window.clearTimeout(update);
  }, []);
  useEffect(()=>{
    if(assignment?.mode!=="assigned"||!unitId.current||!exposureId.current||!shouldTrackExposure.current)return;
    const token=exposureId.current,sentKey=`${exposureKey(assignment)}:sent`;
    const metadata={experiment:assignment.experiment,analysis_cohort:EXPERIMENT_ANALYSIS_COHORT,treatment_fingerprint:EXPERIMENT_TREATMENT_FINGERPRINT,unit_id:unitId.current,variant:assignment.variant,assignment_mode:assignment.mode,rotator_version:ROTATOR_VERSION,exposure_id:token};
    const delivery=startAcknowledgedDelivery({
      send:()=>trackConfirmed("experiment_exposure",location.pathname,metadata),
      isAcknowledged:()=>safeSessionStorage.getItem(sentKey)==="1",
      markAcknowledged:()=>{shouldTrackExposure.current=false;safeSessionStorage.setItem(sentKey,"1")},
      retryDelaysMs:EXPERIMENT_EXPOSURE_RETRY_DELAYS_MS,
    });
    window.addEventListener("online",delivery.retryNow);
    return()=>{delivery.cancel();window.removeEventListener("online",delivery.retryNow)};
  },[assignment]);
  const displayAssignment: WantedAssignment = assignment ?? {experiment:WANTED_LANDING_EXPERIMENT.id,variant:"control",bucket:null,mode:"assigned"};
  const variant = WANTED_LANDING_TREATMENTS[displayAssignment.variant];
  const goal = (goalName: string, href: string) => {
    if (assignment?.mode === "assigned"&&unitId.current&&exposureId.current) queueExperimentGoal("/wanted-10k", { experiment: assignment.experiment, analysis_cohort:EXPERIMENT_ANALYSIS_COHORT,treatment_fingerprint:EXPERIMENT_TREATMENT_FINGERPRINT,unit_id:unitId.current, variant: assignment.variant, goal: goalName, destination: href, assignment_mode: assignment.mode,rotator_version:ROTATOR_VERSION,exposure_id:exposureId.current });
  };
  const pending=assignment===null;
  return <section className={`wantedHero shell wantedVariant wantedVariant--${assignment?.variant??"pending"}`} data-experiment={WANTED_LANDING_EXPERIMENT.id} data-variant={assignment?.variant??"pending"} data-exclusion-reason={storageUnavailable?"storage_unavailable":undefined} aria-busy={pending}>
    {pending&&<div className="variantPending" role="status"><i/><b>WANTED-10K</b><span>Assigning a stable privacy-first site version</span></div>}
    {assignment?.mode === "preview" && <div className="variantPreview" role="status"><b>{storageUnavailable?"STORAGE UNAVAILABLE":"PREVIEW MODE"}</b><span>{assignment.variant.toUpperCase()} · excluded from experiment results</span><a href="/experiments">ROTATOR →</a></div>}
    <div className="wantedHeroCopy" aria-hidden={pending}>
      <span className="eyebrow"><i className="liveDot"/> {variant.eyebrow}</span>
      <h1>{variant.headline[0]}<br/><em>{variant.headline[1]}</em></h1>
      <p>{variant.intro}</p>
      <div className="wantedActions">
        <a className="primary" href={variant.primary.href} onClick={()=>goal("primary_cta",variant.primary.href)}>{variant.primary.label} <span>→</span></a>
        {WANTED_LANDING_SECONDARY_ACTIONS.map(([label,href])=><a className="secondary" href={href} key={href} onClick={()=>goal(`secondary_${href.split("/").pop()}`,href)}>{label}</a>)}
      </div>
      <div className="wantedProof">{variant.proof.map(([value,label])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
    </div>
    <div className="survivalCard" aria-label="Illustrative robot retention survival curve" aria-hidden={pending}>
      <header><span>{variant.cardLabel}</span><b>Ŝ(t)</b></header>
      <div className="curvePlot">
        <span className="y y1">100%</span><span className="y y2">50%</span><span className="y y3">0%</span>
        <span className="x x1">0h</span><span className="x x2">5K</span><span className="x x3">10K</span>
        <i className="curveStep s1"/><i className="curveStep s2"/><i className="curveStep s3"/><i className="curveStep s4"/><i className="curveStep s5"/>
        <i className="censor c1">+</i><i className="censor c2">+</i><i className="censor c3">+</i>
      </div>
      <footer><span>AREA UNDER RETENTION CURVE</span><strong>W = 74.6</strong><small>ILLUSTRATIVE</small></footer>
    </div>
  </section>;
}

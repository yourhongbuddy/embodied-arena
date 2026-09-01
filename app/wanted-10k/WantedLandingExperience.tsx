"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "../components/AnalyticsHeartbeat";
import { resolveWantedAssignment, ROTATOR_VERSION, WANTED_LANDING_EXPERIMENT, type WantedAssignment, type WantedVariant } from "../experiments/rotator";

const content: Record<WantedVariant, { eyebrow: string; headline: React.ReactNode; intro: string; primary: { label: string; href: string }; proof: [string,string][]; cardLabel: string }> = {
  control: {
    eyebrow: "OPEN TECHNICAL SPEC · VERSION 0.2",
    headline: <>Still wanted<br/><em>after 10,000 hours?</em></>,
    intro: "Most benchmarks ask whether a robot can complete a task. WANTED-10K asks whether people continue choosing the robot after novelty fades, hardware ages, routines change, and mistakes accumulate.",
    primary: { label: "Open protocol kit", href: "/wanted-10k/protocol" },
    proof: [["10,000","RESIDENT HOURS"],["20+","INDEPENDENT ENVIRONMENTS"],["1","PRIMARY SCORE"],["0","SAFETY TRADE-OFFS"]],
    cardLabel: "RETENTION / KAPLAN–MEIER",
  },
  proof: {
    eyebrow: "ONE SCORE · NON-COMPENSATORY SAFETY · INDEPENDENT AUDIT",
    headline: <>One score for<br/><em>what happens after the demo.</em></>,
    intro: "WANTED turns continued coexistence into a survival endpoint: time until a person permanently and voluntarily rejects the robot. Every burden stays visible, every safety gate stays absolute, and unsupported tails stay unscored.",
    primary: { label: "Inspect the evidence chain", href: "/wanted-10k/protocol" },
    proof: [["W","NORMALIZED RMST"],["10K","FIXED HORIZON"],["95%","CLUSTER CI"],["L4=0","HARD SAFETY GATE"]],
    cardLabel: "PRIMARY ESTIMATOR / NORMALIZED RMST",
  },
  developer: {
    eyebrow: "VENDOR-NEUTRAL · SIX EVENTS · ZERO RUNTIME DEPENDENCIES",
    headline: <>Ten thousand hours.<br/><em>One integration contract.</em></>,
    intro: "Keep the robot's native stack. Add six signed event types, a continuous resident clock, and a reproducible endpoint table. WANTED supplies the schemas, reference adapter, local verifiers, and immutable audit handoff.",
    primary: { label: "Integrate a robot", href: "/wanted-10k/sdk" },
    proof: [["6","EVENT TYPES"],["1","ORDERED CHAIN"],["0","RUNTIME DEPENDENCIES"],["100%","AUDIT BINDING"]],
    cardLabel: "REFERENCE OUTPUT / RETENTION CURVE",
  },
};

const secondaryActions = [
  ["Open HILO Realtime", "/wanted-10k/realtime"], ["Preflight a policy", "/wanted-10k/preflight"], ["Verify resident hours", "/wanted-10k/exposure-ledger"], ["Calculate a cohort", "/wanted-10k/calculator"], ["Reproduce a score", "/wanted-10k/analysis-reproduction"], ["Audited registry", "/wanted-10k/leaderboard"], ["Research basis", "/wanted-10k/evidence"],
];

function assignmentSeed() {
  const key = "ea_experiment_seed";
  let seed = localStorage.getItem(key);
  if (!seed) { seed = crypto.randomUUID(); localStorage.setItem(key, seed); }
  return seed;
}

function exposureKey(assignment: WantedAssignment) {
  return `ea_exposure:${assignment.experiment}:${assignment.variant}`;
}

const exposureTokenPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function WantedLandingExperience() {
  const [assignment, setAssignment] = useState<WantedAssignment|null>(null);
  const exposureId=useRef<string|null>(null),shouldTrackExposure=useRef(false);
  useEffect(() => {
    const preview = new URLSearchParams(location.search).get("wanted_variant");
    const resolved = resolveWantedAssignment(assignmentSeed(), preview);
    const next = sessionStorage.getItem("ea_experiment_operator")==="1"&&resolved.mode==="assigned"?{...resolved,mode:"preview" as const}:resolved;
    if(next.mode==="assigned"){
      const key=exposureKey(next),stored=sessionStorage.getItem(key),token=stored&&exposureTokenPattern.test(stored)?stored:crypto.randomUUID();
      sessionStorage.setItem(key,token);exposureId.current=token;shouldTrackExposure.current=sessionStorage.getItem(`${key}:sent`)!=="1";
    }
    const update=window.setTimeout(()=>setAssignment(next),0);
    return()=>window.clearTimeout(update);
  }, []);
  useEffect(()=>{
    if(assignment?.mode!=="assigned"||!exposureId.current||!shouldTrackExposure.current)return;
    shouldTrackExposure.current=false;sessionStorage.setItem(`${exposureKey(assignment)}:sent`,"1");
    track("experiment_exposure",location.pathname,{experiment:assignment.experiment,variant:assignment.variant,assignment_mode:assignment.mode,rotator_version:ROTATOR_VERSION,exposure_id:exposureId.current});
  },[assignment]);
  const displayAssignment: WantedAssignment = assignment ?? {experiment:WANTED_LANDING_EXPERIMENT.id,variant:"control",bucket:null,mode:"assigned"};
  const variant = content[displayAssignment.variant];
  const goal = (goalName: string, href: string) => {
    if (assignment?.mode === "assigned"&&exposureId.current) track("experiment_goal", location.pathname, { experiment: assignment.experiment, variant: assignment.variant, goal: goalName, destination: href, assignment_mode: assignment.mode,rotator_version:ROTATOR_VERSION,exposure_id:exposureId.current });
  };
  const pending=assignment===null;
  return <section className={`wantedHero shell wantedVariant wantedVariant--${assignment?.variant??"pending"}`} data-experiment={WANTED_LANDING_EXPERIMENT.id} data-variant={assignment?.variant??"pending"} aria-busy={pending}>
    {pending&&<div className="variantPending" role="status"><i/><b>WANTED-10K</b><span>Assigning a stable privacy-first site version</span></div>}
    {assignment?.mode === "preview" && <div className="variantPreview" role="status"><b>PREVIEW MODE</b><span>{assignment.variant.toUpperCase()} · excluded from experiment results</span><a href="/experiments">ROTATOR →</a></div>}
    <div className="wantedHeroCopy" aria-hidden={pending}>
      <span className="eyebrow"><i className="liveDot"/> {variant.eyebrow}</span>
      <h1>{variant.headline}</h1>
      <p>{variant.intro}</p>
      <div className="wantedActions">
        <a className="primary" href={variant.primary.href} onClick={()=>goal("primary_cta",variant.primary.href)}>{variant.primary.label} <span>→</span></a>
        {secondaryActions.map(([label,href])=><a className="secondary" href={href} key={href} onClick={()=>goal(`secondary_${href.split("/").pop()}`,href)}>{label}</a>)}
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

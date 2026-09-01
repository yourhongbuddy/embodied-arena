"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { safeSessionStorage } from "../experiments/browser-storage";
import { isLocalOnlyAnalyticsPath } from "../experiments/analytics-boundary";
import { createExperimentOutbox,EXPERIMENT_GOAL_OUTBOX_STORAGE_KEY,type DeliveryDisposition } from "../experiments/outbox";
import { currentTrackingExclusionReason } from "../experiments/privacy-choice";
import { EXPERIMENT_GOAL_OUTBOX_MAX_AGE_MS,EXPERIMENT_GOAL_OUTBOX_MAX_ENTRIES } from "../experiments/rotator";

export function analyticsSessionId() {
  const key = "ea_session";
  let value = safeSessionStorage.getItem(key);
  if (!value) { value = crypto.randomUUID(); safeSessionStorage.setItem(key,value); }
  return value;
}

function eventBody(eventType:string,path:string,metadata:Record<string,unknown>) {
  return JSON.stringify({sessionId:analyticsSessionId(),eventType,path,metadata});
}

export function track(eventType:string, path=location.pathname, metadata:Record<string,unknown>={}) {
  if(isLocalOnlyAnalyticsPath(path)||currentTrackingExclusionReason())return;
  const body = eventBody(eventType,path,metadata);
  if (navigator.sendBeacon) navigator.sendBeacon("/api/analytics",new Blob([body],{type:"application/json"}));
  else fetch("/api/analytics",{method:"POST",headers:{"content-type":"application/json"},body,keepalive:true}).catch(()=>{});
}

export async function trackDelivery(eventType:string,path=location.pathname,metadata:Record<string,unknown>={}):Promise<DeliveryDisposition> {
  if(isLocalOnlyAnalyticsPath(path)||currentTrackingExclusionReason())return"rejected";
  try {
    const response=await fetch("/api/analytics",{method:"POST",headers:{"content-type":"application/json"},body:eventBody(eventType,path,metadata),keepalive:true});
    if(response.status===204)return response.headers.get("x-analytics-status")==="accepted"?"accepted":"retry";
    return response.status>=400&&response.status<500?"rejected":"retry";
  } catch { return "retry"; }
}

export async function trackConfirmed(eventType:string,path=location.pathname,metadata:Record<string,unknown>={}) {return(await trackDelivery(eventType,path,metadata))==="accepted"}

let goalOutbox:ReturnType<typeof createExperimentOutbox>|null=null;
function experimentGoalOutbox(){return goalOutbox??=createExperimentOutbox({storage:safeSessionStorage,storageKey:EXPERIMENT_GOAL_OUTBOX_STORAGE_KEY,send:event=>trackDelivery(event.eventType,event.path,event.metadata),makeId:()=>crypto.randomUUID(),now:()=>Date.now(),maxEntries:EXPERIMENT_GOAL_OUTBOX_MAX_ENTRIES,maxAgeMs:EXPERIMENT_GOAL_OUTBOX_MAX_AGE_MS})}
export function queueExperimentGoal(path:"/wanted-10k",metadata:Record<string,unknown>){const outbox=experimentGoalOutbox();outbox.enqueue(path,metadata);void outbox.flush()}
export function flushExperimentGoalOutbox(){return experimentGoalOutbox().flush()}

export function AnalyticsHeartbeat() {
  const pathname=usePathname();
  useEffect(()=>{
    if(isLocalOnlyAnalyticsPath(pathname)||currentTrackingExclusionReason())return;
    track("page_view",pathname,{referrer:document.referrer?"referral":"direct"});
    const flushGoals=()=>{void flushExperimentGoalOutbox()};flushGoals();window.addEventListener("online",flushGoals);
    const id=window.setInterval(()=>{if(document.visibilityState==="visible")track("heartbeat",pathname)},30000);
    return()=>{window.clearInterval(id);window.removeEventListener("online",flushGoals)};
  },[pathname]);
  return null;
}

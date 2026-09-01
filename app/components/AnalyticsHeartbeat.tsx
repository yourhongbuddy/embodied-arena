"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function sessionId() {
  const key = "ea_session";
  let value = sessionStorage.getItem(key);
  if (!value) { value = crypto.randomUUID(); sessionStorage.setItem(key,value); }
  return value;
}

function eventBody(eventType:string,path:string,metadata:Record<string,unknown>) {
  return JSON.stringify({sessionId:sessionId(),eventType,path,metadata});
}

export function track(eventType:string, path=location.pathname, metadata:Record<string,unknown>={}) {
  const body = eventBody(eventType,path,metadata);
  if (navigator.sendBeacon) navigator.sendBeacon("/api/analytics",new Blob([body],{type:"application/json"}));
  else fetch("/api/analytics",{method:"POST",headers:{"content-type":"application/json"},body,keepalive:true}).catch(()=>{});
}

export async function trackConfirmed(eventType:string,path=location.pathname,metadata:Record<string,unknown>={}) {
  try {
    const response=await fetch("/api/analytics",{method:"POST",headers:{"content-type":"application/json"},body:eventBody(eventType,path,metadata),keepalive:true});
    return response.status===204&&response.headers.get("x-analytics-status")==="accepted";
  } catch { return false; }
}

export function AnalyticsHeartbeat() {
  const pathname=usePathname();
  useEffect(()=>{
    track("page_view",pathname,{referrer:document.referrer?"referral":"direct"});
    const id=window.setInterval(()=>{if(document.visibilityState==="visible")track("heartbeat",pathname)},30000);
    return()=>window.clearInterval(id);
  },[pathname]);
  return null;
}

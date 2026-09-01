import { canonicalize } from "../wanted-10k/conformance/validator.ts";
import { EXPERIMENT_RESULTS_SNAPSHOT_CONFORMANCE_DIGEST,EXPERIMENT_RESULTS_SNAPSHOT_CONFORMANCE_INPUT,EXPERIMENT_RESULTS_SNAPSHOT_PROFILE } from "./snapshot-contract.ts";

export { EXPERIMENT_RESULTS_SNAPSHOT_CONFORMANCE_DIGEST,EXPERIMENT_RESULTS_SNAPSHOT_CONFORMANCE_INPUT,EXPERIMENT_RESULTS_SNAPSHOT_PROFILE };

const hex=(value:ArrayBuffer)=>Array.from(new Uint8Array(value),byte=>byte.toString(16).padStart(2,"0")).join("");

export function assertExperimentSnapshotIJson(value:unknown,path="result",seen=new Set<object>()){
  if(["undefined","bigint","function","symbol"].includes(typeof value))throw new TypeError(`${path} is not an I-JSON value`);
  if(typeof value==="number"&&!Number.isFinite(value))throw new TypeError(`${path} contains a non-finite number`);
  if(typeof value==="string"&&/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value))throw new TypeError(`${path} contains an unpaired Unicode surrogate`);
  if(value&&typeof value==="object"){
    if(seen.has(value))throw new TypeError(`${path} contains a cycle`);seen.add(value);
    if(Array.isArray(value))value.forEach((item,index)=>assertExperimentSnapshotIJson(item,`${path}[${index}]`,seen));
    else{if(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)throw new TypeError(`${path} must contain plain JSON objects`);for(const[key,item]of Object.entries(value)){assertExperimentSnapshotIJson(key,`${path}.<key>`,seen);assertExperimentSnapshotIJson(item,`${path}.${key}`,seen)}}
    seen.delete(value);
  }
}

export async function experimentResultsSnapshot(payload:Record<string,unknown>){
  assertExperimentSnapshotIJson(payload);
  const bytes=new TextEncoder().encode(canonicalize(payload));
  const digest=hex(await crypto.subtle.digest("SHA-256",bytes));
  return{profile:EXPERIMENT_RESULTS_SNAPSHOT_PROFILE,digest:`sha256:${digest}`,algorithm:"SHA-256",canonicalization:"RFC8785_JCS",scope:"complete_ready_response_without_analysis_snapshot",signed:false,proves_authenticity:false} as const;
}

export async function verifyExperimentResultsSnapshot(payload:Record<string,unknown>){
  const snapshot=payload.analysis_snapshot;
  if(!snapshot||typeof snapshot!=="object"||Array.isArray(snapshot))return false;
  if(Object.keys(snapshot).sort().join(",")!==["algorithm","canonicalization","digest","profile","proves_authenticity","scope","signed"].join(","))return false;
  const unsigned={...payload};delete unsigned.analysis_snapshot;
  let expected:Awaited<ReturnType<typeof experimentResultsSnapshot>>;try{expected=await experimentResultsSnapshot(unsigned)}catch{return false}
  return(snapshot as Record<string,unknown>).profile===expected.profile&&(snapshot as Record<string,unknown>).digest===expected.digest&&(snapshot as Record<string,unknown>).algorithm===expected.algorithm&&(snapshot as Record<string,unknown>).canonicalization===expected.canonicalization&&(snapshot as Record<string,unknown>).scope===expected.scope&&(snapshot as Record<string,unknown>).signed===false&&(snapshot as Record<string,unknown>).proves_authenticity===false;
}

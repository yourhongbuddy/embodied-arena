import { canonicalize } from "../wanted-10k/conformance/validator.ts";
import { EXPERIMENT_RESULTS_SNAPSHOT_CONFORMANCE_DIGEST,EXPERIMENT_RESULTS_SNAPSHOT_CONFORMANCE_INPUT,EXPERIMENT_RESULTS_SNAPSHOT_PROFILE } from "./snapshot-contract.ts";

export { EXPERIMENT_RESULTS_SNAPSHOT_CONFORMANCE_DIGEST,EXPERIMENT_RESULTS_SNAPSHOT_CONFORMANCE_INPUT,EXPERIMENT_RESULTS_SNAPSHOT_PROFILE };

const hex=(value:ArrayBuffer)=>Array.from(new Uint8Array(value),byte=>byte.toString(16).padStart(2,"0")).join("");

export async function experimentResultsSnapshot(payload:Record<string,unknown>){
  const bytes=new TextEncoder().encode(canonicalize(payload));
  const digest=hex(await crypto.subtle.digest("SHA-256",bytes));
  return{profile:EXPERIMENT_RESULTS_SNAPSHOT_PROFILE,digest:`sha256:${digest}`,algorithm:"SHA-256",canonicalization:"RFC8785_JCS",scope:"complete_ready_response_without_analysis_snapshot",signed:false,proves_authenticity:false} as const;
}

export async function verifyExperimentResultsSnapshot(payload:Record<string,unknown>){
  const snapshot=payload.analysis_snapshot;
  if(!snapshot||typeof snapshot!=="object"||Array.isArray(snapshot))return false;
  const unsigned={...payload};delete unsigned.analysis_snapshot;
  const expected=await experimentResultsSnapshot(unsigned);
  return(snapshot as Record<string,unknown>).profile===expected.profile&&(snapshot as Record<string,unknown>).digest===expected.digest&&(snapshot as Record<string,unknown>).algorithm===expected.algorithm&&(snapshot as Record<string,unknown>).canonicalization===expected.canonicalization&&(snapshot as Record<string,unknown>).scope===expected.scope&&(snapshot as Record<string,unknown>).signed===false&&(snapshot as Record<string,unknown>).proves_authenticity===false;
}

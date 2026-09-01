import { EXPERIMENT_RESULTS_SNAPSHOT_CONFORMANCE_DIGEST,EXPERIMENT_RESULTS_SNAPSHOT_CONFORMANCE_INPUT,EXPERIMENT_RESULTS_SNAPSHOT_PROFILE,EXPERIMENT_SNAPSHOT_VERIFIER_VERSION } from "./snapshot-contract.ts";

export { EXPERIMENT_SNAPSHOT_VERIFIER_VERSION };

export const experimentSnapshotVerifierSource=String.raw`/**
 * Embodied Arena experiment-result snapshot verifier — 0.31-SVS1
 * Zero dependencies, local-only, and no network requests.
 */

export const EXPERIMENT_SNAPSHOT_VERIFIER_VERSION="0.31-SVS1";
export const EXPERIMENT_RESULTS_SNAPSHOT_PROFILE="0.30-AS1";
export const CONFORMANCE_VECTOR=Object.freeze({input:{a:1,b:"wanted"},digest:"sha256:8ff8387cd312bf990e1aa4968d53756965b64e3c9c91c4aac1aaf662156fde93"});
const SNAPSHOT_KEYS=["algorithm","canonicalization","digest","profile","proves_authenticity","scope","signed"];

export function assertIJson(value,path="result",seen=new Set()){
  if(["undefined","bigint","function","symbol"].includes(typeof value))throw new TypeError(path+" is not an I-JSON value");
  if(typeof value==="number"&&!Number.isFinite(value))throw new TypeError(path+" contains a non-finite number");
  if(typeof value==="string"&&/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value))throw new TypeError(path+" contains an unpaired Unicode surrogate");
  if(value&&typeof value==="object"){
    if(seen.has(value))throw new TypeError(path+" contains a cycle");seen.add(value);
    if(Array.isArray(value))value.forEach((item,index)=>assertIJson(item,path+"["+index+"]",seen));
    else{if(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)throw new TypeError(path+" must contain plain JSON objects");for(const[key,item]of Object.entries(value)){assertIJson(key,path+".<key>",seen);assertIJson(item,path+"."+key,seen)}}
    seen.delete(value);
  }
}

function canonicalizeKnownIJson(value){if(value===null||typeof value!=="object")return JSON.stringify(value);if(Array.isArray(value))return "["+value.map(canonicalizeKnownIJson).join(",")+"]";return "{"+Object.keys(value).sort().map(key=>JSON.stringify(key)+":"+canonicalizeKnownIJson(value[key])).join(",")+"}"}
export function canonicalize(value){assertIJson(value);return canonicalizeKnownIJson(value)}
const hex=value=>Array.from(new Uint8Array(value),byte=>byte.toString(16).padStart(2,"0")).join("");
export async function sha256Canonical(value){return"sha256:"+hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(canonicalize(value))))}

const failed=errors=>({verifier_profile:EXPERIMENT_SNAPSHOT_VERIFIER_VERSION,status:"fail",snapshot_profile:EXPERIMENT_RESULTS_SNAPSHOT_PROFILE,declared_digest:null,calculated_digest:null,errors});
export async function verifyExperimentResultsSnapshot(payload){
  if(!payload||typeof payload!=="object"||Array.isArray(payload))return failed(["Result must be a JSON object."]);
  const errors=[];let calculatedDigest=null;const snapshot=payload.analysis_snapshot;
  if(!snapshot||typeof snapshot!=="object"||Array.isArray(snapshot))errors.push("analysis_snapshot must be an object.");
  else{
    if(JSON.stringify(Object.keys(snapshot).sort())!==JSON.stringify(SNAPSHOT_KEYS))errors.push("analysis_snapshot must contain exactly the seven profile fields.");
    if(snapshot.profile!==EXPERIMENT_RESULTS_SNAPSHOT_PROFILE)errors.push("Snapshot profile mismatch.");
    if(snapshot.algorithm!=="SHA-256"||snapshot.canonicalization!=="RFC8785_JCS"||snapshot.scope!=="complete_ready_response_without_analysis_snapshot")errors.push("Snapshot algorithm, canonicalization, or scope mismatch.");
    if(snapshot.signed!==false||snapshot.proves_authenticity!==false)errors.push("Snapshot must remain explicitly unsigned and non-authenticating.");
    if(typeof snapshot.digest!=="string"||!/^sha256:[0-9a-f]{64}$/.test(snapshot.digest))errors.push("Snapshot digest shape is invalid.");
  }
  const unsigned={...payload};delete unsigned.analysis_snapshot;
  try{calculatedDigest=await sha256Canonical(unsigned)}catch(error){errors.push(error instanceof Error?error.message:"Result is not valid I-JSON.")}
  const declaredDigest=snapshot&&typeof snapshot==="object"&&!Array.isArray(snapshot)&&typeof snapshot.digest==="string"?snapshot.digest:null;
  if(calculatedDigest!==null&&declaredDigest!==calculatedDigest)errors.push("Declared digest does not match the canonical unsigned result.");
  return{verifier_profile:EXPERIMENT_SNAPSHOT_VERIFIER_VERSION,status:errors.length?"fail":"pass",snapshot_profile:EXPERIMENT_RESULTS_SNAPSHOT_PROFILE,declared_digest:declaredDigest,calculated_digest:calculatedDigest,errors};
}

export async function verifyExperimentResultsJson(text){try{return await verifyExperimentResultsSnapshot(JSON.parse(text))}catch{return failed(["Input is not valid JSON."])} }
export async function verifyConformanceVector(){const calculated_digest=await sha256Canonical(CONFORMANCE_VECTOR.input);return{status:calculated_digest===CONFORMANCE_VECTOR.digest?"pass":"fail",expected_digest:CONFORMANCE_VECTOR.digest,calculated_digest}}
`;

export const experimentSnapshotVerifierContract={name:"Embodied Arena Experiment Result Snapshot Verifier",version:EXPERIMENT_SNAPSHOT_VERIFIER_VERSION,snapshot_profile:EXPERIMENT_RESULTS_SNAPSHOT_PROFILE,module:"/experiments/wanted-result-snapshot.mjs",contract:"/experiments/snapshot-verifier.json",format:"JavaScript ESM",runtime_dependencies:0,runtime_requirements:["Web Crypto SHA-256","TextEncoder"],performs_network_requests:false,exports:["assertIJson","canonicalize","sha256Canonical","verifyExperimentResultsSnapshot","verifyExperimentResultsJson","verifyConformanceVector"],verification:["strict_I-JSON","exact_snapshot_field_set","profile_and_scope","unsigned_disclosure","canonical_SHA-256_digest"],conformance_vector:{input:EXPERIMENT_RESULTS_SNAPSHOT_CONFORMANCE_INPUT,digest:EXPERIMENT_RESULTS_SNAPSHOT_CONFORMANCE_DIGEST},privacy:"local_only_no_result_uploads",interpretation:"detects result-content drift; does not authenticate the server, sign the result, validate traffic, or authorize experiment decisions"} as const;

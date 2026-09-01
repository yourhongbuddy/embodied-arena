import { EXPERIMENT_ROTATOR_CONFORMANCE_VECTORS,EXPERIMENT_ROTATOR_SDK_VERSION } from "./rotator-sdk-contract.ts";

export { EXPERIMENT_ROTATOR_CONFORMANCE_VECTORS,EXPERIMENT_ROTATOR_SDK_VERSION };

export const experimentRotatorSdkSource=String.raw`/**
 * Embodied Arena WANTED landing rotator SDK — 0.32-RSDK1
 * Zero dependencies, local-only, and no network requests.
 */

export const EXPERIMENT_ROTATOR_SDK_VERSION="0.32-RSDK1";
export const EXPERIMENT_ID="wanted_landing_v1";
export const ANALYSIS_COHORT="wanted_landing_v1-C8";
export const ASSIGNMENT_SALT="wanted-landing-v1-2026-08-31";
export const ALLOCATION_BASIS_POINTS=10000;
export const VARIANTS=Object.freeze([{id:"control",weight_basis_points:3400},{id:"proof",weight_basis_points:3300},{id:"developer",weight_basis_points:3300}]);
export const CONFORMANCE_VECTORS=Object.freeze([
  Object.freeze({unit_id:"00000000-0000-4000-8000-000000000002",experiment:"wanted_landing_v1",variant:"control",bucket:840,mode:"assigned",exposure_token:"541b164a-551b-47dd-921b-1324531b14b7"}),
  Object.freeze({unit_id:"00000000-0000-4000-8000-000000000001",experiment:"wanted_landing_v1",variant:"proof",bucket:3697,mode:"assigned",exposure_token:"1e560e66-1f56-4ff9-9c56-0b401d560cd3"}),
  Object.freeze({unit_id:"00000000-0000-4000-8000-000000000003",experiment:"wanted_landing_v1",variant:"developer",bucket:8459,mode:"assigned",exposure_token:"7f0215e0-8002-4773-8102-190682021a99"}),
]);
export const CLI_EXIT_CODES=Object.freeze({pass:0,verification_failed:1,usage_or_input_error:2});
const CLAIM_KEYS=["bucket","experiment","exposure_token","mode","unit_id","variant"];

export function fnv1a32(value){let hash=0x811c9dc5;for(let index=0;index<value.length;index++){hash^=value.charCodeAt(index);hash=Math.imul(hash,0x01000193)}return hash>>>0}
export function validExperimentUnitId(value){return typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)}
export function validVariant(value){return VARIANTS.some(variant=>variant.id===value)}
export function variantForBucket(bucket){if(!Number.isInteger(bucket)||bucket<0||bucket>=ALLOCATION_BASIS_POINTS)return null;let boundary=0;for(const variant of VARIANTS){boundary+=variant.weight_basis_points;if(bucket<boundary)return variant.id}return null}
export function assignWantedVariant(seed){if(typeof seed!=="string"||seed.length<8||seed.length>200)throw new Error("A bounded anonymous assignment ID is required.");const bucket=fnv1a32(EXPERIMENT_ID+"|"+ASSIGNMENT_SALT+"|"+seed)%ALLOCATION_BASIS_POINTS,variant=variantForBucket(bucket);if(variant)return{experiment:EXPERIMENT_ID,variant,bucket,mode:"assigned"};throw new Error("Experiment allocation does not cover every bucket.")}
export function assignmentForUnit(unitId){if(!validExperimentUnitId(unitId))throw new Error("A valid experiment unit ID is required.");return assignWantedVariant(unitId)}
const hashHex=value=>fnv1a32(value).toString(16).padStart(8,"0");
export function exposureTokenForAssignment(unitId,variant){if(!validExperimentUnitId(unitId))throw new Error("A valid experiment unit ID is required.");const assignment=assignWantedVariant(unitId);if(assignment.variant!==variant)throw new Error("The variant does not match the experiment unit assignment.");const material=Array.from({length:4},(_,index)=>hashHex(EXPERIMENT_ID+"|"+ANALYSIS_COHORT+"|"+variant+"|"+unitId+"|"+index)).join("").split("");material[12]="4";material[16]=["8","9","a","b"][parseInt(material[16],16)%4];const hex=material.join("");return hex.slice(0,8)+"-"+hex.slice(8,12)+"-"+hex.slice(12,16)+"-"+hex.slice(16,20)+"-"+hex.slice(20)}
export function assignmentRecord(unitId){const assignment=assignmentForUnit(unitId);return{unit_id:unitId,...assignment,exposure_token:exposureTokenForAssignment(unitId,assignment.variant)}}
export function verifyAssignment(unitId,claim){const errors=[];let expected=null;try{expected=assignmentRecord(unitId)}catch(error){errors.push(error instanceof Error?error.message:"Assignment could not be reproduced.")}if(!claim||typeof claim!=="object"||Array.isArray(claim))errors.push("Claim must be an object.");else{if(JSON.stringify(Object.keys(claim).sort())!==JSON.stringify(CLAIM_KEYS))errors.push("Claim must contain exactly the six assignment-record fields.");if(expected)for(const key of CLAIM_KEYS)if(claim[key]!==expected[key])errors.push(key+" does not match the reproduced assignment.")}return{verifier_profile:EXPERIMENT_ROTATOR_SDK_VERSION,status:errors.length?"fail":"pass",unit_id:typeof unitId==="string"?unitId:null,expected,errors}}
export function verifyConformanceVectors(){const vectors=CONFORMANCE_VECTORS.map(vector=>{const result=verifyAssignment(vector.unit_id,vector);return{unit_id:vector.unit_id,variant:vector.variant,status:result.status,errors:result.errors}});return{profile:EXPERIMENT_ROTATOR_SDK_VERSION,status:vectors.every(vector=>vector.status==="pass")?"pass":"fail",vectors}}

export async function runCli(args=[],io={}){const stdout=typeof io.stdout==="function"?io.stdout:value=>console.log(value),stderr=typeof io.stderr==="function"?io.stderr:value=>console.error(value),usage="Usage:\n  node wanted-rotator.mjs UNIT_ID\n  node wanted-rotator.mjs --verify UNIT_ID VARIANT EXPOSURE_TOKEN\n  node wanted-rotator.mjs --conformance";if(args.length===1&&["--help","-h"].includes(args[0])){stdout(usage);return CLI_EXIT_CODES.pass}try{if(args.length===1&&args[0]==="--conformance"){const result=verifyConformanceVectors();stdout(JSON.stringify(result,null,2));return result.status==="pass"?CLI_EXIT_CODES.pass:CLI_EXIT_CODES.verification_failed}if(args.length===1){stdout(JSON.stringify(assignmentRecord(args[0]),null,2));return CLI_EXIT_CODES.pass}if(args.length===4&&args[0]==="--verify"){const expected=assignmentRecord(args[1]),claim={...expected,variant:args[2],exposure_token:args[3]};const result=verifyAssignment(args[1],claim);stdout(JSON.stringify(result,null,2));return result.status==="pass"?CLI_EXIT_CODES.pass:CLI_EXIT_CODES.verification_failed}stderr(usage);return CLI_EXIT_CODES.usage_or_input_error}catch(error){stderr("WANTED rotator SDK: "+(error instanceof Error?error.message:"invalid input"));return CLI_EXIT_CODES.usage_or_input_error}}
const normalizedCliPath=value=>value.replaceAll("\\","/").replace(/^\/([A-Za-z]:\/)/,"$1").toLowerCase();
if(typeof process!=="undefined"&&Array.isArray(process.argv)&&import.meta.url.startsWith("file:")&&process.argv[1]&&normalizedCliPath(decodeURIComponent(new URL(import.meta.url).pathname))===normalizedCliPath(process.argv[1]))process.exitCode=await runCli(process.argv.slice(2));
`;

export const experimentRotatorSdkContract={name:"Embodied Arena WANTED Landing Rotator SDK",version:EXPERIMENT_ROTATOR_SDK_VERSION,rotator_version:"0.34-R34",compatible_rotator_versions:["0.28-R28","0.29-R29","0.30-R30","0.31-R31","0.32-R32","0.33-R33","0.34-R34"],experiment:"wanted_landing_v1",analysis_cohort:"wanted_landing_v1-C8",module:"/experiments/wanted-rotator.mjs",contract:"/experiments/rotator-sdk.json",lab:"/experiments/assignment-lab",design_lab:"/experiments/design-lab",format:"JavaScript ESM",runtime_dependencies:0,performs_network_requests:false,exports:["fnv1a32","validExperimentUnitId","validVariant","variantForBucket","assignWantedVariant","assignmentForUnit","exposureTokenForAssignment","assignmentRecord","verifyAssignment","verifyConformanceVectors","CLI_EXIT_CODES","runCli"],cli:{runtime:"Node.js 22+",usage:["node wanted-rotator.mjs UNIT_ID","node wanted-rotator.mjs --verify UNIT_ID VARIANT EXPOSURE_TOKEN","node wanted-rotator.mjs --conformance"],exit_codes:{pass:0,verification_failed:1,usage_or_input_error:2}},conformance_vectors:EXPERIMENT_ROTATOR_CONFORMANCE_VECTORS,privacy:"local_only_no_identifier_or_result_uploads",interpretation:"reproduces deterministic presentation assignment and exposure-token derivation; it does not establish experiment eligibility, issue a server receipt, authenticate traffic, count an exposure, or authorize a version decision"} as const;

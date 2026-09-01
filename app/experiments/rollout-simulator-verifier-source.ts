import { experimentRolloutPackageVerifierSource } from "./rollout-package-verifier-source.ts";
import {
  EXPERIMENT_ROLLOUT_SIMULATOR_ANALYSIS_USE,
  EXPERIMENT_ROLLOUT_SIMULATOR_BUNDLE_PROFILE,
  EXPERIMENT_ROLLOUT_SIMULATOR_PROFILE,
  EXPERIMENT_ROLLOUT_SIMULATOR_SAMPLE_SIZES,
} from "./rollout-simulator.ts";

const bytes = new TextEncoder().encode(experimentRolloutPackageVerifierSource);
const embeddedPackageSource = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));

export const experimentRolloutSimulatorVerifierSource = String.raw`// WANTED staged rollout population simulator ${EXPERIMENT_ROLLOUT_SIMULATOR_PROFILE}
const rolloutSdk=await import(${JSON.stringify(`data:text/javascript;base64,${embeddedPackageSource}`)});
export const PROFILE=${JSON.stringify(EXPERIMENT_ROLLOUT_SIMULATOR_PROFILE)},BUNDLE_PROFILE=${JSON.stringify(EXPERIMENT_ROLLOUT_SIMULATOR_BUNDLE_PROFILE)},ANALYSIS_USE=${JSON.stringify(EXPERIMENT_ROLLOUT_SIMULATOR_ANALYSIS_USE)},SAMPLE_SIZES=Object.freeze(${JSON.stringify(EXPERIMENT_ROLLOUT_SIMULATOR_SAMPLE_SIZES)}),CLI_EXIT_CODES=Object.freeze({pass:0,verification_failed:1,usage_or_input_error:2});
const KEYS=["analysis_use","profile","rollout_package","synthetic","synthetic_unit_ids"],exact=(v,k)=>!!v&&typeof v==="object"&&!Array.isArray(v)&&JSON.stringify(Object.keys(v).sort())===JSON.stringify([...k].sort());
export function fnv1a32(value){let hash=0x811c9dc5;for(let index=0;index<value.length;index++){hash^=value.charCodeAt(index);hash=Math.imul(hash,0x01000193)}return hash>>>0}
export function validSyntheticUnitId(value){return typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)}
export function syntheticUnitId(index){if(!Number.isInteger(index)||index<0||index>=1000000)throw new TypeError("Synthetic unit index must be an integer from 0 through 999,999.");const material=Array.from({length:4},(_,part)=>fnv1a32("wanted-rollout-simulator|"+index+"|"+part).toString(16).padStart(8,"0")).join("").split("");material[12]="4";material[16]=["8","9","a","b"][parseInt(material[16],16)%4];const hex=material.join("");return hex.slice(0,8)+"-"+hex.slice(8,12)+"-"+hex.slice(12,16)+"-"+hex.slice(16,20)+"-"+hex.slice(20)}
export function syntheticUnitIds(size){if(!SAMPLE_SIZES.includes(size))throw new TypeError("Sample size must be 100, 1,000, or 10,000 synthetic units.");return Array.from({length:size},(_,index)=>syntheticUnitId(index))}
export function rolloutBucket(unitId){if(!validSyntheticUnitId(unitId))throw new TypeError("A valid synthetic UUID v4 is required.");return fnv1a32("wanted_landing_v1-C9|staged-rollout|"+unitId)%10000}
export function assignment(unitId,phases){const rollout_bucket=rolloutBucket(unitId);return{unit_id:unitId,rollout_bucket,phases:Object.fromEntries(phases.map(phase=>[phase.id,rollout_bucket<phase.selected_variant_basis_points?"proof":"control"]))}}
export function referenceBundle(size=1000){return{profile:BUNDLE_PROFILE,synthetic:true,analysis_use:ANALYSIS_USE,rollout_package:rolloutSdk.REFERENCE_PACKAGE,synthetic_unit_ids:syntheticUnitIds(size)}}
export async function simulateRollout(bundle){const errors=[],shape=exact(bundle,KEYS)&&bundle.profile===BUNDLE_PROFILE&&bundle.synthetic===true;if(!shape)errors.push("Simulation bundle fields, profile, or synthetic marker are invalid.");const pr=await rolloutSdk.verifyRolloutPackage(bundle?.rollout_package),packageOk=pr.status==="pass";if(!packageOk)errors.push("The staged-rollout package failed verification.");const ids=Array.isArray(bundle?.synthetic_unit_ids)?bundle.synthetic_unit_ids:[],idsOk=ids.length>=1&&ids.length<=10000&&ids.every(validSyntheticUnitId);if(!idsOk)errors.push("Supply 1 through 10,000 valid synthetic UUID v4 unit IDs.");const unique=idsOk&&new Set(ids).size===ids.length;if(!unique)errors.push("Synthetic unit IDs must be unique.");const isolation=bundle?.analysis_use===ANALYSIS_USE;if(!isolation)errors.push("Simulation output is not explicitly excluded from exposures and version selection.");const phases=Array.isArray(bundle?.rollout_package?.rollout_plan?.phases)?bundle.rollout_package.rollout_plan.phases:[],allocation=packageOk&&phases.length===4&&phases.every((phase,index)=>typeof phase.id==="string"&&Number.isInteger(phase.selected_variant_basis_points)&&Number.isInteger(phase.control_basis_points)&&phase.selected_variant_basis_points+phase.control_basis_points===10000&&(index===0||phase.selected_variant_basis_points>phases[index-1].selected_variant_basis_points));if(!allocation)errors.push("Rollout phases do not define a strictly increasing allocation.");const rows=idsOk&&unique&&allocation?ids.map(id=>assignment(id,phases)):[],replay=rows.map(row=>assignment(row.unit_id,phases)),deterministic=rows.length>0&&JSON.stringify(rows)===JSON.stringify(replay);if(!deterministic)errors.push("Deterministic rollout replay failed.");const monotone=rows.length>0&&rows.every(row=>{let selected=false;return phases.every(phase=>{const a=row.phases[phase.id];if(a==="proof")selected=true;return!selected||a==="proof"})});if(!monotone)errors.push("A selected unit returned to control in a later phase.");const summaries=phases.map(phase=>{const selected_units=rows.filter(row=>row.phases[phase.id]==="proof").length,observed=rows.length?selected_units/rows.length:0,configured=phase.selected_variant_basis_points/10000;return{id:phase.id,selected_variant_basis_points:phase.selected_variant_basis_points,control_basis_points:phase.control_basis_points,selected_units,control_units:rows.length-selected_units,observed_selected_share:observed,configured_selected_share:configured,absolute_share_delta:Math.abs(observed-configured)}});let digest=null;try{digest=await rolloutSdk.sha256Canonical(bundle?.rollout_package)}catch{errors.push("The rollout package digest could not be calculated.")}const passed=errors.length===0;return{profile:PROFILE,status:passed?"pass":"fail",target_rotator_version:pr.target_rotator_version,target_analysis_cohort:pr.target_analysis_cohort,calculated_rollout_package_sha256:digest,synthetic_units:rows.length,package_verified:packageOk,input_shape_verified:shape,unit_ids_verified:idsOk,unique_units_verified:unique,deterministic_replay_verified:deterministic,monotone_membership_verified:monotone,phase_allocation_verified:allocation,inference_isolation_verified:isolation,phase_summaries:summaries,sample_units:rows.slice(0,12),changes_live_allocation:false,creates_identifiers:false,stores_identifiers:false,sends_analytics:false,counts_exposures:false,supports_version_selection:false,deploys:false,errors,limitations:["The package, candidate, approval, and unit IDs in the reference vector are synthetic.","This is a deterministic allocation dry run, not traffic-quality evidence or randomization inference.","The simulator creates no browser identifiers, sends no analytics, counts no exposures, and never changes live allocation."]}}
export async function runCli(args=[],io={}){const out=io.stdout||((v)=>console.log(v)),err=io.stderr||((v)=>console.error(v)),read=io.readFile||(async p=>(await import("node:fs/promises")).readFile(p,"utf8")),usage="Usage:\n  node wanted-rollout-simulator.mjs --conformance\n  node wanted-rollout-simulator.mjs --simulate BUNDLE.json";try{const bundle=args.length===1&&args[0]==="--conformance"?referenceBundle():args.length===2&&args[0]==="--simulate"?JSON.parse(await read(args[1])):null;if(!bundle){err(usage);return 2}const result=await simulateRollout(bundle);out(JSON.stringify(result,null,2));return result.status==="pass"?0:1}catch(error){err(String(error?.message||error));return 2}}
const normalized=v=>v.replaceAll("\\","/").replace(/^\/([A-Za-z]:\/)/,"$1").toLowerCase();if(typeof process!=="undefined"&&process.argv?.[1]&&import.meta.url.startsWith("file:")&&normalized(decodeURIComponent(new URL(import.meta.url).pathname))===normalized(process.argv[1]))process.exitCode=await runCli(process.argv.slice(2));`;

export const experimentRolloutSimulatorVerifierContract = {
  name: "Embodied Arena WANTED Rollout Population Simulator Helper",
  version: EXPERIMENT_ROLLOUT_SIMULATOR_PROFILE,
  bundle_profile: EXPERIMENT_ROLLOUT_SIMULATOR_BUNDLE_PROFILE,
  module: "/experiments/wanted-rollout-simulator.mjs",
  contract: "/experiments/rollout-simulator.json",
  schema: "/experiments/rollout-simulator.schema.json",
  reference_bundle: "/experiments/rollout-simulator.reference.json",
  lab: "/experiments/rollout-simulator",
  format: "JavaScript ESM",
  runtime_dependencies: 0,
  performs_network_requests: false,
  exports: [
    "fnv1a32",
    "validSyntheticUnitId",
    "syntheticUnitId",
    "syntheticUnitIds",
    "rolloutBucket",
    "assignment",
    "referenceBundle",
    "simulateRollout",
    "CLI_EXIT_CODES",
    "runCli",
  ],
  cli: {
    runtime: "Node.js 22+",
    modes: {
      conformance: "replay the 1,000-unit frozen synthetic cohort",
      simulate: "verify and replay a supplied simulation bundle",
    },
    exit_codes: { pass: 0, verification_failed: 1, usage_or_input_error: 2 },
  },
  analysis_use: EXPERIMENT_ROLLOUT_SIMULATOR_ANALYSIS_USE,
  monotone_membership_required: true,
  changes_live_allocation: false,
  sends_analytics: false,
  counts_exposures: false,
  supports_version_selection: false,
  deploys: false,
  interpretation:
    "offline synthetic allocation replay only; verifies deterministic monotone phase membership and never operates the live rotator",
} as const;

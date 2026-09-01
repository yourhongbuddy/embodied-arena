import { experimentRolloutConfigVerifierSource } from "./rollout-config-verifier-source.ts";
import {
  EXPERIMENT_ROLLOUT_RUNTIME_BUNDLE_PROFILE,
  EXPERIMENT_ROLLOUT_RUNTIME_CLI_EXIT_CODES,
  EXPERIMENT_ROLLOUT_RUNTIME_PROFILE,
} from "./rollout-runtime.ts";

const bytes = new TextEncoder().encode(experimentRolloutConfigVerifierSource);
const embeddedConfigSource = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));

export const experimentRolloutRuntimeVerifierSource = String.raw`// WANTED fail-closed rollout runtime resolver ${EXPERIMENT_ROLLOUT_RUNTIME_PROFILE}
const configSdk=await import(${JSON.stringify(`data:text/javascript;base64,${embeddedConfigSource}`)});
export const PROFILE=${JSON.stringify(EXPERIMENT_ROLLOUT_RUNTIME_PROFILE)},BUNDLE_PROFILE=${JSON.stringify(EXPERIMENT_ROLLOUT_RUNTIME_BUNDLE_PROFILE)},CLI_EXIT_CODES=Object.freeze(${JSON.stringify(EXPERIMENT_ROLLOUT_RUNTIME_CLI_EXIT_CODES)}),ANALYSIS_USE="synthetic_preproduction_only_excluded_from_exposure_and_version_selection";
const KEYS=["analysis_use","compiler_bundle","manifest","profile","runtime_environment","synthetic","synthetic_unit_id"],ENV_KEYS=["WANTED_ANALYSIS_COHORT","WANTED_AUTOMATIC_PROGRESSION","WANTED_CONTROL_BASIS_POINTS","WANTED_FALLBACK_VARIANT","WANTED_OPERATIONAL_ANALYSIS_USE","WANTED_ROLLOUT_ASSIGNMENT_SALT","WANTED_ROLLOUT_MODE","WANTED_ROLLOUT_PHASE","WANTED_ROLLOUT_PHASE_EPOCH","WANTED_ROTATOR_VERSION","WANTED_SELECTED_BASIS_POINTS","WANTED_SELECTED_VARIANT"],exact=(v,k)=>!!v&&typeof v==="object"&&!Array.isArray(v)&&JSON.stringify(Object.keys(v).sort())===JSON.stringify([...k].sort()),canonical=v=>{if(v===null||typeof v!=="object")return JSON.stringify(v)??"null";if(Array.isArray(v))return"["+v.map(canonical).join(",")+"]";return"{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}"},validId=v=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export function fnv1a32(value){let hash=0x811c9dc5;for(let index=0;index<value.length;index++){hash^=value.charCodeAt(index);hash=Math.imul(hash,0x01000193)}return hash>>>0}
export function syntheticUnitId(index){if(!Number.isInteger(index)||index<0||index>=1000000)throw new TypeError("Synthetic unit index must be an integer from 0 through 999,999.");const material=Array.from({length:4},(_,part)=>fnv1a32("wanted-rollout-simulator|"+index+"|"+part).toString(16).padStart(8,"0")).join("").split("");material[12]="4";material[16]=["8","9","a","b"][parseInt(material[16],16)%4];const hex=material.join("");return hex.slice(0,8)+"-"+hex.slice(8,12)+"-"+hex.slice(12,16)+"-"+hex.slice(16,20)+"-"+hex.slice(20)}
export function rolloutBucket(unitId){if(!validId(unitId))throw new TypeError("A valid synthetic UUID v4 is required.");return fnv1a32("wanted_landing_v1-C9|staged-rollout|"+unitId)%10000}
export async function referenceBundle(index=0){const compiler_bundle=configSdk.referenceBundle(),compiler=await configSdk.compileRolloutConfiguration(compiler_bundle);if(!compiler.manifest)throw new Error("Reference runtime manifest compilation failed.");return{profile:BUNDLE_PROFILE,synthetic:true,analysis_use:ANALYSIS_USE,compiler_bundle,manifest:compiler.manifest,runtime_environment:compiler.manifest.environment,synthetic_unit_id:syntheticUnitId(index)}}
export async function resolveRolloutRuntime(bundle){const errors=[],shape=exact(bundle,KEYS)&&bundle.profile===BUNDLE_PROFILE&&bundle.synthetic===true;if(!shape)errors.push("Runtime-resolution bundle fields, profile, or synthetic marker are invalid.");const cr=await configSdk.compileRolloutConfiguration(bundle?.compiler_bundle),compiler=cr.status==="pass"&&cr.manifest!==null;if(!compiler)errors.push("The rollout configuration compiler bundle failed verification.");const manifest=compiler&&canonical(bundle?.manifest)===canonical(cr.manifest);if(!manifest)errors.push("The supplied runtime manifest does not match the deterministic compiler output.");const envShape=exact(bundle?.runtime_environment,ENV_KEYS)&&Object.values(bundle?.runtime_environment||{}).every(v=>typeof v==="string");if(!envShape)errors.push("Runtime environment fields are incomplete or not strings.");const envMatch=manifest&&envShape&&canonical(bundle.runtime_environment)===canonical(cr.manifest?.environment);if(!envMatch)errors.push("Runtime environment does not exactly match the compiled manifest.");const unit=validId(bundle?.synthetic_unit_id);if(!unit)errors.push("A valid synthetic UUID v4 unit ID is required.");const isolation=bundle?.analysis_use===ANALYSIS_USE;if(!isolation)errors.push("Runtime preview is not explicitly excluded from exposure and version-selection inference.");let bucket=null,resolved="control",deterministic=false;if(shape&&compiler&&manifest&&envMatch&&unit&&isolation&&cr.manifest){bucket=rolloutBucket(bundle.synthetic_unit_id);resolved=bucket<cr.manifest.selected_variant_basis_points?"proof":"control";deterministic=rolloutBucket(bundle.synthetic_unit_id)===bucket&&(bucket<cr.manifest.selected_variant_basis_points?"proof":"control")===resolved;if(!deterministic)errors.push("Runtime assignment did not reproduce deterministically.")}const passed=errors.length===0,fallback=passed?null:"configuration_or_unit_verification_failed_control_fallback",failClosed=passed||(resolved==="control"&&bucket===null);return{profile:PROFILE,status:passed?"pass":"fail",synthetic_unit_id:unit?bundle.synthetic_unit_id:null,rollout_bucket:passed?bucket:null,resolved_variant:passed?resolved:"control",fallback_reason:fallback,phase:passed?cr.manifest?.activation_phase??null:null,phase_epoch:passed?cr.manifest?.activation_phase_epoch??null:null,selected_variant_basis_points:passed?cr.manifest?.selected_variant_basis_points??0:0,control_basis_points:passed?cr.manifest?.control_basis_points??10000:10000,compiler_verified:compiler,manifest_verified:manifest,environment_shape_verified:envShape,environment_matches_manifest:envMatch,unit_id_verified:unit,analysis_boundary_verified:isolation,deterministic_resolution_verified:deterministic,fail_closed_verified:failClosed,assignment_mode:"synthetic_preview",live_use_eligible:false,treatment_served:false,exposure_counted:false,writes_browser_storage:false,reads_platform_environment:false,performs_network_requests:false,changes_live_allocation:false,changes_live_phase:false,deploys:false,errors,limitations:["The manifest, runtime environment, unit ID, approval, package, and phase ledger in the reference vectors are synthetic.","The resolver receives an explicit environment object and never reads process.env, browser storage, secrets, or network resources.","A passing result is a local preview assignment only; it never serves a treatment, counts exposure, changes allocation, advances a phase, or deploys."]}}
export async function runCli(args=[],io={}){const out=io.stdout||((v)=>console.log(v)),err=io.stderr||((v)=>console.error(v)),read=io.readFile||(async p=>(await import("node:fs/promises")).readFile(p,"utf8")),usage="Usage:\n  node wanted-rollout-runtime.mjs --conformance\n  node wanted-rollout-runtime.mjs --resolve BUNDLE.json";try{if(args.length===1&&args[0]==="--conformance"){const vectors=[];for(const [label,index] of[["ramp_control",0],["ramp_proof",9]]){const result=await resolveRolloutRuntime(await referenceBundle(index));vectors.push({label,status:result.status,resolved_variant:result.resolved_variant,rollout_bucket:result.rollout_bucket})}const result={profile:PROFILE,status:vectors.every(v=>v.status==="pass")?"pass":"fail",vectors};out(JSON.stringify(result,null,2));return result.status==="pass"?0:1}if(args.length===2&&args[0]==="--resolve"){const result=await resolveRolloutRuntime(JSON.parse(await read(args[1])));out(JSON.stringify(result,null,2));return result.status==="pass"?0:1}err(usage);return 2}catch(error){err(String(error?.message||error));return 2}}
const normalized=v=>v.replaceAll("\\","/").replace(/^\/([A-Za-z]:\/)/,"$1").toLowerCase();if(typeof process!=="undefined"&&process.argv?.[1]&&import.meta.url.startsWith("file:")&&normalized(decodeURIComponent(new URL(import.meta.url).pathname))===normalized(process.argv[1]))process.exitCode=await runCli(process.argv.slice(2));`;

export const experimentRolloutRuntimeVerifierContract = {
  name: "Embodied Arena WANTED Fail-Closed Rollout Runtime Helper",
  version: EXPERIMENT_ROLLOUT_RUNTIME_PROFILE,
  bundle_profile: EXPERIMENT_ROLLOUT_RUNTIME_BUNDLE_PROFILE,
  module: "/experiments/wanted-rollout-runtime.mjs",
  contract: "/experiments/rollout-runtime.json",
  schema: "/experiments/rollout-runtime.schema.json",
  reference_vectors: "/experiments/rollout-runtime.reference.json",
  lab: "/experiments/rollout-simulator",
  format: "JavaScript ESM",
  runtime_dependencies: 0,
  reads_platform_environment: false,
  writes_browser_storage: false,
  performs_network_requests: false,
  exports: [
    "fnv1a32",
    "syntheticUnitId",
    "rolloutBucket",
    "referenceBundle",
    "resolveRolloutRuntime",
    "CLI_EXIT_CODES",
    "runCli",
  ],
  cli: {
    runtime: "Node.js 22+",
    modes: {
      conformance: "reproduce one ramp control and one ramp proof reference assignment",
      resolve: "verify and resolve one supplied synthetic runtime bundle",
    },
    exit_codes: EXPERIMENT_ROLLOUT_RUNTIME_CLI_EXIT_CODES,
  },
  invalid_configuration_behavior: "control_fallback_with_no_bucket_or_phase",
  live_use_eligible: false,
  treatment_served: false,
  exposure_counted: false,
  changes_live_allocation: false,
  changes_live_phase: false,
  deploys: false,
  interpretation:
    "offline fail-closed synthetic runtime resolution only; never reads platform configuration, serves treatment, counts exposure, or deploys",
} as const;

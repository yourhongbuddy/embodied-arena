import { experimentRolloutPackageVerifierSource } from "./rollout-package-verifier-source.ts";
import { experimentRolloutPhaseLedgerVerifierSource } from "./rollout-phase-ledger-verifier-source.ts";
import {
  EXPERIMENT_ROLLOUT_CONFIG_BUNDLE_PROFILE,
  EXPERIMENT_ROLLOUT_CONFIG_CLI_EXIT_CODES,
  EXPERIMENT_ROLLOUT_CONFIG_COMPILER_PROFILE,
  EXPERIMENT_ROLLOUT_CONFIG_MANIFEST_PROFILE,
} from "./rollout-config.ts";

const encodeSource = (source: string) => {
  const bytes = new TextEncoder().encode(source);
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
};
const packageSource = encodeSource(experimentRolloutPackageVerifierSource);
const ledgerSource = encodeSource(experimentRolloutPhaseLedgerVerifierSource);

export const experimentRolloutConfigVerifierSource = String.raw`// WANTED rollout runtime configuration compiler ${EXPERIMENT_ROLLOUT_CONFIG_COMPILER_PROFILE}
const packageSdk=await import(${JSON.stringify(`data:text/javascript;base64,${packageSource}`)}),ledgerSdk=await import(${JSON.stringify(`data:text/javascript;base64,${ledgerSource}`)});
export const PROFILE=${JSON.stringify(EXPERIMENT_ROLLOUT_CONFIG_COMPILER_PROFILE)},MANIFEST_PROFILE=${JSON.stringify(EXPERIMENT_ROLLOUT_CONFIG_MANIFEST_PROFILE)},BUNDLE_PROFILE=${JSON.stringify(EXPERIMENT_ROLLOUT_CONFIG_BUNDLE_PROFILE)},CLI_EXIT_CODES=Object.freeze(${JSON.stringify(EXPERIMENT_ROLLOUT_CONFIG_CLI_EXIT_CODES)}),TARGET_VERSION="0.37-R37",TARGET_COHORT="wanted_landing_v1-C9",SIMULATION_USE="synthetic_preproduction_only_excluded_from_exposure_and_version_selection",OPERATIONAL_USE="operational_safety_only_excluded_from_version_selection";
const KEYS=["phase_ledger","profile","purpose","rollout_package"],EPOCHS=Object.freeze({canary:"wanted_landing_v1-C9-P1",ramp:"wanted_landing_v1-C9-P2",majority:"wanted_landing_v1-C9-P3",full:"wanted_landing_v1-C9-P4"}),exact=(v,k)=>!!v&&typeof v==="object"&&!Array.isArray(v)&&JSON.stringify(Object.keys(v).sort())===JSON.stringify([...k].sort());
const environment=phase=>({WANTED_ROLLOUT_MODE:"manual_staged_rollout",WANTED_ROTATOR_VERSION:TARGET_VERSION,WANTED_ANALYSIS_COHORT:TARGET_COHORT,WANTED_ROLLOUT_PHASE:phase.id,WANTED_ROLLOUT_PHASE_EPOCH:EPOCHS[phase.id],WANTED_SELECTED_VARIANT:"proof",WANTED_FALLBACK_VARIANT:"control",WANTED_SELECTED_BASIS_POINTS:String(phase.selected_variant_basis_points),WANTED_CONTROL_BASIS_POINTS:String(phase.control_basis_points),WANTED_ROLLOUT_ASSIGNMENT_SALT:"wanted_landing_v1-C9|staged-rollout",WANTED_OPERATIONAL_ANALYSIS_USE:OPERATIONAL_USE,WANTED_AUTOMATIC_PROGRESSION:"false"});
export function referenceBundle(){return{profile:BUNDLE_PROFILE,purpose:"conformance_only",rollout_package:packageSdk.REFERENCE_PACKAGE,phase_ledger:ledgerSdk.REFERENCE_BUNDLE}}
export async function compileRolloutConfiguration(bundle){const errors=[],shape=exact(bundle,KEYS)&&bundle.profile===BUNDLE_PROFILE&&["conformance_only","production"].includes(bundle.purpose);if(!shape)errors.push("Compiler bundle fields, profile, or purpose are invalid.");const pr=await packageSdk.verifyRolloutPackage(bundle?.rollout_package),packageOk=pr.status==="pass";if(!packageOk)errors.push("The staged-rollout package failed verification.");const lr=await ledgerSdk.verifyRolloutPhaseLedger(bundle?.phase_ledger),ledgerOk=lr.status==="pass";if(!ledgerOk)errors.push("The signed phase-review ledger failed verification.");let packageDigest=null,ledgerDigest=null,receiptDigest=null;const entries=Array.isArray(bundle?.phase_ledger?.entries)?bundle.phase_ledger.entries:[],receipt=entries.at(-1)?.phase_receipt||{};try{packageDigest=await packageSdk.sha256Canonical(bundle?.rollout_package);ledgerDigest=await packageSdk.sha256Canonical(bundle?.phase_ledger);receiptDigest=await packageSdk.sha256Canonical(receipt)}catch{errors.push("Compiler source digests could not be calculated.")}const source=packageOk&&ledgerOk&&packageDigest!==null&&packageDigest===receipt.rollout_package_sha256&&pr.target_rotator_version===TARGET_VERSION&&pr.target_analysis_cohort===TARGET_COHORT&&receipt.target_rotator_version===TARGET_VERSION&&receipt.target_analysis_cohort===TARGET_COHORT;if(!source)errors.push("The ledger does not bind the exact verified rollout package and target.");const phases=Array.isArray(bundle?.rollout_package?.rollout_plan?.phases)?bundle.rollout_package.rollout_plan.phases:[],next=phases.find(phase=>phase.id===lr.next_phase),nextOk=ledgerOk&&!lr.rollout_complete&&!!next&&typeof next.id==="string"&&Number.isInteger(next.selected_variant_basis_points)&&Number.isInteger(next.control_basis_points)&&next.selected_variant_basis_points+next.control_basis_points===10000&&next.id in EPOCHS;if(!nextOk)errors.push("The ledger does not identify one valid next rollout phase.");let manifest=null,envOk=false,rollbackOk=false,deterministic=false,isolation=false;if(shape&&source&&nextOk&&packageDigest&&ledgerDigest&&receiptDigest){const phase={id:next.id,selected_variant_basis_points:next.selected_variant_basis_points,control_basis_points:next.control_basis_points},env=environment(phase),rollback=environment({id:phase.id,selected_variant_basis_points:0,control_basis_points:10000}),unsigned={profile:MANIFEST_PROFILE,status:"ready_for_manual_activation_review",purpose:bundle.purpose,target_rotator_version:TARGET_VERSION,target_analysis_cohort:TARGET_COHORT,source_rollout_package_sha256:packageDigest,source_phase_ledger_sha256:ledgerDigest,source_latest_phase_receipt_sha256:receiptDigest,reviewed_phase:String(lr.current_phase),activation_phase:phase.id,activation_phase_epoch:EPOCHS[phase.id],selected_variant:"proof",fallback_variant:"control",selected_variant_basis_points:phase.selected_variant_basis_points,control_basis_points:phase.control_basis_points,allocation_algorithm:"FNV1a_32(target_analysis_cohort|staged-rollout|unit_id) mod 10000",analysis_use:OPERATIONAL_USE,simulation_analysis_use:SIMULATION_USE,environment:env,rollback_environment:rollback,rollback_maximum_minutes:15,manual_confirmation_required:true,automatic_application:false,contains_secrets:false},digest=await packageSdk.sha256Canonical(unsigned);manifest={...unsigned,manifest_sha256:digest};envOk=Object.keys(env).length===12;rollbackOk=Object.keys(rollback).length===12&&rollback.WANTED_SELECTED_BASIS_POINTS==="0"&&rollback.WANTED_CONTROL_BASIS_POINTS==="10000";deterministic=await packageSdk.sha256Canonical(unsigned)===digest;isolation=env.WANTED_OPERATIONAL_ANALYSIS_USE===OPERATIONAL_USE&&unsigned.simulation_analysis_use===SIMULATION_USE;if(!envOk)errors.push("The activation environment is incomplete.");if(!rollbackOk)errors.push("The rollback environment is incomplete.");if(!deterministic)errors.push("The runtime manifest is not deterministic.");if(!isolation)errors.push("Operational and simulation analysis boundaries are invalid.")}const passed=errors.length===0;return{profile:PROFILE,status:passed?"pass":"fail",package_verified:packageOk,phase_ledger_verified:ledgerOk,source_binding_verified:source,next_phase_verified:nextOk,environment_complete:envOk,rollback_environment_complete:rollbackOk,deterministic_manifest_verified:deterministic,inference_isolation_verified:isolation,manifest:passed?manifest:null,applies_configuration:false,changes_live_allocation:false,changes_live_phase:false,reads_or_writes_secrets:false,performs_network_requests:false,deploys:false,errors,limitations:["The reference approval, package, phase ledger, observations, and compiled configuration are synthetic.","The compiler emits inert environment values and digests; it never reads secrets, applies configuration, advances phases, publishes, or deploys.","Production activation still requires a real authorized artifact, accountable manual confirmation, atomic platform configuration, and deployment audit evidence."]}}
export async function runCli(args=[],io={}){const out=io.stdout||((v)=>console.log(v)),err=io.stderr||((v)=>console.error(v)),read=io.readFile||(async p=>(await import("node:fs/promises")).readFile(p,"utf8")),usage="Usage:\n  node wanted-rollout-config.mjs --conformance\n  node wanted-rollout-config.mjs --compile BUNDLE.json";try{const bundle=args.length===1&&args[0]==="--conformance"?referenceBundle():args.length===2&&args[0]==="--compile"?JSON.parse(await read(args[1])):null;if(!bundle){err(usage);return 2}const result=await compileRolloutConfiguration(bundle);out(JSON.stringify(result,null,2));return result.status==="pass"?0:1}catch(error){err(String(error?.message||error));return 2}}
const normalized=v=>v.replaceAll("\\","/").replace(/^\/([A-Za-z]:\/)/,"$1").toLowerCase();if(typeof process!=="undefined"&&process.argv?.[1]&&import.meta.url.startsWith("file:")&&normalized(decodeURIComponent(new URL(import.meta.url).pathname))===normalized(process.argv[1]))process.exitCode=await runCli(process.argv.slice(2));`;

export const experimentRolloutConfigVerifierContract = {
  name: "Embodied Arena WANTED Rollout Runtime Configuration Helper",
  version: EXPERIMENT_ROLLOUT_CONFIG_COMPILER_PROFILE,
  manifest_profile: EXPERIMENT_ROLLOUT_CONFIG_MANIFEST_PROFILE,
  bundle_profile: EXPERIMENT_ROLLOUT_CONFIG_BUNDLE_PROFILE,
  module: "/experiments/wanted-rollout-config.mjs",
  contract: "/experiments/rollout-config.json",
  schema: "/experiments/rollout-config.schema.json",
  reference_bundle: "/experiments/rollout-config.reference.json",
  lab: "/experiments/rollout-simulator",
  format: "JavaScript ESM",
  runtime_dependencies: 0,
  performs_network_requests: false,
  reads_or_writes_secrets: false,
  exports: ["referenceBundle", "compileRolloutConfiguration", "CLI_EXIT_CODES", "runCli"],
  cli: {
    runtime: "Node.js 22+",
    modes: {
      conformance: "compile the frozen synthetic canary-review prefix into the ramp manifest",
      compile: "verify and compile a supplied package and signed ledger prefix",
    },
    exit_codes: EXPERIMENT_ROLLOUT_CONFIG_CLI_EXIT_CODES,
  },
  manual_confirmation_required: true,
  automatic_application: false,
  applies_configuration: false,
  changes_live_allocation: false,
  changes_live_phase: false,
  deploys: false,
  interpretation:
    "offline deterministic compilation of inert activation and rollback settings; never applies configuration or deploys",
} as const;

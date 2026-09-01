import { canonicalizeAuditJson } from "../audit-seal/profile.ts";
import { verifyRootEnvelopeBatch } from "../root-envelope/profile.ts";
import { ROOT_ENVELOPE_BATCH_CONFORMANCE_VERSION } from "./vectors.ts";

const object=(value:unknown):Record<string,unknown>|null=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null;
const counterFields=["deployment_count","root_count","expected_root_count","verified_envelopes","verified_signed_prefixes","missing_envelopes","invalid_envelopes","prefix_binding_failures","key_manifest_mismatches","chain_failures","cadence_failures"] as const;

export function rootEnvelopeBatchConformanceProjection(value:unknown){const result=object(value)??{},summary=object(result.summary)??{};return{status:result.status,top_level_error_count:Array.isArray(result.errors)?result.errors.length:0,failed_deployment_ids:(Array.isArray(result.deployments)?result.deployments:[]).filter(item=>object(item)?.status==="fail").map(item=>String(object(item)?.deployment_id??"")),summary:Object.fromEntries(counterFields.map(field=>[field,summary[field]]))};}

export async function verifyRootEnvelopeBatchConformancePack(value:unknown){
  const input=object(value);if(!input)return{status:"invalid",errors:["Conformance pack must be one JSON object."],profile_version:null,vector_count:0,passed_vectors:0,failed_vectors:0,vectors:[]};
  try{canonicalizeAuditJson(value);}catch(error){return{status:"invalid",errors:[error instanceof Error?error.message:"Conformance pack is not strict I-JSON."],profile_version:null,vector_count:0,passed_vectors:0,failed_vectors:0,vectors:[]};}
  const errors:string[]=[];if(input.version!==ROOT_ENVELOPE_BATCH_CONFORMANCE_VERSION)errors.push(`Conformance pack version must be ${ROOT_ENVELOPE_BATCH_CONFORMANCE_VERSION}.`);if(input.profile_version!=="0.2-REB1")errors.push("Conformance pack profile_version must be 0.2-REB1.");if(!Array.isArray(input.vectors)||input.vectors.length<1)errors.push("Conformance pack must contain at least one vector.");if(errors.length)return{status:"invalid",errors,profile_version:input.profile_version??null,vector_count:Array.isArray(input.vectors)?input.vectors.length:0,passed_vectors:0,failed_vectors:0,vectors:[]};
  const ids=new Set<string>(),vectors=[];
  for(const raw of input.vectors){const vector=object(raw),id=String(vector?.id??""),batch=object(vector?.batch),expected=object(vector?.expected);if(!id||ids.has(id)||!batch||!expected){vectors.push({id:id||"(missing)",status:"invalid",detail:"Malformed or duplicate conformance vector.",expected:expected??null,actual:null});continue;}ids.add(id);const actual=rootEnvelopeBatchConformanceProjection(await verifyRootEnvelopeBatch(batch)),matches=canonicalizeAuditJson(actual)===canonicalizeAuditJson(expected);vectors.push({id,status:matches?"passed":"failed",detail:matches?"Status, failed topology, and exact counter projection match.":"Status, failed topology, or counter projection differs.",expected,actual});}
  const passed=vectors.filter(item=>item.status==="passed").length;return{status:passed===vectors.length?"passed":"failed",errors:[],profile_version:input.profile_version,vector_count:vectors.length,passed_vectors:passed,failed_vectors:vectors.length-passed,vectors};
}

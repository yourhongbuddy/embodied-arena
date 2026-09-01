import { sampleBundle } from "../conformance/validator.ts";
import { createRootEnvelope, verifyRootEnvelopeBatch } from "./profile.ts";

export async function rootEnvelopeTemplate(deploymentCount=1){
  const activation_at="2026-08-28T18:00:00.000Z",observation_end_at="2026-08-28T20:00:00.000Z",commitment_interval_hours=1,deployments=[];
  for(let index=0;index<deploymentCount;index++){
    const suffix=String(index+1).padStart(3,"0"),sample=await sampleBundle({deployment_id:`dep_demo_${suffix}`,environment_id:`env_demo_${suffix}`,robot_id:`robot_demo_${suffix}`}),events=sample.jsonl.split("\n").map(line=>JSON.parse(line)),key_manifest=JSON.parse(sample.keyManifest),first=await createRootEnvelope({events,keyManifest:key_manifest,rootOrdinal:0,coversThroughAt:"2026-08-28T19:00:00.000Z"}),second=await createRootEnvelope({events,keyManifest:key_manifest,rootOrdinal:1,coversThroughAt:observation_end_at,previousEnvelope:first});
    deployments.push({deployment_id:first.deployment_id,activation_at,observation_end_at,commitment_interval_hours,events,key_manifest,roots:[first,second].map((envelope,rootIndex)=>({root_commitment_uri:`https://example.org/wanted/roots/${suffix}/${rootIndex}.json`,envelope}))});
  }
  const batch_input={profile_version:"0.2-REB1",target_certification:"WANTED_LAB",deployments},batch_report=await verifyRootEnvelopeBatch(batch_input),first=deployments[0];
  return{profile_version:"0.2-RE1",notice:"Synthetic interoperability example. Real root envelopes and raw telemetry remain inside operator-approved evidence infrastructure.",activation_at,observation_end_at,commitment_interval_hours,key_manifest:first.key_manifest,events:first.events,envelopes:first.roots.map(root=>root.envelope),root_witness_projection:batch_report.root_witness_projection[0]?.roots??[],batch_input,batch_report};
}

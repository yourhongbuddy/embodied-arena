import { rootCollectionSha256, type RootWitnessManifest, witnessReceiptSigningBytes } from "./profile.ts";

const PKCS8_PREFIX="302e020100300506032b657004220420";
const synthetic=[
  {witness_id:"synthetic-witness-a",organization:"Independent Timestamp Lab A",seed:"9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60",public_key_base64url:"11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo"},
  {witness_id:"synthetic-witness-b",organization:"Independent Transparency Lab B",seed:"4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb",public_key_base64url:"PUAXw-hDiVqStwqnTRt-vJyYLM8uxJaMwM1V8Sr0Zgw"},
];
const hexBytes=(value:string)=>new Uint8Array(value.match(/../g)!.map(byte=>parseInt(byte,16)));
const encode=(value:ArrayBuffer)=>{const bytes=new Uint8Array(value);let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");};
const hash=(prefix:string)=>`${prefix}${"0123456789abcdef".repeat(4)}`.slice(0,64);
async function sign(seed:string,value:Record<string,unknown>){const key=await crypto.subtle.importKey("pkcs8",hexBytes(PKCS8_PREFIX+seed),{name:"Ed25519"},false,["sign"]);return encode(await crypto.subtle.sign({name:"Ed25519"},key,witnessReceiptSigningBytes(value)));}

export async function rootWitnessTemplateFor(target:"WANTED_LAB"|"WANTED_WILD"|"WANTED_10K"="WANTED_LAB"):Promise<RootWitnessManifest>{
  const deploymentCount=target==="WANTED_WILD"?20:1,durationHours=target==="WANTED_LAB"?100:target==="WANTED_WILD"?48:10_000,deployments=[];
  for(let deploymentIndex=0;deploymentIndex<deploymentCount;deploymentIndex++){
    const activation=new Date(Date.UTC(2026,0,1+deploymentIndex)).toISOString(),end=new Date(Date.parse(activation)+durationHours*3600000).toISOString(),roots=[];
    for(let ordinal=0;ordinal<Math.ceil(durationHours/24);ordinal++){
      const covers=new Date(Math.min(Date.parse(end),Date.parse(activation)+(ordinal+1)*24*3600000)).toISOString(),rootDigest=hash(`${(deploymentIndex+10).toString(16)}${(ordinal+20).toString(16)}`),receipts=[];
      for(let witnessIndex=0;witnessIndex<synthetic.length;witnessIndex++){
        const witness=synthetic[witnessIndex],observed=new Date(Date.parse(covers)+(witnessIndex+1)*3600000).toISOString();
        const receipt:Record<string,unknown>={receipt_id:`receipt-${deploymentIndex+1}-${ordinal+1}-${witnessIndex+1}`,witness_id:witness.witness_id,witness_organization:witness.organization,deployment_id:`dep_synthetic_${String(deploymentIndex+1).padStart(3,"0")}`,root_ordinal:ordinal,root_commitment_sha256:rootDigest,covers_through_at:covers,observed_at:observed,log_uri:`https://example.org/${witness.witness_id}/entries/${deploymentIndex+1}-${ordinal+1}`,log_entry_sha256:hash(`${(witnessIndex+40).toString(16)}${(ordinal+60).toString(16)}`)};
        receipt.signature=await sign(witness.seed,receipt);receipts.push(receipt as never);
      }
      roots.push({root_ordinal:ordinal,covers_through_at:covers,root_commitment_uri:`https://example.org/wanted/roots/${deploymentIndex+1}/${ordinal+1}.json`,root_commitment_sha256:rootDigest,receipts});
    }
    deployments.push({deployment_id:`dep_synthetic_${String(deploymentIndex+1).padStart(3,"0")}`,activation_at:activation,observation_end_at:end,roots});
  }
  return {profile_version:"0.2-RC1",target_certification:target,protocol:{canonicalization:"RFC8785_JCS",hash:"SHA-256",signature_algorithm:"Ed25519",signature_scope:"receipt_without_signature",commitment_interval_hours:24,maximum_publication_delay_hours:24,minimum_independent_witnesses:2},witness_registry:{registry_version:1,registry_uri:"https://example.org/wanted/witness-registry.json",registry_sha256:hash("91"),keys:synthetic.map(item=>({witness_id:item.witness_id,organization:item.organization,public_key_base64url:item.public_key_base64url,valid_from:"2025-01-01T00:00:00.000Z",valid_until:null,revoked_at:null,independent_of_sponsor:true}))},root_commitments_sha256:await rootCollectionSha256(deployments),deployments,evidence:{controlled_receipt_archive_uri:"https://example.org/wanted/root-receipts.json",controlled_receipt_archive_sha256:hash("92"),public_log_index_uri:"https://example.org/wanted/root-log-index.json",public_log_index_sha256:hash("93"),public_aggregate_only:true},assessor:{name:"Synthetic Root Witness Auditor",organization:"Independent Example Assurance",independent_of_sponsor:true,attested:true,signed_at:"2027-03-10T12:00:00.000Z"}};
}

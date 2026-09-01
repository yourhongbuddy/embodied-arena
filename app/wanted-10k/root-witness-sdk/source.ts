export const ROOT_WITNESS_VERIFIER_SDK_VERSION="0.2-RCS2";

export const rootWitnessVerifierSdkSource=String.raw`/**
 * WANTED-10K independent root-witness verifier — 0.2-RCS2 / profile 0.2-RC1
 * Zero runtime dependencies. Verification is local and performs no network requests.
 */
export const ROOT_WITNESS_VERIFIER_SDK_VERSION="0.2-RCS2";
export const ROOT_COMMITMENT_WITNESS_VERSION="0.2-RC1";
export const RECEIPT_SCOPE="receipt_without_signature";
export const FIELD_TARGETS=Object.freeze(["WANTED_LAB","WANTED_WILD","WANTED_10K"]);

function object(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:null}
function assertIJson(value,path="value"){
  if(["undefined","bigint","function","symbol"].includes(typeof value))throw new TypeError(path+" is not an I-JSON value");
  if(typeof value==="number"&&!Number.isFinite(value))throw new TypeError(path+" contains a non-finite number");
  if(typeof value==="string"&&/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value))throw new TypeError(path+" contains an unpaired Unicode surrogate");
  if(Array.isArray(value))value.forEach((item,index)=>assertIJson(item,path+"["+index+"]"));
  else if(value&&typeof value==="object"){if(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)throw new TypeError(path+" must contain plain JSON objects");for(const [key,item] of Object.entries(value)){assertIJson(key,path+".<key>");assertIJson(item,path+"."+key)}}
}
export function canonicalize(value){assertIJson(value);if(value===null||typeof value!=="object")return JSON.stringify(value);if(Array.isArray(value))return"["+value.map(canonicalize).join(",")+"]";return"{"+Object.keys(value).sort().map(key=>JSON.stringify(key)+":"+canonicalize(value[key])).join(",")+"}"}
function decodeBase64url(value){if(typeof value!=="string"||!/^[A-Za-z0-9_-]+$/.test(value))throw new Error("value is not unpadded base64url");const padded=value.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-value.length%4)%4),decoded=atob(padded);return Uint8Array.from(decoded,character=>character.charCodeAt(0))}
function hex(value){return Array.from(new Uint8Array(value),byte=>byte.toString(16).padStart(2,"0")).join("")}
async function sha256Bytes(value){return hex(await crypto.subtle.digest("SHA-256",value))}
const encoded=value=>new TextEncoder().encode(canonicalize(value));
const digest=value=>typeof value==="string"&&/^[a-f0-9]{64}$/.test(value)&&!/^([a-f0-9])\1{63}$/.test(value);
const https=value=>typeof value==="string"&&/^https:\/\//.test(value);
const utc=value=>typeof value==="string"&&value.endsWith("Z")&&Number.isFinite(Date.parse(value));
const integer=value=>Number.isInteger(value)&&Number(value)>=0;
const round=value=>Number(value.toFixed(6));
const base64urlLength=(value,length)=>typeof value==="string"&&new RegExp("^[A-Za-z0-9_-]{"+length+"}$").test(value);
const gate=(id,label,passed,pass,fail)=>({id,label,passed,detail:passed?pass:fail});

export function unsignedWitnessReceipt(receipt){const value=structuredClone(receipt);delete value.signature;return value}
export function witnessReceiptSigningBytes(receipt){return encoded(unsignedWitnessReceipt(receipt))}
export function canonicalRootCollection(deployments){return deployments.map(raw=>{const deployment=object(raw)||{};return{deployment_id:deployment.deployment_id,activation_at:deployment.activation_at,observation_end_at:deployment.observation_end_at,roots:(Array.isArray(deployment.roots)?deployment.roots:[]).map(rawRoot=>{const root=object(rawRoot)||{};return{root_ordinal:root.root_ordinal,covers_through_at:root.covers_through_at,root_commitment_uri:root.root_commitment_uri,root_commitment_sha256:root.root_commitment_sha256}})}})}
export async function rootCollectionSha256(deployments){return sha256Bytes(encoded(canonicalRootCollection(deployments)))}

export async function verifyRootWitnessManifest(value){
  if(!object(value))return{status:"invalid",errors:["Root-witness manifest must be one JSON object."],gates:[],summary:null};
  try{assertIJson(value,"root-witness manifest")}catch(error){return{status:"invalid",errors:[error instanceof Error?error.message:"Manifest is not strict I-JSON."],gates:[],summary:null}}
  const input=value,protocol=object(input.protocol)||{},registry=object(input.witness_registry)||{},errors=[];
  if(input.profile_version!==ROOT_COMMITMENT_WITNESS_VERSION)errors.push("profile_version must be 0.2-RC1.");
  if(!FIELD_TARGETS.includes(String(input.target_certification)))errors.push("target_certification must be a field target.");
  if(protocol.canonicalization!=="RFC8785_JCS"||protocol.hash!=="SHA-256"||protocol.signature_algorithm!=="Ed25519"||protocol.signature_scope!==RECEIPT_SCOPE)errors.push("Protocol must freeze RFC8785 JCS, SHA-256, Ed25519, and receipt_without_signature.");
  const interval=Number(protocol.commitment_interval_hours),delay=Number(protocol.maximum_publication_delay_hours),minimum=Number(protocol.minimum_independent_witnesses);
  if(!Number.isInteger(interval)||interval<1||interval>24)errors.push("commitment_interval_hours must be an integer from 1 to 24.");
  if(!Number.isInteger(delay)||delay<1||delay>24)errors.push("maximum_publication_delay_hours must be an integer from 1 to 24.");
  if(!Number.isInteger(minimum)||minimum<2)errors.push("minimum_independent_witnesses must be at least two.");
  if(!Array.isArray(input.deployments)||input.deployments.length<1)errors.push("deployments must contain at least one field deployment.");
  if(!Array.isArray(registry.keys)||registry.keys.length<2||!integer(registry.registry_version)||!https(registry.registry_uri)||!digest(registry.registry_sha256))errors.push("A versioned HTTPS witness registry with at least two keys and a non-placeholder digest is required.");
  if(errors.length)return{status:"invalid",errors,gates:[],summary:null};
  const keys=new Map(),organizations=new Set();let registryPass=true,sponsorControlled=0;
  for(const key of registry.keys){if(!object(key)||typeof key.witness_id!=="string"||!key.witness_id||keys.has(key.witness_id)||typeof key.organization!=="string"||!key.organization||!base64urlLength(key.public_key_base64url,43)||!utc(key.valid_from)||(key.valid_until!==null&&!utc(key.valid_until))||(key.revoked_at!==null&&!utc(key.revoked_at)))registryPass=false;if(key.independent_of_sponsor!==true)sponsorControlled++;keys.set(key.witness_id,key);organizations.add(key.organization)}
  if(organizations.size<2)registryPass=false;
  const deployments=input.deployments,deploymentIds=new Set(),receiptIds=new Set(),logEntries=new Set();let topologyPass=true,schedulePass=true,bindingPass=true,receiptShapePass=true,maxReceiptObservedAt=Number.NEGATIVE_INFINITY;
  let rootCount=0,receiptCount=0,missingWindows=0,unwitnessed=0,invalidSignatures=0,unknownWitnesses=0,revokedReceipts=0,maxObservedDelay=0,minimumObserved=Number.POSITIVE_INFINITY;
  for(const rawDeployment of deployments){
    const deployment=object(rawDeployment)||{},roots=Array.isArray(deployment.roots)?deployment.roots:[],activation=Date.parse(String(deployment.activation_at)),end=Date.parse(String(deployment.observation_end_at)),deploymentId=String(deployment.deployment_id??"");
    if(!deploymentId||deploymentIds.has(deploymentId)||!utc(deployment.activation_at)||!utc(deployment.observation_end_at)||end<=activation){topologyPass=false;continue}deploymentIds.add(deploymentId);
    const due=Math.ceil((end-activation)/(interval*3600000));if(roots.length!==due){schedulePass=false;missingWindows+=Math.abs(due-roots.length)}
    const rootDigests=new Set();
    for(let index=0;index<roots.length;index++){
      const root=object(roots[index])||{},expectedTime=Math.min(end,activation+(index+1)*interval*3600000),covers=Date.parse(String(root.covers_through_at));rootCount++;
      if(root.root_ordinal!==index||!utc(root.covers_through_at)||covers!==expectedTime||!https(root.root_commitment_uri)||!digest(root.root_commitment_sha256)||rootDigests.has(String(root.root_commitment_sha256)))schedulePass=false;rootDigests.add(String(root.root_commitment_sha256));
      const receipts=Array.isArray(root.receipts)?root.receipts:[],witnessIds=new Set(),witnessOrganizations=new Set();receiptCount+=receipts.length;
      for(const rawReceipt of receipts){
        const receipt=object(rawReceipt)||{},key=keys.get(String(receipt.witness_id)),observed=Date.parse(String(receipt.observed_at)),observedDelay=(observed-covers)/3600000,receiptId=String(receipt.receipt_id??""),logIdentity=String(receipt.log_uri??"")+"#"+String(receipt.log_entry_sha256??"");
        const receiptShape=receiptId.length>0&&!receiptIds.has(receiptId)&&!logEntries.has(logIdentity)&&receipt.deployment_id===deploymentId&&receipt.root_ordinal===index&&receipt.root_commitment_sha256===root.root_commitment_sha256&&receipt.covers_through_at===root.covers_through_at&&utc(receipt.observed_at)&&https(receipt.log_uri)&&digest(receipt.log_entry_sha256)&&base64urlLength(receipt.signature,86);
        receiptIds.add(receiptId);logEntries.add(logIdentity);if(Number.isFinite(observed))maxReceiptObservedAt=Math.max(maxReceiptObservedAt,observed);if(!receiptShape){receiptShapePass=false;bindingPass=false}if(!key){unknownWitnesses++;bindingPass=false;continue}
        if(receipt.witness_organization!==key.organization||witnessIds.has(key.witness_id)||witnessOrganizations.has(key.organization))bindingPass=false;witnessIds.add(key.witness_id);witnessOrganizations.add(key.organization);
        if(!Number.isFinite(observedDelay)||observedDelay<0||observedDelay>delay)bindingPass=false;else maxObservedDelay=Math.max(maxObservedDelay,observedDelay);
        const validFrom=Date.parse(key.valid_from),validUntil=key.valid_until?Date.parse(key.valid_until):Number.POSITIVE_INFINITY,revokedAt=key.revoked_at?Date.parse(key.revoked_at):Number.POSITIVE_INFINITY;
        if(observed<validFrom||observed>=validUntil||observed>=revokedAt){revokedReceipts++;bindingPass=false}
        try{const imported=await crypto.subtle.importKey("raw",decodeBase64url(key.public_key_base64url),{name:"Ed25519"},false,["verify"]),verified=await crypto.subtle.verify({name:"Ed25519"},imported,decodeBase64url(String(receipt.signature)),witnessReceiptSigningBytes(receipt));if(!verified){invalidSignatures++;bindingPass=false}}catch{invalidSignatures++;bindingPass=false}
      }
      minimumObserved=Math.min(minimumObserved,witnessOrganizations.size);if(witnessOrganizations.size<minimum){unwitnessed++;bindingPass=false}
    }
  }
  const collectionDigest=await rootCollectionSha256(deployments),collectionPass=digest(input.root_commitments_sha256)&&input.root_commitments_sha256===collectionDigest,evidence=object(input.evidence)||{},assessor=object(input.assessor)||{},assessorTime=Date.parse(String(assessor.signed_at));
  const evidencePass=https(evidence.controlled_receipt_archive_uri)&&digest(evidence.controlled_receipt_archive_sha256)&&https(evidence.public_log_index_uri)&&digest(evidence.public_log_index_sha256)&&evidence.public_aggregate_only===true&&typeof assessor.name==="string"&&assessor.name.length>0&&typeof assessor.organization==="string"&&assessor.organization.length>0&&assessor.independent_of_sponsor===true&&assessor.attested===true&&utc(assessor.signed_at)&&deployments.every(raw=>Date.parse(String((object(raw)||{}).observation_end_at))<=assessorTime)&&maxReceiptObservedAt<=assessorTime;
  const target=input.target_certification,targetPass=deployments.length>=(target==="WANTED_WILD"?20:1);
  const gates=[
    gate("RC1","FROZEN RECEIPT PROTOCOL",protocol.canonicalization==="RFC8785_JCS"&&protocol.hash==="SHA-256"&&protocol.signature_algorithm==="Ed25519"&&protocol.signature_scope===RECEIPT_SCOPE,"Canonical bytes, hash, signature, cadence, and delay rules are frozen.","Use the exact 0.2-RC1 receipt protocol."),
    gate("RC2","INDEPENDENT WITNESS REGISTRY",registryPass&&sponsorControlled===0,"At least two independently controlled witness organizations have valid registered keys.","Remove sponsor-controlled, duplicate, malformed, or single-organization witness authority."),
    gate("RC3","COMPLETE COMMITMENT CADENCE",topologyPass&&schedulePass&&missingWindows===0,"Every deployment has a root at each due interval and at observation end.","Publish every due periodic root in exact ordinal and timestamp order."),
    gate("RC4","CANONICAL ROOT COLLECTION",collectionPass,"The declared root-collection digest reproduces exactly.","Recompute the SHA-256 digest of the canonical deployment/root collection."),
    gate("RC5","BOUND RECEIPTS",receiptShapePass&&bindingPass&&unknownWitnesses===0,"Every receipt binds the exact deployment, root, coverage time, log entry, and registered witness.","Repair receipt identity, log, timing, registry, or root bindings."),
    gate("RC6","ED25519 WITNESS QUORUM",invalidSignatures===0&&revokedReceipts===0&&unwitnessed===0,"Every root has the required organizationally independent valid signatures.","Provide two valid, timely receipts from distinct independent witness organizations for every root."),
    gate("RC7","TARGET COVERAGE",targetPass,target+" has witness evidence for every declared deployment.",target==="WANTED_WILD"?"Provide at least 20 independently witnessed field deployments.":"Provide at least one independently witnessed field deployment."),
    gate("RC8","BOUND INDEPENDENT ASSURANCE",Boolean(evidencePass),"Public log index, controlled archive, and independent assessor chronology are bound.","Bind public and controlled receipt evidence with a post-observation independent attestation.")
  ];
  const summary={profile_version:ROOT_COMMITMENT_WITNESS_VERSION,target_certification:target,deployment_count:deployments.length,root_count:rootCount,receipt_count:receiptCount,minimum_witnesses_per_root:Number.isFinite(minimumObserved)?minimumObserved:0,maximum_publication_delay_hours:delay,maximum_observed_delay_hours:round(maxObservedDelay),missing_commitment_windows:missingWindows,unwitnessed_roots:unwitnessed,invalid_signatures:invalidSignatures,unknown_witnesses:unknownWitnesses,revoked_key_receipts:revokedReceipts,sponsor_controlled_witnesses:sponsorControlled,root_commitments_sha256:String(input.root_commitments_sha256??"")};
  return{status:gates.every(item=>item.passed)?"passed":"failed",errors:[],gates,summary}
}

export async function verifyRootWitnessFile(path){if(typeof process==="undefined"||!process.versions?.node)throw new Error("verifyRootWitnessFile requires Node.js");const{readFile}=await import("node:fs/promises"),text=await readFile(path,"utf8");return verifyRootWitnessManifest(JSON.parse(text))}
export async function verifyRootWitnessConformancePack(value){
  if(!object(value))return{status:"invalid",errors:["Conformance pack must be one JSON object."],profile_version:null,vector_count:0,passed_vectors:0,failed_vectors:0,vectors:[]};
  try{assertIJson(value,"root-witness conformance pack")}catch(error){return{status:"invalid",errors:[error instanceof Error?error.message:"Conformance pack is not strict I-JSON."],profile_version:null,vector_count:0,passed_vectors:0,failed_vectors:0,vectors:[]}}
  const errors=[];if(value.version!=="0.2-RCC1")errors.push("Conformance pack version must be 0.2-RCC1.");if(value.profile_version!==ROOT_COMMITMENT_WITNESS_VERSION)errors.push("Conformance pack profile_version must be 0.2-RC1.");if(!Array.isArray(value.vectors)||value.vectors.length<1)errors.push("Conformance pack must contain at least one vector.");if(errors.length)return{status:"invalid",errors,profile_version:value.profile_version??null,vector_count:Array.isArray(value.vectors)?value.vectors.length:0,passed_vectors:0,failed_vectors:0,vectors:[]};
  const ids=new Set(),vectors=[];
  for(const raw of value.vectors){const vector=object(raw)||{},expected=object(vector.expected)||{},id=String(vector.id??""),expectedFailed=Array.isArray(expected.failed_gate_ids)?expected.failed_gate_ids.map(String):null;if(!id||ids.has(id)||!object(vector.manifest)||!['passed','failed'].includes(String(expected.status))||!expectedFailed){vectors.push({id:id||"(missing)",status:"invalid",expected_status:expected.status??null,actual_status:null,expected_failed_gate_ids:expectedFailed??[],actual_failed_gate_ids:[],detail:"Malformed or duplicate conformance vector."});continue}ids.add(id);const result=await verifyRootWitnessManifest(vector.manifest),actualFailed=result.gates.filter(item=>!item.passed).map(item=>item.id),matches=result.status===expected.status&&actualFailed.length===expectedFailed.length&&actualFailed.every((gateId,index)=>gateId===expectedFailed[index]);vectors.push({id,status:matches?"passed":"failed",expected_status:expected.status,actual_status:result.status,expected_failed_gate_ids:expectedFailed,actual_failed_gate_ids:actualFailed,detail:matches?"Status and exact ordered failed-gate set match.":"Status or failed-gate set differs."})}
  const passed=vectors.filter(item=>item.status==="passed").length;return{status:passed===vectors.length?"passed":"failed",errors:[],profile_version:value.profile_version,vector_count:vectors.length,passed_vectors:passed,failed_vectors:vectors.length-passed,vectors}
}
export const CLI_EXIT_CODES=Object.freeze({pass:0,verification_failed:1,usage_or_io_error:2});
export async function runCli(args=[],io={}){const stdout=typeof io.stdout==="function"?io.stdout:value=>console.log(value),stderr=typeof io.stderr==="function"?io.stderr:value=>console.error(value),usage="Usage:\n  node wanted-root-witness-verifier.mjs ROOT-WITNESS-MANIFEST.json\n  node wanted-root-witness-verifier.mjs --conformance ROOT-WITNESS-CONFORMANCE-VECTORS.json";if(args.length===1&&["--help","-h"].includes(args[0])){stdout(usage);return CLI_EXIT_CODES.pass}const conformance=args[0]==="--conformance";if((conformance&&args.length!==2)||(!conformance&&args.length!==1)){stderr(usage);return CLI_EXIT_CODES.usage_or_io_error}try{let result;if(conformance){const{readFile}=await import("node:fs/promises");result=await verifyRootWitnessConformancePack(JSON.parse(await readFile(args[1],"utf8")))}else result=await verifyRootWitnessFile(args[0]);stdout(JSON.stringify(result,null,2));return result.status==="passed"?CLI_EXIT_CODES.pass:CLI_EXIT_CODES.verification_failed}catch(error){stderr("WANTED root-witness verifier: "+(error instanceof Error?error.message:"unable to read or verify input"));return CLI_EXIT_CODES.usage_or_io_error}}
const directlyExecuted=typeof process!=="undefined"&&Array.isArray(process.argv)&&typeof process.argv[1]==="string"&&import.meta.url.startsWith("file:")&&decodeURIComponent(new URL(import.meta.url).pathname).replace(/\\/g,"/").endsWith(process.argv[1].replace(/\\/g,"/"));
if(directlyExecuted)process.exitCode=await runCli(process.argv.slice(2));
`;

export const rootWitnessVerifierSdkContract={name:"WANTED Root Witness Verifier SDK",version:ROOT_WITNESS_VERIFIER_SDK_VERSION,protocol_version:"0.2",profile:"0.2-RC1",module:"/wanted-10k/wanted-root-witness-verifier.mjs",conformance_vectors:"/wanted-10k/root-witness-conformance-vectors.json",conformance_profile:"0.2-RCC1",format:"JavaScript ESM",runtime_dependencies:0,runtime_requirements:["Web Crypto Ed25519","TextEncoder","structuredClone","atob"],performs_network_requests:false,input:["0.2-RC1 root-witness manifest JSON","0.2-RCC1 conformance pack JSON"],exports:["canonicalize","unsignedWitnessReceipt","witnessReceiptSigningBytes","canonicalRootCollection","rootCollectionSha256","verifyRootWitnessManifest","verifyRootWitnessFile","verifyRootWitnessConformancePack","CLI_EXIT_CODES","runCli"],cli:{runtime:"Node.js 22+",usage:["node wanted-root-witness-verifier.mjs ROOT-WITNESS-MANIFEST.json","node wanted-root-witness-verifier.mjs --conformance ROOT-WITNESS-CONFORMANCE-VECTORS.json"],stdout:"JSON verification report",stderr:"usage or input error",exit_codes:{pass:0,verification_failed:1,usage_or_io_error:2}},verifies:["strict_I-JSON","frozen_protocol","witness_registry_independence","complete_commitment_cadence","canonical_root_collection_digest","receipt_identity_and_log_uniqueness","bounded_publication_delay","witness_key_lifecycle","every_Ed25519_signature","two_organization_quorum","target_coverage","assessor_chronology"],result:"pass_only_when_all_eight_RC1_gates_pass",privacy:"local_only_no_manifest_uploads_or_network_requests",interpretation:"proves timely independent disclosure of the root collection, not sensor truth, complete event capture, safety, human preference, or certification"} as const;

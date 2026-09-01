import{DEFAULT_EXPERIMENT_DESIGN_INPUT,experimentDesignPlanDocument}from"./design-lab.ts";

export const EXPERIMENT_DESIGN_REGISTRATION_PROFILE="0.36-DPR1";
export const EXPERIMENT_DESIGN_REGISTRAR_KEY_PROFILE="0.36-DPK1";
export const EXPERIMENT_DESIGN_REGISTRATION_BUNDLE_PROFILE="wanted_experiment_design_registration_bundle_0.36-DPR1";
export const EXPERIMENT_DESIGN_REGISTRATION_CLI_EXIT_CODES={pass:0,verification_failed:1,usage_or_input_error:2}as const;

export const EXPERIMENT_DESIGN_REGISTRAR_KEY_MANIFEST={profile:EXPERIMENT_DESIGN_REGISTRAR_KEY_PROFILE,registry_operator:"Synthetic Independent Registrar",registry_operator_uri:"https://example.org/registry",keys:[{key_id:"synthetic-registrar-ed25519-2026",algorithm:"Ed25519",public_key_jwk:{kty:"OKP",crv:"Ed25519",x:"4cgDy9Ip0dpUf14RZNrSKYyCirqQ6zkGm--rdq90j9Q"},valid_from:"2026-08-01T00:00:00Z",valid_until:"2026-12-31T23:59:59Z",revoked_at:null,purpose:"experiment_design_registration_receipt"}]}as const;

export const EXPERIMENT_DESIGN_REGISTRATION_REFERENCE_RECEIPT={profile:EXPERIMENT_DESIGN_REGISTRATION_PROFILE,receipt_id:"synthetic:wanted-landing-v1-C8:R36:001",registry_record_id:"synthetic-wanted-landing-v1-C8-R36-001",registry_record_uri:"https://example.org/registry/wanted-landing-v1-C8-R36-001",registry_operator:"Synthetic Independent Registrar",registrar_independent_of_sponsor:true,key_id:"synthetic-registrar-ed25519-2026",issued_at:"2026-09-01T00:00:00Z",plan_profile:"0.34-DL1",experiment:"wanted_landing_v1",analysis_cohort:"wanted_landing_v1-C8",rotator_version:"0.36-R36",canonical_plan_sha256:"9a57d5e55a2da89ee3547bd03d01010398dba1928be85a5df7603765b66a72b9",signature_algorithm:"Ed25519",signature_base64url:"QxO5jBk2Y1awfkls0ROUOvVvSqKuUASufe7HCul3zE7oUe7cQMLjrWPtFMBqDxeFXdB6fBf-se56PYwIlCAwBQ"}as const;
export const EXPERIMENT_DESIGN_REGISTRATION_REFERENCE_FIRST_EXPOSURE_AT="2026-09-02T00:00:00Z";
export const EXPERIMENT_DESIGN_REGISTRAR_KEY_MANIFEST_SHA256="bf38e557d87947d852c507e9c2d731a5356ef2636b47ec4587e5463790ceab9f";

const receiptKeys=["analysis_cohort","canonical_plan_sha256","experiment","issued_at","key_id","plan_profile","profile","receipt_id","registrar_independent_of_sponsor","registry_operator","registry_record_id","registry_record_uri","rotator_version","signature_algorithm","signature_base64url"]as const;
const manifestKeys=["keys","profile","registry_operator","registry_operator_uri"]as const;
const keyKeys=["algorithm","key_id","public_key_jwk","purpose","revoked_at","valid_from","valid_until"]as const;
const jwkKeys=["crv","kty","x"]as const;

function exactKeys(value:unknown,expected:readonly string[]){return Boolean(value&&typeof value==="object"&&!Array.isArray(value)&&JSON.stringify(Object.keys(value).sort())===JSON.stringify([...expected].sort()))}
function validUtc(value:unknown){return typeof value==="string"&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value)&&Number.isFinite(Date.parse(value))}
function validDigest(value:unknown){return typeof value==="string"&&/^[0-9a-f]{64}$/.test(value)}
function validHttps(value:unknown){return typeof value==="string"&&/^https:\/\/[A-Za-z0-9]/.test(value)}
function validBase64url(value:unknown,bytes:number){return typeof value==="string"&&new RegExp(`^[A-Za-z0-9_-]{${Math.floor(bytes*4/3)},${Math.ceil(bytes*4/3)}}$`).test(value)}

export function assertRegistrationIJson(value:unknown,path="$"):void{
  if(value===null||typeof value==="boolean"||typeof value==="string"){if(typeof value==="string"&&/[\uD800-\uDFFF]/u.test(value))throw new TypeError(`${path} contains a surrogate code point.`);return}
  if(typeof value==="number"){if(!Number.isFinite(value)||Object.is(value,-0))throw new TypeError(`${path} contains a non-I-JSON number.`);return}
  if(Array.isArray(value)){value.forEach((item,index)=>assertRegistrationIJson(item,`${path}[${index}]`));return}
  if(typeof value==="object"){for(const[key,item]of Object.entries(value as Record<string,unknown>)){if(/[\uD800-\uDFFF]/u.test(key))throw new TypeError(`${path} contains a surrogate key.`);assertRegistrationIJson(item,`${path}.${key}`)}return}
  throw new TypeError(`${path} contains an unsupported JSON value.`)
}

export function canonicalRegistrationJson(value:unknown):string{
  assertRegistrationIJson(value);
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return`[${value.map(canonicalRegistrationJson).join(",")}]`;
  return`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonicalRegistrationJson((value as Record<string,unknown>)[key])}`).join(",")}}`;
}

export async function registrationSha256(value:unknown){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(canonicalRegistrationJson(value)));return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("")}
function decodeBase64url(value:string){const normalized=value.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(value.length/4)*4,"=");return Uint8Array.from(atob(normalized),character=>character.charCodeAt(0))}
export function registrationReceiptSigningPayload(receipt:Record<string,unknown>){const payload={...receipt};delete payload.signature_base64url;return payload}

export type ExperimentDesignRegistrationResult={profile:typeof EXPERIMENT_DESIGN_REGISTRATION_PROFILE;status:"pass"|"fail";receipt_id:string|null;registry_operator:string|null;issued_at:string|null;first_eligible_exposure_at:string|null;calculated_plan_sha256:string|null;calculated_key_manifest_sha256:string|null;plan_digest_verified:boolean;trust_root_digest_verified:boolean;registrar_key_verified:boolean;signature_verified:boolean;chronology_consistent:boolean;evidence_bundle_verified:boolean;decision_eligible:false;errors:string[];limitations:string[]};

export async function verifyExperimentDesignRegistration(receiptValue:unknown,keyManifestValue:unknown,planValue:unknown,firstEligibleExposureAt:unknown,trustedKeyManifestSha256:unknown):Promise<ExperimentDesignRegistrationResult>{
  const errors:string[]=[];let calculatedPlanSha256:string|null=null,calculatedKeyManifestSha256:string|null=null,signatureVerified=false,keyVerified=false;
  try{assertRegistrationIJson(receiptValue);assertRegistrationIJson(keyManifestValue);assertRegistrationIJson(planValue)}catch(error){errors.push(error instanceof Error?error.message:"Input is not strict I-JSON.")}
  if(!exactKeys(receiptValue,receiptKeys))errors.push("Receipt fields do not match the frozen profile.");
  if(!exactKeys(keyManifestValue,manifestKeys))errors.push("Key-manifest fields do not match the frozen profile.");
  const receipt=receiptValue as Record<string,unknown>,manifest=keyManifestValue as Record<string,unknown>,plan=planValue as Record<string,unknown>;
  if(receipt?.profile!==EXPERIMENT_DESIGN_REGISTRATION_PROFILE)errors.push("Receipt profile mismatch.");
  if(manifest?.profile!==EXPERIMENT_DESIGN_REGISTRAR_KEY_PROFILE)errors.push("Key-manifest profile mismatch.");
  if(typeof receipt?.receipt_id!=="string"||receipt.receipt_id.length<8)errors.push("Receipt identifier is invalid.");
  if(typeof receipt?.registry_record_id!=="string"||receipt.registry_record_id.length<8||!validHttps(receipt.registry_record_uri))errors.push("Registry record identity is invalid.");
  if(typeof receipt?.registry_operator!=="string"||receipt.registry_operator!==manifest?.registry_operator||receipt.registrar_independent_of_sponsor!==true)errors.push("Registry operator or independence binding is invalid.");
  if(!validUtc(receipt?.issued_at))errors.push("Receipt issued_at must be whole-second RFC 3339 UTC.");
  if(receipt?.plan_profile!=="0.34-DL1"||receipt?.experiment!=="wanted_landing_v1"||receipt?.analysis_cohort!=="wanted_landing_v1-C8"||receipt?.rotator_version!=="0.36-R36")errors.push("Receipt plan identity does not match the frozen R36 design.");
  if(!validDigest(receipt?.canonical_plan_sha256)||receipt?.signature_algorithm!=="Ed25519"||!validBase64url(receipt?.signature_base64url,64))errors.push("Receipt digest or signature encoding is invalid.");
  if(!validUtc(firstEligibleExposureAt))errors.push("First eligible exposure must be whole-second RFC 3339 UTC.");
  if(!validDigest(trustedKeyManifestSha256))errors.push("Trusted key-manifest SHA-256 is invalid.");
  try{calculatedPlanSha256=await registrationSha256(planValue);calculatedKeyManifestSha256=await registrationSha256(keyManifestValue)}catch{errors.push("Canonical digest calculation failed.")}
  const planDigestVerified=calculatedPlanSha256!==null&&calculatedPlanSha256===receipt?.canonical_plan_sha256;
  if(!planDigestVerified)errors.push("Receipt does not bind the supplied canonical plan.");
  if(plan?.profile!==receipt?.plan_profile||plan?.experiment!==receipt?.experiment||plan?.analysis_cohort!==receipt?.analysis_cohort||plan?.rotator_version!==receipt?.rotator_version)errors.push("Supplied plan identity does not match the receipt.");
  const trustRootDigestVerified=calculatedKeyManifestSha256!==null&&calculatedKeyManifestSha256===trustedKeyManifestSha256;
  if(!trustRootDigestVerified)errors.push("Key manifest does not match the independently pinned digest.");
  const keys=Array.isArray(manifest?.keys)?manifest.keys:[];
  if(keys.length!==1)errors.push("Key manifest must contain exactly one conformance key for this profile.");
  const key=keys.find(candidate=>candidate&&typeof candidate==="object"&&(candidate as Record<string,unknown>).key_id===receipt?.key_id)as Record<string,unknown>|undefined;
  if(!key||!exactKeys(key,keyKeys)||!exactKeys(key.public_key_jwk,jwkKeys))errors.push("Receipt key is missing or malformed.");
  else{
    const jwk=key.public_key_jwk as Record<string,unknown>,issued=Date.parse(String(receipt.issued_at)),validFrom=Date.parse(String(key.valid_from)),validUntil=Date.parse(String(key.valid_until));
    keyVerified=key.algorithm==="Ed25519"&&key.purpose==="experiment_design_registration_receipt"&&key.revoked_at===null&&validUtc(key.valid_from)&&validUtc(key.valid_until)&&issued>=validFrom&&issued<=validUntil&&jwk.kty==="OKP"&&jwk.crv==="Ed25519"&&validBase64url(jwk.x,32);
    if(!keyVerified)errors.push("Registrar key lifecycle or purpose is invalid.");
    if(keyVerified&&validBase64url(receipt.signature_base64url,64))try{const publicKey=await crypto.subtle.importKey("jwk",jwk as JsonWebKey,{name:"Ed25519"},false,["verify"]);signatureVerified=await crypto.subtle.verify("Ed25519",publicKey,decodeBase64url(String(receipt.signature_base64url)),new TextEncoder().encode(canonicalRegistrationJson(registrationReceiptSigningPayload(receipt))))}catch{signatureVerified=false}
  }
  if(!signatureVerified)errors.push("Registrar Ed25519 signature did not verify.");
  const chronologyConsistent=validUtc(receipt?.issued_at)&&validUtc(firstEligibleExposureAt)&&Date.parse(String(receipt.issued_at))<Date.parse(String(firstEligibleExposureAt));
  if(!chronologyConsistent)errors.push("Receipt must predate the first eligible exposure.");
  const evidenceBundleVerified=errors.length===0;
  return{profile:EXPERIMENT_DESIGN_REGISTRATION_PROFILE,status:evidenceBundleVerified?"pass":"fail",receipt_id:typeof receipt?.receipt_id==="string"?receipt.receipt_id:null,registry_operator:typeof receipt?.registry_operator==="string"?receipt.registry_operator:null,issued_at:typeof receipt?.issued_at==="string"?receipt.issued_at:null,first_eligible_exposure_at:typeof firstEligibleExposureAt==="string"?firstEligibleExposureAt:null,calculated_plan_sha256:calculatedPlanSha256,calculated_key_manifest_sha256:calculatedKeyManifestSha256,plan_digest_verified:planDigestVerified,trust_root_digest_verified:trustRootDigestVerified,registrar_key_verified:keyVerified,signature_verified:signatureVerified,chronology_consistent:chronologyConsistent,evidence_bundle_verified:evidenceBundleVerified,decision_eligible:false,errors,limitations:["The verifier performs no network requests and cannot prove that the registry record was publicly available at issued_at.","Registrar independence and the first-exposure boundary require separately authenticated evidence.","A valid receipt does not authenticate human traffic, authorize early stopping, or select a winning version."]}
}

export function experimentDesignRegistrationReferencePlan(){return experimentDesignPlanDocument(DEFAULT_EXPERIMENT_DESIGN_INPUT)}
export function experimentDesignRegistrationReferenceBundle(){return{profile:EXPERIMENT_DESIGN_REGISTRATION_BUNDLE_PROFILE,receipt:EXPERIMENT_DESIGN_REGISTRATION_REFERENCE_RECEIPT,key_manifest:EXPERIMENT_DESIGN_REGISTRAR_KEY_MANIFEST,plan:experimentDesignRegistrationReferencePlan(),first_eligible_exposure_at:EXPERIMENT_DESIGN_REGISTRATION_REFERENCE_FIRST_EXPOSURE_AT,trusted_key_manifest_sha256:EXPERIMENT_DESIGN_REGISTRAR_KEY_MANIFEST_SHA256}as const}
export async function verifyExperimentDesignRegistrationBundle(value:unknown){
  if(!exactKeys(value,["first_eligible_exposure_at","key_manifest","plan","profile","receipt","trusted_key_manifest_sha256"])||(value as Record<string,unknown>)?.profile!==EXPERIMENT_DESIGN_REGISTRATION_BUNDLE_PROFILE)return{profile:EXPERIMENT_DESIGN_REGISTRATION_PROFILE,status:"fail"as const,receipt_id:null,registry_operator:null,issued_at:null,first_eligible_exposure_at:null,calculated_plan_sha256:null,calculated_key_manifest_sha256:null,plan_digest_verified:false,trust_root_digest_verified:false,registrar_key_verified:false,signature_verified:false,chronology_consistent:false,evidence_bundle_verified:false,decision_eligible:false as const,errors:["Verification bundle fields or profile do not match the frozen contract."],limitations:["No registration claim can be made from a malformed bundle."]};
  const bundle=value as Record<string,unknown>;
  return verifyExperimentDesignRegistration(bundle.receipt,bundle.key_manifest,bundle.plan,bundle.first_eligible_exposure_at,bundle.trusted_key_manifest_sha256)
}

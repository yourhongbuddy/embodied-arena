import{experimentDesignPlanSchema}from"./design-plan-schema.ts";
import{EXPERIMENT_DESIGN_REGISTRATION_PROFILE,EXPERIMENT_DESIGN_REGISTRAR_KEY_PROFILE}from"./design-registration.ts";

const digest={type:"string",pattern:"^[0-9a-f]{64}$"}as const,utc={type:"string",format:"date-time",pattern:"^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$"}as const,https={type:"string",format:"uri",pattern:"^https://"}as const;

export const experimentDesignRegistrationSchema={
  $schema:"https://json-schema.org/draft/2020-12/schema",
  $id:"https://embodied-arena.chrishongap.chatgpt.site/experiments/design-registration.schema.json",
  title:"WANTED Landing Experiment Design Registration Verification Bundle",
  type:"object",additionalProperties:false,
  required:["profile","receipt","key_manifest","plan","first_eligible_exposure_at","trusted_key_manifest_sha256"],
  properties:{profile:{const:"wanted_experiment_design_registration_bundle_0.36-DPR1"},receipt:{$ref:"#/$defs/receipt"},key_manifest:{$ref:"#/$defs/keyManifest"},plan:{$ref:"#/$defs/plan"},first_eligible_exposure_at:utc,trusted_key_manifest_sha256:digest},
  $defs:{
    plan:experimentDesignPlanSchema,
    receipt:{type:"object",additionalProperties:false,required:["profile","receipt_id","registry_record_id","registry_record_uri","registry_operator","registrar_independent_of_sponsor","key_id","issued_at","plan_profile","experiment","analysis_cohort","rotator_version","canonical_plan_sha256","signature_algorithm","signature_base64url"],properties:{profile:{const:EXPERIMENT_DESIGN_REGISTRATION_PROFILE},receipt_id:{type:"string",minLength:8},registry_record_id:{type:"string",minLength:8},registry_record_uri:https,registry_operator:{type:"string",minLength:1},registrar_independent_of_sponsor:{const:true},key_id:{type:"string",minLength:1},issued_at:utc,plan_profile:{const:"0.34-DL1"},experiment:{const:"wanted_landing_v1"},analysis_cohort:{const:"wanted_landing_v1-C8"},rotator_version:{const:"0.36-R36"},canonical_plan_sha256:digest,signature_algorithm:{const:"Ed25519"},signature_base64url:{type:"string",pattern:"^[A-Za-z0-9_-]{86}$"}}},
    keyManifest:{type:"object",additionalProperties:false,required:["profile","registry_operator","registry_operator_uri","keys"],properties:{profile:{const:EXPERIMENT_DESIGN_REGISTRAR_KEY_PROFILE},registry_operator:{type:"string",minLength:1},registry_operator_uri:https,keys:{type:"array",minItems:1,maxItems:1,items:{$ref:"#/$defs/key"}}}},
    key:{type:"object",additionalProperties:false,required:["key_id","algorithm","public_key_jwk","valid_from","valid_until","revoked_at","purpose"],properties:{key_id:{type:"string",minLength:1},algorithm:{const:"Ed25519"},public_key_jwk:{$ref:"#/$defs/jwk"},valid_from:utc,valid_until:utc,revoked_at:{type:"null"},purpose:{const:"experiment_design_registration_receipt"}}},
    jwk:{type:"object",additionalProperties:false,required:["kty","crv","x"],properties:{kty:{const:"OKP"},crv:{const:"Ed25519"},x:{type:"string",pattern:"^[A-Za-z0-9_-]{43}$"}}},
  },
}as const;

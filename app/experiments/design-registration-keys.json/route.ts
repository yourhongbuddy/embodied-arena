import{EXPERIMENT_DESIGN_REGISTRAR_KEY_MANIFEST,EXPERIMENT_DESIGN_REGISTRAR_KEY_MANIFEST_SHA256}from"../design-registration.ts";

export function GET(){return Response.json({synthetic:true,canonical_key_manifest_sha256:EXPERIMENT_DESIGN_REGISTRAR_KEY_MANIFEST_SHA256,key_manifest:EXPERIMENT_DESIGN_REGISTRAR_KEY_MANIFEST,interpretation:"Conformance trust root only. Independently pin a real registrar key-manifest digest outside this site before verifying real receipts."},{headers:{"cache-control":"public, max-age=3600"}})}

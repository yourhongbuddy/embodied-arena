const openapi = {
  openapi: "3.1.0",
  info: {
    title: "WANTED-10K Adapter Contract",
    version: "0.2.0",
    description: "A vendor-neutral transport profile with signed lifecycle boundaries, RFC 8785 canonicalization, per-deployment ordering, Ed25519 signatures under authenticity profile 0.2-T1, and a SHA-256 previous-event chain. Implementers expose or adapt this relative path; this website does not operate a study-ingestion service.",
  },
  paths: {
    "/v1/events": {
      post: {
        operationId: "appendWantedEvent",
        summary: "Append one ordered benchmark event",
        parameters: [{ name: "Idempotency-Key", in: "header", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "./event.schema.json" } } } },
        responses: {
          "202": { description: "Accepted after schema, idempotency, sequence, hash-chain, and signature validation" },
          "409": { description: "Duplicate idempotency key or non-monotonic sequence" },
          "422": { description: "Invalid benchmark event" },
        },
      },
    },
    "/v1/deployments/{deployment_id}/tail": {
      get: {
        operationId: "getWantedDeploymentTail",
        summary: "Recover the last accepted chain checkpoint after restart",
        parameters: [{ name: "deployment_id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Authoritative accepted tail", content: { "application/json": { schema: { type: "object", required: ["next_sequence", "previous_event_hash", "last_occurred_at"], properties: { next_sequence: { type: "integer", minimum: 1 }, previous_event_hash: { type: "string", pattern: "^[a-f0-9]{64}$" }, last_occurred_at: { type: "string", format: "date-time" } } } } } },
          "404": { description: "No accepted event; initialize a genesis checkpoint at sequence zero" },
        },
      },
    },
  },
  "x-wanted-status": "contract-only",
  "x-wanted-reference-sdk": "/wanted-10k/wanted-sdk.mjs",
  "x-wanted-evidence-profiles": {
    preregistration_integrity: { version: "0.2-PR1", contract: "/wanted-10k/preregistration-integrity.json", schema: "/wanted-10k/preregistration-integrity.schema.json", template: "/wanted-10k/preregistration-integrity.template.json", local_verifier: "/wanted-10k/preregistration-integrity" },
    protocol_deviation_integrity: { version: "0.2-DV1", contract: "/wanted-10k/protocol-deviations.json", schema: "/wanted-10k/protocol-deviations.schema.json", template: "/wanted-10k/protocol-deviations.template.json", local_verifier: "/wanted-10k/protocol-deviations" },
    sampling_stopping_integrity: { version: "0.2-ST1", contract: "/wanted-10k/sampling-stopping.json", schema: "/wanted-10k/sampling-stopping.schema.json", template: "/wanted-10k/sampling-stopping.template.json", local_verifier: "/wanted-10k/sampling-stopping" },
    endpoint_adjudication: { version: "0.2-J1", contract: "/wanted-10k/endpoint-adjudication.json", schema: "/wanted-10k/endpoint-adjudication.schema.json", template: "/wanted-10k/endpoint-adjudication.template.json", local_verifier: "/wanted-10k/endpoint-adjudication" },
    site_heterogeneity: { version: "0.2-SH1", contract: "/wanted-10k/site-heterogeneity.json", schema: "/wanted-10k/site-heterogeneity.schema.json", template: "/wanted-10k/site-heterogeneity.template.json", local_verifier: "/wanted-10k/site-heterogeneity" },
    root_commitment_witness: { version: "0.2-RC1", contract: "/wanted-10k/root-commitment-witness.json", schema: "/wanted-10k/root-commitment-witness.schema.json", template: "/wanted-10k/root-commitment-witness.template.json", local_verifier: "/wanted-10k/root-commitment-witness", pasted_manifest_uploads: false },
  },
  "x-wanted-certification": { contract: "/wanted-10k/certification.json", audit_schema: "/wanted-10k/audit-manifest.schema.json", target_templates: "/wanted-10k/certification-templates.json", local_readiness_verifier: "/wanted-10k/audit" },
  "x-wanted-audit-verifier": { module: "/wanted-10k/wanted-audit-verifier.mjs", contract: "/wanted-10k/audit-verifier-sdk.json", performs_network_requests: false },
  "x-wanted-analysis-conformance": { profile: "0.2-AC4", runner_version: "0.2-ACS4", module: "/wanted-10k/wanted-analysis-conformance.mjs", contract: "/wanted-10k/analysis-conformance-sdk.json", vectors: "/wanted-10k/analysis-conformance-vectors.json", vector_pack_sha256: "64e0071ba4d0b843825dd57dca6636a25ddfa1af60d510a6f47bf8c04a29b277", ranking_effect: "none" },
  "x-wanted-exposure-ledger": "/wanted-10k/exposure-ledger.json",
  "x-wanted-telemetry-authenticity": "/wanted-10k/telemetry-authenticity.json",
  "x-wanted-telemetry-verifier": { version: "0.2-TS4", module: "/wanted-10k/wanted-telemetry-verifier.mjs", contract: "/wanted-10k/telemetry-verifier-sdk.json", performs_network_requests: false, cli_exit_codes: { pass: 0, verification_failed: 1, usage_or_io_error: 2 }, reports: { stream: "0.2-TR1", aggregate: "0.2-TA1", exposure_reconciliation: "0.2-TX1", audit_handoff: "exact_audit_manifest.telemetry_shape_with_exposure_binding" } },
  "x-wanted-root-witness-verifier": { version: "0.2-RCS2", profile: "0.2-RC1", module: "/wanted-10k/wanted-root-witness-verifier.mjs", contract: "/wanted-10k/root-witness-verifier-sdk.json", conformance: { version: "0.2-RCC1", vectors: "/wanted-10k/root-witness-conformance-vectors.json", vector_count: 11 }, performs_network_requests: false, cli_exit_codes: { pass: 0, verification_failed: 1, usage_or_io_error: 2 }, result: "pass_only_when_all_eight_RC1_gates_pass" },
  "x-wanted-root-envelope": { version: "0.2-RE1", sdk_version: "0.2-RES1", guide: "/wanted-10k/root-commitment-witness/envelopes", module: "/wanted-10k/wanted-root-envelope.mjs", contract: "/wanted-10k/root-envelope.json", sdk_contract: "/wanted-10k/root-envelope-sdk.json", schema: "/wanted-10k/root-envelope.schema.json", template: "/wanted-10k/root-envelope.template.json", telemetry_verifier_dependency: "/wanted-10k/wanted-telemetry-verifier.mjs", performs_network_requests: false, cli_modes: ["create", "verify", "verify-series"] },
  "x-wanted-root-witness-receipt": { version: "0.2-RIS1", profile: "0.2-RC1", guide: "/wanted-10k/root-commitment-witness/issuance", module: "/wanted-10k/wanted-root-witness-receipt.mjs", contract: "/wanted-10k/root-witness-receipt-sdk.json", schema: "/wanted-10k/root-witness-receipt.schema.json", template: "/wanted-10k/root-witness-receipt.template.json", performs_network_requests: false, private_key_input_supported: false, cli_modes: ["prepare", "attach", "verify"] },
  "x-wanted-key-manifest-schema": "/wanted-10k/telemetry-key-manifest.schema.json",
  "x-hilo-realtime-contract": "/wanted-10k/realtime.json",
  "x-hilo-realtime-schema": "/wanted-10k/realtime.schema.json",
  "x-hilo-realtime-template": "/wanted-10k/realtime.template.json",
};

export async function GET() {
  return Response.json(openapi, { headers: { "cache-control": "public, max-age=3600" } });
}

import { sampleKeyManifest, TELEMETRY_AUTHENTICITY_VERSION } from "../conformance/validator.ts";
import { TELEMETRY_VERIFIER_SDK_VERSION } from "../telemetry-sdk/source.ts";

export const telemetryAuthenticityContract = {
  name: "WANTED Telemetry Authenticity Profile",
  version: TELEMETRY_AUTHENTICITY_VERSION,
  protocol_version: "0.2",
  applies_to: ["WANTED_LAB", "WANTED_WILD", "WANTED_10K"],
  scoring: "eligibility_gate_not_score",
  algorithm: "Ed25519",
  canonicalization: "RFC8785_JCS",
  signature_scope: "current_event_without_signature",
  hash_chain: "previous_event_hash_is_SHA256_of_full_previous_signed_JCS_event",
  key_resolution: "signing_key_id_must_resolve_in_frozen_manifest",
  validity_rule: "valid_from_inclusive_valid_until_exclusive_revocation_effective_at_revoked_at",
  verification: ["every_event_signature", "every_hash_chain_link", "key_manifest_shape", "key_id_resolution", "key_validity_window", "key_revocation"],
  audit_summary_required: ["total_events", "verified_signatures_equals_total_events", "invalid_signatures_equals_zero", "unknown_key_ids_equals_zero", "expired_key_events_equals_zero", "revoked_key_events_equals_zero", "hash_chain_mismatches_equals_zero", "key_manifest_hash", "verification_report_hash"],
  counting_rules: { invalid_signatures: "malformed_or_cryptographically_invalid_event_signatures", unknown_key_ids: "distinct_unresolved_signing_key_identifiers", expired_key_events: "events_at_or_after_valid_until", revoked_key_events: "events_at_or_after_revoked_at", hash_chain_mismatches: "non_genesis_events_whose_previous_event_hash_does_not_match" },
  hard_failures: ["missing_key_manifest", "unknown_key_id", "malformed_public_key", "invalid_signature", "expired_key_event", "revoked_key_event", "broken_hash_chain", "noncanonical_signature_scope"],
  privacy: "verification_runs_locally_and_does_not_upload_event_data",
  portable_verifier: { version: TELEMETRY_VERIFIER_SDK_VERSION, module: "/wanted-10k/wanted-telemetry-verifier.mjs", contract: "/wanted-10k/telemetry-verifier-sdk.json", stream_report: "0.2-TR1", aggregate_report: "0.2-TA1", audit_handoff: "exact_audit_manifest.telemetry_shape" },
  interpretation: "proves_integrity_and_possession_of_a_registered_signing_key_not_sensor_truth_complete_capture_or_key_custody",
} as const;

export const telemetryKeyManifestSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://embodied-arena.chrishongap.chatgpt.site/wanted-10k/telemetry-key-manifest.schema.json",
  title: "WANTED-10K Telemetry Key Manifest",
  type: "object",
  additionalProperties: false,
  required: ["profile_version", "protocol_version", "algorithm", "canonicalization", "signature_scope", "key_manifest_id", "keys"],
  properties: {
    profile_version: { const: TELEMETRY_AUTHENTICITY_VERSION },
    protocol_version: { const: "0.2" },
    algorithm: { const: "Ed25519" },
    canonicalization: { const: "RFC8785_JCS" },
    signature_scope: { const: "current_event_without_signature" },
    key_manifest_id: { type: "string", minLength: 8, maxLength: 128 },
    keys: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, required: ["key_id", "public_key_base64url", "valid_from", "valid_until", "revoked_at"], properties: {
      key_id: { type: "string", minLength: 1, maxLength: 128 },
      public_key_base64url: { type: "string", pattern: "^[A-Za-z0-9_-]{43}$" },
      valid_from: { type: "string", format: "date-time" },
      valid_until: { type: ["string", "null"], format: "date-time" },
      revoked_at: { type: ["string", "null"], format: "date-time" },
    } } },
  },
} as const;

export const telemetryKeyManifestTemplate = sampleKeyManifest;

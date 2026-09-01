import type { RootWitnessManifest } from "../root-commitment-witness/profile.ts";
import { rootWitnessTemplateFor } from "../root-commitment-witness/template.ts";

export const ROOT_WITNESS_CONFORMANCE_VERSION = "0.2-RCC1";

type Expected = { status: "passed" | "failed"; failed_gate_ids: string[] };
type VectorDefinition = {
  id: string;
  purpose: string;
  expected: Expected;
  mutate?: (manifest: RootWitnessManifest) => void;
};

const definitions: VectorDefinition[] = [
  { id: "RCC1-CANONICAL", purpose: "Accept the signed five-root, ten-receipt WANTED LAB example.", expected: { status: "passed", failed_gate_ids: [] } },
  { id: "RCC1-MISSING-WINDOW", purpose: "Reject a missing periodic root and its resulting ordinal, receipt-binding, and collection-digest drift.", expected: { status: "failed", failed_gate_ids: ["RC3", "RC4", "RC5"] }, mutate: manifest => { manifest.deployments[0].roots.splice(2, 1); } },
  { id: "RCC1-LATE-RECEIPT", purpose: "Reject a receipt observed after the frozen 24-hour publication window.", expected: { status: "failed", failed_gate_ids: ["RC5", "RC6"] }, mutate: manifest => { const receipt=manifest.deployments[0].roots[0].receipts[0];receipt.observed_at=new Date(Date.parse(receipt.covers_through_at)+25*3600000).toISOString(); } },
  { id: "RCC1-FORGED-SIGNATURE", purpose: "Reject one altered Ed25519 receipt signature.", expected: { status: "failed", failed_gate_ids: ["RC5", "RC6"] }, mutate: manifest => { const receipt=manifest.deployments[0].roots[0].receipts[0];receipt.signature=`${receipt.signature.startsWith("A")?"B":"A"}${receipt.signature.slice(1)}`; } },
  { id: "RCC1-RECEIPT-REPLAY", purpose: "Reject reuse of one receipt identity across two roots, including the resulting signature-scope mismatch.", expected: { status: "failed", failed_gate_ids: ["RC5", "RC6"] }, mutate: manifest => { manifest.deployments[0].roots[1].receipts[0].receipt_id=manifest.deployments[0].roots[0].receipts[0].receipt_id; } },
  { id: "RCC1-LOG-REPLAY", purpose: "Reject reuse of one transparency-log entry across two roots, including the resulting signature-scope mismatch.", expected: { status: "failed", failed_gate_ids: ["RC5", "RC6"] }, mutate: manifest => { const source=manifest.deployments[0].roots[0].receipts[0],target=manifest.deployments[0].roots[1].receipts[0];target.log_uri=source.log_uri;target.log_entry_sha256=source.log_entry_sha256; } },
  { id: "RCC1-REVOKED-KEY", purpose: "Reject receipts observed after their witness key was revoked.", expected: { status: "failed", failed_gate_ids: ["RC5", "RC6"] }, mutate: manifest => { manifest.witness_registry.keys[0].revoked_at="2026-01-01T00:00:00.000Z"; } },
  { id: "RCC1-SAME-ORGANIZATION", purpose: "Reject a nominal two-key quorum controlled by one organization.", expected: { status: "failed", failed_gate_ids: ["RC2", "RC5", "RC6"] }, mutate: manifest => { manifest.witness_registry.keys[1].organization=manifest.witness_registry.keys[0].organization; } },
  { id: "RCC1-PREMATURE-ASSESSOR", purpose: "Reject an assessor attestation made before the final witness receipt.", expected: { status: "failed", failed_gate_ids: ["RC8"] }, mutate: manifest => { manifest.assessor.signed_at=manifest.deployments[0].observation_end_at; } },
  { id: "RCC1-ROOT-SUBSTITUTION", purpose: "Reject a root changed after its receipts and canonical collection declaration were created.", expected: { status: "failed", failed_gate_ids: ["RC4", "RC5"] }, mutate: manifest => { manifest.deployments[0].roots[0].root_commitment_sha256="abcdef01".repeat(8); } },
  { id: "RCC1-UNKNOWN-WITNESS", purpose: "Reject a receipt whose witness identity is absent from the frozen registry.", expected: { status: "failed", failed_gate_ids: ["RC5", "RC6"] }, mutate: manifest => { manifest.deployments[0].roots[0].receipts[0].witness_id="unknown-witness"; } },
];

export async function rootWitnessConformancePack(){
  const vectors=[];
  for(const definition of definitions){
    const manifest=await rootWitnessTemplateFor("WANTED_LAB");
    definition.mutate?.(manifest);
    vectors.push({id:definition.id,purpose:definition.purpose,manifest,expected:definition.expected});
  }
  return {name:"WANTED Root-Witness Conformance Vectors",version:ROOT_WITNESS_CONFORMANCE_VERSION,protocol_version:"0.2",profile_version:"0.2-RC1",verifier_sdk_minimum_version:"0.2-RCS2",pass_condition:"every_vector_matches_expected_status_and_exact_ordered_failed_gate_ids",interpretation:"developer_conformance_only_not_certification_or_evidence_truth",vectors};
}

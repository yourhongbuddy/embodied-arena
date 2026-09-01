import assert from "node:assert/strict";
import test from "node:test";
import { assessRootCommitmentWitness, rootCommitmentWitnessContract, rootCommitmentWitnessSchema, rootCollectionSha256 } from "../app/wanted-10k/root-commitment-witness/profile.ts";
import { rootWitnessTemplateFor } from "../app/wanted-10k/root-commitment-witness/template.ts";
import { auditManifestTemplates } from "../app/wanted-10k/audit/manifest.ts";
import { assessManifest } from "../app/wanted-10k/audit/readiness.ts";
import { leaderboardContract } from "../app/wanted-10k/leaderboard/registry.ts";
import { certificationProfile } from "../app/wanted-10k/certification/profile.ts";

const gate=(result,id)=>result.gates.find(item=>item.id===id);

test("verifies periodic roots through two independent Ed25519 witnesses",async()=>{
  const manifest=await rootWitnessTemplateFor("WANTED_LAB"),result=await assessRootCommitmentWitness(manifest);
  assert.equal(result.status,"passed",JSON.stringify(result));
  assert.equal(result.summary.deployment_count,1);
  assert.equal(result.summary.root_count,5);
  assert.equal(result.summary.receipt_count,10);
  assert.equal(result.summary.minimum_witnesses_per_root,2);
  assert.equal(result.summary.root_commitments_sha256,await rootCollectionSha256(manifest.deployments));
});

test("rejects missing windows, late receipts, and root substitution",async()=>{
  const missing=await rootWitnessTemplateFor();missing.deployments[0].roots.splice(2,1);
  assert.equal(gate(await assessRootCommitmentWitness(missing),"RC3").passed,false);
  const late=await rootWitnessTemplateFor();late.deployments[0].roots[0].receipts[0].observed_at=new Date(Date.parse(late.deployments[0].roots[0].covers_through_at)+25*3600000).toISOString();
  assert.equal(gate(await assessRootCommitmentWitness(late),"RC5").passed,false);
  const substituted=await rootWitnessTemplateFor();substituted.deployments[0].roots[0].root_commitment_sha256="abcdef01".repeat(8);
  assert.equal(gate(await assessRootCommitmentWitness(substituted),"RC4").passed,false);
  assert.equal(gate(await assessRootCommitmentWitness(substituted),"RC5").passed,false);
});

test("rejects forged, unknown, revoked, and same-organization receipts",async()=>{
  const forged=await rootWitnessTemplateFor();forged.deployments[0].roots[0].receipts[0].signature=`A${forged.deployments[0].roots[0].receipts[0].signature.slice(1)}`;
  assert.equal(gate(await assessRootCommitmentWitness(forged),"RC6").passed,false);
  const unknown=await rootWitnessTemplateFor();unknown.deployments[0].roots[0].receipts[0].witness_id="unknown";
  assert.equal((await assessRootCommitmentWitness(unknown)).summary.unknown_witnesses,1);
  const revoked=await rootWitnessTemplateFor();revoked.witness_registry.keys[0].revoked_at="2026-01-01T00:00:00.000Z";
  assert.equal((await assessRootCommitmentWitness(revoked)).summary.revoked_key_receipts,5);
  const colluding=await rootWitnessTemplateFor();colluding.witness_registry.keys[1].organization=colluding.witness_registry.keys[0].organization;
  assert.equal(gate(await assessRootCommitmentWitness(colluding),"RC2").passed,false);
});

test("rejects receipt replay and an assessor who signs before witnessing finishes",async()=>{
  const replay=await rootWitnessTemplateFor();replay.deployments[0].roots[1].receipts[0].receipt_id=replay.deployments[0].roots[0].receipts[0].receipt_id;
  assert.equal(gate(await assessRootCommitmentWitness(replay),"RC5").passed,false);
  const logReplay=await rootWitnessTemplateFor();logReplay.deployments[0].roots[1].receipts[0].log_uri=logReplay.deployments[0].roots[0].receipts[0].log_uri;logReplay.deployments[0].roots[1].receipts[0].log_entry_sha256=logReplay.deployments[0].roots[0].receipts[0].log_entry_sha256;
  assert.equal(gate(await assessRootCommitmentWitness(logReplay),"RC5").passed,false);
  const premature=await rootWitnessTemplateFor();premature.assessor.signed_at=premature.deployments[0].observation_end_at;
  assert.equal(gate(await assessRootCommitmentWitness(premature),"RC8").passed,false);
});

test("publishes a strict eligibility-only machine contract",()=>{
  assert.equal(rootCommitmentWitnessContract.version,"0.2-RC1");
  assert.equal(rootCommitmentWitnessContract.ranking_effect,"eligibility_only_never_score_or_tiebreaker");
  assert.equal(rootCommitmentWitnessContract.witness_quorum.minimum_organizations_per_root,2);
  assert.equal(rootCommitmentWitnessContract.publication_delay.maximum_hours,24);
  assert.equal(rootCommitmentWitnessContract.local_verifier.performs_network_requests,false);
  assert.equal(rootCommitmentWitnessContract.local_verifier.pasted_manifest_uploads,false);
  assert.equal(rootCommitmentWitnessSchema.additionalProperties,false);
  assert.equal(rootCommitmentWitnessSchema.properties.protocol.properties.minimum_independent_witnesses.minimum,2);
});

test("binds timely root witnessing into every field certification and ranked admission",async()=>{
  for(const target of ["WANTED_LAB","WANTED_WILD","WANTED_10K"]){
    const manifest=structuredClone(auditManifestTemplates[target]);
    assert.equal(manifest.root_commitment_witness.profile_version,"0.2-RC1");
    assert.equal((await assessManifest(JSON.stringify(manifest))).gates.find(item=>item.id==="G5").status,"pass");
    const missing=structuredClone(manifest);missing.root_commitment_witness.missing_commitment_windows=1;
    assert.equal((await assessManifest(JSON.stringify(missing))).gates.find(item=>item.id==="G5").status,"fail");
    const substituted=structuredClone(manifest);substituted.root_commitment_witness.root_commitments_sha256="abcdef01".repeat(8);
    assert.equal((await assessManifest(JSON.stringify(substituted))).gates.find(item=>item.id==="G5").status,"fail");
    const noEvidence=structuredClone(manifest);noEvidence.evidence=noEvidence.evidence.filter(item=>item.role!=="root_commitment_witness_report");
    assert.equal((await assessManifest(JSON.stringify(noEvidence))).gates.find(item=>item.id==="G5").status,"fail");
    assert.equal(certificationProfile.targets[target].requires.includes("root_commitment_witness_0.2-RC1"),true);
  }
  assert.equal(auditManifestTemplates.PREQUALIFIED.root_commitment_witness.applicable,false);
  assert.equal(certificationProfile.targets.PREQUALIFIED.not_applicable.includes("root_commitment_witness_0.2-RC1"),true);
  assert.equal(leaderboardContract.admission.includes("root_commitment_witness_profile_0.2-RC1_passes"),true);
});

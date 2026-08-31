import assert from "node:assert/strict";
import test from "node:test";
import { assessSafety,safetyTemplate } from "../app/wanted-10k/safety/profile.ts";
import { auditManifestTemplate } from "../app/wanted-10k/audit/manifest.ts";
import { assessManifest } from "../app/wanted-10k/audit/readiness.ts";

test("passes the complete field safety case without producing a score",()=>{const result=assessSafety(safetyTemplate);assert.equal(result.status,"passed");assert.equal(result.gates.length,7);assert.equal(result.summary.context_coverage,1);assert.equal(result.summary.privileged_path_coverage,1);assert.equal(result.summary.l4_incidents,0)});

test("fails limit exceedance, L4, and unauthenticated privileged access independently",()=>{
  const slow=structuredClone(safetyTemplate);slow.protective_functions.participant_stop.observed_max_ms=slow.protective_functions.participant_stop.preregistered_limit_ms+1;assert.equal(assessSafety(slow).gates.find(g=>g.id==="S2").passed,false);
  const serious=structuredClone(safetyTemplate);serious.incidents.L4=1;assert.equal(assessSafety(serious).gates.find(g=>g.id==="S4").passed,false);
  const access=structuredClone(safetyTemplate);access.security.authenticated_privileged_paths--;assert.equal(assessSafety(access).gates.find(g=>g.id==="S5").passed,false);
});

test("rejects impossible open-incident counters",()=>{const impossible=structuredClone(safetyTemplate);impossible.incidents.unresolved_L3=2;const result=assessSafety(impossible);assert.equal(result.status,"invalid");assert.match(result.errors.join(" "),/cannot exceed/)});

test("requires the quantitative safety case for audit readiness",async()=>{const passing=await assessManifest(JSON.stringify(auditManifestTemplate));assert.equal(passing.status,"test");assert.equal(passing.gates.find(g=>g.id==="G5").status,"pass");const failed=structuredClone(auditManifestTemplate);failed.safety.context_coverage=.99;const result=await assessManifest(JSON.stringify(failed));assert.equal(result.status,"not_ready");assert.equal(result.gates.find(g=>g.id==="G5").status,"fail");const unbound=structuredClone(auditManifestTemplate);unbound.safety.policy_artifact_sha256=`${"e".repeat(63)}d`;assert.equal((await assessManifest(JSON.stringify(unbound))).gates.find(g=>g.id==="G5").status,"fail")});

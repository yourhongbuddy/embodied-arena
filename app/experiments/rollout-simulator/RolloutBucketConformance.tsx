import {
  experimentRolloutBucketConformanceReferenceBundle,
  verifyExperimentRolloutBucketConformance,
} from "../rollout-bucket-conformance.ts";

const range = (first: number | null, last: number | null) =>
  first === null || last === null ? "—" : `${first.toLocaleString()}–${last.toLocaleString()}`;

export async function RolloutBucketConformance() {
  const bundle = await experimentRolloutBucketConformanceReferenceBundle();
  const result = await verifyExperimentRolloutBucketConformance(bundle);
  const certificate = result.certificate;

  return (
    <section className="rolloutBucketProof shell">
      <header>
        <div>
          <span>EXHAUSTIVE 10,000-BUCKET PROOF</span>
          <b>EVERY INTEGER BUCKET · EVERY STAGED PHASE · EXACT ROLLBACK</b>
        </div>
        <i>{result.status.toUpperCase()}</i>
      </header>
      <div className="rolloutBucketClaims">
        {[
          ["NO GAPS · NO OVERLAPS", result.no_gap_or_overlap_verified],
          ["MONOTONE NESTING", result.monotone_nesting_verified],
          ["EXACT PHASE COUNTS", result.exact_phase_counts_verified],
          ["100% CONTROL ROLLBACK", result.rollback_control_verified],
        ].map(([label, passed]) => (
          <article key={String(label)}>
            <span>{label}</span>
            <strong>{passed ? "PROVED" : "FAILED"}</strong>
          </article>
        ))}
      </div>
      <div className="rolloutBucketMatrix">
        <header><span>PHASE</span><span>PROOF RANGE</span><span>PROOF</span><span>CONTROL</span><span>NEWLY PROOF</span></header>
        {certificate?.phases.map((phase) => (
          <article key={phase.phase}>
            <b>{phase.phase.toUpperCase()}</b>
            <code>{range(phase.first_selected_bucket, phase.last_selected_bucket)}</code>
            <strong>{phase.exact_selected_buckets.toLocaleString()}</strong>
            <strong>{phase.exact_control_buckets.toLocaleString()}</strong>
            <strong>+{phase.newly_selected_buckets.toLocaleString()}</strong>
          </article>
        ))}
      </div>
      <footer>
        <p><span>CERTIFICATE SHA-256</span><code>{certificate?.certificate_sha256 ?? "unavailable"}</code></p>
        <p>All 10,000 possible integer buckets are enumerated offline. This certificate does not inspect users, serve a version, count exposure, change a phase, or deploy.</p>
      </footer>
      <nav className="rolloutSimulatorResources" aria-label="Rollout bucket conformance resources">
        <a href="/experiments/rollout-bucket-conformance.reference.json">REFERENCE CERTIFICATE ↗</a>
        <a href="/experiments/rollout-bucket-conformance.schema.json">STRICT JSON SCHEMA ↗</a>
        <a href="/experiments/wanted-rollout-bucket-conformance.mjs">OFFLINE VERIFIER ↗</a>
        <a href="/experiments/rollout-bucket-conformance.json">DEVELOPER CONTRACT ↗</a>
      </nav>
    </section>
  );
}

import { EXPERIMENT_ROLLOUT_DISTRIBUTION_REFERENCE_SUMMARY as summary } from "../rollout-distribution-audit.ts";

export function RolloutDistributionAudit() {
  return (
    <section className="rolloutDistributionAudit shell">
      <header>
        <div>
          <span>ONE MILLION SYNTHETIC UNITS</span>
          <b>SOURCE-BOUND HASH-DISTRIBUTION AUDIT · PROFILE 0.48-RDA2</b>
        </div>
        <i>PASS</i>
      </header>
      <div className="rolloutDistributionStats">
        <article><span>BUCKETS REACHED</span><strong>{summary.observed_bucket_count.toLocaleString()} / 10,000</strong><small>zero empty buckets</small></article>
        <article><span>OCCUPANCY RANGE</span><strong>{summary.minimum_bucket_occupancy}–{summary.maximum_bucket_occupancy}</strong><small>expected 100 per bucket</small></article>
        <article><span>MAX DEVIATION</span><strong>±{summary.maximum_absolute_bucket_deviation}</strong><small>gate: at most ±50</small></article>
        <article><span>χ² × 100</span><strong>{summary.pearson_chi_square_times_100.toLocaleString()}</strong><small>9,999 degrees of freedom</small></article>
      </div>
      <div className="rolloutDistributionMatrix">
        <header><span>PHASE</span><span>EXPECTED</span><span>OBSERVED</span><span>DEVIATION / 1M</span></header>
        {summary.phases.map((phase) => (
          <article key={phase.phase}>
            <b>{phase.phase.toUpperCase()}</b>
            <strong>{phase.expected.toLocaleString()}</strong>
            <strong>{phase.observed.toLocaleString()}</strong>
            <code>{phase.deviation > 0 ? "+" : ""}{phase.deviation.toLocaleString()}</code>
          </article>
        ))}
      </div>
      <footer>
        <p><span>OCCUPANCY VECTOR SHA-256</span><code>{summary.bucket_occupancy_sha256}</code></p>
        <p><span>AUDITED IMPLEMENTATION SHA-256</span><code>{summary.audited_source_sha256}</code></p>
        <p><span>16-VECTOR PARITY SHA-256</span><code>{summary.cross_implementation_vectors_sha256}</code></p>
        <p><span>CERTIFICATE SHA-256</span><code>{summary.certificate_sha256}</code></p>
      </footer>
      <aside>The certificate binds the exact staged-rollout helper and 16 independently reproduced boundary vectors before enumerating synthetic indices 0–999,999. It is not a hypothesis test, a claim of cryptographic randomness, evidence about real users, or input to version selection.</aside>
      <nav className="rolloutSimulatorResources" aria-label="Rollout distribution audit resources">
        <a href="/experiments/rollout-distribution.reference.json">REFERENCE CERTIFICATE ↗</a>
        <a href="/experiments/rollout-distribution.schema.json">STRICT JSON SCHEMA ↗</a>
        <a href="/experiments/wanted-rollout-distribution.mjs">OFFLINE AUDITOR ↗</a>
        <a href="/experiments/rollout-distribution.json">DEVELOPER CONTRACT ↗</a>
      </nav>
    </section>
  );
}

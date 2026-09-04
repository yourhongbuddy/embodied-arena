import { EXPERIMENT_ROLLOUT_COHORT_SEPARATION_REFERENCE_SUMMARY as summary } from "../rollout-cohort-separation.ts";

export function RolloutCohortSeparation() {
  return (
    <section className="rolloutCohortSeparation shell">
      <header>
        <div>
          <span>C8 → C9 COHORT SEPARATION</span>
          <b>ONE MILLION SOURCE-BOUND SYNTHETIC UNITS · PROFILE 0.49-CSR1</b>
        </div>
        <i>HOLD</i>
      </header>
      <section className="cohortSeparationVerdict">
        <div><span>ACTIVATION</span><strong>NOT AUTHORIZED</strong><small>candidate allocator requires replacement</small></div>
        <p>The broad allocation rates look independent, but the bucket-level mapping is not. Every C9-minus-C8 bucket difference is odd, so half of the modulo-16 outcomes are impossible.</p>
      </section>
      <div className="cohortSeparationMetrics">
        <article><span>TREATMENT ASSOCIATION</span><strong>{summary.treatment_association_ppm.toLocaleString()} ppm</strong><small>passes ≤5,000 ppm gate</small></article>
        <article><span>DECILE ASSOCIATION</span><strong>{summary.decile_association_ppm.toLocaleString()} ppm</strong><small>passes ≤5,000 ppm gate</small></article>
        <article><span>BUCKET CORRELATION</span><strong>{summary.bucket_correlation_ppm.toLocaleString()} ppm</strong><small>passes absolute ≤5,000 ppm gate</small></article>
        <article className="cohortSeparationFail"><span>EXACT BUCKET MATCHES</span><strong>{summary.exact_bucket_match_count}</strong><small>fails expected 50–150 gate</small></article>
      </div>
      <div className="cohortResidues">
        <header><span>MODULO-16 DIFFERENCE RESIDUES</span><b>8 OF 16 OBSERVED · STRUCTURAL COUPLING</b></header>
        <div>{Array.from({ length: 16 }, (_, residue) => {
          const observed = (summary.observed_modulo_16_difference_residues as readonly number[]).includes(residue);
          return <span className={observed ? "residueObserved" : "residueMissing"} key={residue}>{residue}<small>{observed ? "OBSERVED" : "MISSING"}</small></span>;
        })}</div>
      </div>
      <section className="cohortRemediation">
        <b>REQUIRED BEFORE ACTIVATION REVIEW</b>
        <p>Replace the candidate bucket derivation with a domain-separated cryptographic hash, issue a new cohort and implementation profile, then rerun bucket conformance, distribution, and separation audits.</p>
      </section>
      <footer>
        <p><span>DIAGNOSTICS SHA-256</span><code>{summary.diagnostics_sha256}</code></p>
        <p><span>HOLD CERTIFICATE SHA-256</span><code>{summary.certificate_sha256}</code></p>
      </footer>
      <nav className="rolloutSimulatorResources" aria-label="Cohort separation review resources">
        <a href="/experiments/rollout-cohort-separation.reference.json">HOLD CERTIFICATE ↗</a>
        <a href="/experiments/rollout-cohort-separation.schema.json">STRICT JSON SCHEMA ↗</a>
        <a href="/experiments/wanted-rollout-cohort-separation.mjs">OFFLINE AUDITOR ↗</a>
        <a href="/experiments/rollout-cohort-separation.json">DEVELOPER CONTRACT ↗</a>
      </nav>
    </section>
  );
}

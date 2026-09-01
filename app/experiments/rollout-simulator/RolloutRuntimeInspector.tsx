"use client";

import { useEffect, useState } from "react";
import {
  experimentRolloutRuntimeReferenceBundle,
  resolveExperimentRolloutRuntime,
  type ExperimentRolloutRuntimeResult,
} from "../rollout-runtime.ts";
import { syntheticRolloutUnitId } from "../rollout-simulator.ts";

const CONTROL_UNIT = syntheticRolloutUnitId(0);
const PROOF_UNIT = syntheticRolloutUnitId(9);

export function RolloutRuntimeInspector() {
  const [unitId, setUnitId] = useState(PROOF_UNIT);
  const [result, setResult] = useState<ExperimentRolloutRuntimeResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    experimentRolloutRuntimeReferenceBundle(0)
      .then((bundle) =>
        resolveExperimentRolloutRuntime({ ...bundle, synthetic_unit_id: unitId }),
      )
      .then((next) => {
        if (active) setResult(next);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Resolution failed.");
      });
    return () => {
      active = false;
    };
  }, [unitId]);

  return (
    <section className="rolloutRuntimeWorkspace shell">
      <section className="rolloutRuntimeInspector">
        <header><div><span>FAIL-CLOSED RUNTIME RESOLVER</span><b>MANIFEST + EXPLICIT ENVIRONMENT + SYNTHETIC UNIT</b></div><i>LOCAL ONLY</i></header>
        <div className="rolloutRuntimeInput">
          <label htmlFor="rollout-runtime-unit">Synthetic browser-unit UUID</label>
          <div>
            <input id="rollout-runtime-unit" value={unitId} onChange={(event) => setUnitId(event.target.value.trim())} spellCheck={false} />
            <button type="button" onClick={() => setUnitId(crypto.randomUUID())}>NEW UNIT</button>
          </div>
          <nav aria-label="Runtime reference units">
            <button type="button" onClick={() => setUnitId(CONTROL_UNIT)}>CONTROL VECTOR</button>
            <button type="button" onClick={() => setUnitId(PROOF_UNIT)}>PROOF VECTOR</button>
          </nav>
        </div>
        {error ? <p className="designError" role="alert">{error}</p> : null}
      </section>
      <section className={`rolloutRuntimeResult ${result?.status === "pass" ? "rolloutRuntimeResult--pass" : result ? "rolloutRuntimeResult--fail" : ""}`}>
        <header><div><span>RUNTIME PREVIEW</span><b>PROFILE 0.45-RRR1</b></div><i>{result?.status.toUpperCase() ?? "RESOLVING"}</i></header>
        <div className="rolloutRuntimeHero">
          <span>RESOLVED PRESENTATION</span>
          <strong>{result?.resolved_variant.toUpperCase() ?? "—"}</strong>
          <small>{result?.status === "pass" ? `bucket ${result.rollout_bucket} · ${result.phase} · ${result.phase_epoch}` : result?.fallback_reason ?? "verifying exact configuration"}</small>
        </div>
        <div className="rolloutRuntimeChecks">
          {[
            ["COMPILER", result?.compiler_verified],
            ["MANIFEST", result?.manifest_verified],
            ["ENVIRONMENT", result?.environment_matches_manifest],
            ["SYNTHETIC UNIT", result?.unit_id_verified],
            ["ANALYSIS BOUNDARY", result?.analysis_boundary_verified],
            ["DETERMINISTIC", result?.deterministic_resolution_verified],
            ["FAIL CLOSED", result?.fail_closed_verified],
            ["LIVE SERVING", false],
          ].map(([label, passed]) => (
            <article key={String(label)}><i className={passed ? "checkPass" : "checkWait"} /><span>{label}</span><b>{label === "LIVE SERVING" ? "DISABLED" : passed ? "PASS" : "—"}</b></article>
          ))}
        </div>
        <aside>Even a passing preview is never served or counted. Invalid configuration always returns control with no operational bucket or phase, while the live R36/C8 allocator remains untouched.</aside>
      </section>
      <nav className="rolloutSimulatorResources rolloutRuntimeResources" aria-label="Rollout runtime resolver resources">
        <a href="/experiments/rollout-runtime.reference.json">REFERENCE VECTORS ↗</a>
        <a href="/experiments/rollout-runtime.schema.json">STRICT JSON SCHEMA ↗</a>
        <a href="/experiments/wanted-rollout-runtime.mjs">OFFLINE RESOLVER ↗</a>
        <a href="/experiments/rollout-runtime.json">DEVELOPER CONTRACT ↗</a>
      </nav>
    </section>
  );
}

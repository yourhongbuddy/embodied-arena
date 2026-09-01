"use client";

import { useEffect, useState } from "react";
import {
  EXPERIMENT_ROLLOUT_SIMULATOR_SAMPLE_SIZES,
  experimentRolloutSimulatorReferenceBundle,
  simulateExperimentRollout,
  type ExperimentRolloutSimulationResult,
} from "../rollout-simulator.ts";

const integer = (value: number) => new Intl.NumberFormat("en-US").format(value);
const percent = (value: number) => `${(value * 100).toFixed(2)}%`;
const points = (value: number) => `${(value * 100).toFixed(2)} pp`;

export function RolloutSimulatorLab() {
  const [sampleSize, setSampleSize] = useState<number>(1_000);
  const [result, setResult] = useState<ExperimentRolloutSimulationResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    simulateExperimentRollout(experimentRolloutSimulatorReferenceBundle(sampleSize))
      .then((next) => {
        if (active) setResult(next);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Simulation failed.");
      });
    return () => {
      active = false;
    };
  }, [sampleSize]);

  return (
    <section className="rolloutSimulatorWorkspace shell">
      <header className="rolloutSimulatorControl">
        <div>
          <span>SYNTHETIC POPULATION</span>
          <b>SAME UNITS · EVERY PHASE · ONE FROZEN BUCKET</b>
        </div>
        <label>
          Sample size
          <select value={sampleSize} onChange={(event) => setSampleSize(Number(event.target.value))}>
            {EXPERIMENT_ROLLOUT_SIMULATOR_SAMPLE_SIZES.map((size) => (
              <option key={size} value={size}>
                {integer(size)} units
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="rolloutSimulatorStatus" aria-live="polite">
        <article>
          <span>SIMULATION</span>
          <b>{result?.status === "pass" ? "VERIFIED" : error ? "FAILED" : "RUNNING"}</b>
          <small>package + deterministic replay</small>
        </article>
        <article>
          <span>MONOTONE MEMBERSHIP</span>
          <b>{result?.monotone_membership_verified ? "PASS" : "—"}</b>
          <small>selected units never return to control</small>
        </article>
        <article>
          <span>LIVE EFFECT</span>
          <b>NONE</b>
          <small>R36 / C8 remains unchanged</small>
        </article>
        <article className="rolloutSimulatorBoundary">
          <span>ANALYSIS USE</span>
          <b>EXCLUDED</b>
          <small>no exposure or version selection</small>
        </article>
      </section>

      {error ? <p className="designError" role="alert">{error}</p> : null}

      <section className="rolloutPhaseCards">
        {result?.phase_summaries.map((phase) => (
          <article key={phase.id}>
            <header>
              <span>{phase.id.toUpperCase()}</span>
              <b>{(phase.selected_variant_basis_points / 100).toFixed(0)}% PROOF</b>
            </header>
            <div className="rolloutPhaseTrack" aria-label={`${phase.id} configured allocation`}>
              <i style={{ width: `${phase.selected_variant_basis_points / 100}%` }} />
            </div>
            <dl>
              <div><dt>Proof units</dt><dd>{integer(phase.selected_units)}</dd></div>
              <div><dt>Control units</dt><dd>{integer(phase.control_units)}</dd></div>
              <div><dt>Observed</dt><dd>{percent(phase.observed_selected_share)}</dd></div>
              <div><dt>Absolute delta</dt><dd>{points(phase.absolute_share_delta)}</dd></div>
            </dl>
          </article>
        ))}
      </section>

      <section className="rolloutJourneyTable">
        <header>
          <div><span>UNIT JOURNEYS</span><b>FIRST 12 SYNTHETIC UNITS</b></div>
          <i>BUCKET STAYS FROZEN</i>
        </header>
        <div className="rolloutJourneyRows">
          <div><span>UNIT</span><span>BUCKET</span><span>CANARY</span><span>RAMP</span><span>MAJORITY</span><span>FULL</span></div>
          {result?.sample_units.map((unit) => (
            <article key={unit.unit_id}>
              <code>{unit.unit_id}</code>
              <strong>{integer(unit.rollout_bucket)}</strong>
              {(["canary", "ramp", "majority", "full"] as const).map((phase) => (
                <span key={phase} className={`rolloutJourneyState rolloutJourneyState--${unit.phases[phase]}`}>
                  {unit.phases[phase].toUpperCase()}
                </span>
              ))}
            </article>
          ))}
        </div>
      </section>

      <nav className="rolloutSimulatorResources" aria-label="Rollout simulator resources">
        <a href="/experiments/rollout-simulator.reference.json">REFERENCE VECTOR ↗</a>
        <a href="/experiments/rollout-simulator.schema.json">STRICT JSON SCHEMA ↗</a>
        <a href="/experiments/wanted-rollout-simulator.mjs">PORTABLE HELPER ↗</a>
        <a href="/experiments/rollout-simulator.json">DEVELOPER CONTRACT ↗</a>
        <a href="/experiments/rollout-lab">SIGNED ROLLOUT LAB →</a>
      </nav>
    </section>
  );
}

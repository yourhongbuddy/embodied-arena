"use client";

import { useEffect, useState } from "react";
import {
  compileExperimentRolloutConfiguration,
  experimentRolloutConfigReferenceBundle,
  type ExperimentRolloutConfigCompilerResult,
  type ExperimentRolloutRuntimeEnvironment,
} from "../rollout-config.ts";

function EnvironmentTable({ title, environment }: { title: string; environment?: ExperimentRolloutRuntimeEnvironment }) {
  return (
    <section className="rolloutConfigEnvironment">
      <header><span>{title}</span><b>{environment ? "12 VALUES" : "WAITING"}</b></header>
      <div>
        {environment
          ? Object.entries(environment).map(([key, value]) => (
              <p key={key}><code>{key}</code><strong>{value}</strong></p>
            ))
          : <p><code>VERIFICATION</code><strong>IN PROGRESS</strong></p>}
      </div>
    </section>
  );
}

export function RolloutConfigCompilerLab() {
  const [result, setResult] = useState<ExperimentRolloutConfigCompilerResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    compileExperimentRolloutConfiguration(experimentRolloutConfigReferenceBundle())
      .then((next) => {
        if (active) setResult(next);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Compilation failed.");
      });
    return () => {
      active = false;
    };
  }, []);

  const manifest = result?.manifest;
  return (
    <section className="rolloutConfigWorkspace shell">
      <header className="rolloutConfigHeader">
        <div><span>RUNTIME CONFIGURATION COMPILER</span><b>PACKAGE + SIGNED LEDGER → INERT MANIFEST</b></div>
        <i>{result?.status === "pass" ? "COMPILED" : error ? "FAILED" : "VERIFYING"}</i>
      </header>
      <section className="rolloutConfigSummary">
        <article><span>REVIEWED PHASE</span><b>{manifest?.reviewed_phase.toUpperCase() ?? "—"}</b><small>signed ledger prefix</small></article>
        <article><span>PENDING PHASE</span><b>{manifest?.activation_phase.toUpperCase() ?? "—"}</b><small>{manifest?.activation_phase_epoch ?? "awaiting verification"}</small></article>
        <article><span>ACTIVATION</span><b>{manifest ? "25% PROOF" : "—"}</b><small>manual confirmation required</small></article>
        <article className="rolloutConfigNoApply"><span>APPLIED</span><b>NO</b><small>live R36 / C8 unchanged</small></article>
      </section>
      {error ? <p className="designError" role="alert">{error}</p> : null}
      <div className="rolloutConfigEnvironments">
        <EnvironmentTable title="PENDING RAMP ENVIRONMENT" environment={manifest?.environment} />
        <EnvironmentTable title="≤15 MINUTE CONTROL ROLLBACK" environment={manifest?.rollback_environment} />
      </div>
      <section className="rolloutConfigDigest">
        <div><span>IMMUTABLE MANIFEST SHA-256</span><code>{manifest?.manifest_sha256 ?? "verifying source bindings…"}</code></div>
        <p>The digest binds the exact package, signed phase-ledger prefix, phase epoch, allocation, analysis boundary, activation values, and rollback values. It is a review artifact—not hosting credentials and not permission to deploy.</p>
      </section>
      <nav className="rolloutSimulatorResources" aria-label="Rollout configuration compiler resources">
        <a href="/experiments/rollout-config.reference.json">REFERENCE CONFIG ↗</a>
        <a href="/experiments/rollout-config.schema.json">STRICT JSON SCHEMA ↗</a>
        <a href="/experiments/wanted-rollout-config.mjs">OFFLINE COMPILER ↗</a>
        <a href="/experiments/rollout-config.json">DEVELOPER CONTRACT ↗</a>
      </nav>
    </section>
  );
}

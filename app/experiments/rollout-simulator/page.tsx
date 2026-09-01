import type { Metadata } from "next";
import { SiteNav } from "../../components/SiteNav";
import { RolloutConfigCompilerLab } from "./RolloutConfigCompilerLab";
import { RolloutRuntimeInspector } from "./RolloutRuntimeInspector";
import { RolloutSimulatorLab } from "./RolloutSimulatorLab";

export const metadata: Metadata = {
  title: "Staged Rollout Simulator — Embodied Arena",
  description:
    "Replay the WANTED proof rollout over synthetic browser units and verify sticky, monotone phase membership without touching production.",
  alternates: { canonical: "/experiments/rollout-simulator" },
  robots: { index: false, follow: false },
};

export default function RolloutSimulatorPage() {
  return (
    <main className="experimentsPage rolloutSimulatorPage">
      <SiteNav />
      <section className="rolloutSimulatorHero shell">
        <div>
          <span className="eyebrow"><i className="liveDot" /> STAGED ALLOCATION DRY RUN</span>
          <h1>Watch each unit move<br /><em>without moving production.</em></h1>
        </div>
        <p>Replay the exact 5% → 25% → 50% → 100% proof rollout over deterministic synthetic browser units. A selected unit stays selected in every later phase, while the live R36/C8 experiment remains untouched.</p>
      </section>
      <RolloutSimulatorLab />
      <RolloutConfigCompilerLab />
      <RolloutRuntimeInspector />
      <section className="experimentBoundary">
        <div className="shell">
          <b>PREPRODUCTION SIMULATION ONLY</b>
          <p>This surface creates no browser identifiers, sends no analytics, issues no receipts, counts no exposures, and cannot advance a rollout phase or select a winning version.</p>
          <a href="/experiments">BACK TO ROTATOR →</a>
        </div>
      </section>
    </main>
  );
}

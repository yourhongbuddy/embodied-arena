import type { Metadata } from "next";
import { SiteNav } from "../../components/SiteNav";
import { ScoreCalculator } from "./ScoreCalculator";

export const metadata: Metadata = {
  title: "WANTED Score Lab — WANTED-10K",
  description: "Calculate a WANTED-10K cohort score locally with Kaplan–Meier RMST, bootstrap uncertainty, censoring bounds, tail support, and influence analysis.",
  alternates: { canonical: "/wanted-10k/calculator" },
};

export default function CalculatorPage() {
  return <main className="wantedPage calcPage">
    <SiteNav />
    <section className="calcHero shell">
      <span className="eyebrow"><i className="liveDot"/> LOCAL ANALYSIS · COHORT DATA STAYS ON-DEVICE</span>
      <h1>WANTED<br/><em>Score Lab.</em></h1>
      <p>Enter one record per independent environment. The calculator reproduces the benchmark’s Kaplan–Meier restricted mean survival score, refuses unsupported 10,000-hour extrapolation, and reveals censoring sensitivity, tail support, and leave-one-environment-out influence.</p>
      <a href="/wanted-10k/protocol">← PROTOCOL KIT</a>
    </section>
    <ScoreCalculator />
  </main>;
}

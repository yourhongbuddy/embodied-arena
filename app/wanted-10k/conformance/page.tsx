import type { Metadata } from "next";
import { SiteNav } from "../../components/SiteNav";
import { ConformanceChecker } from "./ConformanceChecker";

export const metadata: Metadata = {
  title: "Adapter Conformance — WANTED-10K",
  description: "Validate a WANTED-10K v0.2 JSONL event stream locally for schema shape, ordering, timestamps, coverage, and SHA-256 hash-chain integrity.",
  alternates: { canonical: "/wanted-10k/conformance" },
};

export default function ConformancePage() {
  return <main className="conformancePage">
    <SiteNav />
    <section className="conformanceHero shell">
      <span className="eyebrow"><i className="liveDot"/> LOCAL VALIDATOR · PROTOCOL 0.2</span>
      <h1>Prove the stream<br/><em>before hour one.</em></h1>
      <p>Paste or load a JSONL event stream. The checker validates the six-event adapter profile, lifecycle boundaries, per-deployment ordering, UTC time, and the RFC 8785 / SHA-256 previous-event chain entirely on this device.</p>
      <div className="conformanceLinks"><a href="/wanted-10k/event.schema.json">EVENT SCHEMA ↗</a><a href="/wanted-10k/protocol">PROTOCOL KIT ↗</a><a href="/wanted-10k">BENCHMARK ↗</a></div>
    </section>
    <ConformanceChecker />
    <footer className="wantedFooter"><div className="shell"><div className="brand"><span className="brandMark">EA</span><span>EMBODIED <b>ARENA</b> / CONFORMANCE</span></div><p>Local structural and integrity validation for WANTED-10K telemetry.</p><a href="/wanted-10k/protocol">OPEN PROTOCOL KIT →</a></div></footer>
  </main>;
}

import type { Metadata } from "next";
import { SiteNav } from "../../components/SiteNav";
import { ConformanceChecker } from "./ConformanceChecker";

export const metadata: Metadata = {
  title: "Signed Telemetry Conformance — WANTED-10K",
  description: "Cryptographically verify a WANTED-10K v0.2 JSONL event stream, its SHA-256 hash chain, Ed25519 signatures, and frozen key validity locally.",
  alternates: { canonical: "/wanted-10k/conformance" },
};

export default function ConformancePage() {
  return <main className="conformancePage">
    <SiteNav />
    <section className="conformanceHero shell">
      <span className="eyebrow"><i className="liveDot"/> TELEMETRY AUTHENTICITY · 0.2-T1</span>
      <h1>Prove who signed<br/><em>every event.</em></h1>
      <p>Load a JSONL event stream and its frozen public-key manifest. The checker validates lifecycle boundaries, ordering, UTC time, RFC 8785 / SHA-256 chain continuity, key validity windows, revocation, and every Ed25519 signature entirely on this device.</p>
      <div className="conformanceLinks"><a href="/wanted-10k/telemetry-authenticity.json">AUTHENTICITY CONTRACT ↗</a><a href="/wanted-10k/telemetry-key-manifest.schema.json">KEY SCHEMA ↗</a><a href="/wanted-10k/event.schema.json">EVENT SCHEMA ↗</a><a href="/wanted-10k/protocol">PROTOCOL KIT ↗</a></div>
    </section>
    <ConformanceChecker />
    <footer className="wantedFooter"><div className="shell"><div className="brand"><span className="brandMark">EA</span><span>EMBODIED <b>ARENA</b> / TELEMETRY 0.2-T1</span></div><p>Local structural and cryptographic validation for WANTED-10K telemetry.</p><a href="/wanted-10k/protocol">OPEN PROTOCOL KIT →</a></div></footer>
  </main>;
}

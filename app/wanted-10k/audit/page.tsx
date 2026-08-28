import type { Metadata } from "next";
import { SiteNav } from "../../components/SiteNav";
import { AuditReadiness } from "./AuditReadiness";

export const metadata: Metadata = {
  title: "Certification Audit Pack — WANTED-10K",
  description: "Build and locally assess the aggregate evidence manifest behind a WANTED-10K certification or leaderboard submission.",
  alternates: { canonical: "/wanted-10k/audit" },
};

export default function AuditPage() {
  return <main className="auditPage">
    <SiteNav />
    <section className="auditHero shell">
      <span className="eyebrow"><i className="liveDot"/> CERTIFICATION HANDOFF · PROTOCOL 0.2</span>
      <h1>One row.<br/><em>Every claim bound.</em></h1>
      <p>A certification claim should never be a loose spreadsheet entry. The WANTED Audit Pack applies the evidence gates for the selected target, then binds each applicable claim to frozen study rules, robot and policy artifacts, results, and independent sign-off.</p>
      <div className="auditHeroActions"><a className="primary" href="/wanted-10k/certification-templates.json">Download target examples <span>↓</span></a><a className="secondary" href="/wanted-10k/audit-manifest.schema.json">Open schema</a><a className="secondary" href="/wanted-10k/certification">Certification matrix</a><a className="secondary" href="/wanted-10k/protocol">Protocol kit</a></div>
      <div className="auditPrinciples"><div><span>PUBLIC</span><b>Aggregate results and evidence hashes</b></div><div><span>PRIVATE</span><b>Participant identity and raw household data</b></div><div><span>INDEPENDENT</span><b>Safety, adjudication, and audit sign-off</b></div></div>
    </section>
    <AuditReadiness />
    <footer className="wantedFooter"><div className="shell"><div className="brand"><span className="brandMark">EA</span><span>EMBODIED <b>ARENA</b> / AUDIT PACK</span></div><p>The evidence object behind a WANTED certification and leaderboard row.</p><a href="/wanted-10k">BACK TO BENCHMARK →</a></div></footer>
  </main>;
}

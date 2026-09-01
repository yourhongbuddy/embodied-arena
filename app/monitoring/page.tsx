import type { Metadata } from "next";
import { SiteNav } from "../components/SiteNav";
import { MonitoringConsole } from "./MonitoringConsole";

export const metadata: Metadata = {
  title: "10-Agent Monitor — Embodied Arena",
  description: "Live, read-only deployment monitoring for Embodied Arena routes, MCP contracts, HILO safety, benchmark integrity, and ecosystem evolution.",
};

export default function MonitoringPage() {
  return <main className="monitoringPage">
    <SiteNav />
    <section className="monitorHero shell">
      <div><span className="kicker">SITE OPERATIONS / 10-AGENT COUNCIL</span><h1>Watch the system,<br/><em>protect the claim.</em></h1></div>
      <div><p>Ten read-only specialists watch availability, deployment, MCP, performance, safety, evidence, accessibility, security, and ecosystem change.</p><span><b>Authority boundary:</b> monitors may observe and recommend. They cannot edit, publish, deploy, contact people, or actuate robots.</span></div>
    </section>
    <div className="shell monitoringShell"><MonitoringConsole /></div>
    <section className="monitorPolicy"><div className="shell"><span className="kicker">OPERATING POLICY</span><div><h2>Quiet when healthy.<br/><em>Specific when not.</em></h2><p>The background council runs every 30 minutes, staggers expensive checks, preserves prior incident state, and reports only new failures, recoveries, material regressions, or decisions that require a human.</p></div><dl><div><dt>NO LOCALHOST</dt><dd>Durable deployments only</dd></div><div><dt>NO MUTATIONS</dt><dd>Read-only observation</dd></div><div><dt>NO ACTUATION</dt><dd>Safety kernel stays separate</dd></div><div><dt>NO ALERT LOOPS</dt><dd>State changes only</dd></div></dl></div></section>
  </main>;
}

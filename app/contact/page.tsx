import type { Metadata } from "next";
import { CompanyPage, CompanyEmail } from "../components/CompanyPage";

export const metadata: Metadata = { title: "Contact Us — Robot Router", description: "Contact hfxaa llc for Robot Router support, privacy requests, and leaderboard corrections.", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return <CompanyPage title="Contact us" intro="Questions about Robot Router or Embodied Arena? Contact hfxaa llc.">
    <div className="companyCallout"><h2>Email us</h2><p><CompanyEmail /></p><p>Include the relevant page address and a short description so we can understand your request. Avoid sending passwords, API keys, private robot logs, or participant information.</p><a className="companyAction" href="mailto:privacy@getrobotrouter.com">Write an email ↗</a></div>
    <div className="companyContactGrid"><section><h2>Privacy requests</h2><p>Ask about information associated with you, request a correction or deletion, or raise a privacy concern.</p><a href="mailto:privacy@getrobotrouter.com?subject=Robot%20Router%20privacy%20request">Send a privacy request ↗</a></section><section><h2>Support and corrections</h2><p>Report a broken page or a model-profile error. For factual corrections, include a public source we can review.</p><a href="mailto:privacy@getrobotrouter.com?subject=Robot%20Router%20support%20or%20correction">Contact support ↗</a></section></div>
    <h2>Benchmark evidence</h2><p>Before contacting us about evaluated results, review the <a href="/wanted-10k/protocol">evaluation protocol</a> and <a href="/wanted-10k/audit">audit-pack requirements</a>. Please do not email identifiable participant records or sensitive telemetry.</p>
    <h2>Related information</h2><p>Read our <a href="/privacy">Privacy Policy</a>, <a href="/terms">Terms and Conditions</a>, and <a href="/about">About us</a> page.</p>
  </CompanyPage>;
}

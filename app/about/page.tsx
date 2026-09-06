import type { Metadata } from "next";
import { CompanyPage, CompanyEmail } from "../components/CompanyPage";

export const metadata: Metadata = { title: "About Us — Robot Router", description: "Learn about Robot Router and Embodied Arena, operated by hfxaa llc.", alternates: { canonical: "/about" } };

export default function AboutPage() {
  return <CompanyPage title="About us" intro="A place to understand robot intelligence through tools, context, and evidence.">
    <h2>Robot Router and Embodied Arena</h2><p>Robot Router is the website at getrobotrouter.com, operated by hfxaa llc. The robotics research and comparison experience on this site is called Embodied Arena.</p><p>We bring robot model profiles, evaluation methods, local analysis tools, and research explainers into one place so builders can inspect what a performance claim actually means.</p>
    <h2>What you can explore</h2><ul><li><a href="/leaderboard">Robot AI leaderboard</a> — interactive comparisons across manipulation, navigation, and reasoning, with example scores clearly labeled.</li><li><a href="/scan">URDF scanner</a> — browser-based analysis of robot-description files.</li><li><a href="/wanted-10k">WANTED-10K</a> — a protocol for examining long-term robot deployment evidence, including reliability and human involvement.</li><li><a href="/watch">Watch library</a> — explainers about robot models, hardware, research, and evaluation.</li></ul>
    <h2>Evidence comes with context</h2><p>A model, its robot body, its compute, and its evaluation setup each affect the result. We keep those distinctions visible. Illustrative profiles show how the tools work; they are not measured performance, independently audited results, or safety certifications.</p><p>The <a href="/wanted-10k/leaderboard">audited registry</a> follows its own admission rules. Example data does not qualify for admission.</p>
    <div className="companyCallout"><h2>Get in touch</h2><p>For questions, corrections, research inquiries, or privacy requests, contact <CompanyEmail />.</p><a href="/contact">Contact us →</a></div>
  </CompanyPage>;
}

import type { Metadata } from "next";
import { SiteNav } from "../../components/SiteNav";
import { certificationProfile } from "./profile";

export const metadata: Metadata = {
  title: "Certification Matrix - WANTED-10K",
  description: "The target-specific WANTED evidence contract for preflight, lab, cohort, and 10,000-hour lifetime claims.",
  alternates: { canonical: "/wanted-10k/certification" },
};

const levels = [
  ["01", "PREQUALIFIED", "SIMULATION", "Verify preregistration 0.2-PR1, prospective sampling and stopping 0.2-ST1, protocol deviations 0.2-DV1, then pass preflight 0.2-P1 before human exposure. Field W, diagnostics, safety telemetry, and endpoint adjudication are explicitly not applicable."],
  ["02", "WANTED LAB", "1 SITE / 100H", "Add cohort integrity, exposure-ledger integrity, endpoint adjudication 0.2-J1, neutral human measures 0.2-H1, matched learning 0.2-LG1, assistance integrity 0.2-I1, policy evolution 0.2-U1, privacy + consent integrity 0.2-PV1, service continuity 0.2-SC1, field safety, cryptographically verified telemetry 0.2-T1, diagnostics, and a lab report. No cohort W is claimed."],
  ["03", "WANTED WILD", "N>=20 / 10,000H", "Add Analysis Reproduction 0.2-A2: rebuild an identifiable 10,000-hour W, deterministic 95% cluster-bootstrap interval, robustness bounds, influence, and tail support from audited endpoint rows. This is the only ranked target."],
  ["04", "WANTED 10K", "1 HOME / 10,000H", "Complete one lifetime residence plus a passing 0.2-W1 neutral seven-day withdrawal and reacquisition test. This badge does not create or improve a cohort W."],
];

const rows = [
  ["PREREGISTRATION INTEGRITY 0.2-PR1", "REQUIRED", "REQUIRED", "REQUIRED", "REQUIRED"],
  ["SAMPLING + STOPPING 0.2-ST1", "REQUIRED", "REQUIRED", "REQUIRED", "REQUIRED"],
  ["PROTOCOL DEVIATIONS 0.2-DV1", "REQUIRED", "REQUIRED", "REQUIRED", "REQUIRED"],
  ["PREFLIGHT 0.2-P1", "REQUIRED", "INHERITED", "INHERITED", "INHERITED"],
  ["COHORT INTEGRITY 0.2-E1", "N/A", "REQUIRED", "REQUIRED", "REQUIRED"],
  ["EXPOSURE LEDGER 0.2-X1", "N/A", ">=100H", ">=10,000H TOTAL", "10,000H ONE HOME"],
  ["ANALYSIS REPRODUCTION 0.2-A2", "N/A", "N/A", "REQUIRED", "N/A"],
  ["ENDPOINT ADJUDICATION 0.2-J1", "N/A", "REQUIRED", "REQUIRED", "REQUIRED"],
  ["HUMAN MEASURES 0.2-H1", "N/A", "REQUIRED", "REQUIRED", "REQUIRED"],
  ["LEARNING + GENERALIZATION 0.2-LG1", "N/A", "REQUIRED", "REQUIRED", "REQUIRED"],
  ["ASSISTANCE INTEGRITY 0.2-I1", "N/A", "REQUIRED", "REQUIRED", "REQUIRED"],
  ["POLICY EVOLUTION 0.2-U1", "N/A", "REQUIRED", "REQUIRED", "REQUIRED"],
  ["PRIVACY + CONSENT 0.2-PV1", "N/A", "REQUIRED", "REQUIRED", "REQUIRED"],
  ["SERVICE CONTINUITY 0.2-SC1", "N/A", "REQUIRED", "REQUIRED", "REQUIRED"],
  ["REVEALED PREFERENCE 0.2-RP1", "N/A", "OPTIONAL SEPARATE", "OPTIONAL SEPARATE", "OPTIONAL SEPARATE"],
  ["WITHDRAWAL INTEGRITY 0.2-W1", "N/A", "N/A", "IF 10K COMPLETERS", "REQUIRED"],
  ["FIELD SAFETY 0.2-S1", "N/A", "REQUIRED", "REQUIRED", "REQUIRED"],
  ["TELEMETRY AUTHENTICITY 0.2-T1", "N/A", "REQUIRED", "REQUIRED", "REQUIRED"],
  ["DIAGNOSTICS 0.2-D1", "N/A", "REQUIRED", "REQUIRED", "REQUIRED"],
  ["AUDIT SEAL 0.2-V1", "REQUIRED", "REQUIRED", "REQUIRED", "REQUIRED"],
  ["AUDITOR CREDENTIAL 0.2-V2", "REQUIRED", "REQUIRED", "REQUIRED", "REQUIRED"],
  ["PRIMARY W + 95% CI", "N/A", "N/A", "REQUIRED", "N/A*"],
  ["WITHDRAWAL / REACQUISITION", "N/A", "N/A", "DISCLOSED", "REQUIRED"],
  ["PUBLIC RANK", "NO", "NO", "YES", "NO"],
];

export default function CertificationPage() {
  return <main className="certMatrixPage">
    <SiteNav />
    <section className="certMatrixHero shell">
      <span className="eyebrow"><i className="liveDot"/> CERTIFICATION APPLICABILITY - 0.2-C1</span>
      <h1>Ask only for evidence<br/><em>that can exist.</em></h1>
      <p>WANTED has four distinct evidence claims. The audit contract applies only the gates appropriate to the selected target, so simulation is not mistaken for field evidence and one extraordinary lifetime is not mistaken for a population score.</p>
      <div className="certMatrixActions"><a className="primary" href="/wanted-10k/audit">Test a target manifest <span>-&gt;</span></a><a className="secondary" href="/wanted-10k/preregistration-integrity">Verify preregistration</a><a className="secondary" href="/wanted-10k/sampling-stopping">Verify prospective closure</a><a className="secondary" href="/wanted-10k/protocol-deviations">Reconcile deviations</a><a className="secondary" href="/wanted-10k/human-measures">Verify human measures</a><a className="secondary" href="/wanted-10k/learning-generalization">Verify learning</a><a className="secondary" href="/wanted-10k/assistance-integrity">Verify assistance</a><a className="secondary" href="/wanted-10k/policy-evolution">Verify policy evolution</a><a className="secondary" href="/wanted-10k/privacy-integrity">Verify privacy + consent</a><a className="secondary" href="/wanted-10k/service-continuity">Verify service continuity</a><a className="secondary" href="/wanted-10k/revealed-preference">Verify preference substudy</a><a className="secondary" href="/wanted-10k/withdrawal">Verify withdrawal</a><a className="secondary" href="/wanted-10k/certification.json">Open contract</a><a className="secondary" href="/wanted-10k/certification-templates.json">Download four examples</a></div>
      <div className="certMatrixProof"><div><b>4</b><span>EVIDENCE CLAIMS</span></div><div><b>1</b><span>RANKED TARGET</span></div><div><b>0</b><span>INVENTED FIELD VALUES</span></div><div><b>C1</b><span>APPLICABILITY PROFILE</span></div></div>
    </section>

    <section className="certLevels"><div className="shell">
      <div className="sectionHead wantedHead"><div><span className="kicker">01 / TARGETS</span><h2>Branch after lab.<br/><em>Do not fake a ladder.</em></h2></div><p>WANTED WILD is a cohort claim. WANTED 10K is a lifetime claim. Both inherit field evidence from WANTED LAB, but neither substitutes for the other.</p></div>
      <div className="certLevelGrid">{levels.map(([n,name,scope,copy]) => <article key={name} className={name === "WANTED WILD" ? "ranked" : ""}><span>{n}</span><small>{scope}</small><h3>{name}</h3><p>{copy}</p><i>{name === "WANTED WILD" ? "RANKABLE" : "CERTIFICATION ONLY"}</i></article>)}</div>
    </div></section>

    <section className="certApplicability"><div className="shell">
      <div className="sectionHead wantedHead"><div><span className="kicker">02 / APPLICABILITY MATRIX</span><h2>Every cell means<br/><em>exactly one thing.</em></h2></div><p>N/A is typed evidence about scope, not a zero and not a missing field. *A 10K residence receives W only through a separate qualifying WANTED WILD cohort.</p></div>
      <div className="certTable"><header><span>EVIDENCE</span><span>PREQUALIFIED</span><span>LAB</span><span>WILD</span><span>10K</span></header>{rows.map(row => <div key={row[0]}>{row.map((cell,index) => index === 0 ? <b key={cell}>{cell}</b> : <span key={`${row[0]}-${cell}-${index}`} className={cell === "REQUIRED" || cell === "YES" ? "required" : cell.startsWith("N/A") || cell === "NO" ? "na" : ""}>{cell}</span>)}</div>)}</div>
    </div></section>

    <section className="certAxes"><div className="shell"><article><span>COHORT AXIS</span><h2>WANTED WILD</h2><b>Many environments. One reproducible estimand.</b><p>N&gt;=20 independent environments, at least 10,000 aggregate resident hours, and 0.2-A2 reproduction of W, uncertainty, robustness, influence, and public tail support.</p></article><i>!=</i><article><span>LIFETIME AXIS</span><h2>WANTED 10K</h2><b>One environment. One complete relationship.</b><p>A single residence reaches 10,000 hours and completes the withdrawal test. It earns a badge, never a ranking advantage.</p></article></div></section>

    <section className="certNA"><div className="shell"><div><span className="kicker">03 / TYPED NOT APPLICABLE</span><h2>Absence with<br/><em>a reason.</em></h2><p>When the target cannot produce a field measure, the manifest carries a strict object. The checker rejects fabricated substitutes and applies the matching gate.</p></div><pre>{JSON.stringify(certificationProfile.not_applicable.encoding, null, 2)}</pre></div></section>
    <footer className="wantedFooter"><div className="shell"><div className="brand"><span className="brandMark">EA</span><span>EMBODIED <b>ARENA</b> / CERTIFICATION 0.2-C1</span></div><p>Four evidence claims, each with the burden it can actually support.</p><a href="/wanted-10k">BACK TO BENCHMARK -&gt;</a></div></footer>
  </main>;
}

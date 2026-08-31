import type { Metadata } from "next";
import { SiteNav } from "../../components/SiteNav";
import { CohortIntegrityLab } from "./CohortIntegrityLab";

export const metadata: Metadata = {
  title: "Cohort Integrity - WANTED-10K",
  description: "A machine-auditable selection, independence, and analysis-set gate for WANTED field cohorts.",
  alternates: { canonical: "/wanted-10k/cohort-integrity" },
};

const gates = [
  ["E1", "FROZEN ELIGIBILITY", "Freeze selection rules before screening."],
  ["E2", "SAMPLING FRAME", "Disclose where participants came from."],
  ["E3", "VOLUNTARY CHOICE", "Never reward keeping the robot."],
  ["E4", "PROSPECTIVE FLOW", "Keep every activated run in analysis."],
  ["E5", "DECISION UNITS", "One residence, one primary chooser."],
  ["E6", "TARGET + CARRYOVER", "Meet N and reset reused hardware."],
  ["E7", "INDEPENDENT AUDIT", "Bind flow and hashed linkage evidence."],
];

const methods = [
  ["CONSORT 2025", "Participant flow", "Report assigned, exposed, analysed, lost, and excluded units with reasons.", "https://www.consort-spirit.org/item-22a-randomized"],
  ["STROBE COHORT", "Selection transparency", "Report eligibility, participant sources, selection methods, stage counts, and follow-up.", "https://www.strobe-statement.org/checklists/"],
  ["ICH E9(R1)", "Estimand discipline", "Separate the target question, estimator, estimate, and handling of intercurrent events.", "https://database.ich.org/sites/default/files/E9-R1_Step4_Guideline_2019_1203.pdf"],
];

export default function CohortIntegrityPage() {
  return <main className="cohortPage">
    <SiteNav />
    <section className="cohortHero shell">
      <span className="eyebrow"><i className="liveDot"/> COHORT INTEGRITY - 0.2-E1</span>
      <h1>Count each choice.<br/><em>Count it once.</em></h1>
      <p>A precise survival curve can still be wrong if the same decision-maker appears twice, inconvenient runs disappear, or sponsor-controlled homes masquerade as independent environments. Profile 0.2-E1 makes recruitment flow and independence auditable before W can rank.</p>
      <div className="cohortActions"><a className="primary" href="#evaluator">Assess a cohort <span>-&gt;</span></a><a className="secondary" href="/wanted-10k/cohort-integrity.template.json">Download template</a><a className="secondary" href="/wanted-10k/cohort-integrity.json">Open contract</a></div>
      <div className="cohortProof"><div><b>1:1</b><span>CHOOSER / ENVIRONMENT</span></div><div><b>0</b><span>POST-ACTIVATION EXCLUSIONS</span></div><div><b>0</b><span>DUPLICATE IDS</span></div><div><b>7</b><span>HARD GATES</span></div></div>
    </section>

    <section className="cohortGateSection"><div className="shell">
      <div className="sectionHead wantedHead"><div><span className="kicker">01 / ANTI-CHERRY-PICKING</span><h2>Follow the cohort<br/><em>from screen to score.</em></h2></div><p>The analysis set is fixed by activation. Replacement may add exposure, but it never erases the original run or its terminal disposition.</p></div>
      <div className="cohortGateGrid">{gates.map(([id,title,copy]) => <article key={id}><span>{id}</span><b>{title}</b><p>{copy}</p><i>REQUIRED</i></article>)}</div>
    </div></section>

    <section className="cohortFlow"><div className="shell">
      <div><span className="kicker">02 / FLOW IDENTITY</span><h2>No disappearing<br/><em>households.</em></h2><p>Every activated residence enters the analysis set. The public pack reports aggregate counts; independent auditors reconcile them against a controlled hashed linkage register.</p></div>
      <div className="flowEquation"><span>INTENTION TO OBSERVE</span><b>N<sub>analysis</sub> = N<sub>activated</sub></b><p>Post-activation exclusions = 0. Replaced runs remain in the data. Unrelated exits are censored or reported as terminal causes under frozen endpoint rules.</p></div>
    </div></section>

    <section className="cohortMethods"><div className="shell">
      <div className="sectionHead wantedHead"><div><span className="kicker">03 / METHOD BASIS</span><h2>Borrow the discipline.<br/><em>State the boundary.</em></h2></div><p>WANTED adapts established transparency principles to longitudinal human-robot residence studies. These references inform the profile; they do not make WANTED a clinical trial or claim conformity.</p></div>
      <div className="cohortMethodGrid">{methods.map(([name,title,copy,href]) => <a href={href} target="_blank" rel="noreferrer" key={name}><span>{name}</span><b>{title}</b><p>{copy}</p><i>PRIMARY SOURCE</i></a>)}</div>
    </div></section>

    <section id="evaluator" className="cohortEvaluator"><div className="shell">
      <div className="sectionHead wantedHead"><div><span className="kicker">04 / LOCAL EVALUATOR</span><h2>Audit the count.<br/><em>Protect the choice.</em></h2></div><p>The checker validates arithmetic, chronology, decision-unit uniqueness, target thresholds, evidence bindings, and attestation topology without uploading participant data.</p></div>
      <CohortIntegrityLab />
    </div></section>

    <section className="cohortBoundary"><div className="shell"><b>INDEPENDENT != REPRESENTATIVE</b><p>WANTED reports the sampling frame, recruitment flow, geography, and selection rate. A certification never licenses generalization beyond the observed cohort.</p><a href="/wanted-10k/protocol">OPEN PROTOCOL KIT -&gt;</a></div></section>
    <footer className="wantedFooter"><div className="shell"><div className="brand"><span className="brandMark">EA</span><span>EMBODIED <b>ARENA</b> / COHORT INTEGRITY</span></div><p>The eligibility gate beneath every field claim.</p><a href="/wanted-10k">BACK TO BENCHMARK -&gt;</a></div></footer>
  </main>;
}

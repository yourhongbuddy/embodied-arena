import type { Metadata } from "next";
import { SiteNav } from "../../components/SiteNav";

export const metadata: Metadata = {
  title: "Research Basis — WANTED-10K",
  description: "The statistical, robotics, simulation, trust, and safety sources behind the WANTED-10K benchmark, with explicit limits on what each source supports.",
  alternates: { canonical: "/wanted-10k/evidence" },
};

const foundations = [
  {
    n: "01", field: "STATISTICS", title: "Survival analysis for continued choice",
    copy: "Kaplan–Meier estimates retention when observations are censored. Restricted mean survival time is the area under that curve to a fixed horizon. WANTED adapts both methods from time-to-event analysis to time until voluntary robot rejection.",
    supports: "Supports the estimator and the interpretation of W as expected wanted time within 10,000 hours.",
    limit: "The statistical papers do not validate robot desirability or WANTED’s endpoint definition.",
    links: [["Kaplan & Meier, 1958", "https://www.tandfonline.com/doi/abs/10.1080/01621459.1958.10501452"], ["Royston & Parmar, 2013", "https://discovery.ucl.ac.uk/id/eprint/1427381/"]],
  },
  {
    n: "02", field: "HUMAN-CENTERED TASKS", title: "What people want robots to do",
    copy: "Stanford’s BEHAVIOR-1K grounds 1,000 household activities in human surveys and tests long-horizon mobile manipulation in realistic scenes. It is a strong prequalification layer for capability coverage.",
    supports: "Supports broad, human-relevant task testing before longitudinal deployment.",
    limit: "Task success cannot establish that people will keep a robot, and does not enter the WANTED Score.",
    links: [["Stanford BEHAVIOR-1K", "https://behavior.stanford.edu/index.html"]],
  },
  {
    n: "03", field: "LONG-TERM AUTONOMY", title: "From demonstrations to months of operation",
    copy: "Oxford’s GOALS research targets robots that operate for days, weeks, and months in dynamic environments. STRANDS reported 104 combined deployment days and 116 km across four sites, demonstrating the value of longitudinal autonomy evidence.",
    supports: "Supports duration, recovery, adaptation, and operational-burden diagnostics.",
    limit: "Long uptime is not the same as voluntary human retention; WANTED adds that missing endpoint.",
    links: [["Oxford GOALS", "https://ori.ox.ac.uk/groups/goals"], ["STRANDS deployment report", "https://ora.ox.ac.uk/objects/uuid%3A74bd9aa7-0cab-43a9-be3b-4f8762f6f4f1"]],
  },
  {
    n: "04", field: "DIGITAL TWINS", title: "Fail safely before human exposure",
    copy: "NVIDIA Isaac Sim and Isaac Lab support common robot descriptions, physics-based simulation, sensors, synthetic data, domain randomization, and parallel robot-learning workflows. WANTED uses these capabilities for prequalification and failure injection.",
    supports: "Supports reproducible stress tests before a real-world cohort begins.",
    limit: "A simulated human cannot award WANTED hours or establish real preference.",
    links: [["NVIDIA Isaac Sim", "https://docs.isaacsim.omniverse.nvidia.com/6.0.0/index.html"], ["NVIDIA Isaac Lab", "https://isaac-sim.github.io/IsaacLab/v2.0.0/index.html"]],
  },
  {
    n: "05", field: "TRUST", title: "Behavior outranks claimed trust",
    copy: "Harvard’s field research on robot overtrust measured both stated trust and behavioral compliance, showing why a robot being trusted is not, by itself, proof that the interaction is safe or appropriate.",
    supports: "Supports keeping surveys diagnostic while using revealed choice and safety gates as primary evidence.",
    limit: "A removal decision is not a complete measure of trust, attachment, benefit, or safety.",
    links: [["Harvard SEAS overview", "https://seas.harvard.edu/news/automaton-we-trust"], ["Piggybacking Robots paper", "https://kgajos.seas.harvard.edu/papers/booth17piggybacking.pdf"]],
  },
  {
    n: "06", field: "DATA INTEGRITY", title: "Repeatable hashes need canonical bytes",
    copy: "RFC 8785 defines a JSON Canonicalization Scheme so equivalent event objects have one deterministic representation for hashing and signing. WANTED 0.2 uses JCS before SHA-256 hash-chain and signature operations.",
    supports: "Supports interoperable verification of event ordering and post-hoc modification.",
    limit: "A valid hash chain does not prove that every real-world event was logged or that a logged claim is true.",
    links: [["RFC 8785 — JSON Canonicalization Scheme", "https://www.rfc-editor.org/rfc/rfc8785.html"]],
  },
];

const standards = [
  ["Personal care robots", "ISO 13482:2014", "Published; marked by ISO for revision", "Personal care robot product safety and physical human–robot contact within its stated scope.", "https://www.iso.org/standard/53820.html?browse=ics"],
  ["Service robots", "ISO/FDIS 13482, edition 2", "Final draft; not yet a published replacement", "Proposed broader service-robot safety requirements. Track status before making conformity claims.", "https://www.iso.org/standard/83498.html"],
  ["Industrial robot product", "ISO 10218-1:2025", "Published", "Safety requirements for industrial robots, where that classification applies.", "https://www.iso.org/committee/5915511/x/catalogue/"],
  ["Industrial application or cell", "ISO 10218-2:2025", "Published", "Integration, commissioning, operation, and maintenance of industrial robot applications and cells.", "https://www.iso.org/committee/5915511/x/catalogue/"],
  ["North American service / SCIEE robots", "ANSI/CAN/UL 3300", "Published consensus standard", "Electrical, battery, functional, mechanical, mobility, fire, and related hazards within its product scope.", "https://www.ul.com/services/consumer-and-commercial-robots"],
];

export default function EvidencePage() {
  return <main className="evidencePage">
    <SiteNav />
    <section className="evidenceHero shell">
      <span className="eyebrow"><i className="liveDot"/> RESEARCH BASIS · VERSION 0.1</span>
      <h1>What WANTED inherits.<br/><em>What it changes.</em></h1>
      <p>WANTED-10K combines established time-to-event statistics, human-centered task research, long-term autonomy, digital-twin testing, and robot-safety practice. This record makes the intellectual lineage—and its boundaries—auditable.</p>
      <div className="evidenceHeroActions"><a className="primary" href="#foundations">Review the evidence <span>↓</span></a><a className="secondary" href="/wanted-10k">Return to benchmark</a></div>
      <div className="evidencePrinciple"><span>DESIGN RULE</span><b>Capability evidence qualifies a robot for exposure. Only voluntary, real-world continued choice produces a WANTED Score.</b></div>
    </section>

    <section className="evidenceFoundations" id="foundations"><div className="shell">
      <div className="sectionHead wantedHead"><div><span className="kicker">01 / EVIDENCE MAP</span><h2>Six foundations.<br/><em>Six explicit limits.</em></h2></div><p>Each source informs a defined part of the protocol. None is presented as validation of the complete WANTED construct.</p></div>
      <div className="foundationGrid">{foundations.map((item) => <article key={item.n}>
        <header><span>{item.n}</span><small>{item.field}</small></header><h3>{item.title}</h3><p>{item.copy}</p>
        <dl><div><dt>SUPPORTS</dt><dd>{item.supports}</dd></div><div><dt>DOES NOT PROVE</dt><dd>{item.limit}</dd></div></dl>
        <footer>{item.links.map(([label, href]) => <a key={href} href={href} target="_blank" rel="noreferrer">{label} <b>↗</b></a>)}</footer>
      </article>)}</div>
    </div></section>

    <section className="standardsSection" id="standards"><div className="shell">
      <div className="sectionHead wantedHead"><div><span className="kicker">02 / STANDARDS SCOPE</span><h2>A benchmark layer.<br/><em>Not a conformity mark.</em></h2></div><p>The relevant legal and standards framework depends on the robot, environment, jurisdiction, and intended use. A qualified assessor determines applicability.</p></div>
      <div className="standardsTable" role="table" aria-label="Robot safety standards scope guide">
        <header role="row"><span>DEPLOYMENT CONTEXT</span><span>REFERENCE</span><span>STATUS</span><span>WANTED RECORDS</span><span>PRIMARY SOURCE</span></header>
        {standards.map(([context, reference, status, record, href]) => <div role="row" key={reference}><b>{context}</b><strong>{reference}</strong><small>{status}</small><p>{record}</p><a href={href} target="_blank" rel="noreferrer">VERIFY ↗</a></div>)}
      </div>
      <aside className="scopeNotice"><b>SCOPE NOTICE</b><p>WANTED Safety Certification means the benchmark’s safety gates were satisfied for the reported run. It is not regulatory approval, product certification, or proof of conformity with ISO, UL, medical-device, transportation, workplace, privacy, cybersecurity, or other applicable requirements. Those obligations remain separate and authoritative.</p></aside>
    </div></section>

    <section className="methodBoundary"><div className="shell">
      <span className="kicker">03 / CLAIM BOUNDARY</span><h2>Evidence in.<br/><em>Overclaiming out.</em></h2>
      <div className="boundaryGrid">
        <article><span>SIMULATION</span><b>Can reduce foreseeable risk.</b><p>It cannot reproduce the full social environment or generate human-retention outcomes.</p></article>
        <article><span>LONG-RUN AUTONOMY</span><b>Can establish operational endurance.</b><p>It cannot show that the people sharing the environment chose continued coexistence.</p></article>
        <article><span>RETENTION</span><b>Can reveal continued choice.</b><p>It cannot excuse safety failures or isolate why a participant kept or rejected the robot.</p></article>
        <article><span>WANTED SCORE</span><b>Can compare wanted time.</b><p>It is cohort- and context-specific, and must travel with uncertainty, burden, incident, and support disclosures.</p></article>
      </div>
      <div className="evidenceCta"><div><span>OPEN PROTOCOL</span><b>Audit the claim from event schema to score.</b></div><a className="primary" href="/wanted-10k">READ WANTED-10K <span>→</span></a></div>
    </div></section>
    <footer className="wantedFooter"><div className="shell"><div className="brand"><span className="brandMark">EA</span><span>EMBODIED <b>ARENA</b> / EVIDENCE</span></div><p>Primary sources and scope notes for the WANTED-10K technical specification.</p><a href="#foundations">BACK TO EVIDENCE ↑</a></div></footer>
  </main>;
}

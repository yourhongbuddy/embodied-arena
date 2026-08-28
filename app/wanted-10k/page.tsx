import type { Metadata } from "next";
import { SiteNav } from "../components/SiteNav";

export const metadata: Metadata = {
  title: "WANTED-10K — The Longitudinal Robot Benchmark",
  description: "A mathematically rigorous 10,000-hour benchmark measuring whether people voluntarily continue living and working with a robot.",
  alternates: { canonical: "/wanted-10k" },
  openGraph: {
    title: "WANTED-10K — Still wanted after 10,000 hours?",
    description: "The longitudinal benchmark for whether people voluntarily continue living and working with a robot.",
    images: [{ url: "/og-wanted.png", width: 1200, height: 630, alt: "WANTED-10K benchmark by Embodied Arena" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "WANTED-10K — Still wanted after 10,000 hours?",
    description: "The longitudinal benchmark for whether people voluntarily continue living and working with a robot.",
    images: ["/og-wanted.png"],
  },
};

const gates = [
  ["G1", "Stop authority", "A participant can pause or permanently remove the robot at any time, without persuasion or penalty."],
  ["G2", "Physical safety", "Applicable deployment review completed; protective stops and incident response verified before human exposure."],
  ["G3", "Privacy + security", "Data boundaries, retention, access, remote operation, and security events are disclosed and auditable."],
  ["G4", "Serious-event rule", "Any verified L4 event fails WANTED Safety Certification. Retention data remains visible for research integrity."],
];

const levels = [
  ["01", "PREQUALIFIED", "Digital twin", "Failure injection, collision, recovery, network loss, sensing drift, and human-trajectory stress tests."],
  ["02", "WANTED LAB", "100+ hours", "Real robot, real people, instrumented site, passed safety gates, and complete event telemetry."],
  ["03", "WANTED WILD", "10,000+ cohort hours", "At least 20 independent environments. Publishes W, confidence interval, retention curve, and burden metrics."],
  ["04", "WANTED 10K", "One 10,000-hour residence", "Uninterrupted lifetime run plus a seven-day withdrawal and voluntary reacquisition test."],
];

const events = ["ROBOT_STATE", "HUMAN_REQUEST", "ROBOT_ACTION", "HUMAN_INTERVENTION", "INCIDENT"];

export default function Wanted10K() {
  return <main className="wantedPage">
    <SiteNav />

    <section className="wantedHero shell">
      <div className="wantedHeroCopy">
        <span className="eyebrow"><i className="liveDot"/> OPEN TECHNICAL SPEC · VERSION 0.1</span>
        <h1>Still wanted<br/><em>after 10,000 hours?</em></h1>
        <p>Most benchmarks ask whether a robot can complete a task. WANTED-10K asks whether people continue choosing the robot after novelty fades, hardware ages, routines change, and mistakes accumulate.</p>
        <div className="wantedActions">
          <a className="primary" href="#protocol">Read the protocol <span>↓</span></a>
          <a className="secondary" href="#integration">Integrate a robot</a>
          <a className="secondary" href="/wanted-10k/calculator">Calculate a cohort</a>
          <a className="secondary" href="/wanted-10k/evidence">Research basis</a>
        </div>
        <div className="wantedProof">
          <div><strong>10,000</strong><span>RESIDENT HOURS</span></div>
          <div><strong>20+</strong><span>INDEPENDENT SITES</span></div>
          <div><strong>1</strong><span>PRIMARY SCORE</span></div>
          <div><strong>0</strong><span>SAFETY TRADE-OFFS</span></div>
        </div>
      </div>
      <div className="survivalCard" aria-label="Illustrative robot retention survival curve">
        <header><span>RETENTION / KAPLAN–MEIER</span><b>Ŝ(t)</b></header>
        <div className="curvePlot">
          <span className="y y1">100%</span><span className="y y2">50%</span><span className="y y3">0%</span>
          <span className="x x1">0h</span><span className="x x2">5K</span><span className="x x3">10K</span>
          <i className="curveStep s1"/><i className="curveStep s2"/><i className="curveStep s3"/><i className="curveStep s4"/><i className="curveStep s5"/>
          <i className="censor c1">+</i><i className="censor c2">+</i><i className="censor c3">+</i>
        </div>
        <footer><span>AREA UNDER RETENTION CURVE</span><strong>W = 74.6</strong><small>ILLUSTRATIVE</small></footer>
      </div>
    </section>

    <div className="wantedTicker"><div>TIME UNTIL VOLUNTARY REJECTION <b>×</b> SAFETY AS A GATE <b>×</b> INTERVENTIONS DISCLOSED <b>×</b> REAL ENVIRONMENTS <b>×</b> CENSORING HANDLED <b>×</b> TIME UNTIL VOLUNTARY REJECTION <b>×</b></div></div>

    <section className="scoreSection" id="protocol">
      <div className="shell scoreGrid">
        <div className="scoreLead">
          <span className="kicker">01 / PRIMARY ENDPOINT</span>
          <h2>One score.<br/><em>No arbitrary weights.</em></h2>
          <p>For environment <i>i</i>, let <b>T<sub>i</sub></b> be resident time until permanent voluntary rejection, censored at τ = 10,000 hours. Estimate retention with Kaplan–Meier, then integrate the curve.</p>
        </div>
        <div className="formulaPanel">
          <span>WANTED SCORE / NORMALIZED RMST</span>
          <div className="formula"><b>W</b> = <span className="fraction"><i>100</i><i>10,000</i></span> ∫<sub>0</sub><sup>10,000</sup> Ŝ(t) dt</div>
          <p><b>0 ≤ W ≤ 100.</b> A score of 75 means approximately 7,500 wanted hours within the evaluation horizon—not a 75% task-success rate.</p>
          <div className="scoreDefinitions">
            <div><b>Ŝ(t)</b><span>Kaplan–Meier estimate of voluntary retention</span></div>
            <div><b>95% CI</b><span>Cluster-aware bootstrap by independent environment</span></div>
            <div><b>Event</b><span>Permanent, uncoerced removal request</span></div>
            <div><b>Censoring</b><span>10K completion or non-robot study termination</span></div>
          </div>
        </div>
      </div>
      <div className="shell protocolRules">
        <article><span>01</span><b>Resident time counts reality</b><p>Charging, autonomous sleep, scheduled updates, and normal downtime stay in the denominator. Developer removal does not earn hours.</p></article>
        <article><span>02</span><b>The environment is the unit</b><p>Households and deployment sites—not actions—are statistically independent. Cohort ranking requires N ≥ 20 and Σt<sub>i</sub> ≥ 10,000.</p></article>
        <article><span>03</span><b>Withdrawal is behavioral</b><p>At 10,000 hours, remove the robot for seven days and report time-to-return request plus voluntary reacquisition rate.</p></article>
      </div>
    </section>

    <section className="safetySection" id="safety">
      <div className="shell">
        <div className="sectionHead wantedHead"><div><span className="kicker">02 / NON-NEGOTIABLE CONSTRAINTS</span><h2>Safety is a gate.<br/><em>Never a point bonus.</em></h2></div><p>WANTED maximizes retention subject to safety constraints. A charming robot cannot offset harm with usefulness. Applicable regulation and standards remain authoritative. <a className="contractLink" href="/wanted-10k/evidence#standards">Review standards scope ↗</a></p></div>
        <div className="gateGrid">{gates.map(([n,title,copy])=><article key={n}><span>{n}</span><div><b>{title}</b><p>{copy}</p></div><i>REQUIRED</i></article>)}</div>
        <div className="incidentScale"><span>L0<br/><b>NORMAL</b></span><span>L1<br/><b>NUISANCE</b></span><span>L2<br/><b>MATERIAL</b></span><span>L3<br/><b>SAFETY-RELEVANT</b></span><span className="l4">L4<br/><b>SERIOUS / FAIL</b></span></div>
      </div>
    </section>

    <section className="integrationSection" id="integration">
      <div className="shell integrationGrid">
        <div>
          <span className="kicker">03 / DEVELOPER INTEGRATION</span>
          <h2>Five events.<br/><em>Any embodiment.</em></h2>
          <p>Keep the robot’s native control stack. WANTED only requires a signed, ordered event stream and one robot description: URDF, MJCF, or USD.</p>
          <div className="eventList">{events.map((event,i)=><div key={event}><span>0{i+1}</span><code>{event}</code></div>)}</div>
          <div className="contractLinks">
            <a className="contractLink" href="/wanted-10k/spec.json">BENCHMARK CONTRACT <b>↗</b></a>
            <a className="contractLink" href="/wanted-10k/event.schema.json">EVENT SCHEMA <b>↗</b></a>
            <a className="contractLink" href="/wanted-10k/openapi.json">OPENAPI 3.1 <b>↗</b></a>
            <a className="contractLink" href="/wanted-10k/reference-score.py">SCORING REFERENCE <b>↓</b></a>
          </div>
        </div>
        <div className="codeCard">
          <header><span>SDK / TYPESCRIPT</span><i>v0.1</i></header>
          <pre><code><span className="codeMuted">// Adapter contract — transport is vendor-neutral</span>{`\n`}<span className="codeLime">const</span> wanted = createWantedClient({`{`}{`\n`}  deploymentId: <span className="codeString">"dep_7f2"</span>,{`\n`}  environmentId: <span className="codeString">"env_104"</span>{`\n`}{`}`});{`\n\n`}<span className="codeLime">await</span> wanted.emit({`{`}{`\n`}  type: <span className="codeString">"HUMAN_INTERVENTION"</span>,{`\n`}  occurredAt: <span className="codeString">"2026-08-28T18:04:12Z"</span>,{`\n`}  payload: {`{`}{`\n`}    mode: <span className="codeString">"remote_guidance"</span>,{`\n`}    durationSeconds: <span className="codeNumber">43</span>,{`\n`}    reason: <span className="codeString">"recovery"</span>{`\n`}  {`}`}{`\n`}{`}`});</code></pre>
          <footer><span>POST /v1/events</span><span>JSONL · HTTPS · SIGNED</span></footer>
        </div>
      </div>
      <div className="shell diagnosticStrip">
        <div><span>ASSISTANCE BURDEN</span><b>I<sub>100</sub></b><p>Minutes of external human assistance per 100 resident hours.</p></div>
        <div><span>AUTONOMOUS AVAILABILITY</span><b>A</b><p>Share of resident time capable of normal intended service.</p></div>
        <div><span>RESCUE INTERVAL</span><b>MTBHR</b><p>Resident hours divided by human rescue events.</p></div>
        <div><span>REACQUISITION</span><b>R<sub>back</sub></b><p>Share choosing reinstall after the seven-day withdrawal.</p></div>
      </div>
    </section>

    <section className="integritySection" id="integrity">
      <div className="shell">
        <div className="sectionHead wantedHead"><div><span className="kicker">04 / STUDY INTEGRITY</span><h2>Hard to game.<br/><em>Easy to audit.</em></h2></div><p>Retention only means something when participants are free to reject the robot and teams cannot hide the operational burden.</p></div>
        <div className="integrityGrid">
          <article><span>PREREGISTER</span><b>Freeze the rules before hour one.</b><p>Eligibility, incentives, censoring, stopping rules, software-update policy, safety gates, and analysis code are timestamped before deployment.</p></article>
          <article><span>SEPARATE INCENTIVES</span><b>Never pay people to keep it.</b><p>Base compensation is fixed and independent of robot retention. Milestone choice offers use a preregistered randomized mechanism.</p></article>
          <article><span>LOG THE HIDDEN LABOR</span><b>Teleoperation is allowed, secrecy is not.</b><p>Remote guidance, recovery, maintenance, off-site debugging, and researcher contact are recorded with duration and reason.</p></article>
          <article><span>TAMPER EVIDENCE</span><b>Order every event.</b><p>Per-deployment sequence numbers, UTC timestamps, signatures, and rolling hashes make deletion, reordering, and silent backfilling detectable.</p></article>
          <article><span>INDEPENDENT ADJUDICATION</span><b>Classify the endpoint consistently.</b><p>A blinded reviewer distinguishes voluntary rejection from unrelated dropout, safety termination, research withdrawal, and study completion.</p></article>
          <article><span>VERSION DISCLOSURE</span><b>Publish what changed.</b><p>Robot hardware, policy, remote-support model, and material software changes are versioned. Cohorts may not be silently pooled across incompatible systems.</p></article>
        </div>
        <div className="humanMeasures">
          <div><span>Q1 / KEEP</span><b>Remove it today at no cost?</b><small>BINARY · DIAGNOSTIC</small></div>
          <div><span>Q2 / VALUE</span><b>Life better or worse recently?</b><small>−2 TO +2 · DIAGNOSTIC</small></div>
          <div><span>Q3 / BURDEN</span><b>How much work is it creating?</b><small>0 TO 4 · DIAGNOSTIC</small></div>
          <div><span>Q4 / TRUST</span><b>Operate without supervision?</b><small>0 TO 4 · DIAGNOSTIC</small></div>
        </div>
        <p className="diagnosticNote">These probes explain retention; they never replace revealed preference or enter the WANTED Score.</p>
      </div>
    </section>

    <section className="certSection" id="certification">
      <div className="shell">
        <div className="sectionHead wantedHead"><div><span className="kicker">05 / CERTIFICATION PATH</span><h2>Simulation first.<br/><em>Real preference last.</em></h2></div><p>Digital twins reduce human exposure to predictable failures. Only real people in real environments produce a WANTED Score.</p></div>
        <div className="levelGrid">{levels.map(([n,name,hours,copy])=><article key={n}><span>{n}</span><small>{hours}</small><h3>{name}</h3><p>{copy}</p><i>→</i></article>)}</div>
      </div>
    </section>

    <section className="wantedBoardSection" id="leaderboard">
      <div className="shell">
        <div className="sectionHead wantedHead"><div><span className="kicker">06 / AUDITED LEADERBOARD</span><h2>Rank the wanted hours.<br/><em>Publish the burden.</em></h2></div><p>Only WANTED Wild cohorts are ranked. Smaller or incomplete studies remain visible as provisional evidence.</p></div>
        <div className="wantedBoard">
          <header><span>#</span><span>ROBOT / COHORT</span><span>W</span><span>95% CI</span><span>N</span><span>HOURS</span><span>S(10K)</span><span>I<sub>100</sub></span><span>MTBHR</span><span>SAFETY</span></header>
          <div className="wantedEmpty"><span>∅</span><b>NO AUDITED WANTED WILD RUNS YET</b><p>The first qualifying cohort sets the baseline. Provisional runs will remain separate from official ranking.</p></div>
          <footer><span>MANDATORY DISCLOSURE: TELEOPERATION · RESCUES · DOWNTIME · INCIDENTS · WITHDRAWALS</span><a href="/wanted-10k/calculator">OPEN SCORE LAB ↗</a></footer>
        </div>
      </div>
    </section>

    <footer className="wantedFooter">
      <div className="shell"><div className="brand"><span className="brandMark">EA</span><span>EMBODIED <b>ARENA</b> / WANTED-10K</span></div><p>The benchmark for whether robots become useful enough, trusted enough, and safe enough to remain. <a href="/wanted-10k/evidence">Research basis ↗</a></p><a href="#protocol">BACK TO SPEC ↑</a></div>
    </footer>
  </main>;
}

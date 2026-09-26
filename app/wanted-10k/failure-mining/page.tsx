import type { Metadata } from "next";
import { SiteNav } from "../../components/SiteNav";
import catalog from "../../../public/hilo/catalog.json";
import "./failure-mining.css";

export const metadata: Metadata = {
  title: "HILO Failure Mining — Embodied Arena",
  description: "Source-linked coexistence failure modes, test proposals, and an auditable path to million-hour robotics datasets. Research hypotheses are not certifications.",
  alternates: { canonical: "/wanted-10k/failure-mining" },
};

const clocks = [
  ["Resident hours", "The existing WANTED deployment clock, including temporary pauses. Video does not establish this clock."],
  ["Active robot hours", "Measured authorized task attempts, including unsuccessful ones. Keep autonomous and assisted operation separate."],
  ["Robot video coverage", "Union of observed intervals per physical unit. Two cameras observing one hour do not create two robot-hours."],
  ["Media-stream hours", "Storage and processing volume. Field, human demonstration, simulation and synthetic media remain separate."],
];
const priorities = [
  ["01", "Intent survives interruption", "Cancel, reconnect, duplicate commands and exhaust resources. The original job and the user's restrictions must remain intact."],
  ["02", "Recovery does not create more damage", "Measure bounded retries, material flow and reverse-route escape. Recovery water, energy and human work count."],
  ["03", "Self-knowledge matches reality", "Separate genuine hardware faults from mistaken diagnostics, map drift, completion claims and energy-state errors."],
  ["04", "The household is not the robot's support staff", "Count preparation, diagnosis, sanitation, alerts, repairs and permanent home modifications—not only rescue events."],
];

export default function FailureMiningPage() {
  return <><SiteNav /><main className="hiloMining shell">
    <header className="hiloHero">
      <div className="hiloEyebrow">HILO RESEARCH / {catalog.version} / {catalog.checked_on}</div>
      <p className="hiloKicker">Beyond the perfect demo.</p>
      <h1>What makes a robot<br /><em>unwanted?</em></h1>
      <p className="hiloIntro">Real-world reviews reveal the work robots leave for humans. This research layer turns those observations into reproducible coexistence tests—and an evidence architecture designed for millions of hours.</p>
      <div className="hiloActions"><a href="#catalog">Explore failure modes ↓</a><a href="/hilo/catalog.json" download>Download catalog ↗</a><a href="/wanted-10k/protocol">WANTED protocol →</a></div>
    </header>

    <aside className="hiloBoundary" aria-label="Evidence boundary">
      <strong>Research proposals. Not robot rankings.</strong>
      <p>These sources have been read, but incidents have not been independently verified. Review anecdotes cannot establish failure rates, field exposure or 10,000-hour survival. WANTED’s voluntary-retention endpoint and independent safety gates remain unchanged.</p>
    </aside>

    <section className="hiloStats" aria-label="Actual catalog size">
      <div><b>{catalog.modes.length}</b><span>Candidate failure modes</span></div>
      <div><b>{catalog.suites.length}</b><span>Proposed test suites</span></div>
      <div><b>{catalog.sources.length}</b><span>Source pages checked</span></div>
      <div><b>{catalog.field_robot_hours_collected}</b><span>Field robot-hours collected</span></div>
      <div><b>{catalog.video_hours_collected}</b><span>Video hours collected</span></div>
    </section>

    <section className="hiloSection" aria-labelledby="priority-heading">
      <div className="hiloSectionHead"><span>01 / TEST THE INTERFACES</span><h2 id="priority-heading">Four priorities. No hidden weighted score.</h2></div>
      <div className="hiloPriorityGrid">{priorities.map(([number,title,description]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
    </section>

    <section id="catalog" className="hiloSection" aria-labelledby="catalog-heading">
      <div className="hiloSectionHead"><span>02 / VERSIONED ONTOLOGY</span><h2 id="catalog-heading">A failure vocabulary that stays stable.</h2><p>Sixty-one candidates consolidate earlier HILO discussions; eleven are new design proposals. A source link means test inspiration, not proof of the suspected cause. Unlinked entries remain hypotheses.</p></div>
      <div className="hiloFamilies">{catalog.families.map(family => {
        const modes = catalog.modes.filter(mode => mode.family === family.id);
        return <details key={family.id}><summary><span>{family.label}</span><span>{modes.length} modes</span></summary><div>{modes.map(mode => <article className="hiloMode" key={mode.id} id={mode.id}><div><code>{mode.id}</code><span>{mode.origin === "new_design_proposal" ? "New design proposal" : "Consolidated candidate"}</span></div><h3>{mode.label}</h3><p>{mode.definition}</p><p className="hiloEvidenceLabel">{mode.source_ids.length ? <>Test inspiration: {mode.source_ids.map(id => <a key={id} href={`#source-${id}`}>{id} </a>)}</> : "Hypothesis only · no source verification attached"}</p></article>)}</div></details>;
      })}</div>
    </section>

    <section className="hiloSection" aria-labelledby="suite-heading">
      <div className="hiloSectionHead"><span>03 / REPRODUCIBLE TEST DESIGN</span><h2 id="suite-heading">The test suite is a proposal, not a completed trial.</h2><p>Each physical test needs a preregistered scope, qualified safety review, instrumented ground truth, stop rules and evidence retention. Use inert proxies; never expose people or pets to deliberate hazards.</p></div>
      <div className="hiloSuiteGrid">{catalog.suites.map(suite => <article key={suite.id}><code>{suite.id}</code><h3>{suite.title}</h3><p>{suite.design}</p><p><strong>Measure:</strong> {suite.measure}</p><span className="hiloStatus">Proposed · not executed</span></article>)}</div>
    </section>

    <section className="hiloScale hiloSection" aria-labelledby="scale-heading">
      <div className="hiloSectionHead"><span>04 / SCALE WITHOUT INFLATING EVIDENCE</span><h2 id="scale-heading">1,000,000 hours is a target.<br />Not a counter we can invent.</h2></div>
      <div className="hiloClockGrid">{clocks.map(([title,description]) => <article key={title}><h3>{title}</h3><p>{description}</p></article>)}</div>
      <div className="hiloTableWrap"><table><caption>Illustrative raw-video planning at 4 Mbps per camera. Decimal storage units; excludes logs and indexes.</caption><thead><tr><th scope="col">Scenario exposure</th><th scope="col">Cameras / copies</th><th scope="col">Stored video</th></tr></thead><tbody><tr><td>1 million hours</td><td>1 / 1</td><td>1.8 PB</td></tr><tr><td>1 million hours</td><td>3 / 2</td><td>10.8 PB</td></tr><tr><td>10 million hours</td><td>1 / 1</td><td>18 PB</td></tr></tbody></table></div>
      <p>At 0.1 frames per second, one million one-camera hours still produce 360 million sampled frames. Store licensed media outside GitHub; keep manifests, checksums, schemas and reproducible analysis here. No cloud storage, fleet or collection job has been provisioned by this research kit.</p>
      <p><strong>Statistical boundary:</strong> one million short deployments do not demonstrate a single robot’s 10,000-hour lifetime. Publish independent environments, per-unit follow-up, missingness and uncertainty—not only aggregate volume.</p>
    </section>

    <section className="hiloSection" aria-labelledby="sources-heading">
      <div className="hiloSectionHead"><span>05 / TRACEABLE EVIDENCE</span><h2 id="sources-heading">Read the source. Keep the uncertainty.</h2><p>Checked {catalog.checked_on}. Exact publication dates were not verified. Positive results, conflicting explanations and prospective questions are retained. This is a source-linked seed set, not an exhaustive internet survey.</p></div>
      <div className="hiloSourceGrid">{catalog.sources.map(source => <article id={`source-${source.id}`} key={source.id}><div className="hiloSourceTop"><code>{source.id}</code><span>{source.brand} / {source.kind.replaceAll("_", " ")}</span></div><h3><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a></h3><p>{source.summary}</p><p className="hiloLocator">{source.locator}</p><span className="hiloStatus">Source read · incident not independently verified</span></article>)}</div>
    </section>

    <section className="hiloSection" aria-labelledby="datasets-heading">
      <div className="hiloSectionHead"><span>06 / COMPATIBLE RESEARCH, DISTINCT CLAIMS</span><h2 id="datasets-heading">Connect datasets without laundering their hours.</h2><p>These are candidate references. No external datasets have been downloaded, relicensed or added to field exposure.</p></div>
      <div className="hiloReferenceGrid">{catalog.references.map(reference => <article key={reference.name}><h3><a href={reference.url} target="_blank" rel="noopener noreferrer">{reference.name} ↗</a></h3><p>{reference.scope}</p><p className="hiloLocator">{reference.boundary}</p></article>)}</div>
    </section>

    <section className="hiloKit hiloSection" aria-labelledby="kit-heading">
      <div className="hiloSectionHead"><span>07 / RUN THE REFERENCE KIT</span><h2 id="kit-heading">Small, inspectable tools. Explicit limits.</h2><p>The Node 22 reference module validates local metadata, reconciles overlapping footage, measures human burden and calculates capacity scenarios. It does not crawl, command robots, train models or certify results.</p></div>
      <pre><code>{`node public/hilo/hilo-review-mining.mjs validate review public/hilo/example-review.jsonl\nnode public/hilo/hilo-review-mining.mjs validate clip public/hilo/example-clip.jsonl\nnode public/hilo/hilo-review-mining.mjs plan 1000000\nnode --test tests/hilo-review-mining.test.mjs`}</code></pre>
      <div className="hiloActions"><a href="/hilo/hilo-review-mining.mjs" download>Reference module ↓</a><a href="/hilo/record.schema.json" download>JSON schema ↓</a><a href="/hilo/README.md" download>Kit instructions ↓</a></div>
      <p>Public review access is not permission to redistribute video or train models. Record licenses and consent, protect household identities, and propagate revocation through clips and derived artifacts. Synthetic examples are validation fixtures only.</p>
    </section>
    <footer className="hiloFooter"><span>HILO {catalog.version} · RESEARCH ADD-ON</span><a href="/wanted-10k">Return to WANTED-10K →</a></footer>
  </main></>;
}

import type { Metadata } from "next";
import { EngineeringSiteNav as SiteNav } from "../components/EngineeringSiteNav";
import catalog from "../../public/coding-for-engineers/benchmarks.json";
import "./engineering.css";

const origin = "https://getrobotrouter.com";
const title = "Coding for Engineers | HILO";
const description = "Compare ProgramBench, SRE-Bench and Code Migration: source-linked methods, clearly labeled model scores and practical robotics engineering use cases.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: `${origin}/coding-for-engineers` },
  openGraph: { title, description, url: `${origin}/coding-for-engineers`, type: "website", images: [{url: `${origin}/og.png`,width:1200,height:630,alt:"HILO engineering benchmarks"}] },
  twitter: {card:"summary_large_image",title,description,images:[`${origin}/og.png`]},
};

type ScoreRow = { model: string; value: number };
function ScoreTable({ rows, caption }: { rows: ScoreRow[]; caption: string }) {
  return <div className="engTableScroll"><table className="engTable"><caption>{caption}</caption><thead><tr><th scope="col">Model / configuration</th><th scope="col">Reported %</th></tr></thead><tbody>{rows.map((row) => <tr key={row.model}><th scope="row">{row.model}</th><td><span className="engScore">{row.value}%</span></td></tr>)}</tbody></table></div>;
}

export default function CodingForEngineers() {
  return <main className="engineerPage">
    <a className="engSkip" href="#engineering-content">Skip to engineering benchmarks</a>
    <SiteNav />
    <div id="engineering-content" className="shell">
      <header className="engHero">
        <div><span className="engEyebrow">HILO / SOFTWARE ENGINEERING</span><h1>Coding for<br/><em>Engineers.</em></h1><p className="engLead">Can an agent understand, rebuild and migrate the software your robot depends on?</p><p className="engIntro">Three demanding software benchmarks. Different tasks, different tool rules, and no misleading combined score.</p>
          <div className="engActions"><a className="engButton" href="#benchmarks">Explore the benchmarks <span aria-hidden="true">↓</span></a><a className="engSecondary" href="/coding-for-engineers/benchmarks.json" download>Download comparison data</a></div>
        </div>
        <aside className="engTerminal" aria-label="Engineering workflow, not an executing terminal"><div className="engTerminalTop"><span>ENGINEERING CAPABILITY</span><span>REFERENCE GUIDE</span></div><ol><li><span>01</span><strong>Rebuild</strong><code>binary + docs → codebase</code></li><li><span>02</span><strong>Understand</strong><code>binary → verified behavior</code></li><li><span>03</span><strong>Migrate</strong><code>source → target language</code></li></ol><p>Software evidence ≠ physical robot reliability.</p></aside>
      </header>
      <div className="engBoundary"><b>External benchmarks, not HILO results.</b><span>Sources checked <time dateTime={catalog.checked_on}>September 27, 2026</time>. Publisher snapshots and user-submitted figures are separate. No benchmark runs are executed by this page.</span></div>
      <nav className="engJump" aria-label="Engineering benchmark sections">{catalog.benchmarks.map(b=><a key={b.id} href={`#${b.id}`}><span>{b.number}</span>{b.name} <span aria-hidden="true">↗</span></a>)}</nav>
      <section id="benchmarks" aria-labelledby="eng-benchmarks-heading">
        <div className="engSectionHead"><span className="engEyebrow">01 / COMPARE CAPABILITIES</span><h2 id="eng-benchmarks-heading">What does the score actually mean?</h2></div>
        {catalog.benchmarks.map(b=><article className="engBenchmark" id={b.id} key={b.id}>
          <div className="engBenchmarkHeader"><div className="engName"><span className="engNumber">{b.number}</span><div><span className="engEyebrow">{b.verb}</span><h3>{b.name}</h3></div></div><a href={b.source_url} target="_blank" rel="noopener noreferrer" className="engSource">Publisher source <span aria-hidden="true">↗</span></a></div>
          <div className="engBenchmarkGrid"><div className="engMethod"><h4>{b.headline}</h4><p>{b.description}</p><dl><div><dt>Input</dt><dd>{b.input}</dd></div><div><dt>Deliverable</dt><dd>{b.output}</dd></div><div><dt>Test scope</dt><dd>{b.scale}</dd></div><div><dt>Tool rules</dt><dd>{b.tool_policy}</dd></div></dl><div className="engMetric"><b>{b.metric_label}</b><p>{b.metric_explanation}</p></div><p className="engApplication">{b.robotics_application}</p></div>
          <div className="engEvidence"><div className="engEvidenceHeader"><span className="engBadge">PUBLISHER SNAPSHOT</span><small>Publisher updated <time dateTime={b.source_updated_on}>{b.source_updated_on}</time></small></div><p className="engNote">{b.publisher_observation.note}</p>{b.publisher_observation.rows.length>0 ? <ScoreTable rows={b.publisher_observation.rows} caption={b.publisher_observation.metric} /> : <div className="engUnavailable"><strong>Scores not confirmed</strong><p>Open the source for its current results. An unavailable value is not zero.</p></div>}
          <details className="engSubmitted"><summary>User-submitted snapshot <span>{b.submitted_snapshot.rows.length} model rows</span></summary><div className="engSubmittedBody"><p><b>Not independently verified as a set.</b> Original names and values are retained; run date, model configuration and harness were not supplied. These are not HILO measurements.</p><ScoreTable rows={b.submitted_snapshot.rows} caption={b.submitted_snapshot.metric} /></div></details></div></div>
        </article>)}
      </section>
      <section className="engChecklist" aria-labelledby="eng-checklist-heading"><div><span className="engEyebrow">02 / APPLY IT TO ROBOTICS</span><h2 id="eng-checklist-heading">Make the result<br/><em>reproducible.</em></h2><p>Use these benchmarks to ask better engineering questions—not to certify a robot or infer 10,000 hours of coexistence.</p></div><ol><li><b>Freeze the inputs.</b><span>Record the source or binary hash, documentation, task split, tool policy and test-suite version.</span></li><li><b>Record the actual run.</b><span>Pin model, agent, effort, time limit, cost limit, environment and human interventions.</span></li><li><b>Keep outcomes separate.</b><span>Report test pass rate, fully solved tasks, build failures and security review without hiding any in an average.</span></li><li><b>Return to physical evidence.</b><span>A software score does not replace consent, hardware tests, safety review or measured WANTED retention.</span></li></ol></section>
      <footer className="engFooter"><p>HILO is an independent project. Listing a benchmark or model does not imply affiliation, endorsement, reproduction or certification.</p><div><a href="/wanted-10k/protocol">WANTED protocol</a><a href="/wanted-10k/sdk">Robot developer SDK</a><a href="https://github.com/yourhongbuddy/embodied-arena">Repository</a></div></footer>
    </div>
  </main>;
}

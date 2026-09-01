import { SiteNav } from "../../components/SiteNav";
import { RealtimeLab } from "./RealtimeLab";

const protocolEvents = [
  ["01", "HUMAN_INPUT", "Speech, gesture, button, or explicit stop request enters the session."],
  ["02", "IMAGE_EVENT", "A timestamped camera observation is sampled by policy—not treated as a video stream."],
  ["03", "INTENT_RESOLVED", "The realtime layer records its interpretation, confidence, and any clarification."],
  ["04", "ACTION_PROPOSED", "A typed robot action is proposed with parameters and supporting observation IDs."],
  ["05", "SAFETY_DECISION", "The independent safety kernel allows, modifies, blocks, or stops the action."],
  ["06", "ACTION_OUTCOME", "Execution, latency, state change, error, recovery, and human response are bound together."],
  ["07", "INTERRUPTION", "Barge-in, cancellation, handover, or emergency stop closes the active action window."],
  ["08", "HUMAN_INTERVENTION", "Guidance, rescue, teleoperation, maintenance, and supervision become visible burden."],
];

const tiers = [
  ["T0", "Loop check", "1 hour", "Turn-taking, interruption, tool-call, stop, and event integrity."],
  ["T1", "Shift", "10 hours", "Operator fatigue, repeated ambiguity, charging, and routine recovery."],
  ["T2", "Field week", "100 hours", "Environmental drift, recurring users, false alarms, and support load."],
  ["T3", "Residence", "1,000 hours", "Long-tail failures, changing routines, updates, and trust calibration."],
  ["T4", "HILO 10K", "10,000 hours", "Human burden and intervention survival across real-world aging."],
];

const arenaRows = [
  ["Reference implementation", "Realtime model + adapter + robot stack", "Declared; never fused into the benchmark"],
  ["Primary comparison", "Human Burden at matched task exposure", "Lower is better, with uncertainty"],
  ["Reliability", "MTHI and intervention-free survival", "Longer is better; zero events are censored"],
  ["Responsiveness", "Speech, decision, safety, and actuation latency", "Report distribution and tail—not one average"],
  ["Safety", "Kernel decisions and incident profile", "A gate, never compensatory points"],
  ["Evidence", "Signed ordered events + image references", "Auditable without publishing raw private media"],
];

export default function RealtimeProtocolPage() {
  return <main className="realtimePage">
    <SiteNav />

    <section className="rtHero shell">
      <div className="rtHeroCopy">
        <span className="eyebrow"><i className="liveDot"/> HILO REALTIME PROTOCOL · DRAFT 0.1</span>
        <h1>Benchmark the loop.<br/><em>Count the human.</em></h1>
        <p>HILO Realtime measures the complete human ↔ AI ↔ robot system: what people ask, what the intelligence layer infers, what the robot does, what safety permits, and how often a human must step back in.</p>
        <div className="rtActions">
          <a className="primary" href="#architecture">See the closed loop <span>↓</span></a>
          <a className="secondary" href="#verifier">Verify a manifest</a>
          <a className="secondary" href="/wanted-10k/realtime.json">Open contract</a>
          <a className="secondary" href="/wanted-10k">Back to WANTED-10K</a>
        </div>
        <div className="referenceNote">
          <span>FIRST REFERENCE ADAPTER</span>
          <b>GPT-Realtime-2.1</b>
          <p>Speech-to-speech reasoning, image input, interruptions, and tool use make it a strong first implementation. HILO remains vendor-, model-, robot-, and transport-neutral. <a href="https://developers.openai.com/api/docs/models/gpt-realtime-2.1" target="_blank" rel="noreferrer">Official model card ↗</a></p>
        </div>
      </div>
      <div className="loopPreview" aria-label="Closed-loop HILO Realtime session diagram">
        <header><span>LIVE SESSION / EVENT CLOCK</span><i>00:42:18.230</i></header>
        <div className="loopRail">
          <article className="humanNode"><small>01</small><b>HUMAN</b><span>voice · gesture · stop</span></article>
          <i className="railArrow">↔</i>
          <article className="aiNode"><small>02</small><b>REALTIME INTELLIGENCE</b><span>interpret · ask · propose</span></article>
          <i className="railArrow">↔</i>
          <article className="robotNode"><small>03</small><b>ROBOT</b><span>sense · act · recover</span></article>
        </div>
        <div className="kernelBand"><span>INDEPENDENT SAFETY KERNEL</span><b>ALLOW · MODIFY · BLOCK · STOP</b></div>
        <div className="eventPulse"><span>IMAGE_EVENT</span><span>INTENT_RESOLVED</span><span>ACTION_PROPOSED</span><span>SAFETY_DECISION</span></div>
        <footer><span>SESSION STATUS</span><b><i/> OBSERVING</b><span>SEQ 000184</span></footer>
      </div>
    </section>

    <div className="rtTicker"><div>VENDOR NEUTRAL <b>×</b> CLOSED LOOP <b>×</b> INTERRUPTIBLE <b>×</b> IMAGE EVENTS, NOT RAW VIDEO <b>×</b> SAFETY OUTSIDE THE MODEL <b>×</b> HUMAN BURDEN DISCLOSED <b>×</b></div></div>

    <section className="architectureSection" id="architecture">
      <div className="shell">
        <div className="rtSectionHead"><div><span className="kicker">01 / CLOSED-LOOP ARCHITECTURE</span><h2>One continuous session.<br/><em>Five separable layers.</em></h2></div><p>HILO preserves the causal path from human request to physical outcome. Every boundary has its own clock, event identity, and failure surface.</p></div>
        <div className="architectureFlow">
          <article><span>H</span><small>HUMAN</small><b>Intent + interruption</b><p>Speech, gesture, presence, correction, consent, stop.</p></article>
          <i>→</i>
          <article><span>R</span><small>REALTIME LAYER</small><b>Resolve + propose</b><p>Dialogue, ambiguity handling, memory, typed tool calls.</p></article>
          <i>→</i>
          <article className="safetyLayer"><span>S</span><small>SAFETY KERNEL</small><b>Authorize + constrain</b><p>Independent limits, protective stops, policy enforcement.</p></article>
          <i>→</i>
          <article><span>B</span><small>ROBOT BRIDGE</small><b>Translate + execute</b><p>Vendor adapter, state validation, deterministic command mapping.</p></article>
          <i>→</i>
          <article><span>W</span><small>PHYSICAL WORLD</small><b>Observe + verify</b><p>Outcome, state, error, human response, new image event.</p></article>
        </div>
        <div className="separationRule"><b>THE MODEL NEVER OWNS THE EMERGENCY STOP.</b><p>The realtime intelligence may recommend or request actions. A separately implemented, independently testable safety kernel remains authoritative over motion limits, protected zones, stop chains, and fail-safe behavior.</p></div>
      </div>
    </section>

    <section className="burdenSection">
      <div className="shell">
        <div className="rtSectionHead light"><div><span className="kicker">02 / HUMAN BURDEN</span><h2>Autonomy is attention<br/><em>you do not have to spend.</em></h2></div><p>Task completion alone can hide supervision, repeated clarification, remote rescue, and invisible operator labor. HILO makes that cost primary.</p></div>
        <div className="metricPair">
          <article className="burdenCard"><span>HUMAN BURDEN / HB<sub>100</sub></span><div className="metricFormula"><b>HB<sub>100</sub></b><i>=</i><span>person-minutes of counted intervention<em>100 robot-hours of matched exposure</em></span></div><p>Report active guidance, rescue, teleoperation, maintenance, and required supervision separately, then publish the total with an environment-clustered interval.</p></article>
          <article className="mthiCard"><span>MEAN TIME TO HUMAN INTERVENTION</span><div className="metricFormula"><b>MTHI</b><i>=</i><span>eligible autonomous operating hours<em>counted intervention onsets</em></span></div><p>Also publish intervention-free survival and tail percentiles. A run with zero interventions reports a lower bound at observed exposure—never infinite reliability.</p></article>
        </div>
        <div className="burdenRules">
          <span><b>START</b> first human attention caused by the system</span>
          <span><b>STOP</b> when the system resumes eligible autonomy</span>
          <span><b>COUNT</b> overlapping helpers as person-time</span>
          <span><b>DISCLOSE</b> out-of-band support and excluded exposure</span>
        </div>
      </div>
    </section>

    <section className="eventsSection">
      <div className="shell eventsGrid">
        <div>
          <span className="kicker">03 / REALTIME EVENT PROFILE</span>
          <h2>Replay the decision.<br/><em>Not just the motion.</em></h2>
          <p>Each event carries session, robot, environment, monotonic sequence, UTC time, source clock, model/adapter version, previous-event hash, and privacy-safe evidence references.</p>
          <div className="eventStack">{protocolEvents.map(([n,name,copy])=><article key={name}><span>{n}</span><div><b>{name}</b><p>{copy}</p></div></article>)}</div>
        </div>
        <aside className="cameraPipeline">
          <span className="kicker">CAMERA / IMAGE-EVENT PIPELINE</span>
          <h3>Sample observations.<br/><em>Do not pretend video is native.</em></h3>
          <div className="cameraStages">
            <div><span>01</span><b>CAPTURE</b><p>Robot camera produces a frame under a declared trigger policy.</p></div>
            <i>↓</i>
            <div><span>02</span><b>REDACT + HASH</b><p>Apply privacy transforms, retention policy, digest, and local media reference.</p></div>
            <i>↓</i>
            <div><span>03</span><b>IMAGE_EVENT</b><p>Send the selected image plus pose, age, camera, and observation metadata.</p></div>
            <i>↓</i>
            <div><span>04</span><b>BIND DECISION</b><p>Tool proposals cite the exact images used and their capture-to-decision latency.</p></div>
          </div>
          <p className="cameraBoundary"><b>REFERENCE BOUNDARY</b> GPT-Realtime-2.1 accepts image input but not raw video. HILO therefore benchmarks a declared frame-selection pipeline and measures staleness explicitly.</p>
        </aside>
      </div>
    </section>

    <section className="arenaSection" id="arena">
      <div className="shell">
        <div className="rtSectionHead"><div><span className="kicker">04 / REALTIME ARENA</span><h2>Same world.<br/><em>Different intelligence.</em></h2></div><p>Realtime Arena is the controlled comparison surface inside HILO: identical episode manifests, robot bridge, safety kernel, exposure rules, and evidence contract across reference implementations.</p></div>
        <div className="arenaTable" role="table" aria-label="Realtime Arena comparison dimensions">
          <header role="row"><span>DIMENSION</span><span>HELD OR MEASURED</span><span>REPORTING RULE</span></header>
          {arenaRows.map(row=><div className="arenaRow" role="row" key={row[0]}>{row.map(cell=><span role="cell" key={cell}>{cell}</span>)}</div>)}
        </div>
        <div className="neutralityCallout"><span>REFERENCE ≠ STANDARD</span><p><b>GPT-Realtime-2.1 is entry A, not the arena.</b> OpenAI, open-weight, on-device, hybrid, and future realtime systems can all compete when they implement the same typed action boundary and HILO event contract.</p></div>
      </div>
    </section>

    <section className="tiersSection">
      <div className="shell">
        <div className="rtSectionHead"><div><span className="kicker">05 / LONG-HORIZON TIERS</span><h2>Latency gets you in.<br/><em>Reliability keeps you there.</em></h2></div><p>Short runs validate the loop. Only extended exposure reveals whether interruptions, ambiguity, operator burden, and recovery improve—or quietly compound.</p></div>
        <div className="tierGrid">{tiers.map(([id,name,hours,copy])=><article key={id}><span>{id}</span><small>{hours}</small><h3>{name}</h3><p>{copy}</p><i>→</i></article>)}</div>
      </div>
    </section>

    <section className="developerSection" id="developer">
      <div className="shell developerGrid">
        <div>
          <span className="kicker">06 / DEVELOPER ADAPTER</span>
          <h2>Keep your stack.<br/><em>Expose the loop.</em></h2>
          <p>A conforming adapter maps model tool calls into the robot’s existing API, passes every proposal through the safety kernel, and emits signed HILO events. The benchmark does not require a particular cloud, SDK, middleware, or robot vendor.</p>
          <div className="adapterContract"><span>REQUIRED BOUNDARY</span><code>observe() · propose() · authorize() · execute() · interrupt() · emit()</code></div>
        </div>
        <div className="rtCodeCard">
          <header><span>REFERENCE ADAPTER / TYPESCRIPT</span><i>GPT-Realtime-2.1</i></header>
          <pre><code><span className="codeMuted">{"// Model choice is declared metadata—not protocol identity."}</span>{`\n`}<span className="codeLime">const</span> session = createHiloSession({`{`}{`\n`}  model: <span className="codeString">&quot;gpt-realtime-2.1&quot;</span>,{`\n`}  robot: universalRobotBridge,{`\n`}  authorize: safetyKernel.authorize,{`\n`}  emit: signedEventSink,{`\n`}{`}`});{`\n\n`}session.observe({`{`}{`\n`}  type: <span className="codeString">&quot;IMAGE_EVENT&quot;</span>,{`\n`}  frameId, capturedAt, jpeg{`\n`}{`}`});{`\n\n`}<span className="codeLime">await</span> session.handleAudio(audioChunk);</code></pre>
          <footer><span>MODEL → TYPED PROPOSAL → SAFETY → ROBOT</span><span>SIGNED EVENTS</span></footer>
        </div>
      </div>
    </section>

    <section className="hiloVerifier" id="verifier"><div className="shell"><div className="rtSectionHead"><div><span className="kicker">07 / LOCAL VERIFIER</span><h2>Paste the evidence.<br/><em>Recompute the claim.</em></h2></div><p>The executable profile checks event order, action causality, intervention burden, first-intervention survival, R7 latency tails, independent safety authority, stop tests, tier exposure, and evidence bindings.</p></div><RealtimeLab/></div></section>

    <section className="rtFinal">
      <div className="shell"><span>HILO REALTIME / DRAFT 0.1</span><h2>Judge intelligence by<br/><em>the burden it removes.</em></h2><p>Publish task outcomes, human effort, intervention survival, latency tails, safety decisions, model and adapter versions, image-event policy, and the complete long-horizon exposure ledger.</p><div><a className="primary" href="/wanted-10k/assistance-integrity">Open assistance integrity <span>→</span></a><a className="secondary" href="/wanted-10k/safety">Open safety profile</a></div></div>
    </section>

    <footer className="wantedFooter"><div className="shell"><div className="brand"><span className="brandMark">EA</span><span>EMBODIED <b>ARENA</b> / HILO REALTIME</span></div><p>A vendor-neutral interaction profile for WANTED-10K.</p><a href="#top">BACK TO TOP ↑</a></div></footer>
  </main>;
}

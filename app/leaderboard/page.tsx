"use client";

import { useMemo, useState } from "react";
import { SiteNav } from "../components/SiteNav";
import { track } from "../components/AnalyticsHeartbeat";

type Metric = "overall" | "manipulation" | "navigation" | "reasoning";

const sections = [
  ["top-robot-models", "Top robot models"],
  ["leaderboard-table", "Leaderboard"],
  ["models-by-task", "Top models by task"],
  ["mission-cost", "Cost per mission"],
  ["platform-coverage", "Platform coverage"],
  ["benchmarks", "Benchmarks"],
  ["performance", "Fastest systems"],
  ["embodiments", "Embodiments"],
  ["edge-hardware", "Edge hardware"],
  ["context-memory", "Context & memory"],
  ["robot-actions", "Robot actions"],
  ["vision-streams", "Vision streams"],
  ["deployments", "Top deployments"],
] as const;

const models = [
  { name: "π0.5", org: "Physical Intelligence", overall: 78.4, manipulation: 86.2, navigation: 65.4, reasoning: 82.5, reality: "REAL", open: true, kind: "GENERALIST VLA", task: "Mobile manipulation" },
  { name: "GR00T N1.6", org: "NVIDIA", overall: 75.9, manipulation: 80.4, navigation: 71.5, reasoning: 77.1, reality: "REAL", open: true, kind: "HUMANOID VLA", task: "Humanoid loco-manipulation" },
  { name: "OpenVLA-OFT", org: "Stanford / TRI", overall: 72.6, manipulation: 79.3, navigation: 67.0, reasoning: 74.8, reality: "REAL", open: true, kind: "OPEN VLA", task: "Manipulation" },
  { name: "Helix 02", org: "Figure AI", overall: 69.8, manipulation: 76.6, navigation: 70.2, reasoning: 68.5, reality: "REAL", open: false, kind: "HUMANOID POLICY", task: "Humanoid manipulation" },
  { name: "RoboBrain 2.0", org: "BAAI", overall: 67.2, manipulation: 62.1, navigation: 66.8, reasoning: 81.2, reality: "SIM", open: true, kind: "EMBODIED VLM", task: "Embodied reasoning" },
  { name: "SmolVLA", org: "Hugging Face", overall: 58.7, manipulation: 65.0, navigation: 52.8, reasoning: 63.1, reality: "REAL", open: true, kind: "COMPACT VLA", task: "Local manipulation" },
];

const taskLeaders = [
  ["MANIPULATION", "π0.5", "86.2", "Seed normalized index"],
  ["HUMANOID", "GR00T N1.6", "80.4", "VLA + whole-body policy"],
  ["EMBODIED REASONING", "RoboBrain 2.0", "81.2", "Simulation evidence"],
  ["OPEN / LOCAL", "OpenVLA-OFT", "79.3", "Open weights"],
];

const edgeHardware = [
  { name: "Jetson AGX Thor", compute: "Up to 2,070 FP4 TFLOPS", memory: "Up to 128 GB", power: "40–130 W", fit: "Humanoids + physical AI" },
  { name: "Jetson AGX Orin", compute: "Up to 275 TOPS", memory: "32 / 64 GB", power: "Configurable", fit: "Multi-sensor autonomous machines" },
  { name: "Jetson Orin NX", compute: "Up to 157 TOPS", memory: "8 / 16 GB", power: "Compact", fit: "Mobile robots + manipulators" },
  { name: "Jetson Orin Nano", compute: "Up to 67 TOPS", memory: "4 / 8 GB", power: "7–25 W", fit: "Entry edge AI + prototypes" },
];

const benchmarkCards = [
  ["HILO REALTIME", "Human burden, MTHI, interruption, latency, and safety-kernel evidence.", "/wanted-10k/realtime"],
  ["WANTED-10K", "Long-horizon resident hours, intervention burden, reliability, and evidence integrity.", "/wanted-10k"],
  ["LIBERO / CALVIN", "Short-horizon manipulation task suites. Useful, but not field autonomy certificates.", "/atlas"],
  ["REAL OPERATIONS", "Throughput, recovery, service continuity, and operator burden under deployment load.", "/wanted-10k/service-continuity"],
];

const actionEvents = ["observe", "plan", "navigate", "move", "grasp", "inspect", "ask_human", "yield", "recover", "stop"];

function AnchorTitle({ id, eyebrow, title, copy }: { id: string; eyebrow: string; title: string; copy: string }) {
  return <header className="rankingSectionHead" id={id}><span className="kicker">{eyebrow}</span><h2>{title}</h2><p>{copy}</p></header>;
}

export default function Leaderboard() {
  const [metric, setMetric] = useState<Metric>("overall");
  const [query, setQuery] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const rows = useMemo(() => models
    .filter(model => (!openOnly || model.open) && `${model.name} ${model.org} ${model.kind} ${model.task}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b[metric] - a[metric]), [metric, query, openOnly]);

  return <main className="rankingsPage">
    <SiteNav />
    <section className="rankingsHero shell">
      <div><span className="kicker">ROBOT RANKINGS / EVIDENCE MENU</span><h1>Models meet<br/><em>machines.</em></h1></div>
      <div className="rankingsHeroCopy"><p>Explore robot intelligence, embodiments, edge compute, benchmarks, realtime behavior, and long-horizon deployment evidence in one index.</p><span><b>Important:</b> Jetson is an edge-compute platform—not a robot model. Embodied Arena keeps model, runtime, hardware, and embodiment separate.</span></div>
    </section>

    <div className="rankingsShell shell">
      <aside className="rankingRail"><span>EXPLORE</span><nav aria-label="Rankings page sections">{sections.map(([href, label]) => <a href={`#${href}`} key={href}>{label}<i>↘</i></a>)}</nav></aside>
      <div className="rankingsContent">
        <section className="rankingSection topRobotSection">
          <AnchorTitle id="top-robot-models" eyebrow="01 / TOP ROBOT MODELS" title="Intelligence with an embodiment." copy="A model score is meaningful only when the robot body, sensors, compute, task distribution, and intervention policy travel with it." />
          <div className="topRobotGrid">{models.slice(0, 3).map((model, index) => <article key={model.name}><span>0{index + 1}</span><small>{model.kind}</small><h3>{model.name}</h3><p>{model.org}</p><div><b>{model.overall.toFixed(1)}</b><em>ILLUSTRATIVE INDEX</em></div></article>)}</div>
        </section>

        <section className="rankingSection">
          <AnchorTitle id="leaderboard-table" eyebrow="02 / LEADERBOARD" title="Rank with context." copy="Filter the public-beta seed set. Scores remain illustrative until submissions share a frozen protocol and comparable evidence." />
          <div className="leaderTools"><div>{(["overall", "manipulation", "navigation", "reasoning"] as const).map(item => <button key={item} className={metric === item ? "active" : ""} onClick={() => { setMetric(item); track("leaderboard_filter", "/leaderboard", { metric: item }); }}>{item}</button>)}</div><label><span>⌕</span><input aria-label="Search robot models" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search models" /></label><label className="openCheck"><input type="checkbox" checked={openOnly} onChange={event => setOpenOnly(event.target.checked)} /> open only</label></div>
          <div className="simpleBoard"><header><span>#</span><span>MODEL</span><span>{metric.toUpperCase()}</span><span>EVIDENCE</span></header>{rows.map((model, index) => <article key={model.name}><b className={index === 0 ? "topRank" : ""}>{index + 1}</b><div><strong>{model.name}{model.open && <i>OPEN</i>}</strong><small>{model.org} · {model.kind}</small></div><div className="metricBar"><strong>{model[metric].toFixed(1)}</strong><i><span style={{ width: `${model[metric]}%` }} /></i></div><span className={model.reality === "REAL" ? "realTag" : "simTag"}>● {model.reality}</span></article>)}</div>
          <p className="betaNote">Illustrative public-beta data. Hardware, tasks, training data, sample sizes, and evaluation protocols differ; do not treat this table as a deployment claim.</p>
        </section>

        <section className="rankingSection"><AnchorTitle id="models-by-task" eyebrow="03 / TOP MODELS BY TASK" title="The winner changes with the work." copy="Compare within matched task families rather than collapsing every form of physical intelligence into one number." /><div className="taskLeaderGrid">{taskLeaders.map(([task, model, score, note]) => <article key={task}><span>{task}</span><h3>{model}</h3><div><b>{score}</b><small>{note}</small></div></article>)}</div></section>

        <section className="rankingSection evidencePending"><AnchorTitle id="mission-cost" eyebrow="04 / COST PER MISSION" title="Price the useful outcome." copy="Robot economics must include compute, energy, human attention, retries, maintenance, and downtime—not API cost alone." /><div className="missionFormula"><b>C<sub>mission</sub></b><span>=</span><div>compute + energy + operator time + recovery + maintenance</div></div><p>No comparable cost ranking is published yet. Submissions must disclose every term before this section ranks systems.</p></section>

        <section className="rankingSection"><AnchorTitle id="platform-coverage" eyebrow="05 / PLATFORM COVERAGE" title="Four layers, disclosed separately." copy="Embodied Arena never credits a compute module with the capabilities of the policy running on it—or a model with the safety properties of the robot around it." /><div className="layerMap"><article><span>MODEL</span><b>GR00T · π0.5 · OpenVLA</b><p>Perception, reasoning, and action policy.</p></article><article className="active"><span>EDGE COMPUTE</span><b>Jetson Thor · Orin</b><p>On-robot inference and sensor processing.</p></article><article><span>RUNTIME</span><b>JetPack · ROS · Isaac</b><p>Drivers, acceleration, middleware, and tools.</p></article><article><span>EMBODIMENT</span><b>Humanoid · arm · AMR</b><p>Body, actuators, sensors, and safety envelope.</p></article></div></section>

        <section className="rankingSection"><AnchorTitle id="benchmarks" eyebrow="06 / BENCHMARKS" title="Choose the claim before the test." copy="Short task success, realtime interaction, and long-horizon autonomy answer different questions. Use the smallest protocol that supports the intended claim." /><div className="benchmarkMenu">{benchmarkCards.map(([title, copy, href], index) => <a href={href} key={title}><span>0{index + 1}</span><div><b>{title}</b><p>{copy}</p></div><i>↗</i></a>)}</div></section>

        <section className="rankingSection evidencePending darkPending"><AnchorTitle id="performance" eyebrow="07 / FASTEST SYSTEMS" title="Latency is a chain." copy="Measure camera exposure to perception, reasoning, safety decision, command dispatch, and physical response as separate p50, p95, and p99 stages." /><div className="latencyChain">{["IMAGE EVENT", "PERCEPTION", "POLICY", "SAFETY KERNEL", "ACTUATION"].map((item, index) => <span key={item}><b>0{index + 1}</b>{item}</span>)}</div><p>No cross-platform speed winner is declared without matched power mode, sensor rate, quantization, batch size, and robot workload.</p></section>

        <section className="rankingSection"><AnchorTitle id="embodiments" eyebrow="08 / EMBODIMENTS" title="Bodies are part of the benchmark." copy="A policy transfer across arms, mobile manipulators, humanoids, quadrupeds, and autonomous mobile robots is evidence—not an implementation detail." /><div className="embodimentStrip">{["HUMANOID", "DUAL ARM", "MOBILE MANIPULATOR", "ROBOT ARM", "QUADRUPED", "AMR"].map((item, index) => <span key={item}><i>{String(index + 1).padStart(2, "0")}</i>{item}</span>)}</div></section>

        <section className="rankingSection edgeSection"><AnchorTitle id="edge-hardware" eyebrow="09 / EDGE HARDWARE" title="Jetson, correctly placed." copy="NVIDIA Jetson modules provide the on-robot compute layer. Rank them on matched robotics workloads, sustained latency, power, thermals, memory headroom, and sensor concurrency." /><div className="jetsonGrid">{edgeHardware.map((item, index) => <article key={item.name} className={index === 0 ? "featured" : ""}><header><span>{index === 0 ? "PHYSICAL AI" : "EDGE AI"}</span><i>COMPUTE PLATFORM</i></header><h3>{item.name}</h3><b>{item.compute}</b><dl><div><dt>MEMORY</dt><dd>{item.memory}</dd></div><div><dt>POWER</dt><dd>{item.power}</dd></div><div><dt>BEST FIT</dt><dd>{item.fit}</dd></div></dl></article>)}</div><a className="sourceLine" href="https://developer.nvidia.com/embedded/jetson-modules" target="_blank" rel="noreferrer">Official NVIDIA Jetson module lineup and specifications ↗</a></section>

        <section className="rankingSection"><AnchorTitle id="context-memory" eyebrow="10 / CONTEXT & MEMORY" title="Robots need more than tokens." copy="Disclose the operational memory that actually affects behavior: observation window, map lifetime, session continuity, skill state, and human instruction history." /><div className="memoryGrid">{[["OBSERVATION", "Frames + proprioception"], ["EPISODIC", "Events + recoveries"], ["SPATIAL", "Maps + object state"], ["HUMAN", "Intent + interventions"]].map(([label, value]) => <article key={label}><span>{label}</span><b>{value}</b><i>DECLARED WINDOW</i></article>)}</div></section>

        <section className="rankingSection"><AnchorTitle id="robot-actions" eyebrow="11 / ROBOT ACTIONS" title="Tool calls become physical events." copy="Every proposed action should bind to a safety decision, robot command, result, and recovery path in the HILO event chain." /><div className="actionCloud">{actionEvents.map((event, index) => <code key={event}><span>{String(index + 1).padStart(2, "0")}</span>{event}()</code>)}</div></section>

        <section className="rankingSection"><AnchorTitle id="vision-streams" eyebrow="12 / VISION STREAMS" title="Cameras become image events." copy="Realtime models consume selected, timestamped image events—not an undocumented firehose. Preserve capture time, selection policy, redaction, inference binding, and dropped-frame evidence." /><div className="visionPipeline">{["CAMERA", "LOCAL REDACTION", "FRAME SELECTOR", "IMAGE EVENT", "MODEL", "ACTION"].map((item, index) => <span key={item}><b>{String(index + 1).padStart(2, "0")}</b>{item}{index < 5 && <i>→</i>}</span>)}</div></section>

        <section className="rankingSection deploymentSection"><AnchorTitle id="deployments" eyebrow="13 / TOP DEPLOYMENTS" title="The long horizon wins." copy="Promote systems by independently verified resident exposure—not polished demos or isolated successful episodes." /><div className="deploymentTiers">{[["T0", "10 H", "INTEGRATION"], ["T1", "100 H", "PILOT"], ["T2", "1,000 H", "FIELD"], ["T3", "10,000 H", "ENDURANCE"]].map(([tier, hours, label]) => <article key={tier}><span>{tier}</span><b>{hours}</b><small>{label}</small></article>)}</div><p className="rankingAttribution">Information architecture adapted from the <a href="https://openrouter.ai/rankings#benchmarks" target="_blank" rel="noreferrer">OpenRouter Rankings</a> section menu. OpenRouter rankings data is not reproduced. Reference data is licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>; robotics labels, taxonomy, and evidence rules are Embodied Arena adaptations.</p></section>
      </div>
    </div>
  </main>;
}

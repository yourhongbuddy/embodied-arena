"use client";

import { ChangeEvent, DragEvent, FormEvent, useMemo, useRef, useState } from "react";

type ArenaModel = {
  id: string; name: string; org: string; badge: string; score: number; delta: number;
  manipulation: number; locomotion: number; navigation: number; reasoning: number;
  reliability: string; throughput: string; embodiment: string; open: boolean; real: boolean; color: string;
};

type ScanReport = {
  fileName: string; robotName: string; score: number; links: number; joints: number; dof: number;
  fixed: number; continuous: number; meshes: number; collisions: number; inertials: number;
  totalMass: number; rootLinks: string[]; issues: { level: "pass" | "warn" | "fail"; text: string }[];
  recommendations: string[];
};

const models: ArenaModel[] = [
  { id:"pi05", name:"π0.5", org:"Physical Intelligence", badge:"π", score:78.4, delta:2.8, manipulation:86.2, locomotion:42.0, navigation:65.4, reasoning:82.5, reliability:"4.0 min", throughput:"65 UPH", embodiment:"Multi", open:true, real:true, color:"#d6ff58" },
  { id:"groot", name:"GR00T N1.6", org:"NVIDIA", badge:"G", score:75.9, delta:4.1, manipulation:80.4, locomotion:69.7, navigation:71.5, reasoning:77.1, reliability:"3.5 min", throughput:"60 UPH", embodiment:"Humanoid", open:true, real:true, color:"#c5e66e" },
  { id:"openvla", name:"OpenVLA-OFT", org:"Stanford / TRI", badge:"OV", score:72.6, delta:1.3, manipulation:79.3, locomotion:38.2, navigation:67.0, reasoning:74.8, reliability:"3.1 min", throughput:"54 UPH", embodiment:"Arm", open:true, real:true, color:"#c8cfc3" },
  { id:"helix", name:"Helix 02", org:"Figure AI", badge:"H", score:69.8, delta:6.7, manipulation:76.6, locomotion:73.8, navigation:70.2, reasoning:68.5, reliability:"Private", throughput:"—", embodiment:"Humanoid", open:false, real:true, color:"#f0c5a4" },
  { id:"robobrain", name:"RoboBrain 2.0", org:"BAAI", badge:"RB", score:67.2, delta:0.9, manipulation:62.1, locomotion:48.3, navigation:66.8, reasoning:81.2, reliability:"Sim only", throughput:"—", embodiment:"Multi", open:true, real:false, color:"#b8c7dd" },
  { id:"smolvla", name:"SmolVLA", org:"Hugging Face", badge:"SV", score:58.7, delta:3.4, manipulation:65.0, locomotion:31.4, navigation:52.8, reasoning:63.1, reliability:"1.2 min", throughput:"18 UPH", embodiment:"Arm", open:true, real:true, color:"#ffd36e" },
];

const videoCards = [
  { category:"Breakdowns", eyebrow:"FIELD NOTES · 12:42", title:"Why 95% task success can still fail on the factory floor", creator:"The Robot Report", views:"42K", tone:"videoLime", mark:"95→5", href:"https://www.youtube.com/results?search_query=robot+benchmark+real+world+reliability" },
  { category:"Builders", eyebrow:"BUILDER LOG · 18:06", title:"π0.5 vs GR00T: what the leaderboard leaves out", creator:"AI in Motion", views:"128K", tone:"videoDark", mark:"π : G", href:"https://www.youtube.com/results?search_query=pi0.5+GR00T+robotics" },
  { category:"Research", eyebrow:"PAPER CLUB · 09:18", title:"The five abilities every embodied brain needs", creator:"RoboPapers", views:"31K", tone:"videoClay", mark:"01—05", href:"https://www.youtube.com/results?search_query=RoboBench+embodied+AI" },
  { category:"Builders", eyebrow:"HARDWARE · 15:24", title:"Dexterous manipulation: tactile data changes the game", creator:"Robotics Today", views:"76K", tone:"videoBlue", mark:"TACT", href:"https://www.youtube.com/results?search_query=RoboMIND+tactile+robot+benchmark" },
];

const sources = [
  { name:"PhAIL", label:"Real hardware throughput + MTBF", href:"https://phail.ai" },
  { name:"RoboBench", label:"Embodied cognition across five dimensions", href:"https://arxiv.org/html/2510.17801v1" },
  { name:"Open X-Embodiment", label:"Cross-embodiment dataset index", href:"https://robotics-transformer-x.github.io" },
  { name:"DROID", label:"Real-world robot manipulation data", href:"https://droid-dataset.github.io" },
  { name:"LIBERO", label:"Lifelong robot learning suites", href:"https://libero-project.github.io/main.html" },
  { name:"CALVIN", label:"Long-horizon language-conditioned tasks", href:"http://calvin.cs.uni-freiburg.de" },
];

const sampleUrdf = `<?xml version="1.0"?>
<robot name="arena_demo_arm">
  <link name="base"><inertial><mass value="12.5"/><inertia ixx="1" ixy="0" ixz="0" iyy="1" iyz="0" izz="1"/></inertial><visual><geometry><box size=".4 .4 .2"/></geometry></visual><collision><geometry><box size=".4 .4 .2"/></geometry></collision></link>
  <link name="shoulder"><inertial><mass value="4.2"/><inertia ixx=".2" ixy="0" ixz="0" iyy=".2" iyz="0" izz=".2"/></inertial><visual><geometry><cylinder length=".5" radius=".06"/></geometry></visual><collision><geometry><cylinder length=".5" radius=".06"/></geometry></collision></link>
  <link name="wrist"><visual><geometry><mesh filename="package://arena/meshes/wrist.stl"/></geometry></visual><collision><geometry><sphere radius=".08"/></geometry></collision></link>
  <link name="gripper"><visual><geometry><mesh filename="package://arena/meshes/gripper.stl"/></geometry></visual></link>
  <joint name="shoulder_pan" type="revolute"><parent link="base"/><child link="shoulder"/><limit lower="-3.14" upper="3.14" effort="120" velocity="2.2"/></joint>
  <joint name="wrist_roll" type="continuous"><parent link="shoulder"/><child link="wrist"/><limit effort="32" velocity="3.1"/></joint>
  <joint name="gripper_fixed" type="fixed"><parent link="wrist"/><child link="gripper"/></joint>
</robot>`;

export default function Home() {
  const [category, setCategory] = useState("Overall");
  const [query, setQuery] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [scan, setScan] = useState<ScanReport | null>(null);
  const [scanError, setScanError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [videoFilter, setVideoFilter] = useState("All");
  const [copied, setCopied] = useState("");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const metricKey = category === "Embodied reasoning" ? "reasoning" : category.toLowerCase();
  const visibleModels = useMemo(() => models
    .filter(m => !openOnly || m.open)
    .filter(m => `${m.name} ${m.org} ${m.embodiment}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a,b) => (category === "Overall" ? b.score-a.score : (b[metricKey as keyof ArenaModel] as number)-(a[metricKey as keyof ArenaModel] as number))), [category, query, openOnly, metricKey]);

  const copyText = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(label); window.setTimeout(() => setCopied(""), 1800); }
    catch { setCopied("Copy failed"); }
  };

  const parseUrdf = (text: string, fileName: string) => {
    setScanError(""); setScanning(true); setScan(null);
    window.setTimeout(() => {
      const doc = new DOMParser().parseFromString(text, "application/xml");
      if (doc.querySelector("parsererror") || !doc.querySelector("robot")) { setScanError("This doesn’t look like a valid URDF. Check the XML and try again."); setScanning(false); return; }
      const robot = doc.querySelector("robot")!;
      const links = Array.from(doc.querySelectorAll("link"));
      const joints = Array.from(doc.querySelectorAll("joint"));
      const linkNames = links.map(l => l.getAttribute("name") || "unnamed");
      const childNames = joints.map(j => j.querySelector("child")?.getAttribute("link")).filter(Boolean) as string[];
      const missingParents = joints.filter(j => { const n=j.querySelector("parent")?.getAttribute("link"); return n && !linkNames.includes(n); }).length;
      const missingChildren = joints.filter(j => { const n=j.querySelector("child")?.getAttribute("link"); return n && !linkNames.includes(n); }).length;
      const collisions = doc.querySelectorAll("collision").length;
      const inertials = doc.querySelectorAll("inertial").length;
      const visuals = doc.querySelectorAll("visual").length;
      const meshes = doc.querySelectorAll("mesh").length;
      const fixed = joints.filter(j => j.getAttribute("type") === "fixed").length;
      const continuous = joints.filter(j => j.getAttribute("type") === "continuous").length;
      const dof = joints.filter(j => !["fixed", "floating"].includes(j.getAttribute("type") || "")).length;
      const totalMass = Array.from(doc.querySelectorAll("mass")).reduce((sum, n) => sum + Number(n.getAttribute("value") || 0), 0);
      const duplicateLinks = linkNames.filter((n,i) => linkNames.indexOf(n) !== i);
      const roots = linkNames.filter(n => !childNames.includes(n));
      const issues: ScanReport["issues"] = [];
      issues.push({ level: links.length > 0 ? "pass" : "fail", text: links.length ? `${links.length} uniquely addressable links found` : "No links found" });
      issues.push({ level: roots.length === 1 ? "pass" : "warn", text: roots.length === 1 ? `Single root link: ${roots[0]}` : `${roots.length} root links detected; one is recommended` });
      if (duplicateLinks.length) issues.push({ level:"fail", text:`Duplicate link names: ${[...new Set(duplicateLinks)].join(", ")}` });
      else issues.push({ level:"pass", text:"No duplicate link names" });
      issues.push({ level: missingParents+missingChildren ? "fail" : "pass", text: missingParents+missingChildren ? `${missingParents+missingChildren} broken joint reference(s)` : "All joint references resolve" });
      issues.push({ level: inertials === links.length ? "pass" : "warn", text: inertials === links.length ? "Every link has inertial data" : `${links.length-inertials} link(s) missing inertial data` });
      issues.push({ level: collisions >= Math.max(1,links.length-1) ? "pass" : "warn", text:`Collision geometry on ${collisions}/${links.length} links` });
      issues.push({ level: visuals ? "pass" : "warn", text: visuals ? `${visuals} visual geometries declared` : "No visual geometry declared" });
      let score = 100;
      score -= duplicateLinks.length*15 + (missingParents+missingChildren)*18 + Math.max(0,links.length-inertials)*4 + Math.max(0,links.length-collisions)*3;
      if (roots.length !== 1) score -= 10;
      if (!visuals) score -= 8;
      score = Math.max(12, Math.min(100, score));
      const lower = `${robot.getAttribute("name")} ${linkNames.join(" ")} ${joints.map(j=>j.getAttribute("name")).join(" ")}`.toLowerCase();
      const recs = [dof >= 5 ? "LIBERO · manipulation" : "RoboBench · embodied reasoning"];
      if (/wheel|base|mobile|caster/.test(lower)) recs.push("OpenNav · navigation");
      if (/grip|finger|hand/.test(lower)) recs.push("RoboMIND · dexterity");
      if (dof >= 8) recs.push("CALVIN · long-horizon control");
      recs.push("PhAIL-style reliability run");
      setScan({ fileName, robotName:robot.getAttribute("name") || "Unnamed robot", score, links:links.length, joints:joints.length, dof, fixed, continuous, meshes, collisions, inertials, totalMass, rootLinks:roots, issues, recommendations:[...new Set(recs)] });
      setScanning(false);
    }, 720);
  };

  const processFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 25*1024*1024) { setScanError("That file is over 25 MB. Please upload a smaller URDF."); return; }
    if (!/\.(urdf|xml)$/i.test(file.name)) { setScanError("Please upload a .urdf or .xml file."); return; }
    parseUrdf(await file.text(), file.name);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); };
  const toggleCompare = (id:string) => setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : s.length < 3 ? [...s,id] : s);
  const downloadReport = () => {
    if (!scan) return;
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([JSON.stringify(scan,null,2)],{type:"application/json"})); a.download=`${scan.robotName.replace(/\W+/g,"-").toLowerCase()}-arena-report.json`; a.click(); URL.revokeObjectURL(a.href);
  };
  const submitResult = (e:FormEvent) => { e.preventDefault(); setSubmitted(true); };

  return (
    <main>
      <nav className="nav shell" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="Embodied Arena home"><span className="brandMark">EA</span><span>EMBODIED <b>ARENA</b></span></a>
        <div className="navLinks"><a href="#leaderboard">Leaderboard</a><a href="#scan">URDF Scan</a><a href="#watch">Watch</a><a href="#benchmarks">Benchmarks</a></div>
        <button className="submitBtn" onClick={()=>{setSubmitted(false);setSubmitOpen(true)}}>Submit result <span>↗</span></button>
      </nav>

      <section className="hero shell" id="top">
        <div className="eyebrow"><span className="liveDot" /> LIVE INDEX · UPDATED AUG 25, 2026</div>
        <h1>The open arena for<br /><em>embodied intelligence.</em></h1>
        <p className="heroCopy">See which robot models actually work. Compare real-world performance, scan your robot, and share evidence—not demos.</p>
        <div className="heroActions"><a className="primary" href="#leaderboard">Explore leaderboard <span>↓</span></a><a className="secondary" href="#scan">Analyze a URDF</a></div>
        <div className="heroStats"><div><strong>84</strong><span>models tracked</span></div><div><strong>2.1M</strong><span>episodes indexed</span></div><div><strong>31</strong><span>benchmark suites</span></div><div><strong>67%</strong><span>open weights</span></div></div>
        <div className="orbit" aria-hidden="true"><div className="robotGlyph"><span /><i /><b /><em /></div><span className="orbitLabel one">REALITY GAP</span><span className="orbitLabel two">MTBF</span><span className="orbitLabel three">COST / RUN</span></div>
      </section>

      <div className="signalBar"><div className="signalTrack"><span>REAL HARDWARE</span><b>×</b><span>SIMULATION</span><b>×</b><span>EMBODIED REASONING</span><b>×</b><span>RELIABILITY</span><b>×</b><span>EFFICIENCY</span><b>×</b><span>OPEN EVIDENCE</span></div></div>

      <section className="boardSection shell" id="leaderboard">
        <div className="sectionHead"><div><span className="kicker">GLOBAL RANKINGS / PUBLIC BETA</span><h2>Robot AI leaderboard</h2></div><p>A normalized view across reported public results. Filter the signal, inspect the evidence, and never confuse a score with deployment readiness.</p></div>
        <div className="boardCard">
          <div className="boardToolbar">
            <div className="tabs" role="tablist">{["Overall","Manipulation","Locomotion","Navigation","Embodied reasoning"].map(x=><button key={x} className={category===x?"active":""} onClick={()=>setCategory(x)}>{x}</button>)}</div>
            <div className="boardControls"><label className="search"><span>⌕</span><input aria-label="Search models" placeholder="Search models" value={query} onChange={e=>setQuery(e.target.value)} /></label><label className="toggle"><input type="checkbox" checked={openOnly} onChange={e=>setOpenOnly(e.target.checked)} /><i /> Open</label></div>
          </div>
          <div className="tableHeader"><span>#</span><span>MODEL</span><span>{category.toUpperCase()} SCORE</span><span>REALITY</span><span>7D</span><span /></div>
          {visibleModels.map((item,index) => {
            const metric = category === "Overall" ? item.score : item[metricKey as keyof ArenaModel] as number;
            return <div className="modelRow" key={item.id}>
              <span className={`rank r${index+1}`}>{index+1}</span>
              <span className="model"><i style={{background:item.color}}>{item.badge}</i><span><b>{item.name} {item.open&&<u>OPEN</u>}</b><small>{item.org} · {item.embodiment}</small></span></span>
              <span className="score"><b>{metric.toFixed(1)}</b><i style={{width:`${metric}%`}} /></span>
              <span className={`reality ${item.real?"verified":"sim"}`}><i />{item.real?"REAL":"SIM"}</span>
              <span className="delta">+{item.delta}</span>
              <button className={`compare ${selected.includes(item.id)?"selected":""}`} onClick={()=>toggleCompare(item.id)} aria-label={`Compare ${item.name}`}>{selected.includes(item.id)?"✓":"+"}</button>
            </div>})}
          {!visibleModels.length&&<div className="emptyState">No models match that filter.</div>}
          <div className="boardNote"><span>ⓘ</span><p><b>Read scores with context.</b> This beta index normalizes heterogeneous public reports; hardware, task, data, and evaluation protocols differ. Raw source evidence remains the authority.</p><a href="#methodology">Methodology →</a></div>
        </div>
      </section>

      {selected.length>0&&<div className="compareTray"><span><b>{selected.length}</b> model{selected.length>1?"s":""} selected</span><div>{selected.map(id=><i key={id}>{models.find(m=>m.id===id)?.name}</i>)}</div><button onClick={()=>copyText(`Embodied Arena comparison: ${selected.map(id=>models.find(m=>m.id===id)?.name).join(" vs ")}`,"Comparison copied")}>{copied==="Comparison copied"?"Copied ✓":"Copy comparison"}</button><button className="trayClose" onClick={()=>setSelected([])}>×</button></div>}

      <section className="scanSection" id="scan"><div className="shell">
        <div className="scanIntro"><div><span className="kicker">ROBOT INTAKE / LOCAL ANALYSIS</span><h2>Drop in a URDF.<br /><em>Get the full picture.</em></h2></div><div><p>Like a diagnostic scan for your robot. We inspect topology, joints, inertials, collision geometry, and benchmark fit—entirely in your browser.</p><span className="privacy"><b>●</b> Your file never leaves this device</span></div></div>
        <div className="scannerGrid">
          <div className={`dropzone ${dragging?"dragging":""}`} onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={handleDrop} onClick={()=>fileInput.current?.click()} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter")fileInput.current?.click()}}>
            <input ref={fileInput} type="file" accept=".urdf,.xml" onChange={(e:ChangeEvent<HTMLInputElement>)=>processFile(e.target.files?.[0])} />
            <div className="scanCorners"/><span className="uploadIcon">↑</span><b>{dragging?"Release to analyze":"Drop your robot.urdf here"}</b><small>or click to browse · URDF/XML · up to 25 MB</small><span className="or">OR</span><button onClick={e=>{e.stopPropagation();parseUrdf(sampleUrdf,"arena-demo.urdf")}}>Run the example robot</button>
          </div>
          <div className={`scanPanel ${scan?"hasReport":""}`}>
            {!scan&&!scanning&&<><div className="panelTop"><span>ANALYSIS MODULES</span><i>STANDBY</i></div><div className="moduleList">{[["01","Structure & topology"],["02","Joint safety & limits"],["03","Mass & inertia coverage"],["04","Collision readiness"],["05","Benchmark matching"]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><i>waiting</i></div>)}</div></>}
            {scanning&&<div className="scanning"><div className="radar"><i/></div><b>Parsing robot graph…</b><small>Running five local analysis modules</small></div>}
            {scan&&<><div className="reportHead"><div><small>SCAN COMPLETE · {scan.fileName}</small><h3>{scan.robotName}</h3></div><div className={`grade ${scan.score>=85?"gradeA":scan.score>=65?"gradeB":"gradeC"}`}><strong>{scan.score}</strong><span>/100<br/>READY</span></div></div>
              <div className="reportStats"><div><b>{scan.links}</b><span>links</span></div><div><b>{scan.joints}</b><span>joints</span></div><div><b>{scan.dof}</b><span>DOF</span></div><div><b>{scan.totalMass.toFixed(1)}</b><span>kg declared</span></div></div>
              <div className="issueList">{scan.issues.map((x,i)=><div key={i}><i className={x.level}>{x.level==="pass"?"✓":x.level==="warn"?"!":"×"}</i><span>{x.text}</span></div>)}</div>
              <div className="recList"><small>RECOMMENDED TESTS</small>{scan.recommendations.map(x=><span key={x}>{x}<b>→</b></span>)}</div>
              <div className="reportActions"><button onClick={downloadReport}>Download JSON</button><button onClick={()=>copyText(`<a href="https://embodied-arena.example/scan" title="URDF benchmark readiness"><img src="https://embodied-arena.example/badge/${scan.score}.svg" alt="Embodied Arena readiness: ${scan.score}/100"></a>`,"Badge copied")}>{copied==="Badge copied"?"Badge copied ✓":"Copy score badge"}</button></div>
            </>}
          </div>
        </div>
        {scanError&&<div className="scanError">⚠ {scanError}</div>}
      </div></section>

      <section className="watchSection shell" id="watch">
        <div className="sectionHead watchHead"><div><span className="kicker">WATCH / LEARN / BUILD</span><h2>Robot intelligence,<br />without the highlight reel.</h2></div><div><p>Evidence-led breakdowns, builder logs, and research explainers selected for people who want to understand what happened between the cuts.</p><div className="videoFilters">{["All","Builders","Breakdowns","Research"].map(x=><button className={videoFilter===x?"active":""} onClick={()=>setVideoFilter(x)} key={x}>{x}</button>)}</div></div></div>
        <div className="videoGrid">{videoCards.filter(v=>videoFilter==="All"||v.category===videoFilter).map((v,i)=><a href={v.href} target="_blank" rel="noreferrer" className={`videoCard ${v.tone}`} key={v.title}><div className="videoArt"><span>{v.mark}</span><i>▶</i><b>0{i+1}</b></div><div className="videoMeta"><small>{v.eyebrow}</small><h3>{v.title}</h3><p>{v.creator}<span>{v.views} views</span></p></div></a>)}</div>
        <a className="submitVideo" href="mailto:curation@embodiedarena.org?subject=Video%20recommendation">Recommend a video <span>We credit and link every creator ↗</span></a>
      </section>

      <section className="benchmarkSection" id="benchmarks"><div className="shell">
        <div className="sectionHead light"><div><span className="kicker">BENCHMARK ATLAS</span><h2>One index.<br /><em>Many ways to fail.</em></h2></div><p>No single score explains a robot. The atlas connects task success to throughput, reliability, reasoning, timing, and the reality gap.</p></div>
        <div className="dimensions">
          {[{n:"01",t:"Task execution",d:"Success, completion and horizon length",m:"LIBERO · CALVIN"},{n:"02",t:"Real operations",d:"Units per hour and mean time between failures",m:"PhAIL"},{n:"03",t:"Embodied brain",d:"Intent, perception, planning, affordance, failure analysis",m:"RoboBench"},{n:"04",t:"Real-time behavior",d:"Control-loop deadlines under representative load",m:"OpenNav"},{n:"05",t:"Generalization",d:"Fresh objects, poses, scenes and embodiments",m:"OXE · DROID"}].map(x=><article key={x.n}><span>{x.n}</span><h3>{x.t}</h3><p>{x.d}</p><small>{x.m}</small></article>)}
        </div>
        <div className="sourceWall" id="methodology"><div><span className="kicker">OPEN EVIDENCE GRAPH</span><h3>Follow the score<br />back to the source.</h3><p>Every ranking should have a trail: protocol, hardware, episodes, uncertainty, raw runs, and known limitations.</p></div><div>{sources.map(s=><a href={s.href} target="_blank" rel="noreferrer" key={s.name}><span><b>{s.name}</b><small>{s.label}</small></span><i>↗</i></a>)}</div></div>
      </div></section>

      <section className="linkSection shell"><div className="linkCard"><div><span className="kicker">FOR CREATORS, LABS & ROBOT BUILDERS</span><h2>Make the evidence<br /><em>easy to link.</em></h2><p>Use a live score badge, embed a comparison, cite the methodology, or pitch a field test. Attribution is built in.</p></div><div className="linkTools">
        <button onClick={()=>copyText(`<a href="https://embodied-arena.example"><img src="https://embodied-arena.example/badge/top-model.svg" alt="Top Robot AI Model — Embodied Arena"></a>`,"Embed copied")}><span>‹/›</span><b>{copied==="Embed copied"?"Embed copied ✓":"Copy live badge embed"}</b><small>Always links to current evidence</small></button>
        <button onClick={()=>copyText("Embodied Arena — the open arena for embodied intelligence. Compare robot AI with real evidence: https://embodied-arena.example", "Citation copied")}><span>“ ”</span><b>{copied==="Citation copied"?"Citation copied ✓":"Copy creator citation"}</b><small>Ready for descriptions & show notes</small></button>
        <a href="https://twitter.com/intent/tweet?text=Robot%20AI%20needs%20evidence%2C%20not%20demos.%20Explore%20Embodied%20Arena" target="_blank" rel="noreferrer"><span>↗</span><b>Share the leaderboard</b><small>Start a sourced comparison</small></a>
      </div></div></section>

      <footer><div className="shell footerTop"><div><a className="brand footerBrand" href="#top"><span className="brandMark">EA</span><span>EMBODIED <b>ARENA</b></span></a><p>Independent infrastructure for measuring embodied intelligence in the open.</p></div><div><span>EXPLORE</span><a href="#leaderboard">Leaderboard</a><a href="#scan">URDF analyzer</a><a href="#watch">Videos</a><a href="#benchmarks">Benchmark atlas</a></div><div><span>CONTRIBUTE</span><button onClick={()=>setSubmitOpen(true)}>Submit a result</button><a href="mailto:curation@embodiedarena.org">Recommend a video</a><a href="mailto:partners@embodiedarena.org">Partner with us</a><a href="#methodology">Cite our sources</a></div><div><span>FOLLOW</span><a href="https://www.youtube.com/results?search_query=robotics+benchmarks" target="_blank" rel="noreferrer">YouTube ↗</a><a href="https://www.linkedin.com/search/results/content/?keywords=robotics%20benchmarks" target="_blank" rel="noreferrer">LinkedIn ↗</a><a href="https://www.reddit.com/r/robotics/" target="_blank" rel="noreferrer">Reddit ↗</a><a href="https://github.com/topics/robotics-benchmark" target="_blank" rel="noreferrer">GitHub ↗</a></div></div><div className="shell footerBottom"><span>© 2026 EMBODIED ARENA · PUBLIC BETA</span><span>Scores are informational, not safety certification.</span></div></footer>

      {submitOpen&&<div className="modalBack" onMouseDown={e=>{if(e.target===e.currentTarget)setSubmitOpen(false)}}><div className="modal"><button className="modalClose" onClick={()=>setSubmitOpen(false)}>×</button>{submitted?<div className="success"><span>✓</span><h3>Submission staged.</h3><p>Your evidence checklist is ready. In production, this connects to the public review queue; for this prototype, no data was sent.</p><button onClick={()=>setSubmitOpen(false)}>Back to the arena</button></div>:<form onSubmit={submitResult}><span className="kicker">PUBLIC REVIEW QUEUE</span><h3>Submit a benchmark result</h3><p>Bring the protocol, raw results, and failure cases. We’ll bring the scrutiny.</p><label>Model or robot name<input required placeholder="e.g. OpenVLA-OFT on Franka" /></label><label>Evidence URL<input required type="url" placeholder="https://… paper, repository, or run data" /></label><div className="formPair"><label>Evaluation setting<select><option>Real hardware</option><option>Simulation</option><option>Mixed</option></select></label><label>Primary metric<input required placeholder="e.g. 65 UPH" /></label></div><label>Contact email<input required type="email" placeholder="you@lab.org" /></label><button type="submit">Stage submission <span>→</span></button><small>Public beta · Nothing is uploaded from this demo.</small></form>}</div></div>}
    </main>
  );
}

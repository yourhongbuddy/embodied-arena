"use client";

import { useState, type ChangeEvent } from "react";
import { auditManifestTemplates } from "./manifest";
import { assessManifest, emptyReadiness, type ReadinessResult } from "./readiness";

export function AuditReadiness() {
  const [input,setInput] = useState("");
  const [result,setResult] = useState<ReadinessResult>(emptyReadiness);
  const [working,setWorking] = useState(false);
  const [exampleTarget,setExampleTarget] = useState<keyof typeof auditManifestTemplates>("WANTED_WILD");
  const run = async (value=input) => { setWorking(true);setResult(await assessManifest(value));setWorking(false); };
  const loadExample = async () => { const value=JSON.stringify(auditManifestTemplates[exampleTarget],null,2);setInput(value);await run(value); };
  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => { const file=event.target.files?.[0];if(!file)return;const value=await file.text();setInput(value);setResult(emptyReadiness); };
  const exportReport = () => { if(!result.projection)return;const payload={benchmark:"WANTED-10K",certification_profile_version:"0.2-C1",protocol_version:"0.2",generated_at:new Date().toISOString(),readiness_status:result.status,target:result.target,gates:result.gates,certification_projection:result.projection,note:"Local readiness result only. Certification requires registry review and independent verification; only WANTED_WILD is rankable."};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));const anchor=document.createElement("a");anchor.href=url;anchor.download="wanted-audit-readiness.json";anchor.click();URL.revokeObjectURL(url); };
  const label = result.status === "idle" ? "READY" : result.status === "invalid" ? "INVALID MANIFEST" : result.status === "ready" ? "AUDIT READY" : result.status === "test" ? "TEST PROFILE PASS" : "NOT READY";

  return <section className="auditWorkspace shell">
    <div className="auditGrid">
      <div className="manifestEditor">
        <header><div><span>AUDIT MANIFEST</span><small>ONE AGGREGATE JSON OBJECT · NEVER INCLUDE PARTICIPANT DATA</small></div><div><select aria-label="Synthetic certification target" value={exampleTarget} onChange={event=>setExampleTarget(event.target.value as keyof typeof auditManifestTemplates)}>{Object.keys(auditManifestTemplates).map(target=><option key={target}>{target}</option>)}</select><button onClick={loadExample}>LOAD TARGET EXAMPLE</button><label>OPEN FILE<input type="file" accept=".json,application/json" onChange={loadFile}/></label></div></header>
        <textarea aria-label="WANTED certification audit manifest" spellCheck={false} value={input} onChange={event=>{setInput(event.target.value);setResult(emptyReadiness)}} placeholder={'{\n  "protocol_version": "0.2",\n  "submission_mode": "official",\n  ...\n}'}/>
        <footer><span>{input.length.toLocaleString()} CHARACTERS · LOCAL ONLY</span><button onClick={()=>run()} disabled={working}>{working ? "VERIFYING SEAL…" : "VERIFY AUDIT + READINESS →"}</button></footer>
      </div>
      <aside className={`auditReport ${result.status}`}>
        <header><span>CERTIFICATION HANDOFF</span><b>{label}</b></header>
        <div className="auditTarget"><span>TARGET</span><b>{result.target}</b><small>{result.status === "test" ? "SYNTHETIC · NOT SUBMITTABLE" : "LOCAL PRE-CHECK"}</small></div>
        <div className="gateResults">
          {result.status === "idle" && <p className="auditPrompt">Load the synthetic example to inspect a complete evidence topology, or open your own audit manifest.</p>}
          {result.errors.map((error,index)=><p className="auditError" key={index}>{error}</p>)}
          {result.gates.map(item=><article className={item.status} key={item.id}><span>{item.id}</span><div><b>{item.label}</b><p>{item.detail}</p></div><i>{item.status === "pass" ? "PASS" : item.status.toUpperCase()}</i></article>)}
        </div>
        {result.projection && <button className="exportReadiness" onClick={exportReport}>EXPORT READINESS REPORT ↓</button>}
      </aside>
    </div>
    {result.projection && <div className="projectionRow"><span>{result.projection.rankable ? "LEADERBOARD CANDIDATE" : "CERTIFICATION PROJECTION"}</span><b>{String(result.projection.robot)}</b><strong>{result.projection.wanted_score === null ? "W —" : `W ${Number(result.projection.wanted_score).toFixed(1)}`}</strong><small>{Number(result.projection.environments)} SITES · {Number(result.projection.resident_hours).toLocaleString()} H · {String(result.projection.audit).replaceAll("_"," ")}</small></div>}
    <div className="auditBoundary"><b>LOCAL PRE-CHECK ONLY</b><p>A passing result verifies the manifest structure, internal claims, canonical digest, and auditor Ed25519 seal. It does not verify external-file contents, auditor identity or competence, factual accuracy, regulatory conformity, or award certification.</p></div>
  </section>;
}

"use client";

import { useState, type ChangeEvent } from "react";
import { emptyResult, sampleJsonl, validateStream, type Validation } from "./validator";

export function ConformanceChecker() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Validation>(emptyResult);
  const [working, setWorking] = useState(false);
  const run = async (value = input) => { setWorking(true); setResult(await validateStream(value)); setWorking(false); };
  const loadSample = async () => { const value = await sampleJsonl(); setInput(value); await run(value); };
  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const value = await file.text(); setInput(value); setResult(emptyResult); };

  return <section className="conformanceWorkspace shell">
    <div className="validatorGrid">
      <div className="streamEditor">
        <header><div><span>JSONL EVENT STREAM</span><small>ONE JSON OBJECT PER LINE · DATA STAYS ON-DEVICE</small></div><div><button onClick={loadSample}>LOAD PASSING SAMPLE</button><label>OPEN FILE<input type="file" accept=".jsonl,.json,application/json,text/plain" onChange={loadFile}/></label></div></header>
        <textarea aria-label="WANTED JSONL event stream" spellCheck={false} value={input} onChange={event => { setInput(event.target.value); setResult(emptyResult); }} placeholder={'{"schema_version":"0.2", ...}\n{"schema_version":"0.2", ...}'}/>
        <footer><span>{input.split(/\r?\n/).filter(line=>line.trim()).length} NON-EMPTY LINES</span><button onClick={()=>run()} disabled={working}>{working ? "VALIDATING…" : "VALIDATE STREAM →"}</button></footer>
      </div>
      <aside className={`validationReport ${result.status}`}>
        <header><span>CONFORMANCE RESULT</span><b>{result.status === "idle" ? "READY" : result.status === "pass" ? "ADAPTER PASS" : "ADAPTER FAIL"}</b></header>
        <div className="validationStats"><div><span>EVENTS</span><b>{result.events || "—"}</b></div><div><span>TYPE COVERAGE</span><b>{result.status === "idle" ? "—" : `${result.coverage}/5`}</b></div><div><span>CHAIN LINKS</span><b>{result.status === "idle" ? "—" : result.chainLinks}</b></div></div>
        <div className="validationMessages">
          {result.status === "idle" && <p>Load the passing sample to see the complete profile, or paste a stream from your adapter.</p>}
          {result.errors.map((error,index)=><p className="error" key={`e-${index}`}><i>×</i>{error}</p>)}
          {result.warnings.map((warning,index)=><p className="warning" key={`w-${index}`}><i>!</i>{warning}</p>)}
          {result.status === "pass" && <p className="success"><i>✓</i>Schema shape, identifiers, sequence, UTC order, event payloads, and every supplied hash-chain link passed.</p>}
        </div>
      </aside>
    </div>
    <div className="validatorBoundary"><b>WHAT THIS PROVES</b><span>Format · continuity · ordering · canonical hash-chain integrity</span><b>WHAT STILL NEEDS AN AUDITOR</b><span>Signature authenticity · sensor truth · complete event capture · endpoint classification</span></div>
  </section>;
}

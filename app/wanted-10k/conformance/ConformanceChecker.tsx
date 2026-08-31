"use client";

import { useState, type ChangeEvent } from "react";
import { emptyResult, sampleBundle, validateStream, type Validation } from "./validator";

export function ConformanceChecker() {
  const [input, setInput] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [result, setResult] = useState<Validation>(emptyResult);
  const [working, setWorking] = useState(false);
  const run = async (value = input, keys = keyInput) => { setWorking(true); setResult(await validateStream(value, keys)); setWorking(false); };
  const loadSample = async () => { const value = await sampleBundle(); setInput(value.jsonl); setKeyInput(value.keyManifest); await run(value.jsonl, value.keyManifest); };
  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const value = await file.text(); setInput(value); setResult(emptyResult); };
  const loadKeyFile = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const value = await file.text(); setKeyInput(value); setResult(emptyResult); };
  const exportReport = () => {
    if (result.status === "idle") return;
    const report = { profile_version: "0.2-T1", protocol_version: "0.2", generated_at: new Date().toISOString(), conformance_status: result.status === "pass" ? "passed" : "failed", signature_algorithm: "Ed25519", canonicalization: "RFC8785_JCS", signature_scope: "current_event_without_signature", key_manifest_id: result.keyManifestId, total_events: result.events, verified_signatures: result.signaturesVerified, invalid_signatures: result.invalidSignatures, unknown_key_ids: result.unknownKeyIds, expired_key_events: result.expiredKeyEvents, revoked_key_events: result.revokedKeyEvents, hash_chain_mismatches: result.hashChainMismatches, type_coverage: result.coverage, verified_chain_links: result.chainLinks, errors: result.errors, note: "Local cryptographic verification result. Hash and publish this report before binding it into a certification audit manifest." };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "wanted-telemetry-authenticity-report.json"; anchor.click(); URL.revokeObjectURL(url);
  };

  return <section className="conformanceWorkspace shell">
    <div className="validatorGrid">
      <div className="inputStack"><div className="streamEditor">
        <header><div><span>JSONL EVENT STREAM</span><small>ONE JSON OBJECT PER LINE · DATA STAYS ON-DEVICE</small></div><div><button onClick={loadSample}>LOAD PASSING SAMPLE</button><label>OPEN FILE<input type="file" accept=".jsonl,.json,application/json,text/plain" onChange={loadFile}/></label></div></header>
        <textarea aria-label="WANTED JSONL event stream" spellCheck={false} value={input} onChange={event => { setInput(event.target.value); setResult(emptyResult); }} placeholder={'{"schema_version":"0.2", ...}\n{"schema_version":"0.2", ...}'}/>
        <footer><span>{input.split(/\r?\n/).filter(line=>line.trim()).length} NON-EMPTY LINES</span><div><button onClick={exportReport} disabled={result.status === "idle"}>EXPORT REPORT ↓</button><button onClick={()=>run()} disabled={working}>{working ? "VERIFYING…" : "VERIFY SIGNATURES →"}</button></div></footer>
      </div><div className="keyEditor"><header><div><span>FROZEN KEY MANIFEST</span><small>0.2-T1 · ED25519 RAW PUBLIC KEYS</small></div><label>OPEN KEY MANIFEST<input type="file" accept=".json,application/json" onChange={loadKeyFile}/></label></header><textarea aria-label="WANTED telemetry key manifest" spellCheck={false} value={keyInput} onChange={event=>{setKeyInput(event.target.value);setResult(emptyResult)}} placeholder={'{"profile_version":"0.2-T1","keys":[...]}'}/></div></div>
      <aside className={`validationReport ${result.status}`}>
        <header><span>CONFORMANCE RESULT</span><b>{result.status === "idle" ? "READY" : result.status === "pass" ? "ADAPTER PASS" : "ADAPTER FAIL"}</b></header>
        <div className="validationStats"><div><span>EVENTS</span><b>{result.events || "—"}</b></div><div><span>TYPE COVERAGE</span><b>{result.status === "idle" ? "—" : `${result.coverage}/6`}</b></div><div><span>CHAIN LINKS</span><b>{result.status === "idle" ? "—" : result.chainLinks}</b></div><div><span>SIGNATURES</span><b>{result.status === "idle" ? "—" : `${result.signaturesVerified}/${result.events}`}</b></div></div>
        <div className="validationMessages">
          {result.status === "idle" && <p>Load the passing sample to see the complete profile, or paste a stream from your adapter.</p>}
          {result.errors.map((error,index)=><p className="error" key={`e-${index}`}><i>×</i>{error}</p>)}
          {result.warnings.map((warning,index)=><p className="warning" key={`w-${index}`}><i>!</i>{warning}</p>)}
          {result.status === "pass" && <p className="success"><i>✓</i>Schema shape, identifiers, sequence, UTC order, event payloads, hash-chain links, key validity, and every Ed25519 signature passed.</p>}
        </div>
      </aside>
    </div>
    <div className="validatorBoundary"><b>WHAT THIS PROVES</b><span>Format · continuity · ordering · canonical hash chain · Ed25519 authenticity · key validity</span><b>WHAT STILL NEEDS AN AUDITOR</b><span>Sensor truth · complete event capture · key custody · endpoint classification</span></div>
  </section>;
}

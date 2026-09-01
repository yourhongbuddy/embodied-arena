"use client";

import{useState}from"react";
import{experimentDesignRegistrationReferenceBundle,verifyExperimentDesignRegistrationBundle,type ExperimentDesignRegistrationResult}from"../design-registration.ts";

const reference=()=>JSON.stringify(experimentDesignRegistrationReferenceBundle(),null,2);
const checks=(result:ExperimentDesignRegistrationResult)=>[["PLAN DIGEST",result.plan_digest_verified],["PINNED TRUST ROOT",result.trust_root_digest_verified],["REGISTRAR KEY",result.registrar_key_verified],["ED25519 SIGNATURE",result.signature_verified],["PRE-EXPOSURE ORDER",result.chronology_consistent]]as const;

export function RegistrationLab(){
  const[text,setText]=useState(reference),[result,setResult]=useState<ExperimentDesignRegistrationResult|null>(null),[parseError,setParseError]=useState("");
  const verify=async()=>{try{setParseError("");setResult(await verifyExperimentDesignRegistrationBundle(JSON.parse(text)))}catch{setResult(null);setParseError("The bundle is not valid JSON.")}};
  const reset=()=>{setText(reference());setResult(null);setParseError("")};
  return <section className="registrationWorkspace shell">
    <section className="registrationEditor">
      <header><div><span>VERIFICATION BUNDLE</span><b>RECEIPT · KEY MANIFEST · PLAN · EXPOSURE BOUNDARY</b></div><i>LOCAL ONLY</i></header>
      <textarea aria-label="Design registration verification bundle" spellCheck={false} value={text} onChange={event=>setText(event.target.value)}/>
      <div className="registrationActions"><button type="button" onClick={verify}>VERIFY BUNDLE</button><button type="button" onClick={reset}>RESET SYNTHETIC VECTOR</button><a href="/experiments/design-registration.reference.json">DOWNLOAD VECTOR ↗</a><a href="/experiments/design-registration-keys.json">KEY MANIFEST ↗</a><a href="/experiments/design-registration.schema.json">JSON SCHEMA ↗</a><a href="/experiments/design-registration.json">MACHINE CONTRACT ↗</a></div>
      {parseError&&<p className="registrationError" role="alert">{parseError}</p>}
    </section>
    <section className={`registrationResult ${result?.status==="pass"?"registrationResult--pass":result?"registrationResult--fail":""}`}>
      <header><div><span>OFFLINE VERIFICATION</span><b>PROFILE 0.36-DPR1</b></div><i>{result?result.status.toUpperCase():"WAITING"}</i></header>
      <div className="registrationResultHero"><span>EVIDENCE BUNDLE</span><strong>{result?.evidence_bundle_verified?"VERIFIED":result?"FAILED":"NOT CHECKED"}</strong><small>decision eligibility remains false</small></div>
      <div className="registrationChecks">{(result?checks(result):checks({plan_digest_verified:false,trust_root_digest_verified:false,registrar_key_verified:false,signature_verified:false,chronology_consistent:false}as ExperimentDesignRegistrationResult)).map(([label,passed])=><article key={label}><i className={passed?"checkPass":"checkWait"}/><span>{label}</span><b>{passed?"PASS":"—"}</b></article>)}</div>
      <div className="registrationIdentity"><p><span>RECEIPT</span><code>{result?.receipt_id||"—"}</code></p><p><span>ISSUED</span><code>{result?.issued_at||"—"}</code></p><p><span>FIRST ELIGIBLE EXPOSURE</span><code>{result?.first_eligible_exposure_at||"—"}</code></p></div>
      {result?.errors.length?<div className="registrationFailures"><b>FAILURES</b>{result.errors.map(error=><p key={error}>{error}</p>)}</div>:null}
    </section>
    <section className="registrationBoundary"><b>WHAT A PASS DOES NOT PROVE</b><p>The verifier never contacts the named registry. Independently confirm public availability, registrar control and independence, the pinned key-manifest digest, and the first eligible exposure boundary. A passing bundle does not authenticate people, make rolling results confirmatory, or authorize a winning version.</p></section>
  </section>
}

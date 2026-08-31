import type { Metadata } from "next";
import { SiteNav } from "../../components/SiteNav";

export const metadata: Metadata = {
  title: "Protocol Kit — WANTED-10K",
  description: "Operational WANTED-10K protocol resources for preregistration, endpoint adjudication, telemetry conformance, scoring, and audit.",
  alternates: { canonical: "/wanted-10k/protocol" },
};

const decisions = [
  ["PRIMARY EVENT", "Permanent, uncoerced participant request to remove the robot", "Event at first unambiguous request timestamp"],
  ["10K COMPLETION", "Environment reaches 10,000 resident hours without rejection", "Administrative censor at 10,000"],
  ["UNRELATED EXIT", "Move, illness, or site closure adjudicated unrelated to the robot", "Censor at last observed resident hour"],
  ["SAFETY TERMINATION", "Permanent removal under the safety plan", "Competing terminal cause + safety-gate review"],
  ["DEVELOPER WITHDRAWAL", "Robot or support permanently withdrawn by its developer", "Terminal cause; cohort is not rankable"],
  ["CONSENT / PRIVACY", "Data or consent withdrawal without an adjudicated rejection request", "Terminal cause reported separately"],
  ["TEMPORARY PAUSE", "Travel, reversible pause, or short maintenance", "Not terminal; continuous resident time keeps accruing"],
];

const eligibility = [
  ["01", "COHORT", "N ≥ 20 environments passing integrity profile 0.2-E1"],
  ["02", "EXPOSURE", "Σ resident time ≥ 10,000 hours passing ledger 0.2-X1"],
  ["03", "SUPPORT", "10K RMST is identifiable without extrapolation"],
  ["04", "UNCERTAINTY", "≥95% of environment bootstrap draws identify 10K"],
  ["05", "SAFETY", "All gates pass; no verified L4 event"],
  ["06", "AUDIT", "Seal 0.2-V1 and issuer-signed auditor credential 0.2-V2 verified"],
];

const kit = [
  ["CERTIFICATION MATRIX", "Choose the exact evidence claim before building an audit pack; only WANTED WILD produces a ranked cohort W.", "/wanted-10k/certification", "OPEN MATRIX →"],
  ["CERTIFICATION CONTRACT", "Read the inherited 0.2-C1 requirements, typed not-applicable rule, and rankability boundary for all four targets.", "/wanted-10k/certification.json", "OPEN CONTRACT ↗"],
  ["TARGET MANIFEST TEMPLATES", "Download passing synthetic audit examples for PREQUALIFIED, WANTED LAB, WANTED WILD, and WANTED 10K.", "/wanted-10k/certification-templates.json", "DOWNLOAD JSON ↓"],
  ["COHORT INTEGRITY LAB", "Verify frozen selection, participant flow, one-to-one decision units, target thresholds, carryover controls, and evidence binding.", "/wanted-10k/cohort-integrity", "OPEN COHORT LAB →"],
  ["COHORT INTEGRITY CONTRACT", "Read the 0.2-E1 anti-cherry-picking rules, hard failures, target-specific independence constraints, and interpretation boundary.", "/wanted-10k/cohort-integrity.json", "OPEN CONTRACT ↗"],
  ["COHORT INTEGRITY SCHEMA", "Validate the aggregate recruitment-flow and hashed-linkage evidence manifest used by every field target.", "/wanted-10k/cohort-integrity.schema.json", "OPEN SCHEMA ↗"],
  ["COHORT INTEGRITY TEMPLATE", "Start from a passing synthetic WANTED WILD selection and independence manifest.", "/wanted-10k/cohort-integrity.template.json", "DOWNLOAD JSON ↓"],
  ["EXPOSURE LEDGER LAB", "Reproduce resident hours from signed lifecycle boundaries, complete event chains, and a continuous elapsed-UTC clock.", "/wanted-10k/exposure-ledger", "OPEN LEDGER LAB →"],
  ["EXPOSURE LEDGER CONTRACT", "Read the 0.2-X1 clock, boundary, missing-data, reconciliation, and interpretation rules.", "/wanted-10k/exposure-ledger.json", "OPEN CONTRACT ↗"],
  ["EXPOSURE LEDGER SCHEMA", "Validate the deployment-level signed boundary and stream-reconciliation manifest for every field target.", "/wanted-10k/exposure-ledger.schema.json", "OPEN SCHEMA ↗"],
  ["EXPOSURE LEDGER TEMPLATE", "Start from a passing synthetic 24-environment, 120,000-hour WANTED WILD ledger.", "/wanted-10k/exposure-ledger.template.json", "DOWNLOAD JSON ↓"],
  ["ANALYSIS REPRODUCER", "Rebuild W, S(10K), deterministic uncertainty, censoring bounds, influence, and tail support from the audited endpoint table.", "/wanted-10k/analysis-reproduction", "OPEN REPRODUCER →"],
  ["ANALYSIS CONTRACT", "Read the 0.2-A1 estimator, PCG32 bootstrap, numerical tolerance, upstream bindings, and hard-failure rules.", "/wanted-10k/analysis-reproduction.json", "OPEN CONTRACT ↗"],
  ["ANALYSIS SCHEMA", "Validate the environment-level endpoint table, claimed outputs, deterministic bootstrap parameters, and evidence bindings.", "/wanted-10k/analysis-reproduction.schema.json", "OPEN SCHEMA ↗"],
  ["ANALYSIS TEMPLATE", "Start from a passing synthetic 24-environment claim with exact primary, uncertainty, and robustness outputs.", "/wanted-10k/analysis-reproduction.template.json", "DOWNLOAD JSON ↓"],
  ["FIELD SAFETY CASE", "Evaluate seven non-compensatory gates for scope, stop authority, protective functions, incidents, security, operations, and independent assessment.", "/wanted-10k/safety", "OPEN SAFETY LAB →"],
  ["SAFETY MANIFEST SCHEMA", "Validate the strict deployment-scoped evidence object behind every WANTED field safety decision.", "/wanted-10k/safety-manifest.schema.json", "OPEN SCHEMA ↗"],
  ["SAFETY MANIFEST TEMPLATE", "Start from a complete synthetic 0.2-S1 case with assessed limits, incident closure, security controls, and artifact bindings.", "/wanted-10k/safety-manifest.template.json", "DOWNLOAD JSON ↓"],
  ["AUDITED REGISTRY", "See the official empty-until-earned WANTED ranking, certification lanes, tie policy, correction history, and required disclosures.", "/wanted-10k/leaderboard", "OPEN REGISTRY →"],
  ["REGISTRY CONTRACT", "Read the exact admission, ranking, tie, lifecycle, and disclosure rules plus the current public entry set.", "/wanted-10k/leaderboard.json", "OPEN CONTRACT ↗"],
  ["LEADERBOARD ENTRY SCHEMA", "Validate the immutable aggregate record projected from a passing independent audit manifest.", "/wanted-10k/leaderboard-entry.schema.json", "OPEN SCHEMA ↗"],
  ["PREFLIGHT LAB", "Assess the simulator-neutral eight-family stress matrix, exact zero-event bound, deterministic replay, safe resolution, and artifact binding.", "/wanted-10k/preflight", "OPEN PREFLIGHT LAB →"],
  ["PREFLIGHT MANIFEST SCHEMA", "Validate the portable digital-twin evidence object used by any simulator before human exposure.", "/wanted-10k/preflight.schema.json", "OPEN SCHEMA ↗"],
  ["PREFLIGHT TEMPLATE", "Start with a complete synthetic 0.2-P1 manifest covering all hard qualification gates.", "/wanted-10k/preflight.template.json", "DOWNLOAD JSON ↓"],
  ["REFERENCE ADAPTER", "Connect a native robot stack with six helpers while the module owns lifecycle boundaries, ordering, JCS signing bytes, hash chaining, and restart checkpoints.", "/wanted-10k/sdk", "OPEN QUICKSTART →"],
  ["PREREGISTRATION TEMPLATE", "Freeze recruitment, incentives, endpoints, safety, operations, updates, privacy, telemetry, and analysis before hour one.", "/wanted-10k/preregistration.template.json", "DOWNLOAD JSON ↓"],
  ["PREREGISTRATION SCHEMA", "Machine-check every field that prevents post-hoc rule changes or hidden operational support.", "/wanted-10k/preregistration.schema.json", "OPEN SCHEMA ↗"],
  ["ENDPOINT RULES", "Use one shared disposition vocabulary for rejection, censoring, safety termination, developer withdrawal, and consent exit.", "/wanted-10k/endpoint-rules.json", "OPEN RULES ↗"],
  ["TELEMETRY AUTHENTICITY CONTRACT", "Read the 0.2-T1 Ed25519 signature scope, frozen-key validity, revocation, hash-chain, failure, and interpretation rules.", "/wanted-10k/telemetry-authenticity.json", "OPEN CONTRACT ↗"],
  ["TELEMETRY KEY SCHEMA", "Validate the frozen Ed25519 public-key manifest used to authenticate every field event without exporting a private key.", "/wanted-10k/telemetry-key-manifest.schema.json", "OPEN SCHEMA ↗"],
  ["TELEMETRY KEY TEMPLATE", "Start from the synthetic RFC 8032 public-key manifest used by the local passing sample.", "/wanted-10k/telemetry-key-manifest.template.json", "DOWNLOAD JSON ↓"],
  ["SIGNED STREAM CHECKER", "Exercise the six-event profile and verify lifecycle boundaries, ordered hash-chain continuity, key validity, revocation, and every Ed25519 signature locally.", "/wanted-10k/conformance", "VERIFY STREAM →"],
  ["SCORING REFERENCE", "Reproduce Kaplan–Meier normalized RMST and refuse unsupported 10,000-hour extrapolation.", "/wanted-10k/reference-score.py", "DOWNLOAD PYTHON ↓"],
  ["SCORE LAB", "Enter an environment-level cohort, inspect support and uncertainty, and export an audit summary.", "/wanted-10k/calculator", "OPEN SCORE LAB →"],
  ["AUDIT MANIFEST SCHEMA", "Bind the public leaderboard row to versioned, hashed study, safety, telemetry, adjudication, and withdrawal evidence.", "/wanted-10k/audit-manifest.schema.json", "OPEN SCHEMA ↗"],
  ["CERTIFICATION READINESS", "Assess a complete aggregate audit manifest locally before independent registry review.", "/wanted-10k/audit", "PREPARE AUDIT PACK →"],
  ["AUDIT SEAL VERIFIER", "Reconstruct the non-recursive canonical manifest bytes, bind the declared auditor key, and verify its Ed25519 signature locally.", "/wanted-10k/audit-seal", "VERIFY SEAL →"],
  ["AUDIT SEAL CONTRACT", "Read the 0.2-V1 signature scope, digest, key binding, signing-time, hard-failure, and interpretation rules.", "/wanted-10k/audit-seal.json", "OPEN CONTRACT ↗"],
  ["AUDIT SEAL SCHEMA", "Validate the exact independent audit-seal object embedded in every certification manifest.", "/wanted-10k/audit-seal.schema.json", "OPEN SCHEMA ↗"],
  ["AUDITOR CREDENTIAL CONTRACT", "Read the pinned-root, subject-binding, target-authorization, lifecycle, revocation, and mode-boundary rules for profile 0.2-V2.", "/wanted-10k/auditor-credential.json", "OPEN CONTRACT ↗"],
  ["AUDITOR CREDENTIAL SCHEMA", "Validate the issuer-signed credential embedded inside the sealed aggregate audit manifest.", "/wanted-10k/auditor-credential.schema.json", "OPEN SCHEMA ↗"],
  ["AUDITOR CREDENTIAL TEMPLATE", "Inspect the signed synthetic credential and pinned registry root used by the local passing audit package.", "/wanted-10k/auditor-credential.template.json", "DOWNLOAD JSON ↓"],
  ["AUDIT VERIFIER SDK", "Integrate all 14 seal and credential checks with one zero-dependency local ESM call and explicit production trust-root injection.", "/wanted-10k/audit-sdk", "OPEN QUICKSTART →"],
  ["AUDIT VERIFIER MODULE", "Download the portable browser-and-Node module that performs strict I-JSON canonicalization and both Ed25519 verifications.", "/wanted-10k/wanted-audit-verifier.mjs", "DOWNLOAD ESM ↓"],
  ["AUDIT SDK CONTRACT", "Pin the 0.2-VS1 exports, runtime boundary, trust policy, and exact distributed-source digest.", "/wanted-10k/audit-verifier-sdk.json", "OPEN CONTRACT ↗"],
  ["TRUST ROOT SCHEMA", "Validate synthetic or production registry pins, issuer key digest, minimum registry version, and maximum status age.", "/wanted-10k/auditor-trust-root.schema.json", "OPEN SCHEMA ↗"],
  ["TRUST ROOT TEMPLATE", "Inspect the bundled synthetic-only root shape before provisioning an independently authenticated production root.", "/wanted-10k/auditor-trust-root.template.json", "DOWNLOAD JSON ↓"],
  ["HUMAN MEASURES LAB", "Verify every due randomized prompt, exact four-item instrument, explicit nonresponse, neutral collection, and five-phase report.", "/wanted-10k/human-measures", "OPEN HUMAN LAB →"],
  ["HUMAN MEASURES CONTRACT", "Read the 0.2-H1 questions, scales, timing, denominator, phase boundaries, protections, and hard failures.", "/wanted-10k/human-measures.json", "OPEN CONTRACT ↗"],
  ["HUMAN MEASURES SCHEMA", "Validate the controlled aggregate-safe schedule and response-register manifest for every field certification.", "/wanted-10k/human-measures.schema.json", "OPEN SCHEMA ↗"],
  ["HUMAN MEASURES TEMPLATE", "Start from a passing synthetic WANTED WILD register with 24 environments and five residence phases.", "/wanted-10k/human-measures.template.json", "DOWNLOAD JSON ↓"],
  ["WITHDRAWAL REPRODUCER", "Verify every eligible lifetime completion, exact neutral 168-hour absence, request timing, final choice, and aggregate result.", "/wanted-10k/withdrawal", "OPEN WITHDRAWAL LAB →"],
  ["WITHDRAWAL CONTRACT", "Read the 0.2-W1 denominator, contamination controls, censor-aware median rule, evidence bindings, and hard failures.", "/wanted-10k/withdrawal.json", "OPEN CONTRACT ↗"],
  ["WITHDRAWAL SCHEMA", "Validate the participant-level aggregate-safe register behind WANTED 10K lifetime and WANTED WILD disclosure claims.", "/wanted-10k/withdrawal.schema.json", "OPEN SCHEMA ↗"],
  ["WITHDRAWAL TEMPLATE", "Start from a passing synthetic eight-completion, seven-day absence and reacquisition manifest.", "/wanted-10k/withdrawal.template.json", "DOWNLOAD JSON ↓"],
  ["DIAGNOSTIC PROFILE", "Compute burden, reliability, stop tails, initiative, learning, generalization, and reacquisition without creating a second ranking score.", "/wanted-10k/diagnostics", "OPEN PROFILE LAB →"],
  ["DIAGNOSTIC CONTRACT", "Freeze canonical formulas, denominators, zero-event handling, aggregation units, and anti-gaming rules.", "/wanted-10k/diagnostics.json", "OPEN CONTRACT ↗"],
  ["DIAGNOSTIC INPUT SCHEMA", "Validate the aggregate sufficient statistics used to reproduce every diagnostic result.", "/wanted-10k/diagnostic-input.schema.json", "OPEN SCHEMA ↗"],
];

export default function ProtocolPage() {
  return <main className="protocolPage">
    <SiteNav />
    <section className="protocolHero shell">
      <span className="eyebrow"><i className="liveDot"/> IMPLEMENTATION KIT · PROTOCOL 0.2</span>
      <h1>Freeze the rules.<br/><em>Then start the clock.</em></h1>
      <p>The benchmark becomes credible only when rejection, censoring, assistance, software changes, safety termination, and missing data are defined before deployment. Protocol 0.2 turns those decisions into machine-readable artifacts.</p>
      <div className="protocolHeroActions"><a className="primary" href="/wanted-10k/sdk">Install the adapter <span>→</span></a><a className="secondary" href="/wanted-10k/audit-sdk">Install audit verifier</a><a className="secondary" href="/wanted-10k/preregistration.template.json">Download preregistration</a><a className="secondary" href="/wanted-10k/conformance">Validate an adapter</a><a className="secondary" href="/wanted-10k/audit">Prepare audit pack</a></div>
      <div className="protocolRelease"><b>0.2</b><div><span>SCIENTIFIC CORRECTION</span><p>W is never extrapolated to 10,000 hours when follow-up ends earlier while estimated retention remains above zero.</p></div><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10861099/" target="_blank" rel="noreferrer">RMST BASIS ↗</a></div>
    </section>

    <section className="decisionSection" id="adjudication"><div className="shell">
      <div className="sectionHead wantedHead"><div><span className="kicker">01 / ENDPOINT ADJUDICATION</span><h2>Every exit gets<br/><em>one disposition.</em></h2></div><p>Ambiguous exits are reviewed independently. Safety and developer terminations cannot be relabeled as harmless censoring.</p></div>
      <div className="decisionTable"><header><span>CODE</span><span>OBSERVED DISPOSITION</span><span>ANALYSIS</span></header>{decisions.map(([code,observed,analysis])=><div key={code}><b>{code}</b><p>{observed}</p><span>{analysis}</span></div>)}</div>
      <aside className="adjudicationRule"><b>TIE RULE</b><p>Process endpoint events before censoring at an identical timestamp. Two adjudicators review ambiguous terminal outcomes using only the evidence classes frozen in the preregistration.</p></aside>
    </div></section>

    <section className="eligibilitySection"><div className="shell">
      <div className="sectionHead wantedHead"><div><span className="kicker">02 / LEADERBOARD ELIGIBILITY</span><h2>Six gates.<br/><em>All must pass.</em></h2></div><p>Study duration alone is not enough. A ranked score must be statistically supported, safe, and independently auditable.</p></div>
      <div className="eligibilityGrid">{eligibility.map(([n,title,copy])=><article key={n}><span>{n}</span><b>{title}</b><p>{copy}</p><i>REQUIRED</i></article>)}</div>
    </div></section>

    <section className="kitSection" id="resources"><div className="shell">
      <div className="sectionHead wantedHead"><div><span className="kicker">03 / DEVELOPER + STUDY KIT</span><h2>Fifty-eight artifacts.<br/><em>One evidence chain.</em></h2></div><p>Everything needed to choose a certification claim, preflight a policy, prove cohort, clock, telemetry, final-manifest authenticity, registered auditor-key trust, neutral human reports, and a seven-day absence, verify field safety, connect a robot, reproduce the score and diagnostics, and publish an immutable registry row.</p></div>
      <div className="kitGrid">{kit.map(([title,copy,href,label],index)=><article key={title}><header><span>0{index+1}</span><small>PUBLIC RESOURCE</small></header><h3>{title}</h3><p>{copy}</p><a href={href}>{label}</a></article>)}</div>
    </div></section>

    <section className="integrityChain"><div className="shell">
      <div><span>01</span><b>PREREGISTER</b><p>Freeze decisions and the public-key manifest before hour one.</p></div><i>→</i><div><span>02</span><b>CONFORM</b><p>Verify every event signature and ordered chain link.</p></div><i>→</i><div><span>03</span><b>RUN</b><p>Commit periodic roots while resident time accrues.</p></div><i>→</i><div><span>04</span><b>AUDIT</b><p>Reconcile evidence, credential the key, and seal the manifest.</p></div><i>→</i><div><span>05</span><b>PUBLISH</b><p>Verify both signatures, then release W and its full context.</p></div>
    </div></section>
    <footer className="wantedFooter"><div className="shell"><div className="brand"><span className="brandMark">EA</span><span>EMBODIED <b>ARENA</b> / PROTOCOL 0.2</span></div><p>The operational study package for WANTED-10K.</p><a href="/wanted-10k">BACK TO BENCHMARK →</a></div></footer>
  </main>;
}

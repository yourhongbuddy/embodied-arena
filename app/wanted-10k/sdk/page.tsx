import type { Metadata } from "next";
import { SiteNav } from "../../components/SiteNav";

export const metadata: Metadata = {
  title: "Adapter Quickstart — WANTED-10K",
  description: "Connect any robot to WANTED-10K, emit signed events, and verify the complete telemetry chain locally.",
  alternates: { canonical: "/wanted-10k/sdk" },
};

const events = [
  ["lifecycle", 'wanted.lifecycle("activation", { participant_acceptance_ref: "controlled://acceptance/42", activation_record_sha256: "…" })'],
  ["state", 'wanted.state("available", { autonomous_service_capable: true })'],
  ["request", 'wanted.request("privacy", { evidence_ref: "local://request/42" })'],
  ["action", 'wanted.action("put mug in dishwasher", { proactive: false })'],
  ["intervention", 'wanted.intervention("remote_guidance", 43, "task_recovery", { person_count: 1, resolution: "robot_resumed" })'],
  ["incident", 'wanted.incident("L1", "Brief hallway obstruction")'],
];

export default function SdkPage() {
  return <main className="sdkPage">
    <SiteNav />
    <section className="sdkHero shell">
      <span className="eyebrow"><i className="liveDot"/> EXECUTABLE REFERENCE ADAPTER · PROTOCOL 0.2</span>
      <h1>Robot to valid stream.<br/><em>Fifteen minutes.</em></h1>
      <p>Keep the native controller. WANTED adds one narrow evidence layer: six event helpers, a hardware-backed Ed25519 signer, a durable sink, and a local verifier. The adapter orders and signs each event; the independent verifier rejects structural drift, broken chains, invalid signatures, and ineligible keys before evidence leaves your infrastructure.</p>
      <div className="sdkActions"><a className="primary" href="/wanted-10k/wanted-sdk.mjs">Download adapter <span>↓</span></a><a className="secondary" href="/wanted-10k/wanted-telemetry-verifier.mjs">Download verifier</a><a className="secondary" href="/wanted-10k/deployment.template.json">Download config</a><a className="secondary" href="/wanted-10k/conformance">Test in browser</a></div>
      <div className="sdkPromise"><div><b>0</b><span>RUNTIME DEPENDENCIES</span></div><div><b>6</b><span>EVENT HELPERS</span></div><div><b>1</b><span>DURABLE CHAIN</span></div><div><b>0</b><span>PRIVATE KEYS EXPORTED</span></div></div>
    </section>

    <section className="sdkFlow"><div className="shell">
      <div className="sectionHead wantedHead"><div><span className="kicker">01 / MINIMUM INTEGRATION</span><h2>Three pieces.<br/><em>One ordered truth.</em></h2></div><p>The adapter needs identity, a signing callback, and an accepted-event sink. Sequence and chain state advance only after the sink succeeds.</p></div>
      <div className="sdkSteps">
        <article><span>01</span><b>Identify</b><p>Freeze deployment, environment, robot, and signing-key identifiers in the preregistration.</p><code>deploymentId · environmentId · robotId</code></article>
        <article><span>02</span><b>Sign</b><p>Pass canonical bytes to a TPM, HSM, secure enclave, or equivalent non-exportable key.</p><code>sign(bytes) → signature</code></article>
        <article><span>03</span><b>Commit</b><p>Persist or POST each accepted event, then durably store the returned restart checkpoint.</p><code>sink(event) → accepted</code></article>
      </div>
    </div></section>

    <section className="sdkCodeSection"><div className="shell sdkCodeGrid">
      <div><span className="kicker">02 / COPY, CONNECT, VERIFY</span><h2>The whole<br/><em>evidence surface.</em></h2><p>The production signer stays outside the adapter and the verifier performs no network requests. Private keys and raw event evidence remain inside infrastructure approved by the robot operator.</p><div className="sdkResources"><a href="/wanted-10k/wanted-sdk.mjs">REFERENCE ADAPTER ↓</a><a href="/wanted-10k/wanted-telemetry-verifier.mjs">TELEMETRY VERIFIER ↓</a><a href="/wanted-10k/telemetry-verifier-sdk.json">VERIFIER CONTRACT ↗</a><a href="/wanted-10k/audit-sdk">AUDIT VERIFIER SDK →</a><a href="/wanted-10k/wanted-analysis-conformance.mjs">ANALYSIS CONFORMANCE RUNNER ↓</a><a href="/wanted-10k/site-heterogeneity">SITE HETEROGENEITY →</a><a href="/wanted-10k/realtime">HILO REALTIME →</a><a href="/wanted-10k/preregistration-integrity">PREREGISTRATION INTEGRITY →</a><a href="/wanted-10k/protocol-deviations">PROTOCOL DEVIATIONS →</a><a href="/wanted-10k/sampling-stopping">SAMPLING + STOPPING →</a><a href="/wanted-10k/endpoint-adjudication">ENDPOINT ADJUDICATION →</a><a href="/wanted-10k/assistance-integrity">ASSISTANCE PROFILE →</a><a href="/wanted-10k/policy-evolution">POLICY EVOLUTION →</a><a href="/wanted-10k/privacy-integrity">PRIVACY + CONSENT →</a><a href="/wanted-10k/service-continuity">SERVICE CONTINUITY →</a><a href="/wanted-10k/deployment.schema.json">CONFIG SCHEMA ↗</a><a href="/wanted-10k/event.schema.json">EVENT SCHEMA ↗</a><a href="/wanted-10k/telemetry-key-manifest.schema.json">KEY MANIFEST ↗</a><a href="/wanted-10k/openapi.json">OPENAPI 3.1 ↗</a></div></div>
      <div className="codeCard sdkCode"><header><span>QUICKSTART / JAVASCRIPT ESM</span><i>RUNNABLE</i></header><pre><code>{`import { WantedClient, createHttpSink } from "./wanted-sdk.mjs";

const wanted = new WantedClient({
  deploymentId: "dep_7f2",
  environmentId: "env_104",
  robotId: "robot_07",
  signingKeyId: "key_prod_07",
  sign: bytes => secureModule.sign(bytes),
  sink: createHttpSink("https://collector.example/v1/events"),
  checkpoint: await durableStore.load()
});

await wanted.intervention(
  "remote_guidance", 43, "task_recovery", {
    actor_role: "operator",
    person_count: 1,
    resolution: "robot_resumed",
    support_session_sha256: "…"
  }
);
await durableStore.save(wanted.checkpoint());`}</code></pre><footer><span>WEB CRYPTO · RFC 8785 · SHA-256</span><span>SINGLE WRITER</span></footer></div>
    </div></section>

    <section className="sdkCodeSection"><div className="shell sdkCodeGrid">
      <div><span className="kicker">03 / VERIFY BEFORE HANDOFF</span><h2>Fail locally.<br/><em>Before the audit does.</em></h2><p>Run the independent module against exported JSONL and the frozen public-key manifest. It verifies every signature, chain link, timestamp, key boundary, and payload; then binds each stream’s activation and terminal event to the exposure ledger. Profile 0.2-RC1 separately proves those root commitments were disclosed on schedule to two independent witness organizations before outcome analysis.</p><div className="sdkResources"><a href="/wanted-10k/wanted-telemetry-verifier.mjs">DOWNLOAD VERIFIER ↓</a><a href="/wanted-10k/telemetry-verifier-sdk.json">SOURCE DIGEST + CONTRACT ↗</a><a href="/wanted-10k/exposure-ledger.schema.json">EXPOSURE LEDGER SCHEMA ↗</a><a href="/wanted-10k/root-commitment-witness.schema.json">ROOT WITNESS SCHEMA ↗</a><a href="/wanted-10k/telemetry-key-manifest.template.json">KEY MANIFEST TEMPLATE ↓</a><a href="/wanted-10k/audit-manifest.template.json">AUDIT MANIFEST TEMPLATE ↓</a></div></div>
      <div className="codeCard sdkCode"><header><span>CI CHECK / NODE 22+</span><i>LOCAL ONLY</i></header><pre><code>{`node wanted-telemetry-verifier.mjs \\
  events.jsonl telemetry-key-manifest.json

# stdout: self-digested JSON verification report
# exit 0: every check passed
# exit 1: evidence failed verification
# exit 2: usage, file, or input error

# The same file remains importable JavaScript ESM:
import { verifyTelemetryJsonl } from
  "./wanted-telemetry-verifier.mjs";`}</code></pre><footer><span>NO NETWORK · NO RAW EVENT UPLOAD</span><span>0.2-TS4 · 0.2-TX1</span></footer></div>
    </div></section>

    <section className="sdkEvents"><div className="shell">
      <div className="sectionHead wantedHead"><div><span className="kicker">04 / SIX REQUIRED EVENTS</span><h2>Small API.<br/><em>Complete evidence.</em></h2></div><p>Native ROS 2 topics, simulator callbacks, task planners, and operator consoles map into the same six calls.</p></div>
      <div className="sdkEventRows">{events.map(([name,code],index)=><article key={name}><span>0{index+1}</span><b>{name}</b><code>{code}</code></article>)}</div>
      <div className="adapterMap"><b>COMMON MAPPINGS</b><span>ROS 2 node → helper calls</span><span>Isaac / MuJoCo callbacks → helper calls</span><span>Operator console → intervention + incident</span><span>Participant UI → request</span></div>
    </div></section>

    <section className="sdkCodeSection"><div className="shell sdkCodeGrid">
      <div><span className="kicker">04 / ROOTS + INDEPENDENT WITNESSES</span><h2>Prefixes committed.<br/><em>Keys stay sovereign.</em></h2><p>RE1 first binds each root to a verified signed telemetry prefix and the prior root. Independent witness organizations then create RC1 receipts through the same no-export signing pattern, using a caller-owned HSM callback or air-gapped prepare/attach workflow.</p><div className="sdkResources"><a href="/wanted-10k/root-commitment-witness/envelopes">ROOT ENVELOPE GUIDE →</a><a href="/wanted-10k/wanted-root-envelope.mjs">ROOT HELPER ↓</a><a href="/wanted-10k/root-envelope-sdk.json">ROOT SDK CONTRACT ↗</a><a href="/wanted-10k/root-commitment-witness/issuance">WITNESS ISSUANCE GUIDE →</a><a href="/wanted-10k/wanted-root-witness-receipt.mjs">RECEIPT HELPER ↓</a><a href="/wanted-10k/root-witness-receipt-sdk.json">RECEIPT SDK CONTRACT ↗</a></div></div>
      <div className="codeCard sdkCode"><header><span>ROOT + KEY BOUNDARY</span><i>LOCAL ONLY</i></header><pre><code>{`events  → verified signed prefix
envelope → prefix + prior-root digest
prepare → canonical receipt bytes
sign    → witness HSM / TPM / KMS
attach  → signature self-verification
verify  → registered key + lifecycle

No private-key flag. No network request.
One receipt still requires full RC1 quorum.`}</code></pre><footer><span>0.2-RE1 · 0.2-RIS1 · ED25519</span><span>NO UPLOAD</span></footer></div>
    </div></section>

    <section className="restartSection"><div className="shell">
      <div className="sectionHead wantedHead"><div><span className="kicker">05 / 10,000-HOUR CONTINUITY</span><h2>Restarts happen.<br/><em>Evidence must survive.</em></h2></div><p>A benchmark this long cannot depend on process memory. Persist the checkpoint after every accepted event and test crash recovery before human exposure.</p></div>
      <div className="restartRules"><article><b>ONE WRITER</b><p>Only one process may issue the next sequence for a deployment. Fail over with a lease or fencing token.</p></article><article><b>ACCEPT, THEN ADVANCE</b><p>The SDK advances sequence and chain state only after the sink acknowledges the event.</p></article><article><b>DURABLE CHECKPOINT</b><p>Store next_sequence, previous_event_hash, and last_occurred_at before another event can be emitted.</p></article><article><b>RECONCILE RESTARTS</b><p>After a crash, recover the collector’s accepted tail before emitting. Event IDs make retries idempotent.</p></article></div>
      <aside className="sdkBoundary"><b>REFERENCE, NOT A COLLECTOR</b><p>Embodied Arena publishes the transport contract, executable adapter, and independent local verifier. Each study operates its own approved event sink, key custody, access controls, retention policy, and participant-protection process.</p><a href="/wanted-10k/telemetry-verifier-sdk.json">OPEN VERIFIER CONTRACT →</a></aside>
    </div></section>
    <footer className="wantedFooter"><div className="shell"><div className="brand"><span className="brandMark">EA</span><span>EMBODIED <b>ARENA</b> / ADAPTER KIT</span></div><p>The shortest path from a robot-native stack to auditable WANTED evidence.</p><a href="/wanted-10k">BACK TO BENCHMARK →</a></div></footer>
  </main>;
}

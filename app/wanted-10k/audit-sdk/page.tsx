import type { Metadata } from "next";
import { SiteNav } from "../../components/SiteNav";

export const metadata: Metadata = {
  title: "Audit Verifier SDK — WANTED-10K",
  description: "Verify WANTED audit seals and issuer-signed auditor credentials locally with a zero-dependency ESM module.",
  alternates: { canonical: "/wanted-10k/audit-sdk" },
};

const checks = [
  ["01", "SEAL METADATA", "Freeze profile 0.2-V1, Ed25519, RFC 8785 JCS, and the non-recursive signature scope."],
  ["02", "MANIFEST INTEGRITY", "Reproduce the unsigned-manifest digest and verify the declared auditor key and signature."],
  ["03", "ISSUER TRUST", "Pin the registry root, minimum version, and issuer signature over credential 0.2-V2."],
  ["04", "AUDITOR AUTHORITY", "Bind signer identity and key, authorized target, validity, revocation, freshness, and mode."],
];

export default function AuditSdkPage() {
  return <main className="sdkPage"><SiteNav />
    <section className="sdkHero shell">
      <span className="eyebrow"><i className="liveDot"/> AUDIT VERIFIER SDK · PROTOCOL 0.2-VS1</span>
      <h1>Fourteen checks.<br/><em>One local call.</em></h1>
      <p>Download one zero-dependency ESM module to verify the complete WANTED audit trust chain. It canonicalizes strict I-JSON, verifies both Ed25519 signatures, pins registry roots, and never uploads the manifest.</p>
      <div className="sdkActions"><a className="primary" href="/wanted-10k/wanted-audit-verifier.mjs">Download verifier <span>↓</span></a><a className="secondary" href="/wanted-10k/audit-verifier-sdk.json">SDK contract</a><a className="secondary" href="/wanted-10k/audit-manifest.template.json">Signed example</a><a className="secondary" href="/wanted-10k/audit-seal">Interactive verifier</a></div>
      <div className="sdkPromise"><div><b>0</b><span>RUNTIME DEPENDENCIES</span></div><div><b>14</b><span>HARD CHECKS</span></div><div><b>2</b><span>ED25519 SIGNATURES</span></div><div><b>0</b><span>NETWORK REQUESTS</span></div></div>
    </section>

    <section className="sdkFlow"><div className="shell">
      <div className="sectionHead wantedHead"><div><span className="kicker">01 / VERIFICATION SURFACE</span><h2>Bytes, signer,<br/><em>authority, lifecycle.</em></h2></div><p>A pass means every seal and credential check succeeded. Individual check IDs and errors remain available for audit logs and developer tooling.</p></div>
      <div className="restartRules">{checks.map(([number,title,copy])=><article key={number}><span>{number}</span><b>{title}</b><p>{copy}</p></article>)}</div>
    </div></section>

    <section className="sdkCodeSection"><div className="shell sdkCodeGrid">
      <div><span className="kicker">02 / COPY, LOAD, VERIFY</span><h2>Production trust<br/><em>stays explicit.</em></h2><p>The built-in root verifies synthetic test packages only. Official submissions fail closed until your application supplies a pinned production root reviewed through its own governance process.</p><div className="sdkResources"><a href="/wanted-10k/auditor-trust-root.schema.json">TRUST-ROOT SCHEMA ↗</a><a href="/wanted-10k/auditor-trust-root.template.json">SYNTHETIC ROOT ↓</a><a href="/wanted-10k/auditor-credential.schema.json">CREDENTIAL SCHEMA ↗</a><a href="/wanted-10k/audit-seal.schema.json">SEAL SCHEMA ↗</a></div></div>
      <div className="codeCard sdkCode"><header><span>QUICKSTART / JAVASCRIPT ESM</span><i>RUNNABLE</i></header><pre><code>{`import { verifyAuditPackageJson } from
  "./wanted-audit-verifier.mjs";

const text = await file.text();
const result = await verifyAuditPackageJson(
  text,
  [productionRegistryRoot]
);

if (result.status !== "pass") {
  throw new Error([
    ...result.seal.errors,
    ...result.credential.errors
  ].join(" "));
}`}</code></pre><footer><span>WEB CRYPTO · RFC 8785 · SHA-256</span><span>FAIL CLOSED</span></footer></div>
    </div></section>

    <section className="restartSection"><div className="shell">
      <div className="sectionHead wantedHead"><div><span className="kicker">03 / TRUST BOUNDARY</span><h2>Integrity is proven.<br/><em>Truth still gets audited.</em></h2></div><p>Cryptographic verification proves exact bytes, key possession, and a registry-issued key authorization. It does not prove the factual truth of evidence, auditor competence, independence, or legal conformity.</p></div>
      <aside className="sdkBoundary"><b>OFFICIAL MODE</b><p>Never promote the bundled synthetic root into production. Distribute production roots through an independently authenticated channel, set a minimum registry version, and keep the status-freshness window bounded.</p><a href="/wanted-10k/protocol">OPEN FULL PROTOCOL →</a></aside>
    </div></section>
    <footer className="wantedFooter"><div className="shell"><div className="brand"><span className="brandMark">EA</span><span>EMBODIED <b>ARENA</b> / AUDIT SDK</span></div><p>A portable trust-chain verifier for WANTED certification packages.</p><a href="/wanted-10k/audit-seal">VERIFY IN BROWSER →</a></div></footer>
  </main>;
}

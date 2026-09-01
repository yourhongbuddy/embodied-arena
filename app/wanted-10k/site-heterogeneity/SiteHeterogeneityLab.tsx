"use client";
import { useState } from "react";
import { assessSiteHeterogeneity, siteHeterogeneityTemplate } from "./profile.ts";

type Result = ReturnType<typeof assessSiteHeterogeneity>;

export function SiteHeterogeneityLab() {
  const [input, setInput] = useState(JSON.stringify(siteHeterogeneityTemplate, null, 2));
  const [result, setResult] = useState<Result>(() => assessSiteHeterogeneity(siteHeterogeneityTemplate));
  const run = () => {
    try { setResult(assessSiteHeterogeneity(JSON.parse(input))); }
    catch (error) { setResult({ status: "invalid", errors: [error instanceof Error ? error.message : "Invalid JSON."], gates: [], summary: null }); }
  };
  const load = () => { setInput(JSON.stringify(siteHeterogeneityTemplate, null, 2)); setResult(assessSiteHeterogeneity(siteHeterogeneityTemplate)); };
  const summary = result.summary;
  return <section className="siteLab">
    <header><div><span>LOCAL SITE HETEROGENEITY VERIFIER</span><b>PROFILE / 0.2-SH1</b></div><div><button onClick={load}>LOAD SYNTHETIC EXAMPLE</button><button className="runSite" onClick={run}>REPRODUCE -&gt;</button></div></header>
    <div className="siteWorkspace">
      <div className="siteEditor"><label htmlFor="site-input">SITE ASSIGNMENTS + ENDPOINT ROWS + CLAIMED OUTPUTS</label><textarea id="site-input" spellCheck={false} value={input} onChange={event => setInput(event.target.value)}/><footer><a href="/wanted-10k/site-heterogeneity.schema.json">MANIFEST SCHEMA</a><span>Opaque site IDs. No participant data is uploaded.</span></footer></div>
      <div className="siteOutput"><div className={`siteStatus ${result.status}`}><span>SITE HETEROGENEITY</span><b>{result.status.toUpperCase()}</b><small>{result.errors[0] || (result.status === "passed" ? "All seven multi-site gates pass." : "One or more hard gates failed.")}</small></div>
        {summary && <><div className="siteMetrics"><article><span>POOLED W</span><b>{summary.pooled_wanted_score.toFixed(3)}</b></article><article><span>SITES</span><b>{summary.site_count}</b></article><article><span>MAX SITE SHARE</span><b>{(summary.maximum_site_share * 100).toFixed(1)}%</b></article><article><span>MAX SITE-OUT SHIFT</span><b>{summary.leave_one_site_out_maximum_absolute_shift?.toFixed(3) ?? "NULL"}</b></article></div>
        <div className="siteProfiles">{summary.site_profiles.map(profile => <article key={profile.site_id}><span>{profile.site_id}</span><b>{profile.wanted_score?.toFixed(3) ?? "UNSUPPORTED"}</b><i>N={profile.environment_count} · {(profile.environment_share * 100).toFixed(1)}%</i></article>)}</div>
        <div className="siteGates">{result.gates.map(item => <article className={item.passed ? "pass" : "fail"} key={item.id}><span>{item.id}</span><div><b>{item.label}</b><p>{item.detail}</p></div><i>{item.passed ? "PASS" : "FAIL"}</i></article>)}</div></>}
      </div>
    </div>
    <aside><b>MULTI-SITE != UNIVERSAL</b><p>A pass limits operational site dominance and exposes instability. It does not license inference beyond the observed sites, recruitment frame, dwellings, cultures, or robot version.</p></aside>
  </section>;
}

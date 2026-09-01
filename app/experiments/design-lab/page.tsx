import type{Metadata}from"next";
import{SiteNav}from"../../components/SiteNav";
import{DesignLab}from"./DesignLab";
import"../experiments.css";

export const metadata:Metadata={title:"Experiment Design Lab — Embodied Arena",description:"Plan a fixed-horizon, familywise-error-controlled WANTED landing-page presentation experiment locally.",alternates:{canonical:"/experiments/design-lab"},robots:{index:false,follow:false}};

export default function DesignLabPage(){return <main className="experimentsPage designLabPage"><SiteNav/><section className="designLabHero shell"><div><span className="eyebrow"><i className="liveDot"/> FIXED-HORIZON DESIGN LAB</span><h1>Precommit the close.<br/><em>Then inspect outcomes.</em></h1></div><p>Turn baseline assumptions and minimum detectable effects into per-version accepted-exposure targets. Export one canonical plan for external preregistration before traffic begins. This page is local-only and cannot select a winner.</p></section><DesignLab/><section className="experimentBoundary"><div className="shell"><b>DESIGN DRAFT ONLY</b><p>The calculator supplies a reproducible fixed-horizon plan. It does not authenticate traffic, timestamp a registration, authorize early stopping, or change the live rotator.</p><a href="/experiments/decision-lab">OPEN DECISION LAB →</a></div></section></main>}

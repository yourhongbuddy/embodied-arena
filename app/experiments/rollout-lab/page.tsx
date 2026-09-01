import type{Metadata}from"next";
import{SiteNav}from"../../components/SiteNav";
import{RolloutLab}from"./RolloutLab";
import{RolloutAuthorizationLab}from"./RolloutAuthorizationLab";
import"../experiments.css";
import"./rollout-authorization.css";
export const metadata:Metadata={title:"Artifact-Bound Rollout Lab — Embodied Arena",description:"Verify a WANTED staged-rollout package that binds approval, candidate artifact, cohort reset, safety gates, and rollback.",alternates:{canonical:"/experiments/rollout-lab"},robots:{index:false,follow:false}};
export default function RolloutLabPage(){return <main className="experimentsPage rolloutLabPage"><SiteNav/><section className="designLabHero shell"><div><span className="eyebrow"><i className="liveDot"/> ARTIFACT-BOUND ROLLOUT LAB</span><h1>The approval is not<br/><em>the artifact.</em></h1></div><p>Verify the package, then verify a separate owner signature over its exact approval, candidate manifest, rollout plan, R37 target, and mandatory C9 reset—without giving this site a private key.</p></section><RolloutLab/><RolloutAuthorizationLab/><section className="experimentBoundary"><div className="shell"><b>SIGNED REVIEW, NOT EXECUTION</b><p>A passing synthetic vector proves verifier conformance only. This lab cannot authenticate source-archive bytes, change R36/C8, publish, deploy, advance a phase, or resume after rollback.</p><a href="/experiments/approval-lab">BACK TO APPROVAL →</a></div></section></main>}

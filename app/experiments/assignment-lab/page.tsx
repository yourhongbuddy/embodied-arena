import type{Metadata}from"next";
import{SiteNav}from"../../components/SiteNav";
import{AssignmentLab}from"./AssignmentLab";

export const metadata:Metadata={title:"Rotator Assignment Lab — Embodied Arena",description:"Reproduce WANTED landing-page assignments and dry-run synthetic browser-unit cohorts locally.",alternates:{canonical:"/experiments/assignment-lab"},robots:{index:false,follow:false}};

export default function AssignmentLabPage(){return <main className="experimentsPage assignmentLabPage"><SiteNav/><section className="assignmentLabHero shell"><div><span className="eyebrow"><i className="liveDot"/> LOCAL ROTATOR TEST LAB</span><h1>One unit in.<br/><em>One version out.</em></h1></div><p>Reproduce the exact WANTED landing-page assignment and exposure token for a synthetic browser unit, then exercise the allocation over a deterministic local cohort. Nothing entered here is uploaded, receipted, exposed, or counted.</p></section><AssignmentLab/><section className="experimentBoundary"><div className="shell"><b>SIMULATION ONLY</b><p>This lab checks deterministic implementation parity. It cannot establish eligibility, authenticate traffic, issue a server receipt, count an exposure, or choose a winning presentation.</p><a href="/experiments">BACK TO ROTATOR →</a></div></section></main>}

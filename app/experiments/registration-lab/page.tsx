import type{Metadata}from"next";
import{SiteNav}from"../../components/SiteNav";
import{RegistrationLab}from"./RegistrationLab";
import"../experiments.css";

export const metadata:Metadata={title:"Design Registration Lab — Embodied Arena",description:"Verify an Ed25519-signed WANTED landing experiment design-registration bundle entirely in the browser.",alternates:{canonical:"/experiments/registration-lab"},robots:{index:false,follow:false}};

export default function RegistrationLabPage(){return <main className="experimentsPage registrationLabPage"><SiteNav/><section className="designLabHero shell"><div><span className="eyebrow"><i className="liveDot"/> DESIGN REGISTRATION LAB</span><h1>Verify the freeze.<br/><em>Keep the boundary honest.</em></h1></div><p>Check that one signed registrar receipt binds the exact R36 plan, a pinned Ed25519 key manifest, and a receipt time before the declared first eligible exposure. Everything runs locally; the bundled example is synthetic.</p></section><RegistrationLab/><section className="experimentBoundary"><div className="shell"><b>EVIDENCE COMPONENT ONLY</b><p>Use an independently published registrar receipt, key-manifest digest, and exposure-boundary record for a real prospective claim. This lab does not register the experiment or change the rotator.</p><a href="/experiments/design-lab">BACK TO DESIGN LAB →</a></div></section></main>}

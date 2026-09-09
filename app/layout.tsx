import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { AnalyticsHeartbeat } from "./components/AnalyticsHeartbeat";
import { AskRobot } from "./components/AskRobot";
import { dispatchHref, isDispatchHost } from "./news/domain";

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = h.get("host") || "embodied-arena.example";
  const protocol = host.includes("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;
  const dispatch = isDispatchHost(host);
  const title = dispatch ? "Robot Dispatch — News & perspectives" : "Embodied Arena — Robot AI Leaderboard & URDF Analyzer";
  const description = dispatch ? "Explore headlines across the world, politics, technology, markets, science, culture, and sports. A Robot Router experience." : "Compare robot AI on real-world evidence, analyze URDF files locally, discover benchmark explainers, and share open, source-linked results.";
  return {
    metadataBase: new URL(origin), title, description,
    keywords:["robot AI benchmark","robotics leaderboard","URDF analyzer","embodied AI","VLA models","robot foundation models","robot benchmark"],
    alternates:{canonical:"/"}, icons:{icon:dispatch?"/dispatch-icon.svg":"/favicon.svg",shortcut:dispatch?"/dispatch-icon.svg":"/favicon.svg"},
    openGraph:{title,description,url:origin,siteName:dispatch?"Robot Dispatch":"Embodied Arena",type:"website",...(dispatch?{}:{images:[{url:`${origin}/og.png`,width:1200,height:630,alt:"Embodied Arena — the open arena for embodied intelligence"}]})},
    twitter:{card:dispatch?"summary":"summary_large_image",title,description,...(dispatch?{}:{images:[`${origin}/og.png`]})}, robots:{index:true,follow:true},
  };
}

export default async function RootLayout({children}:{children:React.ReactNode}) {
  const h=await headers(); const host=h.get("host")||"embodied-arena.example"; const origin=`${host.includes("localhost")?"http":"https"}://${host}`;
  const structuredData = isDispatchHost(host) ? {"@context":"https://schema.org","@type":"WebSite",name:"Robot Dispatch",url:origin,description:"A topical news index with links to original publishers, operated by hfxaa llc."} : {"@context":"https://schema.org","@type":"WebSite",name:"Embodied Arena",url:origin,description:"A private URDF readiness scanner, robot AI benchmark index, and first-party robotics research library.",potentialAction:{"@type":"SearchAction",target:`${origin}/leaderboard?q={search_term_string}`,"query-input":"required name=search_term_string"}};
  return <html lang="en"><body><AnalyticsHeartbeat/>{children}<AskRobot newsHref={dispatchHref(host)} /><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData)}} /></body></html>;
}

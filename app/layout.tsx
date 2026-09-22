import type { Metadata } from "next";
import "./globals.css";
import { AnalyticsHeartbeat } from "./components/AnalyticsHeartbeat";
import { PUBLIC_SITE_ORIGIN } from "./site-origin";

export function generateMetadata(): Metadata {
  const origin = PUBLIC_SITE_ORIGIN;
  const title = "Embodied Arena — Robot AI Leaderboard & URDF Analyzer";
  const description = "Compare robot AI on real-world evidence, analyze URDF files locally, discover benchmark explainers, and share open, source-linked results.";
  return {
    metadataBase: new URL(origin), title, description,
    keywords:["robot AI benchmark","robotics leaderboard","URDF analyzer","embodied AI","VLA models","robot foundation models","robot benchmark"],
    alternates:{canonical:"/"}, icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"},
    openGraph:{title,description,url:origin,siteName:"Embodied Arena",type:"website",images:[{url:`${origin}/og.png`,width:1200,height:630,alt:"Embodied Arena — the open arena for embodied intelligence"}]},
    twitter:{card:"summary_large_image",title,description,images:[`${origin}/og.png`]}, robots:{index:true,follow:true},
  };
}

export default function RootLayout({children}:{children:React.ReactNode}) {
  const origin=PUBLIC_SITE_ORIGIN;
  const structuredData = {"@context":"https://schema.org","@type":"WebSite",name:"Embodied Arena",url:origin,description:"A private URDF readiness scanner, robot AI benchmark index, and first-party robotics research library.",potentialAction:{"@type":"SearchAction",target:`${origin}/leaderboard?q={search_term_string}`,"query-input":"required name=search_term_string"}};
  return <html lang="en"><body><AnalyticsHeartbeat/>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData)}} /></body></html>;
}

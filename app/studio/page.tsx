import type { Metadata } from "next";
import Link from "next/link";
import { Studio } from "./Studio";
import { SiteFooter } from "../components/SiteFooter";
import "./studio.css";

export const metadata: Metadata = { title: "Benchmark Studio — Robot Router", description: "Create your own benchmarks, compare results, and export bar, line, and scatter charts. Work with your agents in a private saved workspace.", alternates: { canonical: "/studio" }, robots: { index: true, follow: true } };
export default function StudioPage() {
  return <><header className="studioNav"><Link className="studioBrand" href="/">Robot Router<span> / Studio</span></Link><nav aria-label="Studio navigation"><a href="/leaderboard">Leaderboard</a><a href="/studio/agents">For agents</a><a href="/contact">Help</a></nav></header><main className="studioMain"><Studio /></main><SiteFooter /></>;
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/scan","Scan"],["/wanted-10k","WANTED-10K"],["/wanted-10k/realtime","Realtime"],["/leaderboard","Leaderboard"],["/agents","Agents"],["/monitoring","Monitor"],["/watch","Watch"],["/atlas","Atlas"],["/campaigns","Campaigns"],["/analytics","Heartbeat"],
];

export function SiteNav() {
  const pathname = usePathname();
  return <nav className="nav shell" aria-label="Primary navigation">
    <Link className="brand" href="/"><span className="brandMark">EA</span><span>EMBODIED <b>ARENA</b></span></Link>
    <div className="navLinks routeLinks">{links.map(([href,label])=><a className={pathname===href||(href!=="/"&&pathname.startsWith(`${href}/`))?"current":""} href={href} key={href}>{label}</a>)}</div>
    <a className="localPill" href="/account">MY ACCOUNT ↗</a>
  </nav>;
}

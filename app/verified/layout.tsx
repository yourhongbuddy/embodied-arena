import type { Metadata } from "next";
import { SiteNav } from "../components/SiteNav";
import "./verified.css";
export const metadata: Metadata = { title: "HILO Verified application | Embodied Arena", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="verifiedPage"><SiteNav /><main className="verifiedShell">{children}</main></div>;
}

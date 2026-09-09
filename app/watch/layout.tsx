import type { ReactNode } from "react";
import { SiteFooter } from "../components/SiteFooter";

export default function WatchLayout({ children }: { children: ReactNode }) { return <>{children}<SiteFooter /></>; }

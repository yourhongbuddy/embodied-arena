import type { ReactNode } from "react";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";
import "./company-pages.css";

export function CompanyPage({ title, intro, updated = false, children }: { title: string; intro: string; updated?: boolean; children: ReactNode }) {
  return <><SiteNav /><main className="companyPage shell"><header><span className="companyEyebrow">ROBOT ROUTER / HFXAA LLC</span><h1>{title}</h1><p>{intro}</p>{updated && <p className="companyDate">Effective September 6, 2026</p>}</header><article className="companyContent">{children}</article></main><SiteFooter /></>;
}

export function CompanyEmail() { return <a href="mailto:privacy@getrobotrouter.com">privacy@getrobotrouter.com</a>; }

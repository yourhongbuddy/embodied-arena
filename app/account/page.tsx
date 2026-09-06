import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteNav } from "../components/SiteNav";
import { chatGPTSignOutPath, getChatGPTUser } from "../chatgpt-auth";
import { AccountForm } from "./AccountForm";
import "./account.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "My account — Embodied Arena", description: "Manage your private contact profile.",
  robots: { index: false, follow: false }, alternates: { canonical: "/account" },
};

export default async function AccountPage() {
  if (!await getChatGPTUser()) redirect("/login");
  return <main className="accountPage"><SiteNav /><div className="accountShell">
    <header className="accountHeader"><div><span className="accountEyebrow">EMBODIED ARENA / ACCOUNT</span><h1>Your contact profile.</h1><p>Private details. No public listing.</p></div><a className="accountTextLink" href={chatGPTSignOutPath("/login")} target="_top">Sign out ↗</a></header>
    <AccountForm />
  </div></main>;
}

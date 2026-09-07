import type { Metadata } from "next";
import { SiteNav } from "../components/SiteNav";
import { chatGPTSignInPath, getChatGPTUser } from "../chatgpt-auth";
import { sitesAuthEnabled } from "../account/auth-mode";
import "../account/account.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Sign in — Embodied Arena",
  description: "Sign in to manage your private Arena contact profile.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/login" },
};

export default async function LoginPage() {
  const user = await getChatGPTUser();
  return <main className="accountPage"><SiteNav />
    <div className="accountShell accountLogin">
      <section className="accountIntro">
        <span className="accountEyebrow">EMBODIED ARENA / ACCOUNT</span>
        <h1>Your place<br />in the Arena.</h1>
        <p>Keep your contact details in one private profile. The benchmarks stay open to everyone.</p>
        <a href="/arenagpt" className="accountTextLink">Keep exploring ArenaGPT ↗</a>
      </section>
      <section className="accountCard" aria-labelledby="login-title">
        <span className="accountBadge">PRIVATE PROFILE</span>
        <h2 id="login-title">{user ? "You’re signed in." : "Welcome to the Arena."}</h2>
        <p>{user ? "Open your profile to save or update your contact details." : sitesAuthEnabled() ? "Sign in or create your Arena profile with your ChatGPT account. No new password to remember." : "Contact-profile sign-in is unavailable here. To save benchmarks and connect agents, use a private Studio workspace."}</p>
        {user ? <a className="accountPrimary" href="/account">Open my profile <span aria-hidden="true">↗</span></a>
          : sitesAuthEnabled() ? <a className="accountPrimary" href={chatGPTSignInPath("/account")} target="_top">Sign in with ChatGPT <span aria-hidden="true">↗</span></a>
            : <div className="accountNotice" role="status">Sign-in is not enabled on this host yet. <a href="/studio">Open Benchmark Studio to create or recover a workspace →</a></div>}
        <div className="accountLoginNotes"><p><strong>You choose what to save.</strong> We receive your account email at sign-in. Your contact profile is stored only when you save it.</p><p>Phone numbers are optional. Creating a profile does not subscribe you to marketing or text messages.</p></div>
        <a className="accountTextLink" href="/account/privacy">How we handle contact details ↗</a>
      </section>
    </div>
  </main>;
}

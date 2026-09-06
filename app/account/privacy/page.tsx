import type { Metadata } from "next";
import { SiteNav } from "../../components/SiteNav";
import { PROFILE_PRIVACY_VERSION } from "../profile-contract";
import "../account.css";

export const metadata: Metadata = { title: "Contact-data notice — Embodied Arena", alternates: { canonical: "/account/privacy" }, robots: { index: false, follow: false } };

export default function ContactPrivacyPage() {
  return <main className="accountPage"><SiteNav /><article className="accountShell accountPrivacy">
    <span className="accountEyebrow">CONTACT PROFILE / {PROFILE_PRIVACY_VERSION}</span><h1>A private place for your contact details.</h1>
    <p>This notice covers the Arena contact-profile feature, not ChatGPT’s account policies or the site’s separate anonymous analytics.</p>
    <div className="accountCard"><h2>What is collected</h2><p>Sign-in supplies a site-specific account identifier and your account email. Only when you explicitly save the form do we write that identifier, email, optional phone number, and the notice version and consent/save timestamps into the profile database. We do not store your ChatGPT password.</p>
      <h2>How the details are used</h2><p>The details maintain your Arena contact profile. This form does not enroll you in marketing, SMS, or campaign agents. A phone number is not verified and is not used to authenticate you or recover an account.</p>
      <h2>Who can access them</h2><p>You can view and edit only your own profile. Authorized site operators and the hosting service can access stored data to operate the site. Contact records are not exposed by the public leaderboard, analytics responses, or MCP tools.</p>
      <h2>Storage and deletion</h2><p>On the Sites-hosted version, profiles are stored in the site’s Cloudflare D1 database. They remain until you delete your contact profile. You can remove a phone number by clearing the field and saving, or delete the whole record from your account page. Deletion removes it from the active profile database; hosting backups may retain earlier copies under the hosting provider’s retention settings.</p>
      <h2>Your choice</h2><p>Arena’s public benchmarks do not require a contact profile. Sign-in and profile deletion do not create or delete your underlying ChatGPT account. Only submit a phone number you are authorized to provide.</p>
      <a className="accountTextLink" href="/account">Manage my contact profile ↗</a>
    </div>
  </article></main>;
}

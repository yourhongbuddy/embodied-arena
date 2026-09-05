"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PROFILE_PRIVACY_VERSION, type AccountView } from "./profile-contract";

async function fetchAccount(signal?: AbortSignal): Promise<AccountView> {
  const response = await fetch("/api/account", { cache: "no-store", credentials: "same-origin", signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Your profile could not be loaded.");
  return data;
}

export function AccountForm() {
  const [account, setAccount] = useState<AccountView | null>(null);
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function retry() {
    setBusy(true); setError("");
    try {
      const data = await fetchAccount();
      setAccount(data); setPhone(data.profile?.phone || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your profile could not be loaded.");
    } finally { setBusy(false); }
  }

  useEffect(() => {
    const controller = new AbortController();
    void fetchAccount(controller.signal).then(data => {
      if (!controller.signal.aborted) { setAccount(data); setPhone(data.profile?.phone || ""); }
    }).catch(cause => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Your profile could not be loaded.");
    }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/account", {
        method: "PUT", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Arena-Request": "profile" },
        body: JSON.stringify({ phone, consent, privacyVersion: PROFILE_PRIVACY_VERSION }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Your profile could not be saved.");
      setAccount(data); setPhone(data.profile.phone || ""); setConsent(false);
      setMessage("Your contact profile is saved. You have not been subscribed to marketing or text messages.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Your profile could not be saved."); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!confirmDelete) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/account", { method: "DELETE", credentials: "same-origin", headers: { "X-Arena-Request": "profile" } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Your profile could not be deleted.");
      setAccount(current => current ? { ...current, profile: null } : null);
      setPhone(""); setConsent(false); setConfirmDelete(false);
      setMessage("Your saved email, phone number, and profile consent record were deleted from the active profile database. Your ChatGPT account is unchanged.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Your profile could not be deleted."); }
    finally { setBusy(false); }
  }

  return <div className="accountGrid">
    <section className="accountCard" aria-labelledby="contact-title" aria-busy={busy}>
      <span className="accountBadge">ONLY YOU & AUTHORIZED SITE OPERATORS</span>
      <h2 id="contact-title">Contact details</h2>
      <p>Save the email connected to your sign-in. Add a phone number only if you want one on your profile.</p>
      {error && <div className="accountMessage accountError" role="alert">{error}{!account && <div><button type="button" className="accountSecondary" disabled={busy} onClick={() => void retry()}>Try again</button> <a href="/login" className="accountTextLink">Return to sign-in</a></div>}</div>}
      {message && <p className="accountMessage" role="status">{message}</p>}
      {!account && busy && <p role="status">Loading your private profile…</p>}
      {account && <form onSubmit={save} className="accountForm">
        <label className="accountField" htmlFor="account-email">Account email<input id="account-email" type="email" autoComplete="email" value={account.email} readOnly aria-describedby="email-help" /><small id="email-help">Provided by your sign-in account. To use a different email, sign out and use the corresponding ChatGPT account.</small></label>
        <label className="accountField" htmlFor="account-phone">Phone number <small>(optional)</small><input id="account-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={40} value={phone} onChange={event => setPhone(event.target.value)} placeholder="+1 415 555 0123" aria-describedby="phone-help" disabled={busy} /><small id="phone-help">Include your country code. This number is unverified; it is not used for sign-in, account recovery, or automatic messages.</small></label>
        <label className="accountConsent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} required disabled={busy} /><span>I agree to save my email and optional phone number in my private Arena profile, as described in the <a className="accountTextLink" href="/account/privacy">contact-data notice</a>.</span></label>
        <div className="accountActions"><button className="accountPrimary" type="submit" disabled={busy || !consent}>{busy ? "Working…" : account.profile ? "Save changes" : "Create my profile"}</button></div>
      </form>}
    </section>
    <aside className="accountCard accountSide"><h2>Your data, your choice.</h2><p>Your contact details are not part of the public leaderboard or the agent API.</p>
      <dl><dt>Saved profile</dt><dd>{account?.profile ? "Active" : busy ? "Checking…" : account ? "Not created" : "Unavailable"}</dd><dt>Phone verification</dt><dd>Not verified</dd><dt>Marketing & text messages</dt><dd>Not subscribed by this form</dd>{account?.profile && <><dt>Last saved (UTC)</dt><dd>{account.profile.updatedAt}</dd></>}</dl>
      <a className="accountTextLink" href="/account/privacy">Read the contact-data notice ↗</a>
      {account?.profile && <details className="accountDelete"><summary>Delete my contact profile</summary><p>This removes your saved email, phone number, and consent record from the active profile database. It does not delete your ChatGPT account.</p><label className="accountConsent"><input type="checkbox" checked={confirmDelete} onChange={event => setConfirmDelete(event.target.checked)} disabled={busy} /><span>I understand that this deletes my saved Arena contact profile.</span></label><div className="accountActions" style={{ marginTop: 16 }}><button type="button" className="accountDanger" disabled={busy || !confirmDelete} onClick={() => void remove()}>Delete my profile</button></div></details>}
    </aside>
  </div>;
}

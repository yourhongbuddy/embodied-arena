"use client";
import { useRef, useState } from "react";
import { INTAKE_TERMS, TERMS_VERSION } from "./contract";

export function ApplicationForm() {
  const id = useRef<string | null>(null); const [busy, setBusy] = useState(false); const [locked, setLocked] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setError("");
    const data = new FormData(event.currentTarget); const application = Object.fromEntries(data);
    id.current ??= crypto.randomUUID(); setBusy(true);
    try {
      const response = await fetch("/api/verified/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: id.current, application: { ...application, hours: Number(data.get("hours")), consent: data.get("consent") === "on", termsVersion: TERMS_VERSION } }) });
      const result = await response.json(); if (!response.ok) { if (response.status === 409) setLocked(true); throw new Error(result.error || "Unable to open checkout."); }
      window.location.assign(result.url);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not connect. Please retry."); setBusy(false); }
  }
  return <form className="verifiedCard verifiedForm" onSubmit={submit}>
    <p className="verifiedHint">All fields are required except notes. Use links you are authorized to share; do not include passwords or private access tokens.</p>
    <fieldset disabled={busy}><legend>Robot &amp; organization</legend><div className="verifiedFields">
      <label>Organization / company<input name="organization" autoComplete="organization" required maxLength={200} /></label>
      <label>Robot name / model<input name="robot" required maxLength={200} placeholder="e.g. Atlas / configuration v2" /></label>
      <label className="verifiedWide">Robot or company website<input name="website" type="url" required maxLength={2048} placeholder="https://" /></label>
      <label className="verifiedWide">URDF, MJCF, USD, or repository URL<input name="modelUrl" type="url" required maxLength={2048} placeholder="https://" /></label>
    </div></fieldset>
    <fieldset disabled={busy}><legend>Contact</legend><div className="verifiedFields">
      <label>Contact name<input name="contact" autoComplete="name" required maxLength={200} /></label>
      <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
    </div></fieldset>
    <fieldset disabled={busy}><legend>Deployment context</legend><div className="verifiedFields">
      <label className="verifiedWide">Intended use<textarea name="intendedUse" required maxLength={2000} rows={3} placeholder="What tasks should this robot perform?" /></label>
      <label className="verifiedWide">Deployment environment<textarea name="environment" required maxLength={2000} rows={3} placeholder="e.g. indoor warehouse, research lab, outdoor site" /></label>
      <label className="verifiedWide">Current operating hours<input name="hours" type="number" required min="0" max="1000000000" step="any" /><small>Reported hours for this robot/configuration. Enter 0 if it has not operated yet.</small></label>
      <label className="verifiedWide">Notes <span>(optional)</span><textarea name="notes" maxLength={4000} rows={3} /></label>
    </div></fieldset>
    <label className="verifiedConsent"><input type="checkbox" name="consent" required disabled={busy} /><span>{INTAKE_TERMS} <a href="/verified/terms">Intake terms</a>.</span></label>
    {error && <p className="verifiedError" role="alert">{error}</p>}
    <button className="verifiedPrimary" disabled={busy || locked}>{busy ? "Opening secure checkout…" : "Continue to Stripe · US $1"}</button>
    {locked && <button type="button" className="verifiedSecondary" onClick={() => { id.current = null; setLocked(false); setError(""); }}>Start a new application</button>}
  </form>;
}

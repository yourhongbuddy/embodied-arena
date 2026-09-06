"use client";
import { useEffect, useState } from "react";
import { validId } from "./contract";
export function PaymentResult({ reference, cancelled = false }: { reference: string; cancelled?: boolean }) {
  const [state, setState] = useState(validId(reference) ? "checking" : "invalid"); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function resumeCheckout() {
    setBusy(true); setError("");
    try { const r = await fetch(`/api/verified/resume?application=${reference}`, { method: "POST" }); const result = await r.json(); if (!r.ok) throw new Error(result.error); window.location.assign(result.url); }
    catch (e) { setError(e instanceof Error ? e.message : "Please try again later."); setBusy(false); }
  }
  useEffect(() => {
    const id = reference;
    if (!validId(id)) return;
    let stopped = false; let timer: ReturnType<typeof setTimeout>; let tries = 0;
    async function poll() {
      try { const r = await fetch(`/api/verified/status?application=${id}`, { cache: "no-store" }); const result = await r.json();
        if (stopped) return; if (!r.ok) { setState(r.status === 404 ? "invalid" : "unavailable"); return; }
        setState(result.paymentStatus === "paid" ? "paid" : result.expired ? "expired" : "pending");
        if (result.paymentStatus !== "paid" && !result.expired && ++tries < 20) timer = setTimeout(poll, 3000);
      } catch { if (!stopped) setState("unavailable"); }
    }
    void poll(); return () => { stopped = true; clearTimeout(timer); };
  }, [reference]);
  return <section className="verifiedCard verifiedResult"><span className="verifiedBadge">HILO VERIFIED APPLICATION</span>
    <h1>{state === "paid" ? "Payment received" : cancelled ? "Checkout was cancelled" : "Checking your payment"}</h1>
    {state === "paid" ? <p>Your US $1 intake payment is confirmed and your application is recorded. This is not certification or a verified badge. HILO can contact you at the email you submitted about next steps.</p> : state === "invalid" ? <p>No valid application reference was found. Return to the application page to begin.</p> : state === "expired" ? <p>This checkout has expired. No confirmed payment is recorded for this application.</p> : state === "unavailable" ? <p>We could not check payment status. Refresh this page later before making another payment.</p> : <p role="status">{cancelled ? "Your application details were saved, but we have not recorded a completed payment. You can return to the Stripe tab or use your browser’s Back button to return to your form." : "Your application is recorded. We are waiting for Stripe’s payment confirmation. This page checks automatically for about a minute; you can refresh it later. Please do not pay again while confirmation is pending."}</p>}
    {validId(reference) && <p className="verifiedReference">Application reference<br /><strong>{reference}</strong></p>}
    {error && <p role="alert" className="verifiedError">{error}</p>}
    <div className="verifiedActions">{cancelled && state === "pending" && <button className="verifiedPrimary" disabled={busy} onClick={resumeCheckout}>{busy ? "Opening checkout…" : "Resume the same checkout"}</button>}<a className="verifiedSecondary" href="/wanted-10k">Return to the benchmark</a><a href="/verified">Application page</a></div>
  </section>;
}

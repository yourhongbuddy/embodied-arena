import type { D1Binding } from "../../db/d1.ts";
import { IntakeError, validateApplication, validId } from "./contract.ts";

export type BillingConfig = { origin: string; secret: string; webhookSecret: string };
type Deps = { getDB: () => Promise<D1Binding>; config: () => Promise<BillingConfig>; fetch?: typeof fetch };
type Row = { id: string; application_json: string; payment_status: string; session_id: string | null; checkout_url: string | null; created_at: number };
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
async function bodyText(request: Request, max: number) {
  const reader = request.body?.getReader(); if (!reader) throw new IntakeError("Missing request body.");
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > max) { await reader.cancel(); throw new IntakeError("Request is too large.", 413); } chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0; for (const c of chunks) { bytes.set(c, offset); offset += c.length; } return new TextDecoder().decode(bytes);
}
async function read(db: D1Binding, id: string) { return db.prepare("SELECT id, application_json, payment_status, session_id, checkout_url, created_at FROM hilo_applications WHERE id = ?").bind(id).first<Row>(); }
function failure(error: unknown) { return error instanceof IntakeError ? json({ error: error.message }, error.status) : json({ error: "Application service is temporarily unavailable. Please retry; your existing checkout will be reused." }, 503); }

export async function checkout(request: Request, deps: Deps) {
  try {
    const config = await deps.config();
    if (request.headers.get("origin") !== config.origin || request.headers.get("sec-fetch-site") === "cross-site") throw new IntakeError("Please submit from the HILO website.", 403);
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new IntakeError("Expected JSON.", 415);
    let input; try { input = JSON.parse(await bodyText(request, 20000)); } catch (e) { if (e instanceof IntakeError) throw e; throw new IntakeError("Invalid JSON."); }
    if (!validId(input?.id)) throw new IntakeError("Invalid application reference.");
    const app = validateApplication(input.application); const data = JSON.stringify(app); const db = await deps.getDB();
    // Persist intake before contacting Stripe; the same id always describes the same application.
    await db.prepare(`INSERT INTO hilo_applications (id, email, application_json, terms_version, created_at)
      SELECT ?, ?, ?, ?, ? WHERE (SELECT count(*) FROM hilo_applications WHERE email = ? AND created_at > ?) < 5
      ON CONFLICT(id) DO NOTHING`).bind(input.id, app.email, data, app.termsVersion, Math.floor(Date.now() / 1000), app.email, Math.floor(Date.now() / 1000) - 3600).run();
    const row = await read(db, input.id);
    if (!row) throw new IntakeError("Too many applications for this email. Please try again in an hour.", 429);
    if (row.application_json !== data) throw new IntakeError("This application was already submitted with different details. Start a new application to change it.", 409);
    if (row.payment_status === "paid") return json({ url: `${config.origin}/verified/success?application=${row.id}` });
    if (row.created_at + 22 * 3600 < Date.now() / 1000) throw new IntakeError("This checkout has expired. Start a new application.", 409);
    if (row.checkout_url) return json({ url: row.checkout_url });
    const form = new URLSearchParams({ mode: "payment", "payment_method_types[0]": "card", "adaptive_pricing[enabled]": "false", "automatic_tax[enabled]": "false", customer_email: app.email, client_reference_id: row.id,
      "metadata[application_id]": row.id, "metadata[purpose]": "hilo_verified_intake", "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd", "line_items[0][price_data][unit_amount]": "100",
      "line_items[0][price_data][product_data][name]": "HILO Verified application",
      "line_items[0][price_data][product_data][description]": "One-time verification intake fee. Does not guarantee certification or a verified badge.",
      "custom_text[submit][message]": "US $1 application intake fee only. Certification is not guaranteed.",
      expires_at: String(row.created_at + 23 * 3600), success_url: `${config.origin}/verified/success?application=${row.id}`, cancel_url: `${config.origin}/verified/cancel?application=${row.id}` });
    const response = await (deps.fetch ?? fetch)("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${config.secret}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `hilo-intake-${row.id}` }, body: form, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Checkout creation failed");
    const session = await response.json();
    if (typeof session.id !== "string" || typeof session.url !== "string" || new URL(session.url).origin !== "https://checkout.stripe.com") throw new Error("Invalid Stripe session");
    await db.prepare("UPDATE hilo_applications SET session_id = ?, checkout_url = ? WHERE id = ? AND (session_id IS NULL OR session_id = ?)").bind(session.id, session.url, row.id, session.id).run();
    return json({ url: session.url });
  } catch (error) { return failure(error); }
}

export async function verifySignature(payload: string, header: string, secret: string) {
  const parts = header.split(",").map(p => p.split("=")); const ts = parts.find(p => p[0] === "t")?.[1];
  if (!ts || !/^\d+$/.test(ts) || Math.abs(Date.now() / 1000 - Number(ts)) > 300) throw new IntakeError("Invalid webhook signature.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  for (const [, sig] of parts.filter(p => p[0] === "v1")) {
    if (!/^[a-f0-9]{64}$/i.test(sig ?? "")) continue;
    const bytes = Uint8Array.from(sig.match(/../g)!, h => parseInt(h, 16));
    if (await crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(`${ts}.${payload}`))) return;
  }
  throw new IntakeError("Invalid webhook signature.");
}

export async function webhook(request: Request, deps: Deps) {
  try {
    const config = await deps.config(); const payload = await bodyText(request, 262144);
    await verifySignature(payload, request.headers.get("stripe-signature") ?? "", config.webhookSecret);
    let event; try { event = JSON.parse(payload); } catch { throw new IntakeError("Invalid event."); }
    if (event.type !== "checkout.session.completed") return json({ received: true });
    const s = event.data?.object;
    if (s?.metadata?.purpose !== "hilo_verified_intake") return json({ received: true });
    if (!validId(s.metadata.application_id) || s.client_reference_id !== s.metadata.application_id || typeof s.id !== "string" || typeof event.id !== "string") throw new IntakeError("Invalid session reference.");
    if (s.mode !== "payment" || s.amount_total !== 100 || s.currency !== "usd" || s.livemode !== config.secret.startsWith("sk_live_")) throw new IntakeError("Unexpected payment details.");
    if (s.payment_status !== "paid") return json({ received: true });
    const db = await deps.getDB(); const row = await read(db, s.metadata.application_id);
    if (!row) throw new Error("Application is missing; retry webhook");
    if (row.session_id && row.session_id !== s.id) throw new IntakeError("Session does not match application.");
    // One atomic conditional write makes concurrent deliveries harmless, including delivery before Checkout responds.
    await db.prepare(`UPDATE hilo_applications SET payment_status = 'paid', session_id = ?, stripe_event_id = ?, paid_at = ?, payment_intent = ?
      WHERE id = ? AND payment_status <> 'paid' AND (session_id IS NULL OR session_id = ?)`).bind(s.id, event.id, Math.floor(Date.now() / 1000), typeof s.payment_intent === "string" ? s.payment_intent : null, row.id, s.id).run();
    return json({ received: true });
  } catch (error) { return failure(error); }
}

export async function status(request: Request, deps: Pick<Deps, "getDB">) {
  try { const id = new URL(request.url).searchParams.get("application"); if (!validId(id)) throw new IntakeError("Invalid application reference.");
    const row = await read(await deps.getDB(), id); if (!row) throw new IntakeError("Application not found.", 404);
    // The unguessable application reference only reveals payment state, never applicant details.
    return json({ paymentStatus: row.payment_status, expired: row.created_at + 22 * 3600 < Date.now() / 1000 });
  } catch (error) { return failure(error); }
}

export async function resume(request: Request, deps: Deps) {
  try {
    const config = await deps.config();
    if (request.headers.get("origin") !== config.origin || request.headers.get("sec-fetch-site") === "cross-site") throw new IntakeError("Please submit from the HILO website.", 403);
    const id = new URL(request.url).searchParams.get("application"); if (!validId(id)) throw new IntakeError("Invalid application reference.");
    const row = await read(await deps.getDB(), id); if (!row) throw new IntakeError("Application not found.", 404);
    if (row.payment_status === "paid") return json({ url: `${config.origin}/verified/success?application=${row.id}` });
    if (row.created_at + 22 * 3600 < Date.now() / 1000 || !row.checkout_url) throw new IntakeError("Checkout is unavailable or expired. Return to your original form or start a new application.", 409);
    return json({ url: row.checkout_url });
  } catch (error) { return failure(error); }
}

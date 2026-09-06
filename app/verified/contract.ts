export const TERMS_VERSION = "2026-09-05";
export const INTAKE_TERMS = "I authorize the one-time US $1 HILO Verified application and verification intake fee. Payment does not guarantee certification, a verified badge, a benchmark score, or acceptance. I consent to HILO storing these application details and contacting me about this application, and to Stripe processing the payment.";
export type Application = { organization: string; robot: string; website: string; modelUrl: string; contact: string; email: string; intendedUse: string; environment: string; hours: number; notes: string; termsVersion: string; consent: true };
export class IntakeError extends Error { status: number; constructor(message: string, status = 400) { super(message); this.status = status; } }
export function validateApplication(value: unknown): Application {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new IntakeError("Please complete the application.");
  const v = value as Record<string, unknown>;
  const text = (key: string, max: number, optional = false) => {
    if (typeof v[key] !== "string") throw new IntakeError(`Please check ${key}.`);
    const s = (v[key] as string).trim();
    if ((!s && !optional) || s.length > max || [...s].some(c => c.charCodeAt(0) < 32 && ![9, 10, 13].includes(c.charCodeAt(0)))) throw new IntakeError(`Please check ${key}.`);
    return s;
  };
  const url = (key: string) => { const s = text(key, 2048); try { const u = new URL(s); if (!["https:", "http:"].includes(u.protocol) || u.username || u.password) throw new Error(); } catch { throw new IntakeError(`Please enter an http or https URL for ${key}.`); } return s; };
  const email = text("email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new IntakeError("Please enter a valid email.");
  if (typeof v.hours !== "number" || !Number.isFinite(v.hours) || v.hours < 0 || v.hours > 1e9) throw new IntakeError("Operating hours must be a number from 0 to 1,000,000,000.");
  if (v.consent !== true || v.termsVersion !== TERMS_VERSION) throw new IntakeError("Please accept the current intake terms.");
  return { organization: text("organization", 200), robot: text("robot", 200), website: url("website"), modelUrl: url("modelUrl"), contact: text("contact", 200), email, intendedUse: text("intendedUse", 2000), environment: text("environment", 2000), hours: v.hours, notes: text("notes", 4000, true), consent: true, termsVersion: TERMS_VERSION };
}
export function validId(id: unknown): id is string { return typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id); }

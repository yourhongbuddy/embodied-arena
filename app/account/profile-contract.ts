export const PROFILE_PRIVACY_VERSION = "2026-09-04";
export const PROFILE_BODY_LIMIT = 2048;

export type ContactProfile = { phone: string | null; createdAt: string; updatedAt: string };
export type AccountView = { email: string; profile: ContactProfile | null };

export function validateProfileInput(value: unknown):
  { ok: true; phone: string | null } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "Enter your contact details again." };
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some(key => !["phone", "consent", "privacyVersion"].includes(key))) {
    return { ok: false, error: "Only the phone number and profile consent may be changed here." };
  }
  if (body.consent !== true || body.privacyVersion !== PROFILE_PRIVACY_VERSION) {
    return { ok: false, error: "Please agree to storing your contact profile under the current contact-data notice." };
  }
  if (typeof body.phone !== "string" || body.phone.length > 40) return { ok: false, error: "Enter a valid phone number, or leave it blank." };
  const phone = body.phone.trim().replace(/[ ()-]/g, "");
  if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) {
    return { ok: false, error: "Include a country code, for example +1 415 555 0123. Extensions are not supported." };
  }
  return { ok: true, phone: phone || null };
}

export function validAccountIdentity(user: { userId: string; email: string } | null): boolean {
  return !!user && typeof user.userId === "string" && user.userId.length > 0 && user.userId.length <= 256 &&
    ![...user.userId].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) && typeof user.email === "string" &&
    user.email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email);
}

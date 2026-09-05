import type { D1Binding } from "../../db/d1.ts";
import { PROFILE_BODY_LIMIT, validAccountIdentity, validateProfileInput } from "./profile-contract.ts";
import { deleteProfile, readProfile, saveProfile } from "./profile-store.ts";

type Dependencies = {
  authEnabled: () => boolean;
  getUser: () => Promise<{ userId: string; email: string } | null>;
  getDB: () => Promise<D1Binding>;
};

export const PRIVATE_ACCOUNT_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Vary": "Cookie, oai-authenticated-user-id, oai-authenticated-user-email",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
};

function reply(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...PRIVATE_ACCOUNT_HEADERS, ...extraHeaders } });
}

export function isSameOriginProfileWrite(request: Request): boolean {
  try {
    return request.headers.get("origin") === new URL(request.url).origin &&
      !["cross-site", "same-site"].includes(request.headers.get("sec-fetch-site") || "") &&
      request.headers.get("x-arena-request") === "profile";
  } catch { return false; }
}

async function readBoundedJSON(request: Request) {
  if (Number(request.headers.get("content-length")) > PROFILE_BODY_LIMIT) throw new RangeError();
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > PROFILE_BODY_LIMIT) { await reader.cancel(); throw new RangeError(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

export async function handleProfile(request: Request, deps: Dependencies): Promise<Response> {
  if (!["GET", "PUT", "DELETE"].includes(request.method)) return reply({ error: "Method not allowed." }, 405, { Allow: "GET, PUT, DELETE" });
  if (!deps.authEnabled()) return reply({ error: "Account sign-in is not configured on this host." }, 503);
  if (request.method !== "GET" && !isSameOriginProfileWrite(request)) return reply({ error: "Reload your account page and try again." }, 403);
  try {
    const user = await deps.getUser();
    if (!user || !validAccountIdentity(user)) return reply({ error: "Sign in to manage your profile." }, 401);
    if (request.method === "GET") {
      return reply({ email: user.email, profile: await readProfile(await deps.getDB(), user.userId) });
    }
    if (request.method === "DELETE") {
      await deleteProfile(await deps.getDB(), user.userId);
      return reply({ deleted: true });
    }
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return reply({ error: "Send contact details as JSON." }, 415);
    let input: unknown;
    try { input = await readBoundedJSON(request); }
    catch (error) { return reply({ error: error instanceof RangeError ? "The request is too large." : "The contact details could not be read." }, error instanceof RangeError ? 413 : 400); }
    const parsed = validateProfileInput(input);
    if (!parsed.ok) return reply({ error: parsed.error }, 400);
    const db = await deps.getDB();
    if (!await saveProfile(db, user, parsed.phone)) return reply({ error: "Please wait two seconds before saving again." }, 429, { "Retry-After": "2" });
    const profile = await readProfile(db, user.userId);
    if (!profile) throw new Error("Profile write not visible.");
    return reply({ email: user.email, profile });
  } catch {
    // Never log contact details, SQL bindings, or raw provider errors.
    return reply({ error: "Your profile could not be loaded or saved. Please try again shortly." }, 503);
  }
}

import { BENCHMARK_LIMITS, benchmarkCsv, validateBenchmark } from "./contract.ts";
import { renderBenchmarkSvg } from "./chart.ts";
import { getStudioStore, studioConfigured } from "./database.ts";
import { StudioError, type Identity, type StudioStore } from "./store.ts";

const cookieName = "rr_workspace";
export const privateHeaders = { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", Vary: "Cookie, Authorization, Origin" };
function json(data: unknown, status = 200, headers: Record<string, string> = {}) { return Response.json(data, { status, headers: { ...privateHeaders, ...headers } }); }
function cookie(request: Request, token: string, clear = false) { return `${cookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${clear ? 0 : 604800}${new URL(request.url).protocol === "https:" || process.env.NODE_ENV === "production" ? "; Secure" : ""}`; }
export function checkOrigin(request: Request, mutation: boolean) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new StudioError(403, "Requests must come from this site.");
  if (mutation && !request.headers.has("authorization") && (!origin || request.headers.get("x-robotrouter-request") !== "studio")) throw new StudioError(403, "Reload the Studio and try again.");
}
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new StudioError(415, "Use Content-Type: application/json.");
  if (Number(request.headers.get("content-length")) > BENCHMARK_LIMITS.bytes) throw new StudioError(413, "Request exceeds 512 KB.");
  const reader = request.body?.getReader();
  if (!reader) throw new StudioError(400, "A JSON body is required.");
  let bytes = 0; const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    bytes += value.length;
    if (bytes > BENCHMARK_LIMITS.bytes) { await reader.cancel(); throw new StudioError(413, "Request exceeds 512 KB."); }
    chunks.push(value);
  }
  try {
    const joined = new Uint8Array(bytes); let offset = 0;
    for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.length; }
    const result = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(joined));
    if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error();
    return result;
  } catch { throw new StudioError(400, "Use a valid JSON object."); }
}
export async function studioIdentity(request: Request, store: StudioStore, agentOnly = false): Promise<Identity> {
  const authorization = request.headers.get("authorization");
  if (authorization) return store.authenticate(authorization.startsWith("Bearer ") ? authorization.slice(7) : "", "agent");
  if (agentOnly) throw new StudioError(401, "Provide Authorization: Bearer <agent API key>. Create a key in /studio.");
  const token = request.headers.get("cookie")?.split(";").map(item => item.trim()).find(item => item.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) || "";
  return store.authenticate(token, "session");
}
export function studioFailure(error: unknown) {
  return json({ error: error instanceof StudioError ? error.message : "Saved workspaces are temporarily unavailable. Keep your edits and export a copy, then try again." }, error instanceof StudioError ? error.status : 503);
}
function versionOf(value: unknown) { if (!Number.isSafeInteger(value) || Number(value) < 1) throw new StudioError(400, "Provide the current positive integer version to update or delete a benchmark."); return Number(value); }

export async function handleStudioRequest(request: Request, factory: () => StudioStore = getStudioStore) {
  try {
    const path = new URL(request.url).pathname.replace(/^\/api\/studio\/?/, "").split("/").filter(Boolean);
    const method = request.method;
    checkOrigin(request, !["GET", "HEAD", "OPTIONS"].includes(method));
    if (method === "OPTIONS") return new Response(null, { status: 204, headers: { ...privateHeaders, Allow: "GET, POST, PUT, DELETE, OPTIONS" } });
    if (path.join("/") === "status" && method === "GET") {
      if (factory === getStudioStore && !studioConfigured()) return json({ available: false, authenticated: false });
      const store = factory();
      await store.db.query("SELECT id FROM studio_workspaces LIMIT 1");
      try { const identity = await studioIdentity(request, store); return json({ available: true, authenticated: true, workspaceId: identity.workspaceId, kind: identity.kind }); }
      catch (error) { if (error instanceof StudioError && error.status === 401) return json({ available: true, authenticated: false }); throw error; }
    }
    const store = factory();
    if (path.join("/") === "session" && method === "POST") {
      if (request.headers.has("authorization")) throw new StudioError(403, "Open workspaces in the browser using a recovery key.");
      const body = await readJson(request);
      if (Object.keys(body).some(key => key !== "recoveryKey") || (body.recoveryKey !== undefined && typeof body.recoveryKey !== "string")) throw new StudioError(400, "Provide only an optional recoveryKey string.");
      const result = await store.session(body.recoveryKey as string | undefined);
      return json({ workspaceId: result.workspaceId, ...(result.recoveryKey ? { recoveryKey: result.recoveryKey } : {}) }, 201, { "Set-Cookie": cookie(request, result.token) });
    }
    const identity = await studioIdentity(request, store);
    if (path.join("/") === "session" && method === "DELETE") { await store.logout(identity); return json({ signedOut: true }, 200, { "Set-Cookie": cookie(request, "", true) }); }
    if (path.join("/") === "workspace" && method === "DELETE") {
      const body = await readJson(request); if (body.confirm !== "DELETE WORKSPACE") throw new StudioError(400, "Confirm deletion with DELETE WORKSPACE.");
      await store.deleteWorkspace(identity); return json({ deleted: true }, 200, { "Set-Cookie": cookie(request, "", true) });
    }
    if (path[0] === "keys") {
      if (path.length === 1 && method === "GET") return json({ keys: await store.keys(identity) });
      if (path.length === 1 && method === "POST") {
        const body = await readJson(request); if (typeof body.label !== "string" || !body.label.trim() || body.label.length > 80) throw new StudioError(400, "Give the API key a label of 1–80 characters.");
        return json(await store.createKey(identity, body.label.trim()), 201);
      }
      if (path.length === 2 && method === "DELETE") { await store.revokeKey(identity, path[1]); return json({ revoked: true }); }
    }
    if (path[0] === "benchmarks") {
      if (path.length === 1 && method === "GET") return json({ benchmarks: await store.list(identity) });
      if ((path.length === 1 && method === "POST") || (path.length === 2 && method === "PUT")) {
        const body = await readJson(request);
        if (Object.keys(body).some(key => !["document", "version"].includes(key))) throw new StudioError(400, "Use document and, for updates, version fields.");
        const parsed = validateBenchmark(body.document);
        if (!parsed.ok) return json({ error: parsed.errors.join(" "), errors: parsed.errors }, 422);
        const version = method === "PUT" ? versionOf(body.version) : undefined;
        return json(await store.save(identity, parsed.document, path[1], version), method === "POST" ? 201 : 200);
      }
      if (path.length === 2 && method === "GET") return json(await store.get(identity, path[1]));
      if (path.length === 2 && method === "DELETE") { const body = await readJson(request); await store.remove(identity, path[1], versionOf(body.version)); return json({ deleted: true }); }
      if (path.length === 3 && method === "GET" && ["chart.svg", "results.csv", "document.json"].includes(path[2])) {
        const saved = await store.get(identity, path[1]);
        const format = path[2];
        return new Response(format === "chart.svg" ? renderBenchmarkSvg(saved.document) : format === "results.csv" ? benchmarkCsv(saved.document) : JSON.stringify(saved.document, null, 2), { headers: { ...privateHeaders, "Content-Type": format === "chart.svg" ? "image/svg+xml; charset=utf-8" : format === "results.csv" ? "text/csv; charset=utf-8" : "application/json", "Content-Disposition": `attachment; filename="benchmark-${saved.id}-${format}"`, "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" } });
      }
    }
    return json({ error: "Route or method not found. See /studio/agents for the API." }, 404);
  } catch (error) { return studioFailure(error); }
}

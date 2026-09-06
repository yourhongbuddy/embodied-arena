import { getD1, type D1Binding } from "../../db/d1.ts";
import type { BillingConfig } from "./server.ts";

async function environment(): Promise<Record<string, string | undefined>> {
  const moduleId = "cloudflare:workers";
  try { return (await import(/* @vite-ignore */ moduleId)).env; } catch { return process.env; }
}
export async function billingConfig(): Promise<BillingConfig> {
  const e = await environment();
  const origin = new URL(e.HILO_PUBLIC_URL || "");
  if (origin.origin !== e.HILO_PUBLIC_URL || (origin.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(origin.hostname))) throw new Error("Configure HILO_PUBLIC_URL as a trusted origin");
  if (!/^sk_(test|live)_/.test(e.STRIPE_SECRET_KEY ?? "") || !e.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")) throw new Error("Stripe secrets are not configured");
  return { origin: origin.origin, secret: e.STRIPE_SECRET_KEY!, webhookSecret: e.STRIPE_WEBHOOK_SECRET };
}
let localDB: D1Binding | undefined;
export async function billingDB(): Promise<D1Binding> {
  try { return await getD1(); } catch { /* Node deployment uses an explicit SQLite path or remote D1. */ }
  if (localDB) return localDB;
  const e = await environment();
  if (e.HILO_SQLITE_PATH) {
    // Schema is applied by the migration script, never by an incoming request.
    const moduleId = "node:sqlite";
    const { DatabaseSync } = await import(/* @vite-ignore */ moduleId);
    const sql = new DatabaseSync(e.HILO_SQLITE_PATH); sql.exec("PRAGMA busy_timeout=5000");
    localDB = { prepare(query) { const stmt = sql.prepare(query); let values: unknown[] = []; return {
      bind(...args: unknown[]) { values = args; return this; },
      async first<T>() { return (stmt.get(...values) ?? null) as T | null; },
      async all<T>() { return { results: stmt.all(...values) as T[] }; },
      async run() { return { meta: { changes: Number(stmt.run(...values).changes) } }; },
    }; } }; return localDB;
  }
  // The existing DigitalOcean host can access the established D1 database over HTTPS.
  if (e.CLOUDFLARE_ACCOUNT_ID && e.HILO_D1_DATABASE_ID && e.HILO_D1_API_TOKEN) {
    if (![e.CLOUDFLARE_ACCOUNT_ID, e.HILO_D1_DATABASE_ID].every(s => /^[a-zA-Z0-9-]+$/.test(s))) throw new Error("Invalid D1 configuration");
    return { prepare(query) { let params: unknown[] = [];
      async function execute() {
        const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${e.CLOUDFLARE_ACCOUNT_ID}/d1/database/${e.HILO_D1_DATABASE_ID}/query`, { method: "POST", headers: { Authorization: `Bearer ${e.HILO_D1_API_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ sql: query, params }), signal: AbortSignal.timeout(15000) });
        const result = await r.json(); if (!r.ok || !result.success || !result.result?.[0]?.success) throw new Error("D1 operation failed"); return result.result[0];
      }
      return { bind(...args: unknown[]) { params = args; return this; }, async first<T>() { return ((await execute()).results[0] ?? null) as T | null; }, async all<T>() { return { results: (await execute()).results as T[] }; }, run: execute };
    } };
  }
  throw new Error("Configure D1 or a persistent HILO_SQLITE_PATH");
}
export const billingDependencies = { getDB: billingDB, config: billingConfig };

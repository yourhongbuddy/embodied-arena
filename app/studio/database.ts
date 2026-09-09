import { Pool } from "pg";
import { StudioError, StudioStore, type Database } from "./store.ts";

let store: StudioStore | undefined;
export function studioConfigured() { return Boolean(process.env.BENCHMARK_DATABASE_URL); }
export function getStudioStore(): StudioStore {
  if (store) return store;
  const connectionString = process.env.BENCHMARK_DATABASE_URL;
  if (!connectionString) throw new StudioError(503, "Saved workspaces are not connected yet. You can edit and export charts without an account.");
  const url = new URL(connectionString);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  // Strip URL SSL options so they cannot silently override certificate verification.
  for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) url.searchParams.delete(key);
  const pool = new Pool({ connectionString: url.toString(), max: 4, idleTimeoutMillis: 30000, connectionTimeoutMillis: 8000, statement_timeout: 10000, ssl: local && process.env.NODE_ENV !== "production" ? false : { rejectUnauthorized: true, ...(process.env.BENCHMARK_DATABASE_CA ? { ca: process.env.BENCHMARK_DATABASE_CA.replaceAll("\\n", "\n") } : {}) } });
  // Pool errors must not expose connection details in server logs.
  pool.on("error", () => { console.error("Benchmark database connection failed."); });
  const db: Database = {
    query: (text, values) => pool.query(text, values),
    async transaction(run) {
      const client = await pool.connect();
      try { await client.query("BEGIN"); const result = await run(client); await client.query("COMMIT"); return result; }
      catch (error) { await client.query("ROLLBACK"); throw error; }
      finally { client.release(); }
    },
  };
  store = new StudioStore(db);
  return store;
}

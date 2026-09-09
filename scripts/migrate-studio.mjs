import { readFile } from "node:fs/promises";
import { Pool } from "pg";

if (!process.env.BENCHMARK_DATABASE_URL) throw new Error("BENCHMARK_DATABASE_URL is required. No schema was changed.");
const url = new URL(process.env.BENCHMARK_DATABASE_URL);
const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) url.searchParams.delete(key);
const pool = new Pool({ connectionString: url.toString(), max: 1, connectionTimeoutMillis: 10000, ssl: local && process.env.NODE_ENV !== "production" ? false : { rejectUnauthorized: true, ...(process.env.BENCHMARK_DATABASE_CA ? { ca: process.env.BENCHMARK_DATABASE_CA.replaceAll("\\n", "\n") } : {}) } });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(8014272)");
  await client.query(await readFile(new URL("../db/studio/001-workspaces.sql", import.meta.url), "utf8"));
  await client.query("COMMIT");
  console.log("Benchmark workspace schema is ready.");
} catch { await client.query("ROLLBACK"); console.error("Benchmark schema migration failed. Check database access; credentials are not logged."); process.exitCode = 1; }
finally { client.release(); await pool.end(); }

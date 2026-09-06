import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
const path = process.env.HILO_SQLITE_PATH;
if (!path) throw new Error("Set HILO_SQLITE_PATH before running migrations.");
mkdirSync(dirname(resolve(path)), { recursive: true });
const db = new DatabaseSync(path);
db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS hilo_local_migrations (name TEXT PRIMARY KEY)");
try {
  for (const name of readdirSync(new URL("../drizzle/", import.meta.url)).filter(n => n.endsWith(".sql")).sort()) {
    if (db.prepare("SELECT name FROM hilo_local_migrations WHERE name=?").get(name)) continue;
    db.exec("BEGIN IMMEDIATE");
    try { db.exec(readFileSync(new URL(`../drizzle/${name}`, import.meta.url), "utf8")); db.prepare("INSERT INTO hilo_local_migrations VALUES (?)").run(name); db.exec("COMMIT"); }
    catch (error) { db.exec("ROLLBACK"); throw error; }
  }
  console.log("Local intake database is ready.");
} finally { db.close(); }

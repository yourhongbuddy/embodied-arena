import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { BenchmarkDocument, StoredBenchmark } from "./contract.ts";

export class StudioError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export type Sql = { query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }> };
export type Database = Sql & { transaction<T>(run: (sql: Sql) => Promise<T>): Promise<T> };
export type Identity = { workspaceId: string; kind: "session" | "agent"; hash: string };
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const secret = (prefix: string) => `${prefix}_${randomBytes(32).toString("base64url")}`;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function requireId(id: string) { if (!uuid.test(id)) throw new StudioError(404, "Benchmark not found."); }
function stored(row: Record<string, unknown>): StoredBenchmark {
  return { id: String(row.id), version: Number(row.version), createdAt: new Date(String(row.created_at)).toISOString(), updatedAt: new Date(String(row.updated_at)).toISOString(), document: row.document as BenchmarkDocument };
}

export class StudioStore {
  db: Database;
  constructor(db: Database) { this.db = db; }
  async capacity() {
    const result = await this.db.query("SELECT pg_database_size(current_database()) AS bytes");
    if (Number(result.rows[0].bytes) >= 6 * 1024 ** 3) throw new StudioError(503, "Benchmark storage is at capacity. Existing records can still be read, exported, or deleted. Please contact privacy@getrobotrouter.com.");
  }
  async rate(key: string, limit: number, seconds: number) {
    const result = await this.db.query(`INSERT INTO studio_rate_limits(key,count,expires_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN studio_rate_limits.expires_at<=now() THEN 1 ELSE studio_rate_limits.count+1 END, expires_at=CASE WHEN studio_rate_limits.expires_at<=now() THEN EXCLUDED.expires_at ELSE studio_rate_limits.expires_at END RETURNING count`, [key, seconds]);
    if (Number(result.rows[0].count) > limit) throw new StudioError(429, "Too many requests. Please try again later.");
  }
  async session(recovery?: string) {
    const token = secret("rrs"); const recoveryKey = recovery || secret("rrw");
    if (!/^rrw_[A-Za-z0-9_-]{43}$/.test(recoveryKey)) throw new StudioError(401, "This recovery key is not valid.");
    // A shared cap bounds unauthenticated database growth across all app instances.
    await this.rate(recovery ? "recover" : "create", recovery ? 300 : 30, 3600);
    if (!recovery) await this.capacity();
    return this.db.transaction(async sql => {
      let workspaceId: string;
      if (recovery) {
        const found = await sql.query("SELECT id FROM studio_workspaces WHERE recovery_hash=$1 FOR UPDATE", [tokenHash(recovery)]);
        if (!found.rows.length) throw new StudioError(401, "This recovery key is not valid.");
        workspaceId = String(found.rows[0].id);
      } else {
        await sql.query("SELECT pg_advisory_xact_lock(8014271)");
        const count = await sql.query("SELECT count(*) AS total FROM studio_workspaces");
        if (Number(count.rows[0].total) >= 2000) throw new StudioError(503, "New workspaces are temporarily full. Contact privacy@getrobotrouter.com.");
        workspaceId = randomUUID();
        await sql.query("INSERT INTO studio_workspaces(id,recovery_hash) VALUES($1,$2)", [workspaceId, tokenHash(recoveryKey)]);
      }
      await sql.query("DELETE FROM studio_credentials WHERE workspace_id=$1 AND kind='session' AND (expires_at<now() OR id IN (SELECT id FROM studio_credentials WHERE workspace_id=$1 AND kind='session' ORDER BY created_at DESC OFFSET 9))", [workspaceId]);
      await sql.query("INSERT INTO studio_credentials(id,token_hash,workspace_id,kind,expires_at) VALUES($1,$2,$3,'session',now()+interval '7 days')", [randomUUID(), tokenHash(token), workspaceId]);
      return { token, workspaceId, ...(!recovery ? { recoveryKey } : {}) };
    });
  }
  async authenticate(token: string, kind: Identity["kind"]): Promise<Identity> {
    if (!(kind === "agent" ? /^rra_[A-Za-z0-9_-]{43}$/ : /^rrs_[A-Za-z0-9_-]{43}$/).test(token)) throw new StudioError(401, "Open a workspace or provide a valid agent API key.");
    const hash = tokenHash(token);
    const found = await this.db.query("SELECT workspace_id FROM studio_credentials WHERE token_hash=$1 AND kind=$2 AND (expires_at IS NULL OR expires_at>now())", [hash, kind]);
    if (!found.rows.length) throw new StudioError(401, "Your session or API key has expired or was revoked. Reopen your workspace.");
    const workspaceId = String(found.rows[0].workspace_id);
    await this.rate(`workspace:${workspaceId}`, 120, 60);
    return { workspaceId, hash, kind };
  }
  async logout(identity: Identity) { await this.db.query("DELETE FROM studio_credentials WHERE token_hash=$1", [identity.hash]); }
  async list(identity: Identity) {
    const result = await this.db.query("SELECT id,version,document->>'title' AS title,document->>'evidence' AS evidence,updated_at FROM studio_benchmarks WHERE workspace_id=$1 ORDER BY updated_at DESC", [identity.workspaceId]);
    return result.rows.map(row => ({ id: row.id, title: row.title, evidence: row.evidence, version: row.version, updatedAt: new Date(String(row.updated_at)).toISOString() }));
  }
  async get(identity: Identity, id: string) {
    requireId(id);
    const result = await this.db.query("SELECT * FROM studio_benchmarks WHERE id=$1 AND workspace_id=$2", [id, identity.workspaceId]);
    if (!result.rows.length) throw new StudioError(404, "Benchmark not found.");
    return stored(result.rows[0]);
  }
  async save(identity: Identity, document: BenchmarkDocument, id?: string, version?: number): Promise<StoredBenchmark> {
    if (id) requireId(id);
    await this.capacity();
    return this.db.transaction(async sql => {
      await sql.query("SELECT id FROM studio_workspaces WHERE id=$1 FOR UPDATE", [identity.workspaceId]);
      if (id) {
        const result = await sql.query("UPDATE studio_benchmarks SET document=$1,version=version+1,updated_at=now() WHERE id=$2 AND workspace_id=$3 AND version=$4 RETURNING *", [JSON.stringify(document), id, identity.workspaceId, version]);
        if (!result.rows.length) {
          const found = await sql.query("SELECT id FROM studio_benchmarks WHERE id=$1 AND workspace_id=$2", [id, identity.workspaceId]);
          throw new StudioError(found.rows.length ? 409 : 404, found.rows.length ? "This benchmark changed in another session. Export your edits, then reload the saved version before saving." : "Benchmark not found.");
        }
        return stored(result.rows[0]);
      }
      const count = await sql.query("SELECT count(*) AS total FROM studio_benchmarks WHERE workspace_id=$1", [identity.workspaceId]);
      if (Number(count.rows[0].total) >= 50) throw new StudioError(409, "This workspace has reached its 50-benchmark limit. Export and delete a benchmark to make room.");
      const result = await sql.query("INSERT INTO studio_benchmarks(id,workspace_id,document) VALUES($1,$2,$3) RETURNING *", [randomUUID(), identity.workspaceId, JSON.stringify(document)]);
      return stored(result.rows[0]);
    });
  }
  async remove(identity: Identity, id: string, version: number) {
    requireId(id);
    const result = await this.db.query("DELETE FROM studio_benchmarks WHERE id=$1 AND workspace_id=$2 AND version=$3 RETURNING id", [id, identity.workspaceId, version]);
    if (!result.rows.length) { await this.get(identity, id); throw new StudioError(409, "This benchmark changed. Reload the saved version before deleting."); }
  }
  async keys(identity: Identity) {
    this.owner(identity);
    const result = await this.db.query("SELECT id,label,created_at FROM studio_credentials WHERE workspace_id=$1 AND kind='agent' ORDER BY created_at DESC", [identity.workspaceId]);
    return result.rows.map(row => ({ id: row.id, label: row.label, createdAt: new Date(String(row.created_at)).toISOString() }));
  }
  owner(identity: Identity) { if (identity.kind !== "session") throw new StudioError(403, "Only a browser workspace session can manage access."); }
  async createKey(identity: Identity, label: string) {
    this.owner(identity);
    return this.db.transaction(async sql => {
      await sql.query("SELECT id FROM studio_workspaces WHERE id=$1 FOR UPDATE", [identity.workspaceId]);
      const count = await sql.query("SELECT count(*) AS total FROM studio_credentials WHERE workspace_id=$1 AND kind='agent'", [identity.workspaceId]);
      if (Number(count.rows[0].total) >= 5) throw new StudioError(409, "Revoke an old key before creating another. Each workspace supports five keys.");
      const token = secret("rra"), id = randomUUID();
      await sql.query("INSERT INTO studio_credentials(id,token_hash,workspace_id,kind,label) VALUES($1,$2,$3,'agent',$4)", [id, tokenHash(token), identity.workspaceId, label]);
      return { id, label, token };
    });
  }
  async revokeKey(identity: Identity, id: string) { this.owner(identity); requireId(id); await this.db.query("DELETE FROM studio_credentials WHERE id=$1 AND workspace_id=$2 AND kind='agent'", [id, identity.workspaceId]); }
  async deleteWorkspace(identity: Identity) {
    this.owner(identity);
    await this.db.transaction(async sql => {
      await sql.query("DELETE FROM studio_rate_limits WHERE key=$1", [`workspace:${identity.workspaceId}`]);
      await sql.query("DELETE FROM studio_workspaces WHERE id=$1", [identity.workspaceId]);
    });
  }
}

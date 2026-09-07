CREATE TABLE IF NOT EXISTS studio_workspaces (
  id uuid PRIMARY KEY,
  recovery_hash text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS studio_credentials (
  token_hash text PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES studio_workspaces(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('session','agent')),
  label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  id uuid NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS studio_credentials_workspace ON studio_credentials(workspace_id);
CREATE TABLE IF NOT EXISTS studio_benchmarks (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES studio_workspaces(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  document jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_size CHECK (octet_length(document::text) <= 600000)
);
CREATE INDEX IF NOT EXISTS studio_benchmarks_workspace ON studio_benchmarks(workspace_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS studio_rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL,
  expires_at timestamptz NOT NULL
);

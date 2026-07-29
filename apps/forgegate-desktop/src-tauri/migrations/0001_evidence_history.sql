CREATE TABLE IF NOT EXISTS forgegate_schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id bigserial PRIMARY KEY,
  workspace_path text NOT NULL UNIQUE,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scan_snapshots (
  id bigserial PRIMARY KEY,
  workspace_id bigint NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  package_name text,
  package_manager text,
  workspace_manager text,
  source_commit text,
  dirty boolean,
  component_count integer,
  readiness_summary jsonb,
  adapter_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  scan jsonb NOT NULL,
  seeded boolean NOT NULL DEFAULT false,
  seed_label text,
  CONSTRAINT scan_snapshots_seed_label_check CHECK (
    (seeded = false AND seed_label IS NULL)
    OR (seeded = true AND seed_label IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS scan_snapshots_workspace_scanned_at_idx
  ON scan_snapshots (workspace_id, scanned_at DESC);

CREATE INDEX IF NOT EXISTS scan_snapshots_seeded_idx
  ON scan_snapshots (seeded);

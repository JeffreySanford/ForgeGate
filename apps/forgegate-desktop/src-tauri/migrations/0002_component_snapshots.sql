CREATE TABLE IF NOT EXISTS component_snapshots (
  id bigserial PRIMARY KEY,
  scan_snapshot_id bigint NOT NULL REFERENCES scan_snapshots(id) ON DELETE CASCADE,
  component_id text NOT NULL,
  component_version text,
  framework text NOT NULL,
  adapter text NOT NULL,
  lifecycle text NOT NULL,
  source_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  readiness text NOT NULL,
  finding_summary jsonb NOT NULL DEFAULT '{"status":"not-evaluated","findings":[]}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT component_snapshots_readiness_check CHECK (
    readiness IN ('blocked', 'warning', 'stale', 'unknown', 'not-evaluated', 'clear')
  ),
  CONSTRAINT component_snapshots_unique_component_per_scan UNIQUE (
    scan_snapshot_id,
    component_id
  )
);

CREATE INDEX IF NOT EXISTS component_snapshots_component_id_idx
  ON component_snapshots (component_id);

CREATE INDEX IF NOT EXISTS component_snapshots_scan_readiness_idx
  ON component_snapshots (scan_snapshot_id, readiness);

CREATE TABLE IF NOT EXISTS evidence_events (
  id bigserial PRIMARY KEY,
  workspace_id bigint NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  component_id text NOT NULL,
  scan_snapshot_id bigint NOT NULL REFERENCES scan_snapshots(id) ON DELETE CASCADE,
  previous_scan_snapshot_id bigint REFERENCES scan_snapshots(id) ON DELETE SET NULL,
  event_kind text NOT NULL,
  previous_readiness text NOT NULL,
  next_readiness text NOT NULL,
  previous_commit text,
  next_commit text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_events_kind_check CHECK (event_kind IN ('readiness-changed'))
);

CREATE INDEX IF NOT EXISTS evidence_events_component_idx
  ON evidence_events (workspace_id, component_id, occurred_at DESC);

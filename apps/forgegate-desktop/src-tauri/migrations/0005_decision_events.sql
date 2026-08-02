-- Adds a third real evidence-event kind, 'decision-recorded': a component's
-- most recently connected release-decision workflow record's outcome
-- changed between two consecutive enriched scans. Mirrors 0004's
-- review-recorded columns and constraint shape exactly.
ALTER TABLE component_snapshots
  ADD COLUMN latest_decision_outcome text;

ALTER TABLE evidence_events
  ADD COLUMN previous_decision_outcome text,
  ADD COLUMN next_decision_outcome text;

ALTER TABLE evidence_events DROP CONSTRAINT evidence_events_kind_check;
ALTER TABLE evidence_events DROP CONSTRAINT evidence_events_fields_check;

ALTER TABLE evidence_events ADD CONSTRAINT evidence_events_kind_check
  CHECK (event_kind IN ('readiness-changed', 'review-recorded', 'decision-recorded'));

ALTER TABLE evidence_events ADD CONSTRAINT evidence_events_fields_check
  CHECK (
    (event_kind = 'readiness-changed'
      AND previous_readiness IS NOT NULL AND next_readiness IS NOT NULL)
    OR
    (event_kind = 'review-recorded'
      AND next_review_status IS NOT NULL)
    OR
    (event_kind = 'decision-recorded'
      AND next_decision_outcome IS NOT NULL)
  );

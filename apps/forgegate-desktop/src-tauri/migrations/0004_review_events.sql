-- Adds a second real evidence-event kind, 'review-recorded': a component's
-- most recently connected ManualReview status changed between two
-- consecutive enriched scans. Readiness columns become nullable because a
-- review event has no natural before/after readiness value of its own; a
-- check constraint still requires the columns that matter for each kind.
ALTER TABLE component_snapshots
  ADD COLUMN latest_review_status text;

ALTER TABLE evidence_events
  ALTER COLUMN previous_readiness DROP NOT NULL,
  ALTER COLUMN next_readiness DROP NOT NULL;

ALTER TABLE evidence_events
  ADD COLUMN previous_review_status text,
  ADD COLUMN next_review_status text;

ALTER TABLE evidence_events DROP CONSTRAINT evidence_events_kind_check;

ALTER TABLE evidence_events ADD CONSTRAINT evidence_events_kind_check
  CHECK (event_kind IN ('readiness-changed', 'review-recorded'));

ALTER TABLE evidence_events ADD CONSTRAINT evidence_events_fields_check
  CHECK (
    (event_kind = 'readiness-changed'
      AND previous_readiness IS NOT NULL AND next_readiness IS NOT NULL)
    OR
    (event_kind = 'review-recorded'
      AND next_review_status IS NOT NULL)
  );

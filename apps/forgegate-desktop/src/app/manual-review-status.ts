import type { ResultStatus } from '@forgegate/core-domain';

/**
 * Worst-first rank used to roll many real per-step results up into one
 * overall `ManualReview.status` — lower is worse. A review is never more
 * confident than its worst-recorded step: one `blocked` step makes the
 * whole review `blocked`, no matter how many other steps passed.
 *
 * Shared between `ManualReviewWalkthrough` (target-repo components) and
 * `AccessibilityReviewPage` (ForgeGate's own shell self-review) so the two
 * never silently disagree on what "worst" means.
 */
export const STATUS_SEVERITY_RANK: Readonly<Record<ResultStatus, number>> = {
  blocked: 0,
  failed: 1,
  warning: 2,
  incomplete: 3,
  unknown: 4,
  skipped: 5,
  'not-applicable': 6,
  passed: 7,
};

export function worstStatus(statuses: readonly ResultStatus[]): ResultStatus {
  return statuses.reduce((worst, status) =>
    STATUS_SEVERITY_RANK[status] < STATUS_SEVERITY_RANK[worst] ? status : worst,
  );
}

export const RESULT_STATUS_OPTIONS: readonly ResultStatus[] = [
  'passed',
  'failed',
  'warning',
  'blocked',
  'skipped',
  'incomplete',
  'not-applicable',
  'unknown',
];

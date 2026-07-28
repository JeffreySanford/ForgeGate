import type { TestExecution } from '@forgegate/core-evidence';

/**
 * P1.3's real data: `WorkspaceService.testExecutions()` already parses real
 * `.forgegate/evidence/*.json` files into `TestExecution` records, each
 * with a real `startedAt` timestamp. This orders those real records
 * chronologically (newest first) — it does not fabricate the other event
 * kinds P1.3's title lists (invalidation, reruns as distinct events,
 * reviews, decisions): ForgeGate has no real data source for those yet,
 * so this stays "evidence creation over time" specifically.
 *
 * `startedAt` is expected to be an ISO 8601 string (per
 * `documentation/16-data-and-schema-model.md`), so lexicographic string
 * comparison sorts chronologically without a Date parse.
 */
export function computeEvidenceTimeline(
  executions: readonly TestExecution[],
): readonly TestExecution[] {
  return [...executions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

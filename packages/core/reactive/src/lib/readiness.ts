import type { Finding, TestExecution } from '@forgegate/core-evidence';
import type { ReadinessFlag } from '@forgegate/core-domain';
import { distinctUntilChanged, map, type Observable } from 'rxjs';

/**
 * Pure readiness computation: any open finding at critical or serious
 * severity blocks; any other open finding warns; no open findings is clear.
 * Kept separate from the stream wrapper so it can be unit tested without
 * RxJS at all, per documentation/22-reactive-data-flow.md ("domain streams").
 */
export function computeReadiness(findings: readonly Finding[]): ReadinessFlag {
  const open = findings.filter((finding) => finding.status === 'open');
  if (open.some((finding) => finding.severity === 'critical' || finding.severity === 'serious')) {
    return 'blocked';
  }
  if (open.length > 0) {
    return 'warning';
  }
  return 'clear';
}

/**
 * Derives a readiness stream from a findings stream. `distinctUntilChanged`
 * means downstream UI panels only re-render when readiness actually
 * changes, not on every unrelated findings update.
 */
export function readiness$(findings$: Observable<readonly Finding[]>): Observable<ReadinessFlag> {
  return findings$.pipe(map(computeReadiness), distinctUntilChanged());
}

/**
 * A gate is failing if its most recent execution is failed or blocked, per
 * the normalized statuses in documentation/16-data-and-schema-model.md.
 */
export function hasFailingGate(executions: readonly TestExecution[]): boolean {
  return executions.some((execution) => execution.status === 'failed' || execution.status === 'blocked');
}

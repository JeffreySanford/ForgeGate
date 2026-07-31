import { Component, computed, inject } from '@angular/core';
import type { ResultStatus } from '@forgegate/core-domain';
import type { TestExecution } from '@forgegate/core-evidence';
import { computeEvidenceTimeline } from '../evidence-timeline';
import { WorkspaceService } from '../workspace.service';

const COMMIT_HASH_PATTERN = /^[0-9a-f]{40}$/i;

const STATUS_LABEL: Record<ResultStatus, string> = {
  passed: 'Passed',
  failed: 'Failed',
  warning: 'Warning',
  blocked: 'Blocked',
  skipped: 'Skipped',
  incomplete: 'Incomplete',
  'not-applicable': 'Not applicable',
  unknown: 'Unknown',
};

/**
 * P1.3 — a real, narrow slice: "evidence creation over time" specifically.
 * `WorkspaceService.testExecutions()` already parses real
 * `.forgegate/evidence/*.json` files with real `startedAt` timestamps;
 * this orders them chronologically as a semantic `<ol>` (the primary view
 * is itself the chronological structure, so there is no separate visual
 * representation to keep in sync). Reruns as a distinct event from
 * creation, reviews on the timeline itself, and release decisions are not
 * shown — ForgeGate has no real data source for those event kinds yet.
 *
 * A stale entry's real causal event is explainable, not just flagged:
 * "Show changed files" reuses the same `read_commit_diff_files` Rust
 * command and `WorkspaceService.staleReviewChangedFiles` cache the
 * manual-review freshness table already uses, diffing the entry's
 * recorded commit against the workspace's current one.
 */
@Component({
  selector: 'app-evidence-timeline-view',
  templateUrl: './evidence-timeline-view.html',
  styleUrl: './evidence-timeline-view.css',
})
export class EvidenceTimelineView {
  protected readonly workspace = inject(WorkspaceService);

  protected readonly entries = computed(() =>
    computeEvidenceTimeline(this.workspace.testExecutions()),
  );

  protected statusLabel(status: ResultStatus): string {
    return STATUS_LABEL[status];
  }

  protected shortCommit(commitOrFingerprint: string): string {
    return commitOrFingerprint.slice(0, 7);
  }

  protected executionIsStale(execution: TestExecution): boolean {
    if (!COMMIT_HASH_PATTERN.test(execution.commitOrFingerprint)) {
      return false;
    }
    const commit = this.workspace.gitStatus()?.commit;
    return (
      !!commit &&
      execution.commitOrFingerprint.toLowerCase() !== commit.toLowerCase()
    );
  }

  protected showStaleChangedFiles(execution: TestExecution): void {
    void this.workspace.loadStaleReviewChangedFiles(
      execution.commitOrFingerprint,
    );
  }
}

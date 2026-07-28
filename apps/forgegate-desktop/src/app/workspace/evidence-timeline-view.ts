import { Component, computed, inject } from '@angular/core';
import type { ResultStatus } from '@forgegate/core-domain';
import { computeEvidenceTimeline } from '../evidence-timeline';
import { WorkspaceService } from '../workspace.service';

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
 * representation to keep in sync). Invalidation, reruns as a distinct
 * event from creation, reviews, and decisions are not shown — ForgeGate
 * has no real data source for those event kinds yet.
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
}

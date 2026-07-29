import { Component, computed, inject } from '@angular/core';
import {
  WorkspaceService,
  type EvidenceHistorySnapshot,
} from '../workspace.service';

/**
 * P1/Persistence trend slice: reads persisted scan snapshots from the
 * opt-in Postgres store and renders the actual timeline. Seeded rows stay
 * visibly labeled because they are useful for development, not real audit
 * evidence.
 */
@Component({
  selector: 'app-evidence-history-trend-view',
  templateUrl: './evidence-history-trend-view.html',
  styleUrl: './evidence-history-trend-view.css',
})
export class EvidenceHistoryTrendView {
  protected readonly workspace = inject(WorkspaceService);

  protected readonly snapshots = computed(
    () => this.workspace.evidenceHistoryTrend()?.snapshots ?? [],
  );

  protected readonly firstSnapshot = computed(
    () => this.snapshots()[0] ?? null,
  );
  protected readonly latestSnapshot = computed(
    () => this.snapshots()[this.snapshots().length - 1] ?? null,
  );

  protected readonly componentDelta = computed(() => {
    const first = this.firstSnapshot()?.componentCount;
    const latest = this.latestSnapshot()?.componentCount;
    return first === null ||
      first === undefined ||
      latest === null ||
      latest === undefined
      ? null
      : latest - first;
  });

  protected readonly maxComponentCount = computed(() =>
    Math.max(
      1,
      ...this.snapshots().map((snapshot) => snapshot.componentCount ?? 0),
    ),
  );

  protected componentWidth(snapshot: EvidenceHistorySnapshot): number {
    return ((snapshot.componentCount ?? 0) / this.maxComponentCount()) * 100;
  }

  protected readinessUnknown(snapshot: EvidenceHistorySnapshot): number {
    return snapshot.readinessSummary?.readiness?.['unknown'] ?? 0;
  }

  protected loadedAdapters(snapshot: EvidenceHistorySnapshot): number {
    return snapshot.adapterSummary.byStatus?.loaded ?? 0;
  }

  protected partialAdapters(snapshot: EvidenceHistorySnapshot): number {
    return snapshot.adapterSummary.byStatus?.partial ?? 0;
  }

  protected formatShortDate(value: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(value));
  }

  protected shortCommit(snapshot: EvidenceHistorySnapshot): string {
    return snapshot.sourceCommit?.slice(0, 8) ?? 'unknown';
  }
}

import { Component, computed, input, output } from '@angular/core';
import type { ComponentManifest } from '@forgegate/core-manifest';
import type { ComponentSnapshotReadiness } from '../component-readiness';

export interface DistributionBucket<T extends string> {
  readonly value: T;
  readonly count: number;
  readonly percent: number;
}

/**
 * P1.2 "Component landscape and readiness distribution" — real counts only,
 * never a single collapsed health score (per document 26, Visualization 3's
 * "readiness distribution bars" alternative view). Selecting a lifecycle
 * bar drives the same filter the inventory table/cards already use, so the
 * distribution and the accessible inventory stay connected rather than
 * being two disconnected views of the same data.
 *
 * Readiness is the same derived component-local decision used by persisted
 * scan snapshots: failed or blocked automated evidence blocks, stale evidence
 * is stale, incomplete required evidence warns, and no findings is clear.
 */
@Component({
  selector: 'app-readiness-distribution',
  templateUrl: './readiness-distribution.html',
  styleUrl: './readiness-distribution.css',
})
export class ReadinessDistribution {
  readonly manifests = input.required<readonly ComponentManifest[]>();
  readonly readinessByComponent = input<
    ReadonlyMap<string, ComponentSnapshotReadiness>
  >(new Map());
  readonly selectedLifecycle = input<ComponentManifest['lifecycle'] | null>(
    null,
  );
  readonly lifecycleSelect = output<ComponentManifest['lifecycle'] | null>();

  protected readonly lifecycleBuckets = computed<
    readonly DistributionBucket<ComponentManifest['lifecycle']>[]
  >(() => {
    const total = this.manifests().length;
    if (total === 0) {
      return [];
    }
    const counts = new Map<ComponentManifest['lifecycle'], number>();
    for (const manifest of this.manifests()) {
      counts.set(manifest.lifecycle, (counts.get(manifest.lifecycle) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([value, count]) => ({
        value,
        count,
        percent: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  });

  protected readonly readinessBuckets = computed<
    readonly DistributionBucket<ComponentSnapshotReadiness>[]
  >(() => {
    const total = this.manifests().length;
    if (total === 0) {
      return [];
    }
    const order: ComponentSnapshotReadiness[] = [
      'blocked',
      'stale',
      'warning',
      'clear',
      'unknown',
    ];
    const rank = new Map(order.map((value, index) => [value, index]));
    const counts = new Map<ComponentSnapshotReadiness, number>();
    for (const manifest of this.manifests()) {
      const readiness =
        this.readinessByComponent().get(manifest.id) ?? 'unknown';
      counts.set(readiness, (counts.get(readiness) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([value, count]) => ({
        value,
        count,
        percent: Math.round((count / total) * 100),
      }))
      .sort(
        (a, b) =>
          (rank.get(a.value) ?? Number.MAX_SAFE_INTEGER) -
            (rank.get(b.value) ?? Number.MAX_SAFE_INTEGER) || b.count - a.count,
      );
  });

  protected selectLifecycle(value: ComponentManifest['lifecycle']): void {
    this.lifecycleSelect.emit(
      this.selectedLifecycle() === value ? null : value,
    );
  }

  protected readinessFillClass(value: ComponentSnapshotReadiness): string {
    return `readiness-distribution__bar-fill--${value}`;
  }
}

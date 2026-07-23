import { Component, computed, input, output } from '@angular/core';
import type { ComponentManifest } from '@forgegate/core-manifest';

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
 * Readiness itself is honestly degenerate right now: every component
 * always reports "unknown" (see ComponentDetailPage's readiness rail —
 * ForgeGate has no findings/evidence pipeline at all yet), so this always
 * renders a single 100%-unknown bar rather than a real blocked/warning/
 * clear split. The mechanism is real; the current data just has nothing
 * else to show yet.
 */
@Component({
  selector: 'app-readiness-distribution',
  templateUrl: './readiness-distribution.html',
  styleUrl: './readiness-distribution.css',
})
export class ReadinessDistribution {
  readonly manifests = input.required<readonly ComponentManifest[]>();
  readonly selectedLifecycle = input<ComponentManifest['lifecycle'] | null>(null);
  readonly lifecycleSelect = output<ComponentManifest['lifecycle'] | null>();

  protected readonly lifecycleBuckets = computed<readonly DistributionBucket<ComponentManifest['lifecycle']>[]>(() => {
    const total = this.manifests().length;
    if (total === 0) {
      return [];
    }
    const counts = new Map<ComponentManifest['lifecycle'], number>();
    for (const manifest of this.manifests()) {
      counts.set(manifest.lifecycle, (counts.get(manifest.lifecycle) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count, percent: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  });

  /**
   * Always a single "unknown" bucket today — see class doc comment. Written
   * as a real reduction over `manifests()` (not a hardcoded constant) so it
   * starts reporting real blocked/warning/clear splits the moment
   * ForgeGate has an evidence pipeline to derive them from, with no
   * template change required.
   */
  protected readonly readinessBuckets = computed<readonly DistributionBucket<'unknown'>[]>(() => {
    const total = this.manifests().length;
    if (total === 0) {
      return [];
    }
    return [{ value: 'unknown', count: total, percent: 100 }];
  });

  protected selectLifecycle(value: ComponentManifest['lifecycle']): void {
    this.lifecycleSelect.emit(this.selectedLifecycle() === value ? null : value);
  }
}

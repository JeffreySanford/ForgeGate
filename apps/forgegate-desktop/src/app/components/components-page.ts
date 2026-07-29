import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ComponentManifest } from '@forgegate/core-manifest';
import { ComponentInventoryService } from '../component-inventory.service';
import type {
  ComponentDiscovery,
  ComponentProvenance,
} from '../component-inventory.service';
import type { ComponentSnapshotReadiness } from '../component-readiness';
import { WorkspaceService } from '../workspace.service';
import { ReadinessDistribution } from './readiness-distribution';

type LifecycleFilter = 'all' | ComponentManifest['lifecycle'];
type ViewMode = 'table' | 'cards';
type InventoryMode = 'catalog' | 'diagnostics';

/**
 * Designer-ready component inventory (P0.4, documentation/25-designer-ready-vertical-slice.md).
 * Real data only: everything here comes from `ComponentInventoryService`,
 * which maps a live Custom Elements Manifest. Several columns are honestly
 * static right now rather than fabricated, because nothing in ForgeGate
 * populates them from a CEM: bare CEM rows still start at the manifest's
 * default lifecycle and will usually warn until repository-owned evidence
 * manifests, tests, review procedures, and documentation targets are connected.
 */
@Component({
  selector: 'app-components-page',
  imports: [RouterLink, ReadinessDistribution],
  templateUrl: './components-page.html',
  styleUrl: './components-page.css',
})
export class ComponentsPage {
  protected readonly workspace = inject(WorkspaceService);
  private readonly inventory = inject(ComponentInventoryService);

  protected readonly searchText = signal('');
  protected readonly lifecycleFilter = signal<LifecycleFilter>('all');
  protected readonly missingEvidenceOnly = signal(false);
  protected readonly viewMode = signal<ViewMode>('table');
  protected readonly inventoryMode = signal<InventoryMode>('catalog');

  protected readonly manifests = computed(
    () => this.inventory.result().manifests,
  );
  protected readonly discoveries = computed(
    () => this.inventory.result().discoveries,
  );
  protected readonly readinessByComponent = computed(
    () =>
      new Map(
        this.discoveries().map((item) => [
          item.manifest.id,
          item.readiness.readiness,
        ]),
      ),
  );
  protected readonly failures = computed(
    () => this.inventory.result().failures,
  );
  protected readonly declarationCount = computed(
    () => this.inventory.result().declarationCount,
  );
  protected readonly duplicateGroupCount = computed(
    () => this.inventory.result().duplicateGroupCount,
  );

  protected readonly lifecycleOptions = computed<
    ComponentManifest['lifecycle'][]
  >(() => Array.from(new Set(this.manifests().map((m) => m.lifecycle))).sort());

  protected readonly filtered = computed<readonly ComponentDiscovery[]>(() => {
    const search = this.searchText().trim().toLowerCase();
    const lifecycle = this.lifecycleFilter();
    const missingOnly = this.missingEvidenceOnly();

    return this.discoveries().filter((discovery) => {
      const manifest = discovery.manifest;
      if (
        this.inventoryMode() === 'catalog' &&
        discovery.classification !== 'owned'
      )
        return false;
      if (
        search &&
        !manifest.id.toLowerCase().includes(search) &&
        !componentName(manifest.id).toLowerCase().includes(search)
      ) {
        return false;
      }
      if (lifecycle !== 'all' && manifest.lifecycle !== lifecycle) {
        return false;
      }
      if (missingOnly && hasAnyEvidence(manifest)) {
        return false;
      }
      return true;
    });
  });

  protected count(classification: ComponentProvenance): number {
    return this.discoveries().filter(
      (item) => item.classification === classification,
    ).length;
  }

  protected componentName(id: string): string {
    return componentName(id);
  }

  protected packageId(id: string): string {
    return id.split('.').slice(0, 2).join('.');
  }

  protected stateCoverageLabel(manifest: ComponentManifest): string {
    return manifest.states.length
      ? `${manifest.states.length} state(s)`
      : 'Not evaluated';
  }

  protected reviewStatusLabel(manifest: ComponentManifest): string {
    return manifest.manualReviewProcedureIds.length
      ? `${manifest.manualReviewProcedureIds.length} procedure(s)`
      : 'Not reviewed';
  }

  protected documentationStatusLabel(manifest: ComponentManifest): string {
    return manifest.documentationTargets.length
      ? `${manifest.documentationTargets.length} target(s)`
      : 'Not connected';
  }

  protected ownerLabel(manifest: ComponentManifest): string {
    return manifest.owner ?? 'Unknown';
  }

  protected readinessLabel(discovery: ComponentDiscovery): string {
    const { readiness, blockingReasons } = discovery.readiness;
    const findingCount = blockingReasons.length;
    if (readiness === 'clear') {
      return 'Clear — no derived findings';
    }
    return `${formatReadiness(readiness)} — ${findingCount} finding(s)`;
  }

  protected setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  protected readonly selectedLifecycle = computed<
    ComponentManifest['lifecycle'] | null
  >(() => {
    const lifecycle = this.lifecycleFilter();
    return lifecycle === 'all' ? null : lifecycle;
  });

  protected onLifecycleSelect(
    lifecycle: ComponentManifest['lifecycle'] | null,
  ): void {
    this.lifecycleFilter.set(lifecycle ?? 'all');
  }
}

function componentName(id: string): string {
  const parts = id.split('.');
  return parts[parts.length - 1] ?? id;
}

function formatReadiness(readiness: ComponentSnapshotReadiness): string {
  return readiness.charAt(0).toUpperCase() + readiness.slice(1);
}

/** Whether any evidence-bearing field on the manifest is populated at all. */
function hasAnyEvidence(manifest: ComponentManifest): boolean {
  return (
    manifest.states.length > 0 ||
    manifest.testRequirements.length > 0 ||
    manifest.tokenMappings.length > 0 ||
    manifest.documentationTargets.length > 0 ||
    manifest.manualReviewProcedureIds.length > 0
  );
}

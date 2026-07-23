import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ComponentManifest } from '@forgegate/core-manifest';
import { ComponentInventoryService } from '../component-inventory.service';
import { WorkspaceService } from '../workspace.service';

type LifecycleFilter = 'all' | ComponentManifest['lifecycle'];
type ViewMode = 'table' | 'cards';

/**
 * Designer-ready component inventory (P0.4, documentation/25-designer-ready-vertical-slice.md).
 * Real data only: everything here comes from `ComponentInventoryService`,
 * which maps a live Custom Elements Manifest. Several columns are honestly
 * static right now rather than fabricated, because nothing in ForgeGate
 * populates them from a CEM: `lifecycle` is always the manifest's own
 * default ('proposal') since nothing sets it yet; readiness has no source
 * at all (no evidence/findings pipeline is wired into the desktop app),
 * so it is always shown as explicitly unknown rather than guessed; state
 * coverage, review status, and documentation status are always "not
 * evaluated/connected" for the same reason — those fields exist on
 * `ComponentManifest` but nothing populates them from a bare CEM mapping.
 */
@Component({
  selector: 'app-components-page',
  imports: [RouterLink],
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

  protected readonly manifests = computed(() => this.inventory.result().manifests);
  protected readonly failures = computed(() => this.inventory.result().failures);

  protected readonly lifecycleOptions = computed<ComponentManifest['lifecycle'][]>(() =>
    Array.from(new Set(this.manifests().map((m) => m.lifecycle))).sort(),
  );

  protected readonly filtered = computed<readonly ComponentManifest[]>(() => {
    const search = this.searchText().trim().toLowerCase();
    const lifecycle = this.lifecycleFilter();
    const missingOnly = this.missingEvidenceOnly();

    return this.manifests().filter((manifest) => {
      if (search && !manifest.id.toLowerCase().includes(search) && !componentName(manifest.id).toLowerCase().includes(search)) {
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

  protected componentName(id: string): string {
    return componentName(id);
  }

  protected packageId(id: string): string {
    return id.split('.').slice(0, 2).join('.');
  }

  protected stateCoverageLabel(manifest: ComponentManifest): string {
    return manifest.states.length ? `${manifest.states.length} state(s)` : 'Not evaluated';
  }

  protected reviewStatusLabel(manifest: ComponentManifest): string {
    return manifest.manualReviewProcedureIds.length ? `${manifest.manualReviewProcedureIds.length} procedure(s)` : 'Not reviewed';
  }

  protected documentationStatusLabel(manifest: ComponentManifest): string {
    return manifest.documentationTargets.length ? `${manifest.documentationTargets.length} target(s)` : 'Not connected';
  }

  protected ownerLabel(manifest: ComponentManifest): string {
    return manifest.owner ?? 'Unknown';
  }

  protected setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }
}

function componentName(id: string): string {
  const parts = id.split('.');
  return parts[parts.length - 1] ?? id;
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

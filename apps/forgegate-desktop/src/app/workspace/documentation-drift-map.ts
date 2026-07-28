import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { computeWorkspaceDocumentationDrift, type DocumentationDriftStatus } from '../documentation-drift';
import { ComponentInventoryService } from '../component-inventory.service';
import { WorkspaceService } from '../workspace.service';

const STATUS_LABEL: Record<DocumentationDriftStatus, string> = {
  current: 'Current',
  drifted: 'Drifted',
  'not-evaluated': 'Not evaluated',
};

/**
 * P1.6 — a real aggregation of the per-component documentation drift
 * check (`computeDocumentationDriftState`, shared with
 * `ComponentDetailPage` rather than duplicated) across every component in
 * the current inventory. Answers a concrete question a single component's
 * own record can't: "how much of the documentation across this whole
 * workspace is actually stale, and which pages specifically?"
 *
 * A component contributing zero rows here (no documentation targets at
 * all) is honestly absent, not shown as a fabricated "not evaluated" —
 * there is nothing to compare. "Link to the generated diff or publication
 * action" from document 26 is not implemented: ForgeGate has no
 * documentation-generation feature to link to yet.
 */
@Component({
  selector: 'app-documentation-drift-map',
  imports: [RouterLink],
  templateUrl: './documentation-drift-map.html',
  styleUrl: './documentation-drift-map.css',
})
export class DocumentationDriftMap {
  protected readonly workspace = inject(WorkspaceService);
  private readonly inventory = inject(ComponentInventoryService);

  protected readonly entries = computed(() =>
    computeWorkspaceDocumentationDrift(
      this.inventory.result().manifests,
      this.workspace.workspaceScan()?.starlightProjects ?? [],
    ),
  );

  protected readonly counts = computed(() => {
    const entries = this.entries();
    return {
      current: entries.filter((entry) => entry.result.status === 'current').length,
      drifted: entries.filter((entry) => entry.result.status === 'drifted').length,
      notEvaluated: entries.filter((entry) => entry.result.status === 'not-evaluated').length,
    };
  });

  protected statusLabel(status: DocumentationDriftStatus): string {
    return STATUS_LABEL[status];
  }

  protected componentName(id: string): string {
    const parts = id.split('.');
    return parts[parts.length - 1] ?? id;
  }
}

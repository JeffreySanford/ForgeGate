import { Component, computed, inject } from '@angular/core';
import {
  computeAdapterConstellation,
  type AdapterCapabilityStatus,
} from '../adapter-constellation';
import { WorkspaceService } from '../workspace.service';

const STATUS_LABEL: Record<AdapterCapabilityStatus, string> = {
  loaded: 'Supported',
  partial: 'Partial',
  failed: 'Failed',
  unavailable: 'Unavailable',
};

/**
 * P1.7 — real per-adapter capability status, grouped from
 * `WorkspaceService.adapterDiagnostics()` (already populated by every real
 * adapter call the workspace makes) rather than a fixed, hand-authored
 * list of "supported adapters". No vendor logos — a semantic table naming
 * each adapter, its worst real status across every source it touched, and
 * a link into the existing raw diagnostics disclosure for the exact
 * output and failure messages behind that status.
 */
@Component({
  selector: 'app-adapter-constellation-view',
  templateUrl: './adapter-constellation-view.html',
  styleUrl: './adapter-constellation-view.css',
})
export class AdapterConstellationView {
  protected readonly workspace = inject(WorkspaceService);

  protected readonly entries = computed(() =>
    computeAdapterConstellation(this.workspace.adapterDiagnostics()),
  );

  protected statusLabel(status: AdapterCapabilityStatus): string {
    return STATUS_LABEL[status];
  }
}

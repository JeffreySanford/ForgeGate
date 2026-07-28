import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { computeTokenTopology } from '../token-topology';
import { ComponentInventoryService } from '../component-inventory.service';
import { WorkspaceService } from '../workspace.service';

/**
 * P1.5's narrow real slice: which components consume which real,
 * repository-authored token mappings, aggregated across the inventory
 * (`computeTokenTopology`). Primitive/semantic token layering, alias
 * chains, unresolved references, theme/mode coverage, hard-coded value
 * detection, and anatomy/state linkage are not shown — no real DTCG
 * parser exists yet, so this stays "component-token consumption" only.
 */
@Component({
  selector: 'app-token-topology-view',
  imports: [RouterLink],
  templateUrl: './token-topology-view.html',
  styleUrl: './token-topology-view.css',
})
export class TokenTopologyView {
  protected readonly workspace = inject(WorkspaceService);
  private readonly inventory = inject(ComponentInventoryService);

  protected readonly entries = computed(() =>
    computeTokenTopology(this.inventory.result().manifests),
  );

  protected componentName(id: string): string {
    const parts = id.split('.');
    return parts[parts.length - 1] ?? id;
  }
}

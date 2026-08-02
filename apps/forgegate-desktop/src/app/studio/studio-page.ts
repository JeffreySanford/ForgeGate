import { Component, computed, inject, signal } from '@angular/core';
import type { Blueprint } from '@forgegate/core-manifest';
import { WorkspaceService } from '../workspace.service';

/**
 * P2 first slice, item 1: "Choose the Button blueprint"
 * (`documentation/28-blueprint-studio-implementation-plan.md`'s Workstream 3
 * "Studio navigation and shell" and Release A "Proposal Studio").
 *
 * Deliberately narrow and honest about what it is not: this lists real
 * discovered blueprints (`WorkspaceService.blueprints`, parsed from
 * `.forgegate/blueprints/*.yaml`) and lets a designer select one, showing
 * its real authored metadata (purpose, required states, token slots). It
 * does not yet create a `ComponentProposal` — that domain model doesn't
 * exist yet (Workstream 1, tracked separately in TODO.md) — so selecting a
 * blueprint here is a real, terminal action for now, not the start of a
 * flow that silently goes nowhere. The page says so explicitly rather than
 * implying more is built than actually is.
 */
@Component({
  selector: 'app-studio-page',
  templateUrl: './studio-page.html',
  styleUrl: './studio-page.css',
})
export class StudioPage {
  protected readonly workspace = inject(WorkspaceService);
  protected readonly selectedBlueprintId = signal<string | null>(null);

  protected readonly selectedBlueprint = computed<Blueprint | null>(() => {
    const id = this.selectedBlueprintId();
    if (!id) {
      return null;
    }
    return this.workspace.blueprints().find((b) => b.id === id) ?? null;
  });

  protected selectBlueprint(id: string): void {
    this.selectedBlueprintId.set(id);
  }

  protected clearSelection(): void {
    this.selectedBlueprintId.set(null);
  }
}

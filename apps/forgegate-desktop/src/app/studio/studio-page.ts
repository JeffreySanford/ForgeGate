import { Component, computed, inject, signal } from '@angular/core';
import type { Blueprint, ComponentProposal } from '@forgegate/core-manifest';
import { WorkspaceService } from '../workspace.service';

/**
 * P2 first slice, items 1 and 2: "Choose the Button blueprint" and "Define
 * purpose and native semantics" (`documentation/28-blueprint-studio-
 * implementation-plan.md`'s Workstream 3 "Studio navigation and shell" and
 * Workstream 1 "Portable proposal domain", Release A "Proposal Studio").
 *
 * Deliberately narrow and honest about what it is not: choosing a
 * blueprint and drafting a `ComponentProposal`'s purpose and native
 * semantic confirmation is real and staged/approved through the same P2
 * entry gate 2 discipline every other domain write uses. Configuring the
 * contract, composing variants and states, anatomy, tokens, and everything
 * after remains unbuilt and the page says so explicitly.
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

  protected readonly purposeInput = signal('');
  protected readonly componentNameInput = signal('');
  protected readonly packagePathInput = signal('');
  protected readonly adapterInput = signal('');
  protected readonly nativeSemanticConfirmedInput = signal(false);

  protected readonly canCreateProposal = computed(
    () =>
      this.purposeInput().trim().length > 0 &&
      this.componentNameInput().trim().length > 0 &&
      this.packagePathInput().trim().length > 0 &&
      this.adapterInput().trim().length > 0,
  );

  protected selectBlueprint(id: string): void {
    this.selectedBlueprintId.set(id);
    const blueprint = this.workspace.blueprints().find((b) => b.id === id);
    this.purposeInput.set(blueprint?.purpose ?? '');
    this.componentNameInput.set('');
    this.packagePathInput.set('');
    this.adapterInput.set('');
    this.nativeSemanticConfirmedInput.set(false);
  }

  protected clearSelection(): void {
    this.selectedBlueprintId.set(null);
  }

  protected async createProposal(): Promise<void> {
    const blueprint = this.selectedBlueprint();
    if (!blueprint || !this.canCreateProposal()) {
      return;
    }
    const now = new Date().toISOString();
    const componentName = this.componentNameInput().trim();
    const proposal: ComponentProposal = {
      identity: {
        id: `proposal.${componentName}-${Date.now()}`,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      },
      blueprint: {
        blueprintId: blueprint.id,
        blueprintVersion: blueprint.version,
      },
      target: {
        componentName,
        packagePath: this.packagePathInput().trim(),
        adapter: this.adapterInput().trim(),
      },
      purpose: this.purposeInput().trim(),
      nativeSemanticConfirmed: this.nativeSemanticConfirmedInput(),
    };
    await this.workspace.stageProposal(proposal);
  }
}

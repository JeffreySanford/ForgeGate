import { Component, computed, inject, signal } from '@angular/core';
import type {
  Blueprint,
  ComponentProposal,
  ContractMember,
  ProposalContractDraft,
} from '@forgegate/core-manifest';
import { WorkspaceService } from '../workspace.service';

/** The five portable contract member categories, per `ProposalContractDraft`. */
export type ContractMemberCategory = keyof ProposalContractDraft;

const CONTRACT_MEMBER_CATEGORIES: readonly {
  readonly key: ContractMemberCategory;
  readonly label: string;
  readonly addLabel: string;
}[] = [
  { key: 'inputs', label: 'Inputs', addLabel: 'Add input' },
  { key: 'outputs', label: 'Outputs', addLabel: 'Add output' },
  { key: 'content', label: 'Content', addLabel: 'Add content slot' },
  {
    key: 'publicMethods',
    label: 'Public methods',
    addLabel: 'Add public method',
  },
  { key: 'styleParts', label: 'Style parts', addLabel: 'Add style part' },
];

function emptyContractDraft(): ProposalContractDraft {
  return {
    inputs: [],
    outputs: [],
    content: [],
    publicMethods: [],
    styleParts: [],
  };
}

/**
 * P2 first slice, items 1 through 3: "Choose the Button blueprint", "Define
 * purpose and native semantics", and "Configure the portable public
 * contract" (`documentation/28-blueprint-studio-implementation-plan.md`'s
 * Workstream 3 "Studio navigation and shell", Workstream 1 "Portable
 * proposal domain", and Workstream 4 "Button contract editor", Release A
 * "Proposal Studio").
 *
 * Deliberately narrow and honest about what it is not: choosing a
 * blueprint, drafting purpose and native semantic confirmation, and
 * editing a portable public contract (inputs/outputs/content/public
 * methods/style parts) is real and staged/approved through the same P2
 * entry gate 2 discipline every other domain write uses. This is not yet
 * Workstream 4's full inspector-driven contract editor (friendly labels,
 * organization-policy inheritance, invalid-combination explanations) —
 * just a real, generic, portable member list. Composing variants and
 * states, anatomy, tokens, and everything after remains unbuilt and the
 * page says so explicitly.
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
  protected readonly contractDraft =
    signal<ProposalContractDraft>(emptyContractDraft());
  protected readonly contractCategories = CONTRACT_MEMBER_CATEGORIES;

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
    this.contractDraft.set(emptyContractDraft());
  }

  protected clearSelection(): void {
    this.selectedBlueprintId.set(null);
  }

  protected addContractMember(category: ContractMemberCategory): void {
    const member: ContractMember = { name: '', required: false };
    this.contractDraft.update((draft) => ({
      ...draft,
      [category]: [...draft[category], member],
    }));
  }

  protected removeContractMember(
    category: ContractMemberCategory,
    index: number,
  ): void {
    this.contractDraft.update((draft) => ({
      ...draft,
      [category]: draft[category].filter((_, i) => i !== index),
    }));
  }

  protected updateContractMember(
    category: ContractMemberCategory,
    index: number,
    field: keyof ContractMember,
    value: string | boolean,
  ): void {
    this.contractDraft.update((draft) => ({
      ...draft,
      [category]: draft[category].map((member, i) =>
        i === index ? { ...member, [field]: value } : member,
      ),
    }));
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
      contract: this.contractDraft(),
    };
    await this.workspace.stageProposal(proposal);
  }
}

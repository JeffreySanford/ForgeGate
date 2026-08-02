import { Component, computed, inject, signal } from '@angular/core';
import type {
  Blueprint,
  ComponentProposal,
  ContractMember,
  ProposalAnatomyPart,
  ProposalContractDraft,
  ProposalTokenMapping,
  ProposalVariantSelection,
} from '@forgegate/core-manifest';
import { resolveDtcgAliases } from '../dtcg-tokens';
import { WorkspaceService } from '../workspace.service';
import {
  computePreviewTokenValues,
  previewSurfaceStyle,
} from './reference-preview';

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
 * P2 first slice, items 1 through 4 plus part of item 5 and item 6:
 * "Choose the Button blueprint", "Define purpose and native semantics",
 * "Configure the portable public contract", "Compose variants and
 * required states", anatomy parts plus token-slot mapping from "define
 * anatomy, slots, parts, token slots, behavior, and fixtures", and a real
 * reference preview
 * (`documentation/28-blueprint-studio-implementation-plan.md`'s Workstream
 * 3 "Studio navigation and shell", Workstream 1 "Portable proposal
 * domain", Workstream 4 "Button contract editor", Workstream 5 "State and
 * variant matrix", Workstream 6 "Anatomy editor", Workstream 7 "Token
 * mapping", and Workstream 9 "Reference preview", Release A "Proposal
 * Studio").
 *
 * Deliberately narrow and honest about what it is not: choosing a
 * blueprint, drafting purpose and native semantic confirmation, editing a
 * portable public contract, choosing required states plus a value per
 * blueprint inspector field, naming anatomy parts, mapping the blueprint's
 * own token slots to real discovered DTCG tokens, and previewing that data
 * before generation exists is real and staged/approved through the same
 * P2 entry gate 2 discipline every other domain write uses. This is not
 * yet Workstream 4's full inspector-driven contract editor, Workstream
 * 5's full variant×state coverage matrix, Workstream 6's anatomy tree
 * with spatial preview overlay, Workstream 7's `$type` validation against
 * a slot's declared types, or Workstream 9's theme/viewport/locale/
 * direction controls and true anatomy overlay — just real, generic,
 * portable lists and a plain reference surface. Behavior, fixtures, and
 * everything after item 6 remains unbuilt and the page says so explicitly.
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
  protected readonly requiredStatesInput = signal<readonly string[]>([]);
  protected readonly customStateInput = signal('');
  protected readonly variantSelectionsInput = signal<
    readonly ProposalVariantSelection[]
  >([]);
  protected readonly anatomyPartsInput = signal<readonly ProposalAnatomyPart[]>(
    [],
  );
  protected readonly tokenMappingsInput = signal<
    readonly ProposalTokenMapping[]
  >([]);

  protected readonly previewedStateInput = signal<string | null>(null);

  protected readonly previewTokenValues = computed(() =>
    computePreviewTokenValues(
      this.tokenMappingsInput(),
      resolveDtcgAliases(this.workspace.designTokens()),
    ),
  );

  protected readonly previewSurfaceStyle = computed(() =>
    previewSurfaceStyle(this.previewTokenValues()),
  );

  protected readonly totalContractMemberCount = computed(() => {
    const draft = this.contractDraft();
    return (
      draft.inputs.length +
      draft.outputs.length +
      draft.content.length +
      draft.publicMethods.length +
      draft.styleParts.length
    );
  });

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
    this.requiredStatesInput.set(blueprint?.requiredStates ?? []);
    this.customStateInput.set('');
    this.variantSelectionsInput.set([]);
    this.anatomyPartsInput.set([]);
    this.tokenMappingsInput.set([]);
    this.previewedStateInput.set(null);
  }

  protected setPreviewedState(state: string): void {
    this.previewedStateInput.set(state || null);
  }

  protected clearSelection(): void {
    this.selectedBlueprintId.set(null);
  }

  protected toggleRequiredState(state: string): void {
    this.requiredStatesInput.update((states) =>
      states.includes(state)
        ? states.filter((s) => s !== state)
        : [...states, state],
    );
  }

  protected addCustomRequiredState(): void {
    const state = this.customStateInput().trim();
    if (!state || this.requiredStatesInput().includes(state)) {
      return;
    }
    this.requiredStatesInput.update((states) => [...states, state]);
    this.customStateInput.set('');
  }

  protected setVariantSelection(fieldPath: string, value: string): void {
    this.variantSelectionsInput.update((selections) => {
      const withoutField = selections.filter(
        (selection) => selection.fieldPath !== fieldPath,
      );
      return value ? [...withoutField, { fieldPath, value }] : withoutField;
    });
  }

  protected variantSelectionValue(fieldPath: string): string {
    return (
      this.variantSelectionsInput().find(
        (selection) => selection.fieldPath === fieldPath,
      )?.value ?? ''
    );
  }

  protected addAnatomyPart(): void {
    const part: ProposalAnatomyPart = {
      id: '',
      label: '',
      required: false,
      publicSlot: false,
      publicPart: false,
    };
    this.anatomyPartsInput.update((parts) => [...parts, part]);
  }

  protected removeAnatomyPart(index: number): void {
    this.anatomyPartsInput.update((parts) =>
      parts.filter((_, i) => i !== index),
    );
  }

  protected updateAnatomyPart(
    index: number,
    field: keyof ProposalAnatomyPart,
    value: string | boolean,
  ): void {
    this.anatomyPartsInput.update((parts) =>
      parts.map((part, i) =>
        i === index ? { ...part, [field]: value } : part,
      ),
    );
  }

  protected setTokenMapping(slotId: string, tokenPath: string): void {
    this.tokenMappingsInput.update((mappings) => {
      const withoutSlot = mappings.filter(
        (mapping) => mapping.slotId !== slotId,
      );
      return tokenPath ? [...withoutSlot, { slotId, tokenPath }] : withoutSlot;
    });
  }

  protected tokenMappingValue(slotId: string): string {
    return (
      this.tokenMappingsInput().find((mapping) => mapping.slotId === slotId)
        ?.tokenPath ?? ''
    );
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
      requiredStates: this.requiredStatesInput(),
      variantSelections: this.variantSelectionsInput(),
      anatomyParts: this.anatomyPartsInput(),
      tokenMappings: this.tokenMappingsInput(),
    };
    await this.workspace.stageProposal(proposal);
  }
}

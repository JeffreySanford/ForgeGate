import { Component, computed, inject, signal } from '@angular/core';
import type {
  Blueprint,
  ComponentProposal,
  ContractMember,
  ProposalAnatomyPart,
  ProposalBehaviorDecisions,
  ProposalContentFixture,
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

function emptyBehaviorDecisions(): ProposalBehaviorDecisions {
  return {
    keyboardBehaviorSummary: '',
    accessibleNameStrategy: '',
    focusBehavior: '',
    loadingBehavior: '',
    announcementStrategy: '',
  };
}

/** The five behavior decision fields, per `ProposalBehaviorDecisions`. */
export type BehaviorDecisionField = keyof ProposalBehaviorDecisions;

const BEHAVIOR_DECISION_FIELDS: readonly {
  readonly key: BehaviorDecisionField;
  readonly label: string;
  readonly placeholder: string;
}[] = [
  {
    key: 'keyboardBehaviorSummary',
    label: 'Keyboard behavior summary',
    placeholder: 'Enter and Space activate the button.',
  },
  {
    key: 'accessibleNameStrategy',
    label: 'Accessible-name strategy',
    placeholder:
      'Icon-only use requires a real accessible label — describe how it is provided.',
  },
  {
    key: 'focusBehavior',
    label: 'Focus behavior',
    placeholder: 'Receives a visible focus ring; no focus trapping.',
  },
  {
    key: 'loadingBehavior',
    label: 'Loading and disabled behavior',
    placeholder: 'Loading disables activation and prevents duplicate presses.',
  },
  {
    key: 'announcementStrategy',
    label: 'Announcement strategy',
    placeholder: 'State changes announced via a polite live region.',
  },
];

/**
 * P2 first slice, items 1 through 4 plus part of item 5 and item 6:
 * "Choose the Button blueprint", "Define purpose and native semantics",
 * "Configure the portable public contract", "Compose variants and
 * required states", "define anatomy, slots, parts, token slots, behavior,
 * and fixtures" except fixtures, a real reference preview, and a real
 * handoff-to-engineering export
 * (`documentation/28-blueprint-studio-implementation-plan.md`'s Workstream
 * 3 "Studio navigation and shell", Workstream 1 "Portable proposal
 * domain", Workstream 4 "Button contract editor", Workstream 5 "State and
 * variant matrix", Workstream 6 "Anatomy editor", Workstream 7 "Token
 * mapping", Workstream 8 "Behavior and accessibility editor", Workstream 9
 * "Reference preview", and Workstream 13 "Handoff and proposal review",
 * Release A "Proposal Studio").
 *
 * Deliberately narrow and honest about what it is not: choosing a
 * blueprint, drafting purpose and native semantic confirmation, editing a
 * portable public contract, choosing required states plus a value per
 * blueprint inspector field, naming anatomy parts, mapping the blueprint's
 * own token slots to real discovered DTCG tokens, capturing free-text
 * behavior/accessibility decisions, previewing that data before generation
 * exists, and exporting an approved proposal as a real handoff package is
 * real and staged/approved through the same P2 entry gate 2 discipline
 * every other domain write uses. This is not yet Workstream 4's full
 * inspector-driven contract editor, Workstream 5's full variant×state
 * coverage matrix, Workstream 6's anatomy tree with spatial preview
 * overlay, Workstream 7's `$type` validation against a slot's declared
 * types, Workstream 8's guided per-decision UI with cross-field
 * validation, Workstream 9's theme/viewport/locale/direction controls and
 * true anatomy overlay, or Workstream 13's review checkpoints/comments —
 * just real, generic, portable lists, a plain reference surface, and a
 * checksum-verifiable export. Fixtures, and everything the generation
 * pipeline itself would require, remain unbuilt and the page says so
 * explicitly.
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
  protected readonly behaviorInput = signal<ProposalBehaviorDecisions>(
    emptyBehaviorDecisions(),
  );
  protected readonly behaviorFields = BEHAVIOR_DECISION_FIELDS;
  protected readonly contentFixturesInput = signal<
    readonly ProposalContentFixture[]
  >([]);

  protected readonly previewedStateInput = signal<string | null>(null);

  /** The proposal just approved into `.forgegate/proposals/`, kept only so
   * the "Hand off to engineering" action below has something real to
   * export — cleared on a fresh blueprint selection. */
  protected readonly approvedProposalForHandoff =
    signal<ComponentProposal | null>(null);

  protected readonly previewTokenValues = computed(() =>
    computePreviewTokenValues(
      this.tokenMappingsInput(),
      resolveDtcgAliases(this.workspace.designTokens()),
    ),
  );

  protected readonly previewSurfaceStyle = computed(() =>
    previewSurfaceStyle(this.previewTokenValues()),
  );

  /** Real fixture content takes priority in the reference preview when
   * one exists — the whole point of a fixture is to be the example
   * content shown, not the raw component name. Falls back honestly when
   * no fixture has a real value yet. */
  protected readonly previewDisplayText = computed(() => {
    const fixtureWithValue = this.contentFixturesInput().find(
      (fixture) => fixture.value.trim().length > 0,
    );
    return (
      fixtureWithValue?.value ||
      this.componentNameInput() ||
      this.selectedBlueprint()?.name ||
      ''
    );
  });

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
    this.behaviorInput.set(emptyBehaviorDecisions());
    this.contentFixturesInput.set([]);
    this.previewedStateInput.set(null);
    this.approvedProposalForHandoff.set(null);
  }

  protected updateBehaviorField(
    field: BehaviorDecisionField,
    value: string,
  ): void {
    this.behaviorInput.update((behavior) => ({ ...behavior, [field]: value }));
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

  protected addContentFixture(): void {
    const fixture: ProposalContentFixture = { id: '', label: '', value: '' };
    this.contentFixturesInput.update((fixtures) => [...fixtures, fixture]);
  }

  protected removeContentFixture(index: number): void {
    this.contentFixturesInput.update((fixtures) =>
      fixtures.filter((_, i) => i !== index),
    );
  }

  protected updateContentFixture(
    index: number,
    field: keyof ProposalContentFixture,
    value: string,
  ): void {
    this.contentFixturesInput.update((fixtures) =>
      fixtures.map((fixture, i) =>
        i === index ? { ...fixture, [field]: value } : fixture,
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
      behavior: this.behaviorInput(),
      contentFixtures: this.contentFixturesInput(),
    };
    await this.workspace.stageProposal(proposal);
  }

  protected async approveProposal(proposal: ComponentProposal): Promise<void> {
    await this.workspace.approveStagedProposal();
    if (!this.workspace.approveProposalError()) {
      this.approvedProposalForHandoff.set(proposal);
    }
  }

  protected async handOffToEngineering(): Promise<void> {
    const proposal = this.approvedProposalForHandoff();
    const blueprint = this.selectedBlueprint();
    if (!proposal || !blueprint) {
      return;
    }
    await this.workspace.exportProposalHandoff(proposal, blueprint);
  }
}

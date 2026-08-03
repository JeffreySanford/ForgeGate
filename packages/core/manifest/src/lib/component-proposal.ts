/**
 * A ComponentProposal is what Blueprint Studio produces before any
 * framework file exists — a portable, versioned record of the decisions a
 * designer has made about a new component, per
 * documentation/28-blueprint-studio-implementation-plan.md's Workstream 1
 * "Portable proposal domain". Distinct from a `ComponentManifest`: a
 * manifest describes a component that exists in a repository; a proposal
 * describes one that doesn't yet, and is never treated as evidence.
 *
 * Deliberately still a narrow slice of that workstream's full illustrative
 * shape — covering "choose a blueprint", "define purpose and native
 * semantics", "configure the portable public contract", "compose variants
 * and required states", and the entire "define anatomy, slots, parts,
 * token slots, behavior, and fixtures" checklist item, from P2's
 * first-slice checklist, not the entire eventual coverage/finding/
 * exception/generation-plan/revision model. Those remain real, named
 * gaps, not fabricated here.
 */

import type { ContractMember } from './contract';

export type ProposalStatus =
  'draft' | 'in-review' | 'approved' | 'generated' | 'abandoned';

/** Identity and lifecycle status — independent of the blueprint or target it references. */
export interface ProposalIdentity {
  readonly id: string;
  readonly status: ProposalStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Which blueprint, and which version of it, this proposal was started from. */
export interface BlueprintReference {
  readonly blueprintId: string;
  readonly blueprintVersion: string;
}

/** Where the eventual generated component would live — not yet a real repository write. */
export interface ProposalTargetDefinition {
  readonly componentName: string;
  readonly packagePath: string;
  readonly adapter: string;
}

/**
 * The designer's in-progress public contract for this proposal — the same
 * portable member shape (`ContractMember`) a real `ComponentContract`
 * eventually uses, but keyed to no `componentVersionId` yet, since no
 * component version exists. This is a draft, not the eventual generated
 * contract; it is what "configure the portable public contract" produces.
 */
export interface ProposalContractDraft {
  readonly inputs: readonly ContractMember[];
  readonly outputs: readonly ContractMember[];
  readonly content: readonly ContractMember[];
  readonly publicMethods: readonly ContractMember[];
  readonly styleParts: readonly ContractMember[];
}

/**
 * The designer's chosen value for one of the blueprint's own inspector
 * fields (`BlueprintInspectorField.path`) — e.g. an `appearance` field's
 * segmented control set to `outlined`. Portable and independent of any
 * particular framework's variant/property implementation.
 */
export interface ProposalVariantSelection {
  readonly fieldPath: string;
  readonly value: string;
}

/**
 * One meaningful, named part of the component's anatomy — e.g. "root",
 * "leading icon", "loading indicator" — per Workstream 6's anatomy editor.
 * Deliberately flat, with no tree nesting, preview-overlay coordinates, or
 * accessible-relationship graph yet.
 */
export interface ProposalAnatomyPart {
  readonly id: string;
  readonly label: string;
  readonly required: boolean;
  /** Whether this part is exposed as a public content/slot projection point. */
  readonly publicSlot: boolean;
  /** Whether this part is exposed as a public CSS styling part/hook. */
  readonly publicPart: boolean;
}

/**
 * The designer's mapping of one of the blueprint's own required token
 * slots (`BlueprintTokenSlot.id`) to a real, approved DTCG token path this
 * workspace already discovered — Workstream 7's "token mapping", without
 * yet validating the token's resolved `$type` against the slot's declared
 * `types`.
 */
export interface ProposalTokenMapping {
  readonly slotId: string;
  readonly tokenPath: string;
}

/**
 * The designer's guided behavior and accessibility decisions for this
 * proposal — Workstream 8's "behavior" half of "define anatomy, slots,
 * parts, token slots, behavior, and fixtures". Real, free-text decisions
 * captured early enough to inform stories, tests, reviews, and eventual
 * implementation hooks — not yet Workstream 8's full guided-decision UI
 * (per-decision explanations, cross-field validation like "icon-only use
 * requires an accessible-name strategy", or an exception-request
 * workflow). Every field defaults to an honest empty string, never a
 * fabricated placeholder.
 */
export interface ProposalBehaviorDecisions {
  readonly keyboardBehaviorSummary: string;
  readonly accessibleNameStrategy: string;
  readonly focusBehavior: string;
  readonly loadingBehavior: string;
  readonly announcementStrategy: string;
}

/**
 * One real, named example content value for previewing this proposal —
 * e.g. a "label" fixture of `"Submit"`, or an "icon" fixture of `"check"`.
 * The "fixtures" half of "define anatomy, slots, parts, token slots,
 * behavior, and fixtures" — a real, portable key-value list, not yet
 * Workstream 1's full `ContentFixture` shape (per-variant fixture sets,
 * long-content/empty-content/overflow scenarios, locale variants).
 */
export interface ProposalContentFixture {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

export interface ComponentProposal {
  readonly identity: ProposalIdentity;
  readonly blueprint: BlueprintReference;
  readonly target: ProposalTargetDefinition;
  /** The designer's own stated purpose for this specific component — may
   * start as the blueprint's own purpose text, but is a real, independent,
   * editable decision, not a copy that silently drifts from it. */
  readonly purpose: string;
  /** Whether the designer has explicitly confirmed the blueprint's
   * `preferredNativeElement` (or their own reasoned deviation) applies —
   * "native semantic confirmation" per Workstream 4. Defaults to `false`;
   * never silently assumed `true`. */
  readonly nativeSemanticConfirmed: boolean;
  readonly contract: ProposalContractDraft;
  /**
   * The interaction/appearance states this proposal commits to supporting
   * — starts as the blueprint's own `requiredStates`, but is a real,
   * independent, editable decision (a designer may add an
   * organization-required state the blueprint doesn't name, or — for now,
   * without validation preventing it — remove one). "Required states" per
   * P2's first-slice checklist.
   */
  readonly requiredStates: readonly string[];
  /**
   * The designer's chosen value for each blueprint inspector field they've
   * set — the "compose variants" half of P2's first-slice checklist item.
   * Deliberately just a flat portable list, not yet Workstream 5's full
   * variant×state coverage matrix (blueprint/organization/designer
   * indicators, unsupported-combination exclusion rationale, per-cell
   * story/test/preview/documentation markers).
   */
  readonly variantSelections: readonly ProposalVariantSelection[];
  /** Real, named anatomy parts — the "anatomy" and "parts" half of "define
   * anatomy, slots, parts, token slots, behavior, and fixtures". */
  readonly anatomyParts: readonly ProposalAnatomyPart[];
  /** Real mappings of the blueprint's own required token slots to approved
   * DTCG tokens — the "token slots" half of that same checklist item. */
  readonly tokenMappings: readonly ProposalTokenMapping[];
  /** The "behavior" half of that same checklist item — Workstream 8's
   * guided behavior and accessibility decisions. */
  readonly behavior: ProposalBehaviorDecisions;
  /** The "fixtures" half of that same checklist item — real, named
   * example content for previewing this proposal. */
  readonly contentFixtures: readonly ProposalContentFixture[];
}

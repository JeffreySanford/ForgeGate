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
 * semantics", and "configure the portable public contract" (the first
 * three items of P2's first-slice checklist), not the entire eventual
 * variant/anatomy/token/fixture/coverage/finding/exception/generation-plan/
 * revision model. Those remain real, named gaps, not fabricated here.
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
}

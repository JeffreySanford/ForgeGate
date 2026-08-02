/**
 * A ComponentProposal is what Blueprint Studio produces before any
 * framework file exists — a portable, versioned record of the decisions a
 * designer has made about a new component, per
 * documentation/28-blueprint-studio-implementation-plan.md's Workstream 1
 * "Portable proposal domain". Distinct from a `ComponentManifest`: a
 * manifest describes a component that exists in a repository; a proposal
 * describes one that doesn't yet, and is never treated as evidence.
 *
 * Deliberately the first, narrow slice of that workstream's full
 * illustrative shape — covering exactly "choose a blueprint" and "define
 * purpose and native semantics" (the first two items of P2's first-slice
 * checklist), not the entire eventual contract/variant/anatomy/token/
 * fixture/coverage/finding/exception/generation-plan/revision model. Those
 * remain real, named gaps, not fabricated here.
 */

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
}

export type ReleaseDecisionOutcome = 'authorized-candidate' | 'blocked';

/**
 * The final policy evaluation and authorized release state, tied to a
 * commit, evidence set, and policy version, per
 * documentation/16-data-and-schema-model.md ("ReleaseDecision") and
 * documentation/21-mvp-acceptance-criteria.md ("Policy and readiness").
 */
export interface ReleaseDecision {
  readonly id: string;
  readonly componentVersionId: string;
  readonly policyId: string;
  readonly policyVersion: string;
  readonly evidenceIds: readonly string[];
  readonly commit: string;
  readonly outcome: ReleaseDecisionOutcome;
  readonly blockingFindingIds: readonly string[];
  readonly approver?: string;
  readonly decidedAt: string;
}

/**
 * A decision can never claim "authorized-candidate" while blocking findings
 * remain open — that is exactly the silent-approval failure mode
 * documentation/20-risks-and-decisions.md warns against.
 */
export function createReleaseDecision(input: {
  id: string;
  componentVersionId: string;
  policyId: string;
  policyVersion: string;
  evidenceIds: readonly string[];
  commit: string;
  blockingFindingIds: readonly string[];
  approver?: string;
  decidedAt: string;
}): ReleaseDecision {
  const outcome: ReleaseDecisionOutcome =
    input.blockingFindingIds.length > 0 ? 'blocked' : 'authorized-candidate';
  if (outcome === 'authorized-candidate' && !input.approver) {
    throw new Error('An authorized-candidate release decision requires an approver');
  }
  return { ...input, outcome };
}

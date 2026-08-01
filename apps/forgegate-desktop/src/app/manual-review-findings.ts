import {
  createFinding,
  type Finding,
  type ManualReviewStepResult,
} from '@forgegate/core-evidence';

/**
 * "A failed step should create or link to a finding"
 * (documentation/09-manual-review-and-evidence.md). Converts each `failed`
 * or `blocked` step result from a completed guided manual review into a
 * real, structured `Finding` — linked back to the review that produced it
 * via `sourceEvidenceId`, and to the procedure via `standardOrPolicyRef`.
 * Pure and deterministic: the same review always produces the same
 * findings, so a step's finding id (`<reviewId>-step-<stepIndex>`) is
 * stable across re-derivations rather than a fresh UUID each time.
 *
 * Severity is a real, disclosed editorial classification (there is no
 * policy engine here either) — always `'serious'`, matching the same
 * classification `evidence-export.ts` already gives a confirmed automated
 * failure, since a failed manual review step is exactly that kind of
 * confirmed result, not an incompleteness gap.
 *
 * `componentId` is the fallback attribution for a review scoped to one
 * subject throughout. When an individual step result carries its own
 * `componentId` (a review that walks several real components, one step
 * group per component), that step's finding is attributed to the real
 * component it actually checked instead — so a failure found while
 * reviewing one component's assurance record shows up on that component's
 * own findings, not lumped onto whatever subject the review as a whole is
 * nominally about.
 */
export function findingsFromManualReviewStepResults(
  componentId: string,
  review: { readonly id: string; readonly procedureId: string },
  stepResults: readonly ManualReviewStepResult[],
): readonly Finding[] {
  return stepResults
    .filter(
      (result) => result.status === 'failed' || result.status === 'blocked',
    )
    .map((result) =>
      createFinding({
        id: `${review.id}-step-${result.stepIndex}`,
        componentId: result.componentId ?? componentId,
        scenario: result.action,
        description: result.note
          ? `${result.action} — expected: ${result.expected} ${result.note}`
          : `${result.action} — expected: ${result.expected}, but the review recorded ${result.status}.`,
        severity: 'serious',
        sourceEvidenceId: review.id,
        standardOrPolicyRef: review.procedureId,
      }),
    );
}

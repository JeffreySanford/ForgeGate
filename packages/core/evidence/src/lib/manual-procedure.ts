/**
 * A repeatable, ordered manual procedure a human follows to produce a real
 * `ManualReview`, per documentation/09-manual-review-and-evidence.md
 * ("Procedure model"). This is the definition a reviewer is guided through,
 * not the review record itself.
 *
 * Deliberately narrower than the full documented model: no preconditions,
 * starting state, required attachments, required reviewer role, or
 * expiration/re-review rule yet — those need their own real design, not a
 * placeholder field nobody's read yet. `appliesTo` and `steps` are the real
 * core of "what do I follow" and are what this guided-walkthrough first
 * slice actually uses.
 */
export interface ManualProcedureStep {
  readonly action: string;
  readonly expected: string;
}

export interface ManualProcedureEnvironment {
  readonly operatingSystem?: string;
  readonly assistiveTechnology?: readonly string[];
}

export interface ManualProcedure {
  readonly id: string;
  readonly version: string;
  readonly appliesTo: readonly string[];
  readonly environment?: ManualProcedureEnvironment;
  readonly steps: readonly ManualProcedureStep[];
}

/**
 * A repeatable, ordered manual procedure a human follows to produce a real
 * `ManualReview`, per documentation/09-manual-review-and-evidence.md
 * ("Procedure model"). This is the definition a reviewer is guided through,
 * not the review record itself.
 *
 * Deliberately narrower than the full documented model: no preconditions,
 * starting state, or required attachments yet — those need their own real
 * design, not a placeholder field nobody's read yet. `appliesTo`, `steps`,
 * `requiredReviewerRole`, and `expirationDays` are what this guided
 * walkthrough actually reads and enforces.
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
  /** A reviewer role this procedure requires (documentation/09's "Required
   * reviewer role"), matched case-insensitively against a review's own
   * `reviewerRole`. Absent means the procedure declares no role
   * requirement — any reviewer identity may record a result. */
  readonly requiredReviewerRole?: string;
  /** How many days a passed result stays valid before it needs a real
   * re-review (documentation/09's "Expiration or re-review rule"),
   * independent of whether the source commit itself has changed. Absent
   * means the procedure declares no expiration. */
  readonly expirationDays?: number;
}

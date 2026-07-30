import { createValidator, describeErrors } from '@forgegate/core-domain';
import type { ManualReview } from './evidence';
import { manualReviewSchema } from './schemas';

const validate = createValidator<ManualReview>(manualReviewSchema);

/**
 * Parses a repository-owned `.forgegate/manual-reviews/*.json` record — the
 * result of a human actually performing a declared manual review procedure
 * (documentation/07-compliance-testing.md, "Manual result model"), not the
 * procedure declaration itself (`ComponentManifest.manualReviewProcedureIds`
 * only says a procedure exists, never that anyone ran it). Invalid evidence
 * is rejected rather than allowed to influence readiness.
 */
export function parseManualReview(jsonText: string): ManualReview {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Manual review is not valid JSON: ${String(error)}`);
  }

  if (!validate(parsed)) {
    throw new Error(
      `Manual review does not match the schema: ${describeErrors(validate)}`,
    );
  }

  return parsed;
}

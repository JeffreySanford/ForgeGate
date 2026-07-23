/**
 * Normalized result status used across automated and manual evidence, per
 * documentation/16-data-and-schema-model.md ("Internal result format") and
 * the acceptance-journey language in documentation/21-mvp-acceptance-criteria.md.
 */
export type ResultStatus =
  | 'passed'
  | 'failed'
  | 'warning'
  | 'blocked'
  | 'skipped'
  | 'incomplete'
  | 'not-applicable'
  | 'unknown';

/**
 * Severity levels, consistent with the compliance-profile example in
 * documentation/07-compliance-testing.md (criticalFindingsAllowed,
 * seriousFindingsAllowed).
 */
export type Severity = 'critical' | 'serious' | 'moderate' | 'minor' | 'informational';

/**
 * A result is "blocking" only when it actually threatens release readiness.
 * Passed, skipped, not-applicable, and informational-severity results never
 * block on their own.
 */
export function isBlockingResult(status: ResultStatus, severity?: Severity): boolean {
  if (status === 'failed' || status === 'blocked') {
    return true;
  }
  if (status === 'incomplete') {
    return severity === 'critical' || severity === 'serious';
  }
  return false;
}

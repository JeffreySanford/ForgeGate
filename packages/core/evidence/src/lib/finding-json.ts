import { createValidator, describeErrors } from '@forgegate/core-domain';
import type { Finding } from './evidence';
import { findingSchema } from './schemas';

const validate = createValidator<Finding>(findingSchema);

/**
 * Parses a repository-owned `.forgegate/findings/*.json` record. Unlike
 * `.forgegate/exceptions/*.json`, these are not hand-authored today — the
 * guided manual-review walkthrough writes one real `Finding` per failed or
 * blocked step (see `findingsFromManualReviewStepResults`) — but the read
 * path is the same convention as every other repository-owned evidence
 * file, so a human or another tool authoring one by hand works too.
 */
export function parseFinding(jsonText: string): Finding {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Finding is not valid JSON: ${String(error)}`);
  }

  if (!validate(parsed)) {
    throw new Error(
      `Finding does not match the schema: ${describeErrors(validate)}`,
    );
  }

  return parsed;
}

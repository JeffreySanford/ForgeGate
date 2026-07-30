import { createValidator, describeErrors } from '@forgegate/core-domain';
import type { Exception } from './evidence';
import { exceptionSchema } from './schemas';

const validate = createValidator<Exception>(exceptionSchema);

/**
 * Parses a repository-owned `.forgegate/exceptions/*.json` record — a
 * human's explicit, rationale-bearing approval of a deviation against a
 * specific finding (documentation/16-data-and-schema-model.md, "Exception"),
 * not a computation ForgeGate can derive on its own. Invalid evidence is
 * rejected rather than allowed to influence readiness.
 */
export function parseException(jsonText: string): Exception {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Exception is not valid JSON: ${String(error)}`);
  }

  if (!validate(parsed)) {
    throw new Error(
      `Exception does not match the schema: ${describeErrors(validate)}`,
    );
  }

  return parsed;
}

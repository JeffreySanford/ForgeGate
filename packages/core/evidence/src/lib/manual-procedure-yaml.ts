import { createValidator, describeErrors } from '@forgegate/core-domain';
import { parse } from 'yaml';
import type { ManualProcedure } from './manual-procedure';
import { manualProcedureSchema } from './schemas';

const validate = createValidator<ManualProcedure>(manualProcedureSchema);

/**
 * Parses a repository-owned `.forgegate/procedures/<procedure-id>.yaml`
 * file — the ordered steps a human follows during a guided manual review,
 * per documentation/09-manual-review-and-evidence.md's own YAML example.
 * YAML (not JSON) to match that documented convention and the sibling
 * `.forgegate/components/*.yaml` component-manifest codec.
 */
export function parseManualProcedure(yamlText: string): ManualProcedure {
  let parsed: unknown;
  try {
    parsed = parse(yamlText);
  } catch (error) {
    throw new Error(`Manual procedure is not valid YAML: ${String(error)}`);
  }

  if (!validate(parsed)) {
    throw new Error(
      `Manual procedure does not match the schema: ${describeErrors(validate)}`,
    );
  }

  return parsed;
}

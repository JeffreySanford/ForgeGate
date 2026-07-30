import { createValidator, describeErrors } from '@forgegate/core-domain';
import { parse } from 'yaml';
import type { Blueprint } from './blueprint';
import { blueprintSchema } from './schemas';

const validate = createValidator<Blueprint>(blueprintSchema);

/**
 * Parses and schema-validates a `.forgegate/blueprints/<blueprint-id>.yaml`
 * file's contents. As with the other evidence and manifest codecs, a parse
 * or schema failure is reported, never silently swallowed.
 */
export function parseBlueprint(yamlText: string): Blueprint {
  let parsed: unknown;
  try {
    parsed = parse(yamlText);
  } catch (error) {
    throw new Error(`Blueprint is not valid YAML: ${String(error)}`);
  }

  if (!validate(parsed)) {
    throw new Error(`Blueprint does not match the schema: ${describeErrors(validate)}`);
  }

  return parsed;
}

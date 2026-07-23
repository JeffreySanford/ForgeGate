import { createValidator, describeErrors } from '@forgegate/core-domain';
import { parse, stringify } from 'yaml';
import type { ComponentManifest } from './component-manifest';
import { componentManifestSchema } from './component-manifest-schema';

const validate = createValidator<ComponentManifest>(componentManifestSchema);

/**
 * Parses and schema-validates a `.forgegate/components/<component-id>.yaml`
 * file's contents. As with the repository config codec, a parse or schema
 * failure is reported, never silently swallowed.
 */
export function parseComponentManifest(yamlText: string): ComponentManifest {
  let parsed: unknown;
  try {
    parsed = parse(yamlText);
  } catch (error) {
    throw new Error(`Component manifest is not valid YAML: ${String(error)}`);
  }

  if (!validate(parsed)) {
    throw new Error(`Component manifest does not match the schema: ${describeErrors(validate)}`);
  }

  return parsed;
}

export function serializeComponentManifest(manifest: ComponentManifest): string {
  return stringify(manifest);
}

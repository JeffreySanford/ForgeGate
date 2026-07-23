import { createValidator, describeErrors } from '@forgegate/core-domain';
import type { CustomElementsManifest } from './custom-elements-manifest';
import { customElementsManifestSchema } from './custom-elements-manifest-schema';

const validate = createValidator<CustomElementsManifest>(customElementsManifestSchema);

/**
 * Parses and loosely schema-validates a Custom Elements Manifest JSON
 * document. As with the other portable-record parsers in this repository,
 * a parse or shape failure is reported, never silently swallowed.
 */
export function parseCustomElementsManifest(jsonText: string): CustomElementsManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Custom Elements Manifest is not valid JSON: ${String(error)}`);
  }

  if (!validate(parsed)) {
    throw new Error(`Custom Elements Manifest does not have the expected shape: ${describeErrors(validate)}`);
  }

  return parsed;
}

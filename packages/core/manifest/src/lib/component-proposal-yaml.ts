import { createValidator, describeErrors } from '@forgegate/core-domain';
import { parse, stringify } from 'yaml';
import type { ComponentProposal } from './component-proposal';
import { componentProposalSchema } from './schemas';

const validate = createValidator<ComponentProposal>(componentProposalSchema);

/**
 * Parses and schema-validates a `.forgegate/proposals/<proposal-id>.yaml`
 * file's contents, per documentation/28's Workstream 1 "Storage" section.
 * As with the other manifest and evidence codecs, a parse or schema
 * failure is reported, never silently swallowed.
 */
export function parseComponentProposal(yamlText: string): ComponentProposal {
  let parsed: unknown;
  try {
    parsed = parse(yamlText);
  } catch (error) {
    throw new Error(`Component proposal is not valid YAML: ${String(error)}`);
  }

  if (!validate(parsed)) {
    throw new Error(
      `Component proposal does not match the schema: ${describeErrors(validate)}`,
    );
  }

  return parsed;
}

/** Serializes a `ComponentProposal` back to the YAML `.forgegate/proposals/<proposal-id>.yaml` stores. */
export function serializeComponentProposal(
  proposal: ComponentProposal,
): string {
  return stringify(proposal);
}

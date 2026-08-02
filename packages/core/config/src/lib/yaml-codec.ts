import { createValidator, describeErrors } from '@forgegate/core-domain';
import { parse, stringify } from 'yaml';
import type { RepositoryConfig } from './repository-config';
import { repositoryConfigSchema } from './schema';

const validate = createValidator<RepositoryConfig>(repositoryConfigSchema);

/**
 * Parses and schema-validates `.forgegate/config.yaml` contents. Per the
 * repository-write flow in documentation/02-system-architecture.md, ForgeGate
 * must never treat an invalid or hand-edited config file as silently valid —
 * a parse or schema failure is reported, not swallowed.
 */
export function parseRepositoryConfig(yamlText: string): RepositoryConfig {
  let parsed: unknown;
  try {
    parsed = parse(yamlText);
  } catch (error) {
    throw new Error(`.forgegate/config.yaml is not valid YAML: ${String(error)}`);
  }

  parsed = normalizeRepositoryConfig(parsed);

  if (!validate(parsed)) {
    throw new Error(`.forgegate/config.yaml does not match the repository config schema: ${describeErrors(validate)}`);
  }

  return parsed;
}

export function serializeRepositoryConfig(config: RepositoryConfig): string {
  return stringify(config);
}

function normalizeRepositoryConfig(parsed: unknown): unknown {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return parsed;
  }
  const record = parsed as Record<string, unknown>;
  return {
    ...record,
    policyMappings: record['policyMappings'] ?? [],
  };
}

import { parse } from 'yaml';

const ALLOWED_FORGEGATE_STARLIGHT_COMPONENTS = new Set([
  'AccessibilityRequirements',
  'ApiTable',
  'ComponentRegistry',
  'ComponentStatus',
  'ConsumerValidation',
  'EvidenceSummary',
  'ReleaseHistory',
  'StateMatrix',
  'StoryPreview',
  'TokenTable',
]);
const OVERVIEW_START = '{/* forgegate:user-content:start overview */}';
const OVERVIEW_END = '{/* forgegate:user-content:end overview */}';

export interface StarlightMdxValidationIssue {
  readonly code:
    | 'invalid-frontmatter'
    | 'missing-frontmatter'
    | 'missing-forgegate-metadata'
    | 'missing-import'
    | 'missing-protected-overview'
    | 'missing-section'
    | 'unknown-forgegate-component'
    | 'unsafe-script';
  readonly message: string;
}

export interface StarlightMdxValidationResult {
  readonly valid: boolean;
  readonly issues: readonly StarlightMdxValidationIssue[];
}

export function assertValidGeneratedStarlightMdx(source: string): void {
  const validation = validateGeneratedStarlightMdx(source);
  if (!validation.valid) {
    throw new Error(
      `Generated Starlight MDX failed validation: ${validation.issues
        .map((issue) => issue.message)
        .join('; ')}`,
    );
  }
}

export function validateGeneratedStarlightMdx(
  source: string,
): StarlightMdxValidationResult {
  const normalizedSource = source.replace(/\r\n/g, '\n');
  const issues: StarlightMdxValidationIssue[] = [];
  const frontmatter = parseFrontmatter(normalizedSource);

  if (!frontmatter.present) {
    issues.push({
      code: 'missing-frontmatter',
      message: 'Generated page must start with YAML frontmatter.',
    });
  } else if (frontmatter.error) {
    issues.push({
      code: 'invalid-frontmatter',
      message: `Generated page frontmatter is invalid YAML: ${frontmatter.error}`,
    });
  } else if (!hasForgeGateMetadata(frontmatter.data)) {
    issues.push({
      code: 'missing-forgegate-metadata',
      message:
        'Generated page frontmatter must include forgegate component or registry metadata.',
    });
  }

  if (/<script\b/i.test(normalizedSource)) {
    issues.push({
      code: 'unsafe-script',
      message: 'Generated page must not contain raw script tags.',
    });
  }

  const importedComponents =
    extractForgeGateStarlightComponentImports(normalizedSource);
  if (!importedComponents.length) {
    issues.push({
      code: 'missing-import',
      message:
        'Generated page must import ForgeGate Starlight presentation components.',
    });
  }
  for (const component of importedComponents) {
    if (!ALLOWED_FORGEGATE_STARLIGHT_COMPONENTS.has(component)) {
      issues.push({
        code: 'unknown-forgegate-component',
        message: `Generated page imports unknown ForgeGate Starlight component ${component}.`,
      });
    }
  }

  if (isRegistryPage(frontmatter.data)) {
    requireSections(normalizedSource, ['# Component registry', '## Components'])
      .map((section) => ({
        code: 'missing-section' as const,
        message: `Generated registry page is missing section ${section}.`,
      }))
      .forEach((issue) => issues.push(issue));
    if (!normalizedSource.includes('<ComponentRegistry')) {
      issues.push({
        code: 'missing-section',
        message: 'Generated registry page must include ComponentRegistry.',
      });
    }
  } else {
    requireSections(normalizedSource, [
      '## Overview',
      '## Tokens',
      '## Accessibility',
      '## Assurance',
    ])
      .map((section) => ({
        code: 'missing-section' as const,
        message: `Generated component page is missing section ${section}.`,
      }))
      .forEach((issue) => issues.push(issue));
    if (
      !normalizedSource.includes(OVERVIEW_START) ||
      !normalizedSource.includes(OVERVIEW_END)
    ) {
      issues.push({
        code: 'missing-protected-overview',
        message:
          'Generated component page must preserve the protected overview section.',
      });
    }
  }

  return { valid: issues.length === 0, issues };
}

function parseFrontmatter(source: string):
  | { readonly present: false; readonly data: null; readonly error: null }
  | {
      readonly present: true;
      readonly data: unknown;
      readonly error: string | null;
    } {
  if (!source.startsWith('---\n')) {
    return { present: false, data: null, error: null };
  }
  const endIndex = source.indexOf('\n---', 4);
  if (endIndex === -1) {
    return {
      present: true,
      data: null,
      error: 'missing closing frontmatter fence',
    };
  }
  try {
    return {
      present: true,
      data: parse(source.slice(4, endIndex)),
      error: null,
    };
  } catch (error) {
    return { present: true, data: null, error: String(error) };
  }
}

function hasForgeGateMetadata(data: unknown): boolean {
  if (!isRecord(data) || !isRecord(data['forgegate'])) {
    return false;
  }
  const forgegate = data['forgegate'];
  return (
    typeof forgegate['componentId'] === 'string' ||
    forgegate['page'] === 'component-registry'
  );
}

function isRegistryPage(data: unknown): boolean {
  return (
    isRecord(data) &&
    isRecord(data['forgegate']) &&
    data['forgegate']['page'] === 'component-registry'
  );
}

function extractForgeGateStarlightComponentImports(
  source: string,
): readonly string[] {
  const imports = source.matchAll(
    /import\s+\{(?<members>[^}]+)\}\s+from\s+['"]@forgegate\/starlight['"];?/g,
  );
  return [...imports].flatMap((match) =>
    (match.groups?.['members'] ?? '')
      .split(',')
      .map((member) => member.trim())
      .filter(Boolean),
  );
}

function requireSections(
  source: string,
  requiredSections: readonly string[],
): readonly string[] {
  return requiredSections.filter((section) => !source.includes(section));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

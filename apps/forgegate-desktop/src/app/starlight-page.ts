import type {
  Finding,
  ManualProcedure,
  ManualReview,
  TestExecution,
} from '@forgegate/core-evidence';
import type {
  ComponentManifest,
  ContractMember,
} from '@forgegate/core-manifest';
import { componentManifestPath } from '@forgegate/core-manifest';

const OVERVIEW_START = '{/* forgegate:user-content:start overview */}';
const OVERVIEW_END = '{/* forgegate:user-content:end overview */}';
const LEGACY_OVERVIEW_START = '<!-- forgegate:user-content:start overview -->';
const LEGACY_OVERVIEW_END = '<!-- forgegate:user-content:end overview -->';
const DEFAULT_OVERVIEW =
  'Add a one-line purpose and any content guidance for this component.';

export type StarlightPageTemplate =
  'designer' | 'balanced' | 'developer' | 'registry-index';

export type StarlightComponentPageTemplate = Exclude<
  StarlightPageTemplate,
  'registry-index'
>;

export interface StarlightTemplateOption {
  readonly id: StarlightPageTemplate;
  readonly label: string;
  readonly description: string;
}

export type StarlightAudienceTier =
  'designer-heavy' | 'balanced' | 'developer-heavy';

export interface StarlightAudienceOverrideConfig {
  readonly defaultAudience?: StarlightAudienceTier;
  readonly organizationAudiences: Readonly<
    Record<string, StarlightAudienceTier>
  >;
  readonly libraryAudiences: Readonly<Record<string, StarlightAudienceTier>>;
  readonly packageAudiences: Readonly<Record<string, StarlightAudienceTier>>;
  readonly componentAudiences: Readonly<Record<string, StarlightAudienceTier>>;
}

export const STARLIGHT_TEMPLATE_OPTIONS: readonly StarlightTemplateOption[] = [
  {
    id: 'designer',
    label: 'Designer component page',
    description:
      'State matrix, token usage, behavior guidance, and plain-language API.',
  },
  {
    id: 'balanced',
    label: 'Balanced component page',
    description:
      'Overview, examples, API, tokens, accessibility, and assurance summary.',
  },
  {
    id: 'developer',
    label: 'Developer component page',
    description:
      'API table, import snippets, signatures, examples, and raw evidence detail.',
  },
  {
    id: 'registry-index',
    label: 'Component registry index',
    description:
      'A generated Starlight registry overview for component status and inventory.',
  },
];

/**
 * The last dotted segment of a manifest id ("acme.design-system.acme-button"
 * -> "acme-button"), title-cased on hyphens ("Acme Button"). No `name`
 * field exists on `ComponentManifest` (documentation/16-data-and-schema-model.md's
 * "Component manifest" carries no display name), so this is a real,
 * deterministic derivation rather than a fabricated one.
 */
export function componentDisplayName(componentId: string): string {
  const segments = componentId.split('.');
  const lastSegment = segments[segments.length - 1] ?? componentId;
  return lastSegment
    .split('-')
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Extracts whatever real text a human previously wrote between the
 * generated page's protected overview markers, per
 * documentation/12-starlight-integration.md's "Protected content" —
 * regenerating a page must never destroy user-authored guidance. Returns
 * `null` if no page (or no protected section) exists yet.
 */
export function extractProtectedOverview(
  existingPageContent: string | null,
): string | null {
  if (!existingPageContent) {
    return null;
  }
  const marker = [
    { start: OVERVIEW_START, end: OVERVIEW_END },
    { start: LEGACY_OVERVIEW_START, end: LEGACY_OVERVIEW_END },
  ].find(
    ({ start, end }) =>
      existingPageContent.indexOf(start) !== -1 &&
      existingPageContent.indexOf(end) !== -1,
  );
  if (!marker) {
    return null;
  }
  const startIndex = existingPageContent.indexOf(marker.start);
  const endIndex = existingPageContent.indexOf(marker.end);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return null;
  }
  const content = existingPageContent
    .slice(startIndex + marker.start.length, endIndex)
    .trim();
  return content.length ? content : null;
}

function escapeYamlString(value: string): string {
  return JSON.stringify(value);
}

function escapeMdxText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;');
}

function escapeMdxAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;');
}

function serializeMdxExport(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function templateAudience(template: StarlightComponentPageTemplate): string {
  switch (template) {
    case 'designer':
      return 'designer-heavy';
    case 'developer':
      return 'developer-heavy';
    case 'balanced':
      return 'balanced';
  }
}

export function audienceToComponentTemplate(
  audience: StarlightAudienceTier,
): StarlightComponentPageTemplate {
  switch (audience) {
    case 'designer-heavy':
      return 'designer';
    case 'developer-heavy':
      return 'developer';
    case 'balanced':
      return 'balanced';
  }
}

export function parseStarlightAudienceOverrideConfig(
  adapterConfiguration: Readonly<Record<string, unknown>> | undefined,
): StarlightAudienceOverrideConfig {
  const raw = adapterConfiguration?.['starlight'];
  if (!isRecord(raw)) {
    return {
      organizationAudiences: {},
      libraryAudiences: {},
      packageAudiences: {},
      componentAudiences: {},
    };
  }
  return {
    defaultAudience: parseAudienceTier(raw['defaultAudience']),
    organizationAudiences: parseAudienceMap(raw['organizationAudiences']),
    libraryAudiences: parseAudienceMap(raw['libraryAudiences']),
    packageAudiences: parseAudienceMap(raw['packageAudiences']),
    componentAudiences: parseAudienceMap(raw['componentAudiences']),
  };
}

export function starlightTemplateForManifest(
  manifest: ComponentManifest,
  config: StarlightAudienceOverrideConfig,
): StarlightComponentPageTemplate {
  const [organization, library] = manifest.id.split('.');
  const libraryKey =
    organization && library ? `${organization}.${library}` : undefined;
  return audienceToComponentTemplate(
    config.componentAudiences[manifest.id] ??
      (libraryKey ? config.libraryAudiences[libraryKey] : undefined) ??
      (organization ? config.organizationAudiences[organization] : undefined) ??
      config.packageAudiences[manifest.packagePath] ??
      config.defaultAudience ??
      'designer-heavy',
  );
}

function parseAudienceMap(
  value: unknown,
): Record<string, StarlightAudienceTier> {
  if (!isRecord(value)) {
    return {};
  }
  const entries = Object.entries(value)
    .map(([key, rawAudience]) => [key, parseAudienceTier(rawAudience)] as const)
    .filter((entry): entry is readonly [string, StarlightAudienceTier] =>
      Boolean(entry[1]),
    );
  return Object.fromEntries(entries);
}

function parseAudienceTier(value: unknown): StarlightAudienceTier | undefined {
  return value === 'designer-heavy' ||
    value === 'balanced' ||
    value === 'developer-heavy'
    ? value
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function templateSlugSuffix(template: StarlightComponentPageTemplate): string {
  switch (template) {
    case 'designer':
      return '--for-designers';
    case 'developer':
      return '--for-developers';
    case 'balanced':
      return '';
  }
}

function componentSlug(componentId: string): string {
  const segments = componentId.split('.');
  return segments[segments.length - 1] ?? componentId;
}

function starlightComponentReportDataImportPath(
  componentId: string,
  template: StarlightComponentPageTemplate,
): string {
  return `../../../data/forgegate/components/${componentSlug(
    componentId,
  )}${templateSlugSuffix(template)}.json`;
}

function starlightRegistryReportDataImportPath(): string {
  return '../../../data/forgegate/components/index.json';
}

export function buildStarlightComponentReport(
  manifest: ComponentManifest,
  procedures: readonly ManualProcedure[],
  testExecutions: readonly TestExecution[],
  manualReviews: readonly ManualReview[],
  findings: readonly Finding[],
  evidenceCommit: string,
  tier: string,
): unknown {
  const storiesByState = new Map(
    manifest.storyMappings.map((mapping) => [
      mapping.stateName,
      mapping.storybookStoryId,
    ]),
  );
  const declaredIds = new Set(manifest.manualReviewProcedureIds);
  const componentVersion = manifest.componentVersion
    ? `${manifest.id}@${manifest.componentVersion}`
    : manifest.id;
  const automatedEvidence = testExecutions.filter(
    (execution) => execution.componentVersionId === componentVersion,
  );
  const connectedManualReviews = manualReviews.filter(
    (review) => review.componentVersionId === componentVersion,
  );
  const connectedFindings = findings.filter(
    (finding) => finding.componentId === manifest.id,
  );
  return {
    componentId: manifest.id,
    version: manifest.componentVersion ?? 'unreleased',
    lifecycle: manifest.lifecycle,
    evidenceCommit,
    packagePath: manifest.packagePath,
    tier,
    manifest: {
      schemaVersion: manifest.schemaVersion,
      path: componentManifestPath(manifest.id),
      framework: manifest.framework,
      adapter: manifest.adapter,
      sourceFiles: manifest.sourceFiles,
      documentationTargets: manifest.documentationTargets,
      ...(manifest.policyId ? { policyId: manifest.policyId } : {}),
      ...(manifest.policyVersion
        ? { policyVersion: manifest.policyVersion }
        : {}),
    },
    states: manifest.states.map((state) => ({
      name: state.name,
      required: state.required,
      ...(state.description ? { description: state.description } : {}),
      ...(storiesByState.get(state.name)
        ? { storybookStoryId: storiesByState.get(state.name) }
        : {}),
    })),
    tokens: manifest.tokenMappings.map((token) => ({
      tokenPath: token.tokenPath,
      category: token.category,
      required: token.required,
    })),
    contract: {
      inputs: manifest.contract.inputs,
      outputs: manifest.contract.outputs,
      content: manifest.contract.content,
      publicMethods: manifest.contract.publicMethods,
      styleParts: manifest.contract.styleParts,
    },
    manualProcedures: procedures
      .filter((procedure) => declaredIds.has(procedure.id))
      .map((procedure) => ({
        id: procedure.id,
        steps: procedure.steps.map((step) => ({
          action: step.action,
          expected: step.expected,
        })),
      })),
    evidence: {
      automated: automatedEvidence.map((execution) => ({
        id: execution.id,
        gate: execution.gate,
        tool: execution.tool,
        status: execution.status,
        commitOrFingerprint: execution.commitOrFingerprint,
        ...(execution.rawArtifactRef
          ? { rawArtifactRef: execution.rawArtifactRef }
          : {}),
      })),
      manualReviews: connectedManualReviews.map((review) => ({
        id: review.id,
        procedureId: review.procedureId,
        status: review.status,
        ...(review.reviewerRole ? { reviewerRole: review.reviewerRole } : {}),
        date: review.date,
        commitOrFingerprint: review.commitOrFingerprint,
      })),
      findings: connectedFindings.map((finding) => ({
        id: finding.id,
        description: finding.description,
        severity: finding.severity,
        status: finding.status,
      })),
    },
  };
}

export function generateStarlightComponentReportData(
  input: StarlightPageInput,
): string {
  const template = input.template ?? 'designer';
  return `${serializeMdxExport(
    buildStarlightComponentReport(
      input.manifest,
      input.procedures,
      input.testExecutions ?? [],
      input.manualReviews ?? [],
      input.findings ?? [],
      input.evidenceCommit,
      templateAudience(template),
    ),
  )}\n`;
}

export function buildStarlightRegistryReport(
  input: StarlightRegistryIndexInput,
): unknown {
  const sorted = [...input.manifests].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  return {
    evidenceCommit: input.evidenceCommit,
    componentCount: sorted.length,
    components: sorted.map((manifest) => ({
      componentId: manifest.id,
      version: manifest.componentVersion ?? 'unreleased',
      lifecycle: manifest.lifecycle,
      manifestPath: componentManifestPath(manifest.id),
      manifestSchemaVersion: manifest.schemaVersion,
    })),
  };
}

export function generateStarlightRegistryReportData(
  input: StarlightRegistryIndexInput,
): string {
  return `${serializeMdxExport(buildStarlightRegistryReport(input))}\n`;
}

function plainLanguageCapabilityLines(
  label: string,
  members: readonly ContractMember[],
): string[] {
  if (!members.length) {
    return [];
  }
  const lines = [`### ${label}`, ''];
  for (const member of members) {
    const requirement = member.required ? ' (required)' : '';
    const description = escapeMdxText(
      member.description ?? 'No description recorded yet.',
    );
    lines.push(
      `- **${escapeMdxText(member.name)}**${requirement}: ${description}`,
    );
  }
  lines.push('');
  return lines;
}

function accessibilityBehaviorLines(
  manifest: ComponentManifest,
  procedures: readonly ManualProcedure[],
): string[] {
  const declaredIds = new Set(manifest.manualReviewProcedureIds);
  const connected = procedures.filter((procedure) =>
    declaredIds.has(procedure.id),
  );
  if (!connected.length) {
    return ['No manual accessibility review procedure is connected yet.'];
  }
  const lines: string[] = [];
  for (const procedure of connected) {
    lines.push(`### ${escapeMdxText(procedure.id)}`, '');
    for (const step of procedure.steps) {
      lines.push(
        `- **${escapeMdxText(step.action)}** ${escapeMdxText(step.expected)}`,
      );
    }
    lines.push('');
  }
  return lines;
}

export interface StarlightPageInput {
  readonly manifest: ComponentManifest;
  readonly procedures: readonly ManualProcedure[];
  readonly testExecutions?: readonly TestExecution[];
  readonly manualReviews?: readonly ManualReview[];
  readonly findings?: readonly Finding[];
  /** The commit the generated evidence summary should be pinned to —
   * `WorkspaceService.gitStatus()?.commit`, never fabricated. */
  readonly evidenceCommit: string;
  /** Real text extracted from a previously generated page's protected
   * overview section (`extractProtectedOverview`), if one exists. */
  readonly existingOverview?: string | null;
  readonly template?: StarlightComponentPageTemplate;
}

export interface StarlightRegistryIndexInput {
  readonly manifests: readonly ComponentManifest[];
  readonly evidenceCommit: string;
}

export interface StarlightRegistryPageInput extends StarlightRegistryIndexInput {
  readonly componentReportTemplate?: StarlightComponentPageTemplate;
}

/**
 * Generates a real Starlight MDX component page in the "designer-heavy"
 * audience tier (documentation/12-starlight-integration.md's
 * "Audience-tier output": leads with `StateMatrix` and `TokenTable`,
 * includes an annotated example per state, summarizes the API as
 * plain-language capabilities rather than code, and states accessibility
 * requirements as behavior descriptions rather than an ARIA table), per
 * this session's request for "a standard designer template."
 *
 * Follows the doc's "Generated component page" template shape: frontmatter
 * `forgegate:` metadata, an embedded `forgegateReport` object for the
 * presentation components, and MDX-safe protected overview markers. It also
 * satisfies the MVP checklist: one Storybook link/embed,
 * API/states/tokens/accessibility/assurance summary, and one preserved
 * user-authored section. This function only produces MDX text; writing,
 * staging, and build validation happen elsewhere.
 */
export function generateDesignerStarlightComponentPage(
  input: StarlightPageInput,
): string {
  return generateStarlightComponentPage({ ...input, template: 'designer' });
}

export function generateStarlightComponentPage(
  input: StarlightPageInput,
): string {
  const { manifest, procedures, evidenceCommit } = input;
  const template = input.template ?? 'designer';
  const title = componentDisplayName(manifest.id);
  const version = manifest.componentVersion ?? 'unreleased';
  const overview = escapeMdxText(
    input.existingOverview?.trim() || DEFAULT_OVERVIEW,
  );
  const escapedComponentId = escapeMdxAttribute(manifest.id);
  const audience = templateAudience(template);

  const lines: string[] = [];
  lines.push('---');
  lines.push(`title: ${escapeYamlString(title)}`);
  lines.push(
    `description: ${escapeYamlString(
      `Designer-ready ForgeGate report for ${title}.`,
    )}`,
  );
  lines.push('forgegate:');
  lines.push(`  componentId: ${escapeYamlString(manifest.id)}`);
  lines.push(
    `  manifestPath: ${escapeYamlString(componentManifestPath(manifest.id))}`,
  );
  lines.push(
    `  manifestSchemaVersion: ${escapeYamlString(manifest.schemaVersion)}`,
  );
  lines.push(`  version: ${escapeYamlString(version)}`);
  lines.push(`  lifecycle: ${escapeYamlString(manifest.lifecycle)}`);
  lines.push(`  evidenceCommit: ${escapeYamlString(evidenceCommit)}`);
  lines.push(`  audience: ${escapeYamlString(audience)}`);
  lines.push(
    `  reportData: ${escapeYamlString(
      starlightComponentReportDataPath('', manifest.id, template),
    )}`,
  );
  lines.push('---');
  lines.push('');
  lines.push(
    "import { ComponentStatus, StoryPreview, StateMatrix, TokenTable, ApiTable, AccessibilityRequirements, EvidenceSummary, ConsumerValidation, ReleaseHistory } from '@forgegate/starlight';",
  );
  lines.push(
    `import forgegateReport from ${JSON.stringify(
      starlightComponentReportDataImportPath(manifest.id, template),
    )};`,
  );
  lines.push('');
  lines.push(
    `<ComponentStatus component="${escapedComponentId}" tier="${audience}" report={forgegateReport} />`,
  );
  lines.push('');
  lines.push('## Overview');
  lines.push('');
  lines.push(OVERVIEW_START);
  lines.push(overview);
  lines.push(OVERVIEW_END);
  lines.push('');

  if (template === 'developer') {
    lines.push('## Installation');
    lines.push('');
    lines.push('```ts');
    lines.push(`import '${escapeMdxText(manifest.packagePath)}';`);
    lines.push('```');
    lines.push('');
    lines.push('## API');
    lines.push('');
    lines.push(
      `<ApiTable component="${escapedComponentId}" tier="${audience}" report={forgegateReport} />`,
    );
    lines.push('');
    lines.push(...developerContractLines(manifest));
    lines.push('## Examples');
    lines.push('');
    lines.push(...stateExampleLines(manifest, true));
  } else if (template === 'balanced') {
    lines.push('## Examples');
    lines.push('');
    lines.push(...stateExampleLines(manifest, false));
    lines.push('## API');
    lines.push('');
    lines.push(
      `<ApiTable component="${escapedComponentId}" tier="${audience}" report={forgegateReport} />`,
    );
  } else {
    lines.push('## States');
    lines.push('');
    lines.push(
      `<StateMatrix component="${escapedComponentId}" tier="${audience}" report={forgegateReport} />`,
    );
    lines.push('');
    lines.push(...stateExampleLines(manifest, false));
    lines.push('## Capabilities');
    lines.push('');
    lines.push(
      ...plainLanguageCapabilityLines('Inputs', manifest.contract.inputs),
    );
    lines.push(
      ...plainLanguageCapabilityLines('Outputs', manifest.contract.outputs),
    );
    lines.push(
      ...plainLanguageCapabilityLines('Content', manifest.contract.content),
    );
    lines.push(
      ...plainLanguageCapabilityLines(
        'Public methods',
        manifest.contract.publicMethods,
      ),
    );
    lines.push(
      ...plainLanguageCapabilityLines(
        'Style parts',
        manifest.contract.styleParts,
      ),
    );
  }

  lines.push('');
  lines.push('## Tokens');
  lines.push('');
  lines.push(
    `<TokenTable component="${escapedComponentId}" tier="${audience}" report={forgegateReport} />`,
  );
  lines.push('');
  lines.push('## Accessibility');
  lines.push('');
  if (template === 'balanced' || template === 'developer') {
    lines.push(
      `<AccessibilityRequirements component="${escapedComponentId}" tier="${audience}" report={forgegateReport} />`,
    );
    lines.push('');
  } else {
    // The designer template has no <AccessibilityRequirements> component
    // on the page (it leads with StateMatrix/TokenTable instead, per
    // documentation/12-starlight-integration.md's "designer-heavy" tier),
    // so its plain-language behavior bullets are the only place this
    // shows — balanced/developer get it once, from the component above,
    // not duplicated here too.
    lines.push(...accessibilityBehaviorLines(manifest, procedures));
  }
  if (template === 'developer') {
    lines.push('## Consumer validation');
    lines.push('');
    lines.push(`<ConsumerValidation component="${escapedComponentId}" />`);
    lines.push('');
  }
  lines.push('## Assurance');
  lines.push('');
  lines.push(
    `<EvidenceSummary component="${escapedComponentId}" tier="${audience}" report={forgegateReport} />`,
  );
  if (template === 'developer') {
    lines.push('');
    lines.push('## Release history');
    lines.push('');
    lines.push(`<ReleaseHistory component="${escapedComponentId}" />`);
  }
  lines.push('');

  return lines.join('\n');
}

function stateExampleLines(
  manifest: ComponentManifest,
  includeCodeExample: boolean,
): string[] {
  const lines: string[] = [];
  if (manifest.states.length) {
    for (const state of manifest.states) {
      const story = manifest.storyMappings.find(
        (mapping) => mapping.stateName === state.name,
      );
      lines.push(`### ${escapeMdxText(state.name)}`);
      lines.push('');
      if (state.description) {
        lines.push(escapeMdxText(state.description));
        lines.push('');
      }
      if (story) {
        lines.push(
          `<StoryPreview storyId="${escapeMdxAttribute(story.storybookStoryId)}" />`,
        );
      } else {
        lines.push('No story is connected for this state yet.');
      }
      lines.push('');
      if (includeCodeExample) {
        lines.push('```html');
        lines.push(
          `<!-- Add a consumer-facing ${escapeMdxText(state.name)} example. -->`,
        );
        lines.push('```');
        lines.push('');
      }
    }
  } else {
    const defaultStory = manifest.storyMappings[0];
    if (defaultStory) {
      lines.push(
        `<StoryPreview storyId="${escapeMdxAttribute(defaultStory.storybookStoryId)}" />`,
      );
      lines.push('');
    } else {
      lines.push('No state stories are connected yet.');
      lines.push('');
    }
  }
  return lines;
}

function developerContractLines(manifest: ComponentManifest): string[] {
  const lines: string[] = [];
  const groups: readonly [string, readonly ContractMember[]][] = [
    ['Inputs', manifest.contract.inputs],
    ['Outputs', manifest.contract.outputs],
    ['Content', manifest.contract.content],
    ['Public methods', manifest.contract.publicMethods],
    ['Style parts', manifest.contract.styleParts],
  ];
  for (const [label, members] of groups) {
    lines.push(`### ${label}`, '');
    if (!members.length) {
      lines.push('None declared.', '');
      continue;
    }
    for (const member of members) {
      const type = member.type ? ` \`${escapeMdxText(member.type)}\`` : '';
      const required = member.required ? ' required' : '';
      const description = member.description
        ? ` — ${escapeMdxText(member.description)}`
        : '';
      lines.push(
        `- \`${escapeMdxText(member.name)}\`${type}${required}${description}`,
      );
    }
    lines.push('');
  }
  return lines;
}

export function generateStarlightRegistryIndexPage(
  input: StarlightRegistryPageInput,
): string {
  const sorted = [...input.manifests].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const componentReportTemplate = input.componentReportTemplate ?? 'designer';
  const lines: string[] = [];
  lines.push('---');
  lines.push(`title: ${escapeYamlString('Component registry')}`);
  lines.push(
    `description: ${escapeYamlString('Generated ForgeGate component registry overview.')}`,
  );
  lines.push('forgegate:');
  lines.push(`  page: ${escapeYamlString('component-registry')}`);
  lines.push(`  evidenceCommit: ${escapeYamlString(input.evidenceCommit)}`);
  lines.push(`  componentCount: ${sorted.length}`);
  lines.push(
    `  reportData: ${escapeYamlString(starlightRegistryReportDataPath(''))}`,
  );
  lines.push('---');
  lines.push('');
  lines.push(
    "import { ComponentRegistry, ComponentStatus, EvidenceSummary } from '@forgegate/starlight';",
  );
  lines.push(
    `import forgegateRegistry from ${JSON.stringify(
      starlightRegistryReportDataImportPath(),
    )};`,
  );
  for (const manifest of sorted) {
    lines.push(
      `import ${registryReportVariableName(manifest.id)} from ${JSON.stringify(
        starlightComponentReportDataImportPath(
          manifest.id,
          componentReportTemplate,
        ),
      )};`,
    );
  }
  lines.push('');
  lines.push('# Component registry');
  lines.push('');
  lines.push('<ComponentRegistry report={forgegateRegistry} />');
  lines.push('');
  lines.push('## Components');
  lines.push('');
  if (!sorted.length) {
    lines.push('No components are connected to this registry yet.');
    lines.push('');
    return lines.join('\n');
  }
  for (const manifest of sorted) {
    const componentId = escapeMdxAttribute(manifest.id);
    const name = escapeMdxText(componentDisplayName(manifest.id));
    const reportVariable = registryReportVariableName(manifest.id);
    lines.push(`### ${name}`);
    lines.push('');
    lines.push(
      `<ComponentStatus component="${componentId}" tier="${templateAudience(
        componentReportTemplate,
      )}" report={${reportVariable}} />`,
    );
    lines.push('');
    lines.push(
      `<EvidenceSummary component="${componentId}" tier="${templateAudience(
        componentReportTemplate,
      )}" report={${reportVariable}} />`,
    );
    lines.push('');
  }
  return lines.join('\n');
}

function registryReportVariableName(componentId: string): string {
  const name = componentSlug(componentId)
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment, index) =>
      index === 0
        ? segment[0]?.toLowerCase() + segment.slice(1)
        : segment[0]?.toUpperCase() + segment.slice(1),
    )
    .join('');
  return `${/^[a-zA-Z_]/.test(name) ? name : `component${name}`}Report`;
}

/**
 * The conventional path (workspace-root-relative) a generated component
 * page lands at, per documentation/12-starlight-integration.md's
 * "Proposed content layout" (`src/content/docs/components/<slug>.mdx`).
 * `starlightProjectDir` is a detected Starlight project's own root
 * relative to the workspace (`""` for a workspace-root project).
 */
export function starlightComponentPagePath(
  starlightProjectDir: string,
  componentId: string,
  template: StarlightComponentPageTemplate = 'balanced',
): string {
  const prefix = starlightProjectDir ? `${starlightProjectDir}/` : '';
  return `${prefix}src/content/docs/components/${componentSlug(
    componentId,
  )}${templateSlugSuffix(template)}.mdx`;
}

export function starlightComponentReportDataPath(
  starlightProjectDir: string,
  componentId: string,
  template: StarlightComponentPageTemplate = 'balanced',
): string {
  const prefix = starlightProjectDir ? `${starlightProjectDir}/` : '';
  return `${prefix}src/data/forgegate/components/${componentSlug(
    componentId,
  )}${templateSlugSuffix(template)}.json`;
}

export function starlightRegistryIndexPath(
  starlightProjectDir: string,
): string {
  const prefix = starlightProjectDir ? `${starlightProjectDir}/` : '';
  return `${prefix}src/content/docs/components/index.mdx`;
}

export function starlightRegistryReportDataPath(
  starlightProjectDir: string,
): string {
  const prefix = starlightProjectDir ? `${starlightProjectDir}/` : '';
  return `${prefix}src/data/forgegate/components/index.json`;
}

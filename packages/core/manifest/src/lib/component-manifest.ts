import type { DocumentationAdapter, LifecycleStatus } from '@forgegate/core-domain';
import type { ContractMember } from './contract';
import type { TestGate, TestScope } from './test-requirement';
import type { TokenCategory } from './token-reference';

/**
 * The shape of `.forgegate/components/<component-id>.yaml`, per
 * documentation/16-data-and-schema-model.md ("Component manifest") and
 * TODO.md Phase 4 ("Manifest specification").
 *
 * This is deliberately a leaner, unversioned cousin of the Phase 2 entities
 * in contract.ts/states.ts/token-reference.ts/test-requirement.ts: those
 * carry `id`/`componentVersionId` because they are evidence records tied to
 * a specific commit. A manifest is authored *before* any particular
 * version exists, so its nested shapes (ManifestState, ManifestTokenMapping,
 * ...) drop those fields rather than force a placeholder componentVersionId.
 */

export interface ManifestState {
  readonly name: string;
  readonly required: boolean;
  readonly description?: string;
}

export interface ManifestStoryMapping {
  readonly storybookStoryId: string;
  readonly stateName?: string;
}

export interface ManifestTokenMapping {
  readonly tokenPath: string;
  readonly category: TokenCategory;
  readonly required: boolean;
}

export interface ManifestTestRequirement {
  readonly gate: TestGate;
  readonly scope: TestScope;
  readonly required: boolean;
}

export interface ManifestDocumentationTarget {
  readonly adapter: DocumentationAdapter;
  readonly pathOrPageId?: string;
}

/**
 * Public inputs, outputs, content projection, public methods, and styling
 * API, per the portable-concept table in documentation/05-framework-adapters.md.
 * Events fold into `outputs`; attributes and CSS custom properties fold
 * into `styleParts` — this is a simplification, not a distinct field per
 * framework concept, tracked as a known gap rather than hidden.
 */
export interface ManifestContract {
  readonly inputs: readonly ContractMember[];
  readonly outputs: readonly ContractMember[];
  readonly content: readonly ContractMember[];
  readonly publicMethods: readonly ContractMember[];
  readonly styleParts: readonly ContractMember[];
}

export interface ComponentManifest {
  readonly schemaVersion: string;
  /** organization.library.component, per core-domain's buildComponentId. */
  readonly id: string;
  readonly framework: string;
  readonly adapter: string;
  readonly packagePath: string;
  readonly sourceFiles: readonly string[];
  readonly lifecycle: LifecycleStatus;
  readonly owner?: string;
  readonly reviewers: readonly string[];
  readonly contract: ManifestContract;
  readonly states: readonly ManifestState[];
  readonly themes: readonly string[];
  readonly densities: readonly string[];
  readonly viewports: readonly string[];
  readonly environments: readonly string[];
  readonly tokenMappings: readonly ManifestTokenMapping[];
  readonly storyMappings: readonly ManifestStoryMapping[];
  readonly testRequirements: readonly ManifestTestRequirement[];
  readonly manualReviewProcedureIds: readonly string[];
  readonly documentationTargets: readonly ManifestDocumentationTarget[];
  readonly consumerApplicationIds: readonly string[];
  readonly policyId?: string;
  readonly deprecatedInFavorOf?: string;
  readonly deprecationNotice?: string;
}

const COMPONENT_ID_PATTERN = /^[^.\s]+\.[^.\s]+\.[^.\s]+$/;

export function createComponentManifest(input: {
  id: string;
  framework: string;
  adapter: string;
  packagePath: string;
  schemaVersion?: string;
  sourceFiles?: readonly string[];
  lifecycle?: LifecycleStatus;
  owner?: string;
  reviewers?: readonly string[];
  contract?: Partial<ManifestContract>;
  states?: readonly ManifestState[];
  themes?: readonly string[];
  densities?: readonly string[];
  viewports?: readonly string[];
  environments?: readonly string[];
  tokenMappings?: readonly ManifestTokenMapping[];
  storyMappings?: readonly ManifestStoryMapping[];
  testRequirements?: readonly ManifestTestRequirement[];
  manualReviewProcedureIds?: readonly string[];
  documentationTargets?: readonly ManifestDocumentationTarget[];
  consumerApplicationIds?: readonly string[];
  policyId?: string;
  deprecatedInFavorOf?: string;
  deprecationNotice?: string;
}): ComponentManifest {
  if (!COMPONENT_ID_PATTERN.test(input.id)) {
    throw new Error(`Component manifest id "${input.id}" must be "organization.library.component"`);
  }
  if (!input.packagePath.trim()) {
    throw new Error('Component manifest requires a non-empty packagePath');
  }

  return {
    schemaVersion: input.schemaVersion ?? '0.1.0',
    id: input.id,
    framework: input.framework,
    adapter: input.adapter,
    packagePath: input.packagePath,
    sourceFiles: input.sourceFiles ?? [],
    lifecycle: input.lifecycle ?? 'proposal',
    owner: input.owner,
    reviewers: input.reviewers ?? [],
    contract: {
      inputs: input.contract?.inputs ?? [],
      outputs: input.contract?.outputs ?? [],
      content: input.contract?.content ?? [],
      publicMethods: input.contract?.publicMethods ?? [],
      styleParts: input.contract?.styleParts ?? [],
    },
    states: input.states ?? [],
    themes: input.themes ?? [],
    densities: input.densities ?? [],
    viewports: input.viewports ?? [],
    environments: input.environments ?? [],
    tokenMappings: input.tokenMappings ?? [],
    storyMappings: input.storyMappings ?? [],
    testRequirements: input.testRequirements ?? [],
    manualReviewProcedureIds: input.manualReviewProcedureIds ?? [],
    documentationTargets: input.documentationTargets ?? [],
    consumerApplicationIds: input.consumerApplicationIds ?? [],
    policyId: input.policyId,
    deprecatedInFavorOf: input.deprecatedInFavorOf,
    deprecationNotice: input.deprecationNotice,
  };
}

/** The conventional repository path for a component's manifest file, per `.forgegate/components/<component-id>.yaml`. */
export function componentManifestPath(componentId: string): string {
  return `.forgegate/components/${componentId}.yaml`;
}

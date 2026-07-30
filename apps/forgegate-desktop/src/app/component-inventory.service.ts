import { Injectable, computed, effect, inject } from '@angular/core';
import { buildComponentId } from '@forgegate/core-domain';
import {
  deriveOrganizationAndLibrary,
  mapCustomElementsManifestToComponentManifests,
  type MapCemFailure,
  type MapCemResult,
} from '@forgegate/adapter-web-components';
import type {
  ComponentManifest,
  ManifestContract,
  ManifestStoryMapping,
} from '@forgegate/core-manifest';
import { createComponentManifest } from '@forgegate/core-manifest';
import type {
  AngularComponentDeclaration,
  AngularMember,
} from './angular-components';
import { createStoryIndexLookup } from './storybook/storybook-index';
import { WorkspaceService } from './workspace.service';
import {
  componentVersionId,
  evaluateComponentReadiness,
  type ComponentReadinessEvaluation,
} from './component-readiness';

const EMPTY_MAP_RESULT: MapCemResult = { manifests: [], failures: [] };

export type ComponentProvenance =
  'owned' | 'workspace' | 'dependency' | 'tooling' | 'generated' | 'unknown';

export interface ComponentDiscovery {
  readonly manifest: MapCemResult['manifests'][number];
  readonly readiness: ComponentReadinessEvaluation;
  readonly classification: ComponentProvenance;
  readonly sourcePackage: string;
  readonly canonicalSource: string;
  readonly declarationCount: number;
  readonly sourceFiles: readonly string[];
}

export interface ComponentInventoryResult extends MapCemResult {
  readonly discoveries: readonly ComponentDiscovery[];
  readonly declarationCount: number;
  readonly duplicateGroupCount: number;
}

/**
 * The mapped-component-inventory computation used to live inline in the
 * workspace page component. Extracted so the workspace system map (P0.3)
 * can show real component counts/failures without duplicating the mapping
 * logic or re-parsing the manifest a second time.
 */
@Injectable({ providedIn: 'root' })
export class ComponentInventoryService {
  private readonly workspace = inject(WorkspaceService);
  private lastPersistedSnapshotKey: string | null = null;

  readonly result = computed<ComponentInventoryResult>(() => {
    const manifest = this.workspace.customElementsManifest();
    const { organization, library } = deriveOrganizationAndLibrary(
      this.workspace.workspaceScan()?.packageName ?? null,
    );
    const mapped = manifest
      ? mapCustomElementsManifestToComponentManifests(manifest, {
          organization,
          library,
          packagePath: '.',
        })
      : EMPTY_MAP_RESULT;
    const angularMapped = mapAngularDeclarationsToComponentManifests(
      this.workspace.angularComponents(),
      {
        organization,
        library,
        packagePath: '.',
      },
    );

    const storybookIndex = this.workspace.storybookIndex();
    // Built once per recompute, not once per component — see
    // createStoryIndexLookup's doc comment. With hundreds of components and
    // hundreds of Storybook index entries, rebuilding this map per
    // component was the one real O(components * storyEntries) cost in this
    // computed signal.
    const lookupStories = storybookIndex
      ? createStoryIndexLookup(storybookIndex)
      : null;
    const overrides = new Map(
      this.workspace
        .componentManifestOverrides()
        .map((item) => [item.id, item]),
    );
    const enriched = [...mapped.manifests, ...angularMapped.manifests].map(
      (componentManifest) => {
        const discoveredStories = lookupStories
          ? lookupStories(componentManifest.sourceFiles)
          : [];
        const override = overrides.get(componentManifest.id);
        return override
          ? applyRepositoryOverride(
              componentManifest,
              override,
              discoveredStories,
            )
          : { ...componentManifest, storyMappings: discoveredStories };
      },
    );
    const groups = new Map<string, (typeof enriched)[number][]>();
    for (const componentManifest of enriched) {
      const group = groups.get(componentManifest.id) ?? [];
      group.push(componentManifest);
      groups.set(componentManifest.id, group);
    }
    const selectedPackage = this.workspace
      .workspaceScan()
      ?.componentPackages?.find(
        (candidate) =>
          candidate.path === this.workspace.selectedComponentPackagePath(),
      );
    const scan = this.workspace.workspaceScan();
    const currentCommit = this.workspace.gitStatus()?.commit ?? null;
    const testExecutions = this.workspace.testExecutions();
    const manualReviews = this.workspace.manualReviews();
    const storybookIndexError = this.workspace.storybookIndexError();
    const starlightProjects = scan?.starlightProjects ?? [];
    const storybookProjects = scan?.storybookProjects ?? [];

    const discoveries = Array.from(groups.values()).map((declarations) => {
      const sourceFiles = Array.from(
        new Set(declarations.flatMap((item) => item.sourceFiles)),
      ).sort(
        (left, right) =>
          left.length - right.length || left.localeCompare(right),
      );
      const canonicalSource = sourceFiles[0] ?? 'unknown';
      const first = declarations[0];
      if (!first) {
        throw new Error('Component declaration group cannot be empty');
      }
      const manifest = { ...first, sourceFiles };
      const classification = classifySource(
        canonicalSource,
        selectedPackage?.path,
      );
      return {
        manifest,
        readiness: evaluateComponentReadiness({
          manifest,
          testExecutions: testExecutions.filter(
            (execution) =>
              execution.componentVersionId === componentVersionId(manifest),
          ),
          manualReviews: manualReviews.filter(
            (review) =>
              review.componentVersionId === componentVersionId(manifest),
          ),
          currentCommit,
          storybookProjects,
          storybookIndex,
          storybookIndexError,
          starlightProjects,
        }),
        classification,
        sourcePackage: resolveSourcePackage(
          canonicalSource,
          classification,
          selectedPackage?.name ?? this.workspace.workspaceScan()?.packageName,
        ),
        canonicalSource,
        declarationCount: declarations.length,
        sourceFiles,
      };
    });
    return {
      failures: [...mapped.failures, ...angularMapped.failures],
      manifests: discoveries.map((item) => item.manifest),
      discoveries,
      declarationCount: enriched.length,
      duplicateGroupCount: discoveries.filter(
        (item) => item.declarationCount > 1,
      ).length,
    };
  });

  private readonly persistEnrichedSnapshot = effect(() => {
    const workspacePath = this.workspace.workspacePath();
    const scanProgress = this.workspace.scanProgress();
    const gitStatus = this.workspace.gitStatus();
    const inventory = this.result();
    const diagnostics = this.workspace.adapterDiagnostics();
    if (
      !workspacePath ||
      scanProgress?.state !== 'complete' ||
      scanProgress.phase !== 'complete'
    ) {
      return;
    }

    const snapshot = {
      sourceCommit: gitStatus?.commit ?? null,
      dirty: gitStatus?.dirty ?? null,
      componentCount: inventory.manifests.length,
      readinessSummary: {
        total: inventory.manifests.length,
        readiness: countBy(
          inventory.discoveries.map((item) => item.readiness.readiness),
        ),
        lifecycle: countBy(
          inventory.manifests.map((manifest) => manifest.lifecycle),
        ),
      },
      adapterSummary: {
        total: diagnostics.length,
        byStatus: countBy(diagnostics.map((diagnostic) => diagnostic.status)),
        diagnostics: diagnostics.map((diagnostic) => ({
          id: diagnostic.id,
          adapter: diagnostic.adapter,
          source: diagnostic.source,
          status: diagnostic.status,
          error: diagnostic.error,
        })),
      },
      components: inventory.discoveries.map(({ manifest, readiness }) => ({
        componentId: manifest.id,
        componentVersion: manifest.componentVersion ?? null,
        framework: manifest.framework,
        adapter: manifest.adapter,
        lifecycle: manifest.lifecycle,
        sourceFiles: manifest.sourceFiles,
        readiness: readiness.readiness,
        findingSummary: readiness.findingSummary,
      })),
    };
    const snapshotKey = JSON.stringify({ workspacePath, snapshot });
    if (snapshotKey === this.lastPersistedSnapshotKey) {
      return;
    }
    this.lastPersistedSnapshotKey = snapshotKey;
    void this.workspace.recordEnrichedScanSnapshot(snapshot);
  });
}

/**
 * CEM remains authoritative for discovered source and public contract.
 * Repository manifests add the governance data CEM cannot express.
 */
function applyRepositoryOverride(
  discovered: ComponentManifest,
  override: ComponentManifest,
  discoveredStories: readonly ManifestStoryMapping[],
): ComponentManifest {
  return {
    ...discovered,
    componentVersion: override.componentVersion,
    lifecycle: override.lifecycle,
    owner: override.owner,
    reviewers: override.reviewers,
    states: override.states,
    themes: override.themes,
    densities: override.densities,
    viewports: override.viewports,
    environments: override.environments,
    tokenMappings: override.tokenMappings,
    storyMappings: mergeStoryMappings(
      override.storyMappings,
      discoveredStories,
    ),
    testRequirements: override.testRequirements,
    manualReviewProcedureIds: override.manualReviewProcedureIds,
    documentationTargets: override.documentationTargets,
    consumerApplicationIds: override.consumerApplicationIds,
    policyId: override.policyId,
    policyVersion: override.policyVersion,
    deprecatedInFavorOf: override.deprecatedInFavorOf,
    deprecationNotice: override.deprecationNotice,
  };
}

interface AngularMapOptions {
  readonly organization: string;
  readonly library: string;
  readonly packagePath: string;
}

function mapAngularDeclarationsToComponentManifests(
  declarations: readonly AngularComponentDeclaration[],
  options: AngularMapOptions,
): MapCemResult {
  const manifests: ComponentManifest[] = [];
  const failures: MapCemFailure[] = [];

  for (const declaration of declarations) {
    try {
      manifests.push(mapAngularDeclaration(declaration, options));
    } catch (error) {
      failures.push({
        declarationName: declaration.className,
        modulePath: declaration.sourceFile,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { manifests, failures };
}

function mapAngularDeclaration(
  declaration: AngularComponentDeclaration,
  options: AngularMapOptions,
): ComponentManifest {
  const selectorOrClass = declaration.selector ?? declaration.className;
  return createComponentManifest({
    id: buildComponentId(
      options.organization,
      options.library,
      sanitizeIdentitySegment(selectorOrClass),
    ),
    framework: 'angular',
    adapter: `framework.angular.source-scan.${declaration.confidence}`,
    packagePath: options.packagePath,
    sourceFiles: [declaration.sourceFile],
    contract: buildAngularContract(declaration),
  });
}

function buildAngularContract(
  declaration: AngularComponentDeclaration,
): Partial<ManifestContract> {
  return {
    inputs: declaration.inputs.map(angularMemberToContractMember),
    outputs: declaration.outputs.map(angularMemberToContractMember),
  };
}

function angularMemberToContractMember(member: AngularMember): {
  name: string;
  type?: string;
  required?: boolean;
  description?: string;
} {
  return {
    name: member.alias ?? member.name,
    type: member.type,
    required: member.required,
    description:
      member.alias && member.alias !== member.name
        ? `Class member: ${member.name}`
        : undefined,
  };
}

function sanitizeIdentitySegment(value: string): string {
  return value.replace(/[.\s]+/g, '-');
}

function mergeStoryMappings(
  authored: readonly ManifestStoryMapping[],
  discovered: readonly ManifestStoryMapping[],
): readonly ManifestStoryMapping[] {
  const mappings = new Map<string, ManifestStoryMapping>();
  for (const mapping of [...authored, ...discovered]) {
    const key = `${mapping.storybookStoryId}\0${mapping.stateName ?? ''}`;
    mappings.set(key, mapping);
  }
  return [...mappings.values()];
}

function resolveSourcePackage(
  sourcePath: string,
  classification: ComponentProvenance,
  ownedPackage?: string | null,
): string {
  if (classification === 'owned') return ownedPackage ?? 'Owned package';
  if (classification === 'tooling') return 'Tooling';
  if (classification === 'generated') return 'Generated output';
  const segments = sourcePath.replace(/\\/g, '/').split('/');
  if (classification === 'dependency') {
    const nodeModulesIndex = segments.lastIndexOf('node_modules');
    const first = segments[nodeModulesIndex + 1];
    return first?.startsWith('@')
      ? `${first}/${segments[nodeModulesIndex + 2] ?? ''}`
      : (first ?? 'Dependency');
  }
  if (classification === 'workspace') return segments.slice(0, 2).join('/');
  return 'Unknown';
}

function classifySource(
  sourcePath: string,
  selectedPackagePath?: string,
): ComponentProvenance {
  const path = sourcePath.replace(/\\/g, '/').toLowerCase();
  if (/(^|\/)(dist|coverage|\.nx|storybook-static|generated)(\/|$)/.test(path))
    return 'generated';
  if (/(^|\/)node_modules(\/|$)/.test(path)) return 'dependency';
  if (/(astro|storybook|dev-toolbar|test|fixture|vite|webpack)/.test(path))
    return 'tooling';
  if (path.startsWith('src/')) return 'owned';
  if (
    selectedPackagePath &&
    path.startsWith(`${selectedPackagePath.toLowerCase()}/`)
  )
    return 'owned';
  if (/^(apps|packages|libs)\//.test(path)) return 'workspace';
  return 'unknown';
}

function countBy<T extends string>(values: readonly T[]): Record<T, number> {
  const counts = {} as Record<T, number>;
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

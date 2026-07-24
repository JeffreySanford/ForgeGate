import { Injectable, computed, inject } from '@angular/core';
import {
  deriveOrganizationAndLibrary,
  mapCustomElementsManifestToComponentManifests,
  type MapCemResult,
} from '@forgegate/adapter-web-components';
import { findStoriesForSourceFiles } from './storybook/storybook-index';
import { WorkspaceService } from './workspace.service';

const EMPTY_MAP_RESULT: MapCemResult = { manifests: [], failures: [] };

export type ComponentProvenance =
  'owned' | 'workspace' | 'dependency' | 'tooling' | 'generated' | 'unknown';

export interface ComponentDiscovery {
  readonly manifest: MapCemResult['manifests'][number];
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

const EMPTY_INVENTORY_RESULT: ComponentInventoryResult = {
  ...EMPTY_MAP_RESULT,
  discoveries: [],
  declarationCount: 0,
  duplicateGroupCount: 0,
};

/**
 * The mapped-component-inventory computation used to live inline in the
 * workspace page component. Extracted so the workspace system map (P0.3)
 * can show real component counts/failures without duplicating the mapping
 * logic or re-parsing the manifest a second time.
 */
@Injectable({ providedIn: 'root' })
export class ComponentInventoryService {
  private readonly workspace = inject(WorkspaceService);

  readonly result = computed<ComponentInventoryResult>(() => {
    const manifest = this.workspace.customElementsManifest();
    if (!manifest) {
      return EMPTY_INVENTORY_RESULT;
    }
    const { organization, library } = deriveOrganizationAndLibrary(
      this.workspace.workspaceScan()?.packageName ?? null,
    );
    const mapped = mapCustomElementsManifestToComponentManifests(manifest, {
      organization,
      library,
      packagePath: '.',
    });

    const storybookIndex = this.workspace.storybookIndex();
    const enriched = storybookIndex
      ? mapped.manifests.map((componentManifest) => ({
          ...componentManifest,
          storyMappings: findStoriesForSourceFiles(
            storybookIndex,
            componentManifest.sourceFiles,
          ),
        }))
      : mapped.manifests;
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
      const classification = classifySource(
        canonicalSource,
        selectedPackage?.path,
      );
      return {
        manifest: { ...first, sourceFiles },
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
      failures: mapped.failures,
      manifests: discoveries.map((item) => item.manifest),
      discoveries,
      declarationCount: enriched.length,
      duplicateGroupCount: discoveries.filter(
        (item) => item.declarationCount > 1,
      ).length,
    };
  });
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

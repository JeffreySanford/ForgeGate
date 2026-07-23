import { Injectable, computed, inject } from '@angular/core';
import {
  deriveOrganizationAndLibrary,
  mapCustomElementsManifestToComponentManifests,
  type MapCemResult,
} from '@forgegate/adapter-web-components';
import { findStoriesForSourceFiles } from './storybook/storybook-index';
import { WorkspaceService } from './workspace.service';

const EMPTY_MAP_RESULT: MapCemResult = { manifests: [], failures: [] };

/**
 * The mapped-component-inventory computation used to live inline in the
 * workspace page component. Extracted so the workspace system map (P0.3)
 * can show real component counts/failures without duplicating the mapping
 * logic or re-parsing the manifest a second time.
 */
@Injectable({ providedIn: 'root' })
export class ComponentInventoryService {
  private readonly workspace = inject(WorkspaceService);

  readonly result = computed<MapCemResult>(() => {
    const manifest = this.workspace.customElementsManifest();
    if (!manifest) {
      return EMPTY_MAP_RESULT;
    }
    const { organization, library } = deriveOrganizationAndLibrary(this.workspace.workspaceScan()?.packageName ?? null);
    const mapped = mapCustomElementsManifestToComponentManifests(manifest, {
      organization,
      library,
      packagePath: '.',
    });

    const storybookIndex = this.workspace.storybookIndex();
    if (!storybookIndex) {
      return mapped;
    }

    return {
      ...mapped,
      manifests: mapped.manifests.map((componentManifest) => ({
        ...componentManifest,
        storyMappings: findStoriesForSourceFiles(storybookIndex, componentManifest.sourceFiles),
      })),
    };
  });
}

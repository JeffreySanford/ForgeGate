import { Component, computed, inject } from '@angular/core';
import {
  deriveOrganizationAndLibrary,
  mapCustomElementsManifestToComponentManifests,
  type MapCemResult,
} from '@forgegate/adapter-web-components';
import { GENERATE_CEM_COMMAND_TEXT, WorkspaceService } from '../workspace.service';

const EMPTY_MAP_RESULT: MapCemResult = { manifests: [], failures: [] };

@Component({
  selector: 'app-workspace-page',
  templateUrl: './workspace-page.html',
  styleUrl: './workspace-page.css',
})
export class WorkspacePage {
  protected readonly workspace = inject(WorkspaceService);
  protected readonly generateCemCommandText = GENERATE_CEM_COMMAND_TEXT;

  /**
   * The actual payoff of the CEM discovery/generation work: real
   * ComponentManifest records, not just a list of tag names. Organization
   * and library are derived from the workspace's package name via a
   * documented naming convention (`deriveOrganizationAndLibrary`) — not
   * real configured identity, since `.forgegate/config.yaml` has no
   * dedicated field for that yet. `failures` holds any declaration that
   * couldn't be mapped (shown in the UI, not silently dropped) — the
   * mapper reports per-declaration problems rather than losing every
   * sibling component over one bad one.
   */
  protected readonly componentMapResult = computed<MapCemResult>(() => {
    const manifest = this.workspace.customElementsManifest();
    if (!manifest) {
      return EMPTY_MAP_RESULT;
    }
    const { organization, library } = deriveOrganizationAndLibrary(this.workspace.workspaceScan()?.packageName ?? null);
    return mapCustomElementsManifestToComponentManifests(manifest, {
      organization,
      library,
      packagePath: '.',
    });
  });

  generateCustomElementsManifest(): void {
    void this.workspace.generateCustomElementsManifest();
  }
}

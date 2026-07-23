import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  deriveOrganizationAndLibrary,
  mapCustomElementsManifestToComponentManifests,
} from '@forgegate/adapter-web-components';
import { GENERATE_CEM_COMMAND_TEXT, WorkspaceService } from './workspace.service';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'ForgeGate';
  protected workspace = inject(WorkspaceService);
  protected readonly generateCemCommandText = GENERATE_CEM_COMMAND_TEXT;

  /**
   * The actual payoff of the CEM discovery/generation work: real
   * ComponentManifest records, not just a list of tag names. Organization
   * and library are derived from the workspace's package name via a
   * documented naming convention (`deriveOrganizationAndLibrary`) — not
   * real configured identity, since `.forgegate/config.yaml` has no
   * dedicated field for that yet.
   */
  protected readonly componentManifests = computed(() => {
    const manifest = this.workspace.customElementsManifest();
    if (!manifest) {
      return [];
    }
    const { organization, library } = deriveOrganizationAndLibrary(this.workspace.workspaceScan()?.packageName ?? null);
    return mapCustomElementsManifestToComponentManifests(manifest, {
      organization,
      library,
      packagePath: '.',
    });
  });

  openWorkspace(): void {
    void this.workspace.selectWorkspace();
  }

  generateCustomElementsManifest(): void {
    void this.workspace.generateCustomElementsManifest();
  }
}

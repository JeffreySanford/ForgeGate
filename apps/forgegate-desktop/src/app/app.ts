import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { customElementDeclarations } from '@forgegate/adapter-web-components';
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

  protected readonly customElementTags = computed(() => {
    const manifest = this.workspace.customElementsManifest();
    if (!manifest) {
      return [];
    }
    return customElementDeclarations(manifest)
      .map(({ declaration }) => declaration.tagName)
      .filter((tagName): tagName is string => Boolean(tagName));
  });

  openWorkspace(): void {
    void this.workspace.selectWorkspace();
  }

  generateCustomElementsManifest(): void {
    void this.workspace.generateCustomElementsManifest();
  }
}

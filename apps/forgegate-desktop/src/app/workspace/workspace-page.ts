import { Component, inject } from '@angular/core';
import { ComponentInventoryService } from '../component-inventory.service';
import { GENERATE_CEM_COMMAND_TEXT, WorkspaceService } from '../workspace.service';
import { SystemMap } from './system-map';

@Component({
  imports: [SystemMap],
  selector: 'app-workspace-page',
  templateUrl: './workspace-page.html',
  styleUrl: './workspace-page.css',
})
export class WorkspacePage {
  protected readonly workspace = inject(WorkspaceService);
  protected readonly generateCemCommandText = GENERATE_CEM_COMMAND_TEXT;
  protected readonly componentMapResult = inject(ComponentInventoryService).result;

  generateCustomElementsManifest(): void {
    void this.workspace.generateCustomElementsManifest();
  }
}

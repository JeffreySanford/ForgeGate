import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ComponentInventoryService } from '../component-inventory.service';
import { WorkspaceService } from '../workspace.service';
import { AssuranceJourney } from './assurance-journey';
import { SystemMap } from './system-map';
import { WorkspaceScanProgressView } from './workspace-scan-progress';

@Component({
  imports: [AssuranceJourney, SystemMap, WorkspaceScanProgressView, RouterLink],
  selector: 'app-workspace-page',
  templateUrl: './workspace-page.html',
  styleUrl: './workspace-page.css',
})
export class WorkspacePage {
  protected readonly workspace = inject(WorkspaceService);
  protected readonly componentMapResult = inject(ComponentInventoryService)
    .result;

  selectComponentPackage(path: string): void {
    this.workspace.selectComponentPackage(path);
  }

  generateCustomElementsManifest(): void {
    void this.workspace.generateCustomElementsManifest();
  }
}

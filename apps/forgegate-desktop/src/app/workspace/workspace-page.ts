import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ComponentInventoryService } from '../component-inventory.service';
import { WorkspaceService } from '../workspace.service';
import { AdapterConstellationView } from './adapter-constellation-view';
import { AssuranceJourney } from './assurance-journey';
import { ChangeImpactTable } from './change-impact-table';
import { DocumentationDriftMap } from './documentation-drift-map';
import { EvidenceTimelineView } from './evidence-timeline-view';
import { SystemMap } from './system-map';
import { TokenTopologyView } from './token-topology-view';
import { WorkspaceScanProgressView } from './workspace-scan-progress';

@Component({
  imports: [
    AssuranceJourney,
    SystemMap,
    WorkspaceScanProgressView,
    RouterLink,
    DocumentationDriftMap,
    ChangeImpactTable,
    AdapterConstellationView,
    EvidenceTimelineView,
    TokenTopologyView,
  ],
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

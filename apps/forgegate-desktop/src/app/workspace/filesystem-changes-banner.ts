import { Component, inject } from '@angular/core';
import { WorkspaceService } from '../workspace.service';

@Component({
  selector: 'app-filesystem-changes-banner',
  templateUrl: './filesystem-changes-banner.html',
  styleUrl: './filesystem-changes-banner.css',
})
export class FilesystemChangesBanner {
  protected readonly workspace = inject(WorkspaceService);

  protected rescan(): void {
    void this.workspace.rescanWorkspace();
  }

  protected dismiss(): void {
    this.workspace.dismissFilesystemChanges();
  }
}

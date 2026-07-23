import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { WorkspaceService } from './workspace.service';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'ForgeGate';
  protected workspace = inject(WorkspaceService);

  openWorkspace(): void {
    void this.workspace.selectWorkspace();
  }
}

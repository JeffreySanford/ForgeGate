import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { WorkspaceService } from './workspace.service';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = 'ForgeGate';
  protected readonly workspace = inject(WorkspaceService);
  private readonly router = inject(Router);
  private readonly mainContent = viewChild.required<ElementRef<HTMLElement>>('mainContent');

  constructor() {
    // Route-change focus management (P0.2): move focus to the main content
    // landmark on every navigation so a keyboard/screen-reader user isn't
    // silently left focused on a nav link that's no longer where the page
    // content is, per documentation/25's route-change focus requirement.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.mainContent().nativeElement.focus());
  }

  openWorkspace(): void {
    void this.workspace.selectWorkspace();
  }
}

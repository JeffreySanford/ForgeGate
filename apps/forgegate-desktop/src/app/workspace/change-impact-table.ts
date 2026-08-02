import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { computeChangeImpact } from '../change-impact';
import { ComponentInventoryService } from '../component-inventory.service';
import { WorkspaceService } from '../workspace.service';

/**
 * P1.4's real slice: real changed files from `git status --porcelain`
 * (`WorkspaceService.gitStatus().changedFiles`) matched against each
 * discovered component's own `sourceFiles`, then cross-referenced through
 * that component to its real stories, test executions, manual reviews,
 * documentation targets, and release decisions (`computeChangeImpact`). A
 * changed file with no matching component is shown as "No component
 * matched" rather than hidden, so the table never implies precision the
 * adapter does not possess.
 */
@Component({
  selector: 'app-change-impact-table',
  imports: [RouterLink],
  templateUrl: './change-impact-table.html',
  styleUrl: './change-impact-table.css',
})
export class ChangeImpactTable {
  protected readonly workspace = inject(WorkspaceService);
  private readonly inventory = inject(ComponentInventoryService);

  protected readonly entries = computed(() =>
    computeChangeImpact(
      this.workspace.gitStatus()?.changedFiles ?? [],
      this.inventory.result().discoveries,
      this.workspace.testExecutions(),
      this.workspace.manualReviews(),
      this.workspace.releaseDecisionRecords(),
    ),
  );

  protected componentName(id: string): string {
    const parts = id.split('.');
    return parts[parts.length - 1] ?? id;
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import type {
  ManualReview,
  ManualReviewStepResult,
} from '@forgegate/core-evidence';
import type { ResultStatus } from '@forgegate/core-domain';
import { RESULT_STATUS_OPTIONS, worstStatus } from '../manual-review-status';
import {
  FORGEGATE_SHELL_COMPONENT_ID,
  FORGEGATE_SHELL_PROCEDURE_ID,
  FORGEGATE_SHELL_PROCEDURE_VERSION,
  SELF_REVIEW_AREAS,
  flattenSelfReviewSteps,
} from '../self-review-content';
import { WorkspaceService } from '../workspace.service';

/**
 * A guided self-review of ForgeGate's own shell — the one manual
 * accessibility gate (TODO.md P0.7) no agent can complete. Walks a
 * reviewer (designer or accessibility specialist) through
 * `SELF_REVIEW_AREAS` one real area at a time with NVDA/JAWS/VoiceOver
 * running, records a real per-step result for each, and stages/diffs/
 * approves the resulting `ManualReview` through the exact same
 * `WorkspaceService.stageManualReview`/`approveStagedManualReview`
 * mechanism `ManualReviewWalkthrough` uses for a target repo's component —
 * this is not a separate, bespoke persistence path.
 *
 * Because this reviews ForgeGate's own shell rather than a component
 * discovered in some workspace's inventory, it records a synthetic, real,
 * disclosed `componentVersionId` (`FORGEGATE_SHELL_COMPONENT_ID`) rather
 * than fabricating a component that doesn't exist. Saving still requires a
 * workspace to be open, since staging writes into `.forgegate/` under
 * whatever workspace path is current — the intended flow is to open
 * ForgeGate's own repository as that workspace, so the resulting evidence
 * record lands in ForgeGate's own history, reviewable and git-trackable
 * like everything else ForgeGate tracks.
 */
@Component({
  selector: 'app-accessibility-review-page',
  templateUrl: './accessibility-review-page.html',
  styleUrl: './accessibility-review-page.css',
})
export class AccessibilityReviewPage {
  protected readonly workspace = inject(WorkspaceService);
  protected readonly areas = SELF_REVIEW_AREAS;
  protected readonly resultStatusOptions = RESULT_STATUS_OPTIONS;
  private readonly flatSteps = flattenSelfReviewSteps(SELF_REVIEW_AREAS);

  protected readonly currentAreaIndex = signal(0);
  protected readonly currentArea = computed(
    () => this.areas[this.currentAreaIndex()],
  );

  /** Keyed by the step's global index across every area, not per-area —
   * matches `flatSteps`' order, so a saved review's `stepResults` line up
   * with what's recorded here without an extra mapping step. */
  protected readonly stepStatuses = signal<Record<number, ResultStatus>>({});
  protected readonly stepNotes = signal<Record<number, string>>({});

  protected readonly reviewerIdentity = signal('');
  protected readonly reviewerRole = signal('');
  protected readonly operatingSystem = signal('');
  protected readonly assistiveTechnology = signal('');
  protected readonly notes = signal('');

  protected readonly overallStatus = computed<ResultStatus>(() => {
    const statuses = this.stepStatuses();
    return worstStatus(
      this.flatSteps.map((_, index) => statuses[index] ?? 'unknown'),
    );
  });

  protected readonly canSave = computed<boolean>(
    () =>
      !!this.workspace.workspacePath() &&
      this.reviewerIdentity().trim().length > 0 &&
      this.operatingSystem().trim().length > 0 &&
      this.assistiveTechnology().trim().length > 0,
  );

  /** The global step index a given area's local step index maps to. */
  protected globalStepIndex(areaIndex: number, localStepIndex: number): number {
    let offset = 0;
    for (let i = 0; i < areaIndex; i++) {
      offset += this.areas[i]?.steps.length ?? 0;
    }
    return offset + localStepIndex;
  }

  protected goToArea(index: number): void {
    if (index >= 0 && index < this.areas.length) {
      this.currentAreaIndex.set(index);
    }
  }

  protected nextArea(): void {
    this.goToArea(this.currentAreaIndex() + 1);
  }

  protected previousArea(): void {
    this.goToArea(this.currentAreaIndex() - 1);
  }

  protected setStepStatus(globalIndex: number, status: string): void {
    this.stepStatuses.update((current) => ({
      ...current,
      [globalIndex]: status as ResultStatus,
    }));
  }

  protected setStepNote(globalIndex: number, note: string): void {
    this.stepNotes.update((current) => ({ ...current, [globalIndex]: note }));
  }

  protected stepStatus(globalIndex: number): ResultStatus {
    return this.stepStatuses()[globalIndex] ?? 'unknown';
  }

  protected stepNote(globalIndex: number): string {
    return this.stepNotes()[globalIndex] ?? '';
  }

  protected save(): void {
    if (!this.canSave()) {
      return;
    }
    const commit = this.workspace.gitStatus()?.commit ?? 'unknown';
    const statuses = this.stepStatuses();
    const notes = this.stepNotes();
    const stepResults: ManualReviewStepResult[] = this.flatSteps.map(
      (step, index) => ({
        stepIndex: index,
        action: step.action,
        expected: step.expected,
        status: statuses[index] ?? 'unknown',
        ...(notes[index]?.trim() ? { note: notes[index].trim() } : {}),
      }),
    );
    const review: ManualReview = {
      id: `${FORGEGATE_SHELL_PROCEDURE_ID}-${Date.now()}`,
      componentVersionId: FORGEGATE_SHELL_COMPONENT_ID,
      procedureId: FORGEGATE_SHELL_PROCEDURE_ID,
      procedureVersion: FORGEGATE_SHELL_PROCEDURE_VERSION,
      reviewerIdentity: this.reviewerIdentity().trim(),
      ...(this.reviewerRole().trim()
        ? { reviewerRole: this.reviewerRole().trim() }
        : {}),
      date: new Date().toISOString(),
      operatingSystem: this.operatingSystem().trim(),
      assistiveTechnology: this.assistiveTechnology().trim(),
      status: this.overallStatus(),
      ...(this.notes().trim() ? { notes: this.notes().trim() } : {}),
      commitOrFingerprint: commit,
      stepResults,
    };
    void this.workspace.stageManualReview(review, FORGEGATE_SHELL_COMPONENT_ID);
  }

  protected approve(): void {
    void this.workspace.approveStagedManualReview();
  }

  protected discard(): void {
    void this.workspace.discardStagedManualReview();
  }
}

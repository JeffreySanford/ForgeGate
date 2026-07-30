import { Component, computed, inject, input, signal } from '@angular/core';
import type { ResultStatus } from '@forgegate/core-domain';
import type {
  ManualProcedure,
  ManualReview,
  ManualReviewStepResult,
} from '@forgegate/core-evidence';
import type { ComponentManifest } from '@forgegate/core-manifest';
import { componentVersionId } from '../component-readiness';
import { WorkspaceService } from '../workspace.service';

const RESULT_STATUS_OPTIONS: readonly ResultStatus[] = [
  'passed',
  'failed',
  'warning',
  'blocked',
  'skipped',
  'incomplete',
  'not-applicable',
  'unknown',
];

/**
 * Worst-first rank used to roll many real per-step results up into one
 * overall `ManualReview.status` — lower is worse. A review is never more
 * confident than its worst-recorded step: one `blocked` step makes the
 * whole review `blocked`, no matter how many other steps passed.
 */
const STATUS_SEVERITY_RANK: Readonly<Record<ResultStatus, number>> = {
  blocked: 0,
  failed: 1,
  warning: 2,
  incomplete: 3,
  unknown: 4,
  skipped: 5,
  'not-applicable': 6,
  passed: 7,
};

function worstStatus(statuses: readonly ResultStatus[]): ResultStatus {
  return statuses.reduce((worst, status) =>
    STATUS_SEVERITY_RANK[status] < STATUS_SEVERITY_RANK[worst] ? status : worst,
  );
}

/**
 * The guided manual-review walkthrough (documentation/09-manual-review-and-evidence.md,
 * "Procedure model"): the reviewer picks one of the component's own
 * declared, connected procedures, records a real per-step result for each
 * ordered step (not just one overall outcome), confirms the environment
 * they actually reviewed in, and saves. `WorkspaceService.stageManualReview`
 * stages the resulting `ManualReview` — with real `stepResults` — plus a
 * real `Finding` for every step recorded as `failed` or `blocked`
 * (`findingsFromManualReviewStepResults`), per the doc's "A failed step
 * should create or link to a finding." Nothing is written into the
 * reviewed workspace yet at this point: the reviewer must review the real
 * staged diff and explicitly approve it (`approveStagedManualReview`) or
 * discard it (`discardStagedManualReview`), per P2 entry gate 2.
 *
 * The overall `status` on the saved review is never chosen directly — it
 * is always the real worst-of-steps rollup, so it can't silently disagree
 * with what the per-step results actually say.
 *
 * When the selected procedure declares a `requiredReviewerRole`
 * (documentation/09's "Required reviewer role"), saving is blocked until
 * the entered reviewer role matches it (case-insensitively) — a review
 * recorded by the wrong role is not a substitute for the real one. A
 * declared `expirationDays` (the doc's "Expiration or re-review rule") is
 * shown as a real, disclosed hint here; it is not yet enforced anywhere
 * else in the app (see TODO.md).
 *
 * Deliberately narrower than the full documented model still: no required
 * attachments, no preconditions, no starting-state field.
 */
@Component({
  selector: 'app-manual-review-walkthrough',
  templateUrl: './manual-review-walkthrough.html',
  styleUrl: './manual-review-walkthrough.css',
})
export class ManualReviewWalkthrough {
  protected readonly workspace = inject(WorkspaceService);
  readonly manifest = input.required<ComponentManifest>();
  protected readonly resultStatusOptions = RESULT_STATUS_OPTIONS;

  protected readonly availableProcedures = computed<
    readonly ManualProcedure[]
  >(() => {
    const declaredIds = new Set(this.manifest().manualReviewProcedureIds);
    return this.workspace
      .procedures()
      .filter((procedure) => declaredIds.has(procedure.id));
  });

  protected readonly selectedProcedureId = signal<string | null>(null);
  protected readonly selectedProcedure = computed<ManualProcedure | null>(
    () =>
      this.availableProcedures().find(
        (procedure) => procedure.id === this.selectedProcedureId(),
      ) ?? null,
  );

  /** Keyed by step index. A step not yet given a real result defaults to
   * `'unknown'` rather than a silently assumed `'passed'` — the reviewer
   * must explicitly record what happened. */
  protected readonly stepStatuses = signal<Record<number, ResultStatus>>({});
  protected readonly stepNotes = signal<Record<number, string>>({});

  protected readonly reviewerIdentity = signal('');
  protected readonly reviewerRole = signal('');
  protected readonly operatingSystem = signal('');
  protected readonly browser = signal('');
  protected readonly assistiveTechnology = signal('');
  protected readonly storyOrScenario = signal('');
  protected readonly notes = signal('');

  protected readonly overallStatus = computed<ResultStatus>(() => {
    const procedure = this.selectedProcedure();
    if (!procedure || procedure.steps.length === 0) {
      return 'unknown';
    }
    const statuses = this.stepStatuses();
    return worstStatus(
      procedure.steps.map((_, index) => statuses[index] ?? 'unknown'),
    );
  });

  protected readonly reviewerRoleMismatch = computed<boolean>(() => {
    const required = this.selectedProcedure()?.requiredReviewerRole;
    if (!required) {
      return false;
    }
    return (
      this.reviewerRole().trim().toLowerCase() !== required.toLowerCase()
    );
  });

  protected readonly canSave = computed<boolean>(
    () =>
      !!this.selectedProcedure() &&
      this.reviewerIdentity().trim().length > 0 &&
      this.operatingSystem().trim().length > 0 &&
      !this.reviewerRoleMismatch(),
  );

  protected selectProcedure(procedureId: string): void {
    this.selectedProcedureId.set(procedureId || null);
    const procedure = this.availableProcedures().find(
      (candidate) => candidate.id === procedureId,
    );
    this.operatingSystem.set(procedure?.environment?.operatingSystem ?? '');
    this.assistiveTechnology.set(
      (procedure?.environment?.assistiveTechnology ?? []).join(', '),
    );
    this.reviewerRole.set(procedure?.requiredReviewerRole ?? '');
    this.stepStatuses.set({});
    this.stepNotes.set({});
  }

  protected setStepStatus(stepIndex: number, status: string): void {
    this.stepStatuses.update((current) => ({
      ...current,
      [stepIndex]: status as ResultStatus,
    }));
  }

  protected setStepNote(stepIndex: number, note: string): void {
    this.stepNotes.update((current) => ({ ...current, [stepIndex]: note }));
  }

  protected stepStatus(stepIndex: number): ResultStatus {
    return this.stepStatuses()[stepIndex] ?? 'unknown';
  }

  protected stepNote(stepIndex: number): string {
    return this.stepNotes()[stepIndex] ?? '';
  }

  protected save(): void {
    const procedure = this.selectedProcedure();
    if (!procedure || !this.canSave()) {
      return;
    }
    const manifest = this.manifest();
    const commit = this.workspace.gitStatus()?.commit ?? 'unknown';
    const statuses = this.stepStatuses();
    const notes = this.stepNotes();
    const stepResults: ManualReviewStepResult[] = procedure.steps.map(
      (step, index) => ({
        stepIndex: index,
        action: step.action,
        expected: step.expected,
        status: statuses[index] ?? 'unknown',
        ...(notes[index]?.trim() ? { note: notes[index].trim() } : {}),
      }),
    );
    const review: ManualReview = {
      id: `${manifest.id}-${procedure.id}-${Date.now()}`,
      componentVersionId: componentVersionId(manifest),
      procedureId: procedure.id,
      procedureVersion: procedure.version,
      reviewerIdentity: this.reviewerIdentity().trim(),
      ...(this.reviewerRole().trim()
        ? { reviewerRole: this.reviewerRole().trim() }
        : {}),
      date: new Date().toISOString(),
      operatingSystem: this.operatingSystem().trim(),
      ...(this.browser().trim() ? { browser: this.browser().trim() } : {}),
      ...(this.assistiveTechnology().trim()
        ? { assistiveTechnology: this.assistiveTechnology().trim() }
        : {}),
      ...(this.storyOrScenario().trim()
        ? { storyOrScenario: this.storyOrScenario().trim() }
        : {}),
      status: this.overallStatus(),
      ...(this.notes().trim() ? { notes: this.notes().trim() } : {}),
      commitOrFingerprint: commit,
      stepResults,
    };
    void this.workspace.stageManualReview(review, manifest.id);
  }

  protected approve(): void {
    void this.workspace.approveStagedManualReview();
  }

  protected discard(): void {
    void this.workspace.discardStagedManualReview();
  }
}

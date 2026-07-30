import { Component, computed, inject, input, signal } from '@angular/core';
import type { ResultStatus } from '@forgegate/core-domain';
import type { ManualProcedure, ManualReview } from '@forgegate/core-evidence';
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
 * A real, narrow first slice of the documented guided manual-review flow
 * (documentation/09-manual-review-and-evidence.md, "Procedure model"): the
 * reviewer picks one of the component's own declared, connected procedures,
 * reads its ordered steps, confirms the environment they actually reviewed
 * in, records an overall result, and saves it as a real
 * `.forgegate/manual-reviews/<id>.json` file — the exact same file shape
 * `WorkspaceService.loadManualReviews` already reads back.
 *
 * Deliberately not per-step result tracking yet (one overall `status`, from
 * the same real `ResultStatus` enum every other evidence record already
 * uses — not the documented per-step "Observation"/"Needs follow-up"
 * states, which nothing in the schema supports yet). The steps are shown so
 * the reviewer actually follows them, but only one recorded outcome comes
 * out the other end. Extending to real per-step results is a disclosed,
 * separate next step, not fabricated here.
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

  protected readonly reviewerIdentity = signal('');
  protected readonly reviewerRole = signal('');
  protected readonly operatingSystem = signal('');
  protected readonly browser = signal('');
  protected readonly assistiveTechnology = signal('');
  protected readonly storyOrScenario = signal('');
  protected readonly status = signal<ResultStatus>('passed');
  protected readonly notes = signal('');

  protected readonly canSave = computed<boolean>(
    () =>
      !!this.selectedProcedure() &&
      this.reviewerIdentity().trim().length > 0 &&
      this.operatingSystem().trim().length > 0,
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
  }

  protected save(): void {
    const procedure = this.selectedProcedure();
    if (!procedure || !this.canSave()) {
      return;
    }
    const manifest = this.manifest();
    const commit = this.workspace.gitStatus()?.commit ?? 'unknown';
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
      status: this.status(),
      ...(this.notes().trim() ? { notes: this.notes().trim() } : {}),
      commitOrFingerprint: commit,
    };
    void this.workspace.saveManualReview(review);
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type {
  ManualReview,
  ManualReviewStepResult,
} from '@forgegate/core-evidence';
import type { ResultStatus } from '@forgegate/core-domain';
import { ComponentInventoryService } from '../component-inventory.service';
import { componentVersionId } from '../component-readiness';
import { freshnessLabel, isStaleAgainstCommit } from '../evidence-freshness';
import { FocusOnRevealDirective } from '../focus-on-reveal.directive';
import { RESULT_STATUS_OPTIONS, worstStatus } from '../manual-review-status';
import {
  buildComponentRecordSteps,
  COMPONENT_RECORD_AREA_ID,
  COMPONENT_RECORD_AREA_SUMMARY,
  COMPONENT_RECORD_AREA_TITLE,
  COMPONENT_RECORD_CHECK_TEMPLATES,
  FORGEGATE_SHELL_COMPONENT_ID,
  FORGEGATE_SHELL_PROCEDURE_ID,
  FORGEGATE_SHELL_PROCEDURE_VERSION,
  SELF_REVIEW_AREAS,
  flattenSelfReviewSteps,
  type SelfReviewArea,
} from '../self-review-content';
import { WorkspaceService } from '../workspace.service';

/** A discovered component annotated with whether it still needs a human look. */
interface ComponentReviewStatus {
  readonly id: string;
  readonly name: string;
  readonly needsAttention: boolean;
  readonly latestReviewStatus: ResultStatus | null;
}

const CHECKS_PER_COMPONENT = COMPONENT_RECORD_CHECK_TEMPLATES.length;

/**
 * A guided self-review of ForgeGate's own shell — the one manual
 * accessibility gate (TODO.md P0.7) no agent can complete. Walks a
 * reviewer (designer or accessibility specialist) through the fixed
 * `SELF_REVIEW_AREAS` (shell, workspace, inventory — identical regardless
 * of which repository is open) plus a fourth, repo-specific area built from
 * whatever the currently open workspace actually discovered
 * (`buildComponentRecordSteps`), records a real per-step result for each,
 * and stages/diffs/approves the resulting `ManualReview` through the exact
 * same `WorkspaceService.stageManualReview`/`approveStagedManualReview`
 * mechanism `ManualReviewWalkthrough` uses for a target repo's component —
 * this is not a separate, bespoke persistence path.
 *
 * The fourth area's component list is sorted so components with no real
 * `ManualReview` yet, or a stale one, sort first — a component with a
 * fresh, passed review doesn't need another human look right now, so the
 * reviewer's limited time is spent where it's actually missing. Nothing is
 * hidden, only reordered: a large repo still shows every component.
 *
 * Because reviewing ForgeGate's own shell itself isn't about any one
 * component, the overall review records a synthetic, real, disclosed
 * `componentVersionId` (`FORGEGATE_SHELL_COMPONENT_ID`) — but each
 * component-record step carries its own real `componentId`, so a failed
 * check is attributed to the actual component reviewed, not lumped onto
 * the shell (`manual-review-findings.ts`). Saving still requires a
 * workspace to be open, since staging writes into `.forgegate/` under
 * whatever workspace path is current — the intended flow is to open
 * ForgeGate's own repository as that workspace, so the resulting evidence
 * record lands in ForgeGate's own history, reviewable and git-trackable
 * like everything else ForgeGate tracks.
 */
@Component({
  selector: 'app-accessibility-review-page',
  imports: [FocusOnRevealDirective, RouterLink],
  templateUrl: './accessibility-review-page.html',
  styleUrl: './accessibility-review-page.css',
})
export class AccessibilityReviewPage {
  protected readonly workspace = inject(WorkspaceService);
  private readonly inventory = inject(ComponentInventoryService);
  protected readonly resultStatusOptions = RESULT_STATUS_OPTIONS;
  protected readonly checksPerComponent = CHECKS_PER_COMPONENT;
  protected readonly checkIndexRange = Array.from(
    { length: CHECKS_PER_COMPONENT },
    (_, i) => i,
  );
  protected readonly componentRecordAreaId = COMPONENT_RECORD_AREA_ID;

  /**
   * Every real discovered component, annotated with whether it still needs
   * a human look (no `ManualReview` yet, or the most recent one is stale
   * against the current commit), sorted so those come first.
   */
  protected readonly componentReviewStatuses = computed<
    readonly ComponentReviewStatus[]
  >(() => {
    const manifests = this.inventory.result().manifests;
    const reviews = this.workspace.manualReviews();
    const commit = this.workspace.gitStatus()?.commit;
    const withStatus = manifests.map((manifest) => {
      const versionId = componentVersionId(manifest);
      const matching = reviews.filter(
        (review) => review.componentVersionId === versionId,
      );
      const latest =
        matching.length > 0
          ? [...matching].sort((a, b) => b.date.localeCompare(a.date))[0]
          : null;
      const needsAttention =
        !latest ||
        isStaleAgainstCommit(latest.commitOrFingerprint, commit) ||
        latest.status !== 'passed';
      return {
        id: manifest.id,
        name: this.componentName(manifest.id),
        needsAttention,
        latestReviewStatus: latest?.status ?? null,
      };
    });
    return [...withStatus].sort(
      (a, b) => Number(b.needsAttention) - Number(a.needsAttention),
    );
  });

  protected readonly componentRecordSteps = computed(() =>
    buildComponentRecordSteps(this.componentReviewStatuses()),
  );

  private readonly componentRecordArea = computed<SelfReviewArea>(() => ({
    id: COMPONENT_RECORD_AREA_ID,
    title: COMPONENT_RECORD_AREA_TITLE,
    summary: COMPONENT_RECORD_AREA_SUMMARY,
    steps: this.componentRecordSteps(),
  }));

  protected readonly areas = computed<readonly SelfReviewArea[]>(() => [
    ...SELF_REVIEW_AREAS,
    this.componentRecordArea(),
  ]);

  protected readonly componentRecordAreaIndex = computed(
    () => this.areas().length - 1,
  );

  private readonly flatSteps = computed(() =>
    flattenSelfReviewSteps(this.areas()),
  );

  protected readonly currentAreaIndex = signal(0);
  protected readonly currentArea = computed(
    () => this.areas()[this.currentAreaIndex()],
  );

  /**
   * The dogfooding "evidence freshness" axis (TODO.md's "Dogfooding
   * ForgeGate on itself"): once a real self-review has been approved, show
   * whether it's still current for the workspace's real commit, reusing
   * the exact same commit comparison every other piece of evidence in the
   * app uses (`evidence-freshness.ts`) rather than a bespoke check here.
   */
  protected readonly latestSelfReview = computed<ManualReview | null>(() => {
    const reviews = this.workspace
      .manualReviews()
      .filter(
        (review) => review.componentVersionId === FORGEGATE_SHELL_COMPONENT_ID,
      );
    if (reviews.length === 0) {
      return null;
    }
    return [...reviews].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
  });

  protected readonly latestSelfReviewFreshness = computed<string | null>(() => {
    const review = this.latestSelfReview();
    if (!review) {
      return null;
    }
    return freshnessLabel(
      review.commitOrFingerprint,
      this.workspace.gitStatus()?.commit,
    );
  });

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
      this.flatSteps().map((_, index) => statuses[index] ?? 'unknown'),
    );
  });

  /** How many of the real discovered components have had every one of
   * their steps recorded (not left at the default "unknown"). Disclosed,
   * not enforced — saving is never blocked on full coverage. */
  protected readonly componentReviewCoverage = computed<{
    readonly reviewed: number;
    readonly total: number;
  } | null>(() => {
    const components = this.componentReviewStatuses();
    if (components.length === 0) {
      return null;
    }
    const statuses = this.stepStatuses();
    const areaIndex = this.componentRecordAreaIndex();
    let reviewed = 0;
    components.forEach((_, componentIndex) => {
      const allRecorded = Array.from(
        { length: CHECKS_PER_COMPONENT },
        (_, checkIndex) =>
          this.globalStepIndex(
            areaIndex,
            componentIndex * CHECKS_PER_COMPONENT + checkIndex,
          ),
      ).every(
        (globalIndex) => (statuses[globalIndex] ?? 'unknown') !== 'unknown',
      );
      if (allRecorded) {
        reviewed++;
      }
    });
    return { reviewed, total: components.length };
  });

  protected readonly canSave = computed<boolean>(
    () =>
      !!this.workspace.workspacePath() &&
      this.reviewerIdentity().trim().length > 0 &&
      this.operatingSystem().trim().length > 0 &&
      this.assistiveTechnology().trim().length > 0,
  );

  /**
   * What's stopping Save from succeeding right now, in plain language. A
   * disabled button with no explanation tells a keyboard/screen-reader user
   * nothing — the whole point of this page is to catch exactly that kind of
   * failure, so it can't ship one itself. Shown only after a real attempt
   * (`saveAttempted`), not proactively on every keystroke.
   */
  protected readonly missingRequirements = computed<readonly string[]>(() => {
    const missing: string[] = [];
    if (!this.workspace.workspacePath()) {
      missing.push('Open a workspace (use "Open workspace…" above).');
    }
    if (!this.reviewerIdentity().trim()) {
      missing.push('Enter your reviewer identity.');
    }
    if (!this.operatingSystem().trim()) {
      missing.push('Enter the operating system.');
    }
    if (!this.assistiveTechnology().trim()) {
      missing.push('Enter the assistive technology you used.');
    }
    return missing;
  });

  protected readonly saveAttempted = signal(false);

  /** The global step index a given area's local step index maps to. */
  protected globalStepIndex(areaIndex: number, localStepIndex: number): number {
    const areas = this.areas();
    let offset = 0;
    for (let i = 0; i < areaIndex; i++) {
      offset += areas[i]?.steps.length ?? 0;
    }
    return offset + localStepIndex;
  }

  protected goToArea(index: number): void {
    if (index >= 0 && index < this.areas().length) {
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

  protected componentName(id: string): string {
    const parts = id.split('.');
    return parts[parts.length - 1] ?? id;
  }

  protected componentStep(componentIndex: number, checkIndex: number) {
    return this.componentRecordSteps()[
      componentIndex * CHECKS_PER_COMPONENT + checkIndex
    ];
  }

  protected componentGlobalStepIndex(
    componentIndex: number,
    checkIndex: number,
  ): number {
    return this.globalStepIndex(
      this.componentRecordAreaIndex(),
      componentIndex * CHECKS_PER_COMPONENT + checkIndex,
    );
  }

  protected save(): void {
    this.saveAttempted.set(true);
    if (!this.canSave()) {
      return;
    }
    const commit = this.workspace.gitStatus()?.commit ?? 'unknown';
    const statuses = this.stepStatuses();
    const notes = this.stepNotes();
    const stepResults: ManualReviewStepResult[] = this.flatSteps().map(
      (step, index) => ({
        stepIndex: index,
        action: step.action,
        expected: step.expected,
        status: statuses[index] ?? 'unknown',
        ...(notes[index]?.trim() ? { note: notes[index].trim() } : {}),
        ...(step.componentId ? { componentId: step.componentId } : {}),
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

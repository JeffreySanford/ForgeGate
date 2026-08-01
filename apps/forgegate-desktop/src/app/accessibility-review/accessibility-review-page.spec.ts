import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccessibilityReviewPage } from './accessibility-review-page';
import { expectNoAccessibilityViolations } from '../../test-a11y';
import { SELF_REVIEW_AREAS } from '../self-review-content';
import { WorkspaceService } from '../workspace.service';

function areaButtons(compiled: HTMLElement): HTMLButtonElement[] {
  return Array.from(
    compiled.querySelectorAll('.accessibility-review-page__areas-nav button'),
  ) as HTMLButtonElement[];
}

function stepStatusSelects(compiled: HTMLElement): HTMLSelectElement[] {
  return Array.from(
    compiled.querySelectorAll('.accessibility-review-page__steps select'),
  ) as HTMLSelectElement[];
}

function fillFormField(
  compiled: HTMLElement,
  index: number,
  value: string,
): void {
  const input = Array.from(
    compiled.querySelectorAll('.accessibility-review-page__form input'),
  )[index] as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function findButton(compiled: HTMLElement, text: string): HTMLButtonElement {
  return Array.from(compiled.querySelectorAll('button')).find((button) =>
    (button as HTMLButtonElement).textContent?.includes(text),
  ) as HTMLButtonElement;
}

describe('AccessibilityReviewPage', () => {
  let workspace: WorkspaceService;
  let fixture: ReturnType<
    typeof TestBed.createComponent<AccessibilityReviewPage>
  >;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AccessibilityReviewPage] });
    workspace = TestBed.inject(WorkspaceService);
  });

  it('names every real review area and reminds the reviewer to turn on a screen reader', async () => {
    fixture = TestBed.createComponent(AccessibilityReviewPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('screen reader');
    for (const area of SELF_REVIEW_AREAS) {
      expect(compiled.textContent).toContain(area.title);
    }

    await expectNoAccessibilityViolations(compiled);
  });

  it("shows only the current area's steps, and lets the reviewer jump between areas", () => {
    fixture = TestBed.createComponent(AccessibilityReviewPage);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain(
      SELF_REVIEW_AREAS[0]?.steps[0]?.action,
    );
    expect(compiled.textContent).not.toContain(
      SELF_REVIEW_AREAS[1]?.steps[0]?.action,
    );

    areaButtons(compiled)[1]?.click();
    fixture.detectChanges();

    expect(compiled.textContent).toContain(
      SELF_REVIEW_AREAS[1]?.steps[0]?.action,
    );
    expect(compiled.textContent).not.toContain(
      SELF_REVIEW_AREAS[0]?.steps[0]?.action,
    );
  });

  it('defaults every step to an honest "unknown" result rather than assuming a pass', () => {
    fixture = TestBed.createComponent(AccessibilityReviewPage);
    fixture.detectChanges();

    const selects = stepStatusSelects(fixture.nativeElement);
    expect(selects.length).toBeGreaterThan(0);
    expect(selects.every((select) => select.value === 'unknown')).toBe(true);
  });

  it("remembers a step's result when navigating away to another area and back", () => {
    fixture = TestBed.createComponent(AccessibilityReviewPage);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const [firstSelect] = stepStatusSelects(compiled);
    firstSelect.value = 'passed';
    firstSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    areaButtons(compiled)[1]?.click();
    fixture.detectChanges();
    areaButtons(compiled)[0]?.click();
    fixture.detectChanges();

    expect(stepStatusSelects(compiled)[0]?.value).toBe('passed');
  });

  it('marks every required field with a visible and screen-reader-readable indicator', () => {
    fixture = TestBed.createComponent(AccessibilityReviewPage);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const requiredInputs = compiled.querySelectorAll(
      '.accessibility-review-page__form input[required]',
    );
    expect(requiredInputs).toHaveLength(3);
    expect(compiled.textContent).toContain('Required');
  });

  it('the Save button stays clickable when fields are missing, and clicking it explains exactly what to fix', () => {
    fixture = TestBed.createComponent(AccessibilityReviewPage);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const saveButton = findButton(compiled, 'Save self-review');
    expect(saveButton.disabled).toBe(false);
    expect(compiled.querySelector('[role="alert"]')).toBeNull();

    saveButton.click();
    fixture.detectChanges();

    const alert = compiled.querySelector(
      '.accessibility-review-page__missing[role="alert"]',
    );
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain('Open a workspace');
    expect(alert?.textContent).toContain('Enter your reviewer identity');
    expect(alert?.textContent).toContain('Enter the operating system');
    expect(alert?.textContent).toContain(
      'Enter the assistive technology you used',
    );
    // Nothing was staged — the workspace service was never asked to save.
    expect(workspace.stagedManualReview()).toBeNull();
  });

  it('the missing-requirements list shrinks as each real field is filled in, and disappears once everything is', () => {
    fixture = TestBed.createComponent(AccessibilityReviewPage);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    findButton(compiled, 'Save self-review').click();
    fixture.detectChanges();
    expect(
      compiled.querySelector('.accessibility-review-page__missing'),
    ).not.toBeNull();

    workspace.workspacePath.set('/repos/ForgeGate');
    fillFormField(compiled, 0, 'reviewer@example.com');
    fillFormField(compiled, 2, 'Windows 11');
    fillFormField(compiled, 3, 'NVDA 2025.3');
    fixture.detectChanges();

    expect(
      compiled.querySelector('.accessibility-review-page__missing'),
    ).toBeNull();
  });

  it('saves a real ManualReview with a disclosed synthetic component id and every flattened step', () => {
    workspace.workspacePath.set('/repos/ForgeGate');
    workspace.gitStatus.set({
      branch: 'main',
      commit: 'a'.repeat(40),
      dirty: false,
      changedFiles: [],
    });
    const saveSpy = vi
      .spyOn(workspace, 'stageManualReview')
      .mockResolvedValue();

    fixture = TestBed.createComponent(AccessibilityReviewPage);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    fillFormField(compiled, 0, 'reviewer@example.com');
    fillFormField(compiled, 2, 'Windows 11');
    fillFormField(compiled, 3, 'NVDA 2025.3');
    fixture.detectChanges();

    const [firstSelect] = stepStatusSelects(compiled);
    firstSelect.value = 'passed';
    firstSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    findButton(compiled, 'Save self-review').click();

    expect(saveSpy).toHaveBeenCalledTimes(1);
    const [savedReview, savedComponentId] = saveSpy.mock.calls[0] ?? [];
    expect(savedComponentId).toBe('forgegate.desktop.shell');
    expect(savedReview?.componentVersionId).toBe('forgegate.desktop.shell');
    expect(savedReview?.procedureId).toBe(
      'forgegate-shell-accessibility-review',
    );
    expect(savedReview?.reviewerIdentity).toBe('reviewer@example.com');
    expect(savedReview?.commitOrFingerprint).toBe('a'.repeat(40));
    const totalSteps = SELF_REVIEW_AREAS.reduce(
      (sum, area) => sum + area.steps.length,
      0,
    );
    expect(savedReview?.stepResults).toHaveLength(totalSteps);
    expect(savedReview?.stepResults?.[0]?.status).toBe('passed');
    expect(savedReview?.stepResults?.[0]?.action).toContain(
      `[${SELF_REVIEW_AREAS[0]?.title}]`,
    );
    // Every other step is left an honest 'unknown' rather than assumed
    // passed, so the overall rollup is 'unknown', not 'passed'.
    expect(savedReview?.status).toBe('unknown');
  });

  it('shows no self-review recorded when a workspace is open but none exists yet', () => {
    workspace.workspacePath.set('/repos/ForgeGate');
    fixture = TestBed.createComponent(AccessibilityReviewPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No self-review has been recorded',
    );
  });

  it('shows the latest self-review as Current when its commit matches the real current commit', () => {
    workspace.workspacePath.set('/repos/ForgeGate');
    workspace.gitStatus.set({
      branch: 'main',
      commit: 'a'.repeat(40),
      dirty: false,
      changedFiles: [],
    });
    workspace.manualReviews.set([
      {
        id: 'r1',
        componentVersionId: 'forgegate.desktop.shell',
        procedureId: 'forgegate-shell-accessibility-review',
        procedureVersion: '1.0.0',
        reviewerIdentity: 'reviewer@example.com',
        date: '2026-01-01T00:00:00.000Z',
        operatingSystem: 'Windows 11',
        status: 'passed',
        commitOrFingerprint: 'a'.repeat(40),
      },
    ]);

    fixture = TestBed.createComponent(AccessibilityReviewPage);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Last recorded self-review');
    expect(compiled.textContent).toContain('Current');
    expect(
      compiled
        .querySelector('.accessibility-review-page__freshness')
        ?.classList.contains('accessibility-review-page__freshness--stale'),
    ).toBe(false);
  });

  it('shows the latest self-review as Stale, and picks the most recent when several exist', () => {
    workspace.workspacePath.set('/repos/ForgeGate');
    workspace.gitStatus.set({
      branch: 'main',
      commit: 'b'.repeat(40),
      dirty: false,
      changedFiles: [],
    });
    workspace.manualReviews.set([
      {
        id: 'older',
        componentVersionId: 'forgegate.desktop.shell',
        procedureId: 'forgegate-shell-accessibility-review',
        procedureVersion: '1.0.0',
        reviewerIdentity: 'reviewer@example.com',
        date: '2026-01-01T00:00:00.000Z',
        operatingSystem: 'Windows 11',
        status: 'passed',
        commitOrFingerprint: 'a'.repeat(40),
      },
      {
        id: 'newer',
        componentVersionId: 'forgegate.desktop.shell',
        procedureId: 'forgegate-shell-accessibility-review',
        procedureVersion: '1.0.0',
        reviewerIdentity: 'reviewer@example.com',
        date: '2026-02-01T00:00:00.000Z',
        operatingSystem: 'Windows 11',
        status: 'failed',
        commitOrFingerprint: 'a'.repeat(40),
      },
    ]);

    fixture = TestBed.createComponent(AccessibilityReviewPage);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    // The newer record's status ('failed'), not the older one's ('passed').
    expect(compiled.textContent).toContain('failed');
    expect(compiled.textContent).toContain('Stale');
    expect(
      compiled
        .querySelector('.accessibility-review-page__freshness')
        ?.classList.contains('accessibility-review-page__freshness--stale'),
    ).toBe(true);
  });

  it('routes Approve/Discard on a staged self-review to the workspace service', () => {
    fixture = TestBed.createComponent(AccessibilityReviewPage);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    workspace.stagedManualReview.set({
      review: {
        id: 'r1',
        componentVersionId: 'forgegate.desktop.shell',
        procedureId: 'forgegate-shell-accessibility-review',
        procedureVersion: '1.0.0',
        reviewerIdentity: 'reviewer@example.com',
        date: new Date().toISOString(),
        operatingSystem: 'Windows 11',
        status: 'unknown',
        commitOrFingerprint: 'a'.repeat(40),
      },
      componentId: 'forgegate.desktop.shell',
      reviewWrite: {
        stagingId: 'stg-1',
        subdirectory: 'manual-reviews',
        filename: 'r1.json',
        previousContent: null,
        newContent: '{"status":"unknown"}',
      },
      findingWrites: [],
    });
    fixture.detectChanges();

    expect(compiled.textContent).toContain('{"status":"unknown"}');

    const approveSpy = vi
      .spyOn(workspace, 'approveStagedManualReview')
      .mockResolvedValue();
    const discardSpy = vi
      .spyOn(workspace, 'discardStagedManualReview')
      .mockResolvedValue();

    findButton(compiled, 'Approve').click();
    expect(approveSpy).toHaveBeenCalledTimes(1);
    findButton(compiled, 'Discard').click();
    expect(discardSpy).toHaveBeenCalledTimes(1);
  });
});

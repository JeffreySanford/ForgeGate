import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { ComponentManifest } from '@forgegate/core-manifest';
import { createComponentManifest } from '@forgegate/core-manifest';
import { ManualReviewWalkthrough } from './manual-review-walkthrough';
import { expectNoAccessibilityViolations } from '../../test-a11y';
import { WorkspaceService } from '../workspace.service';

@Component({
  imports: [ManualReviewWalkthrough],
  template: `<app-manual-review-walkthrough [manifest]="manifest" />`,
})
class HostComponent {
  manifest!: ComponentManifest;
}

const procedure = {
  id: 'keyboard-and-screen-reader-review',
  version: '1.0.0',
  appliesTo: ['button'],
  environment: {
    operatingSystem: 'Windows',
    assistiveTechnology: ['JAWS', 'NVDA'],
  },
  steps: [
    {
      action: 'Move focus to the button using Tab.',
      expected: 'The accessible name and button role are announced.',
    },
    {
      action: 'Activate using Space.',
      expected: 'The configured action occurs exactly once.',
    },
  ],
};

const procedureWithRoleAndExpiration = {
  ...procedure,
  requiredReviewerRole: 'accessibility-reviewer',
  expirationDays: 90,
};

function manifestWithProcedure(): ComponentManifest {
  return createComponentManifest({
    id: 'acme.design-system.acme-button',
    framework: 'web-components',
    adapter: 'framework.web-components',
    packagePath: '.',
    componentVersion: '0.1.0',
    manualReviewProcedureIds: ['keyboard-and-screen-reader-review'],
  });
}

function selectProcedure(compiled: HTMLElement): void {
  const select = compiled.querySelector('select') as HTMLSelectElement;
  select.value = procedure.id;
  select.dispatchEvent(new Event('change'));
}

function fillReviewerIdentity(compiled: HTMLElement, value: string): void {
  const reviewerInput = compiled.querySelector(
    '.manual-review-walkthrough__form input',
  ) as HTMLInputElement;
  reviewerInput.value = value;
  reviewerInput.dispatchEvent(new Event('input'));
}

function stepStatusSelects(compiled: HTMLElement): HTMLSelectElement[] {
  return Array.from(
    compiled.querySelectorAll('.manual-review-walkthrough__steps select'),
  ) as HTMLSelectElement[];
}

describe('ManualReviewWalkthrough', () => {
  let workspace: WorkspaceService;
  let fixture: ReturnType<typeof TestBed.createComponent<HostComponent>>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    workspace = TestBed.inject(WorkspaceService);
  });

  it('states plainly when the component declares no manual review procedure', () => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifest = createComponentManifest({
      id: 'acme.design-system.acme-button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No manual review procedure is declared',
    );
  });

  it('states plainly when a declared procedure has no connected definition', () => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifest = manifestWithProcedure();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'none are connected',
    );
  });

  it('shows the real ordered steps of a connected procedure and pre-fills its environment', async () => {
    workspace.procedures.set([procedure]);
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifest = manifestWithProcedure();
    fixture.detectChanges();

    selectProcedure(fixture.nativeElement);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Move focus to the button using Tab.');
    expect(compiled.textContent).toContain(
      'The accessible name and button role are announced.',
    );
    const formInputs = Array.from(
      compiled.querySelectorAll('.manual-review-walkthrough__form input'),
    ) as HTMLInputElement[];
    // Form field order: reviewer identity, reviewer role, operating
    // system, browser, assistive technology, story/scenario.
    expect(formInputs[2]?.value).toBe('Windows');
    expect(formInputs[4]?.value).toBe('JAWS, NVDA');

    await expectNoAccessibilityViolations(compiled);
  });

  it('defaults every step to an honest "unknown" result rather than assuming a pass', () => {
    workspace.procedures.set([procedure]);
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifest = manifestWithProcedure();
    fixture.detectChanges();

    selectProcedure(fixture.nativeElement);
    fixture.detectChanges();

    const selects = stepStatusSelects(fixture.nativeElement);
    expect(selects).toHaveLength(2);
    expect(selects.every((select) => select.value === 'unknown')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('unknown');
  });

  it('disables saving until a reviewer identity and environment are entered', () => {
    workspace.procedures.set([procedure]);
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifest = manifestWithProcedure();
    fixture.detectChanges();

    selectProcedure(fixture.nativeElement);
    fixture.detectChanges();

    const saveButton = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((button: HTMLButtonElement) =>
      button.textContent?.includes('Save manual review'),
    ) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);
  });

  it('rolls the overall status up to the worst real per-step result and saves real stepResults', () => {
    workspace.procedures.set([procedure]);
    workspace.gitStatus.set({
      branch: 'main',
      commit: 'a'.repeat(40),
      dirty: false,
      changedFiles: [],
    });
    const saveSpy = vi
      .spyOn(workspace, 'stageManualReview')
      .mockResolvedValue();

    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifest = manifestWithProcedure();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    selectProcedure(compiled);
    fixture.detectChanges();
    fillReviewerIdentity(compiled, 'reviewer@acme.example');

    const [firstStepSelect, secondStepSelect] = stepStatusSelects(compiled);
    firstStepSelect.value = 'passed';
    firstStepSelect.dispatchEvent(new Event('change'));
    secondStepSelect.value = 'failed';
    secondStepSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(compiled.textContent).toContain('failed');

    const saveButton = Array.from(compiled.querySelectorAll('button')).find(
      (button: HTMLButtonElement) =>
        button.textContent?.includes('Save manual review'),
    ) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
    saveButton.click();

    expect(saveSpy).toHaveBeenCalledTimes(1);
    const [savedReview, savedComponentId] = saveSpy.mock.calls[0] ?? [];
    expect(savedComponentId).toBe('acme.design-system.acme-button');
    expect(savedReview?.componentVersionId).toBe(
      'acme.design-system.acme-button@0.1.0',
    );
    expect(savedReview?.procedureId).toBe(procedure.id);
    expect(savedReview?.reviewerIdentity).toBe('reviewer@acme.example');
    expect(savedReview?.operatingSystem).toBe('Windows');
    expect(savedReview?.commitOrFingerprint).toBe('a'.repeat(40));
    // One failed step makes the whole review's overall status 'failed',
    // even though the other step passed.
    expect(savedReview?.status).toBe('failed');
    expect(savedReview?.stepResults).toEqual([
      {
        stepIndex: 0,
        action: 'Move focus to the button using Tab.',
        expected: 'The accessible name and button role are announced.',
        status: 'passed',
      },
      {
        stepIndex: 1,
        action: 'Activate using Space.',
        expected: 'The configured action occurs exactly once.',
        status: 'failed',
      },
    ]);
  });

  it('shows a staged review as a real diff and routes Approve/Discard to the workspace service', () => {
    workspace.procedures.set([procedure]);
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifest = manifestWithProcedure();
    fixture.detectChanges();
    selectProcedure(fixture.nativeElement);
    fixture.detectChanges();

    workspace.stagedManualReview.set({
      review: {
        id: 'r1',
        componentVersionId: 'acme.design-system.acme-button@0.1.0',
        procedureId: procedure.id,
        procedureVersion: procedure.version,
        reviewerIdentity: 'reviewer@acme.example',
        date: new Date().toISOString(),
        operatingSystem: 'Windows',
        status: 'passed',
        commitOrFingerprint: 'a'.repeat(40),
      },
      componentId: 'acme.design-system.acme-button',
      reviewWrite: {
        stagingId: 'stg-1',
        subdirectory: 'manual-reviews',
        filename: 'r1.json',
        previousContent: null,
        newContent: '{"status":"passed"}',
      },
      findingWrites: [],
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('{"status":"passed"}');

    const approveSpy = vi
      .spyOn(workspace, 'approveStagedManualReview')
      .mockResolvedValue();
    const discardSpy = vi
      .spyOn(workspace, 'discardStagedManualReview')
      .mockResolvedValue();

    const approveButton = Array.from(
      compiled.querySelectorAll('button'),
    ).find((button: HTMLButtonElement) =>
      button.textContent?.includes('Approve'),
    ) as HTMLButtonElement;
    approveButton.click();
    expect(approveSpy).toHaveBeenCalledTimes(1);

    const discardButton = Array.from(
      compiled.querySelectorAll('button'),
    ).find((button: HTMLButtonElement) =>
      button.textContent?.includes('Discard'),
    ) as HTMLButtonElement;
    discardButton.click();
    expect(discardSpy).toHaveBeenCalledTimes(1);
  });

  it('shows the real expiration hint when the procedure declares one', () => {
    workspace.procedures.set([procedureWithRoleAndExpiration]);
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifest = manifestWithProcedure();
    fixture.detectChanges();

    selectProcedure(fixture.nativeElement);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'requires re-review every 90 days',
    );
  });

  it('pre-fills the reviewer role from the procedure and blocks saving until it matches', () => {
    workspace.procedures.set([procedureWithRoleAndExpiration]);
    workspace.gitStatus.set({
      branch: 'main',
      commit: 'a'.repeat(40),
      dirty: false,
      changedFiles: [],
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifest = manifestWithProcedure();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    selectProcedure(compiled);
    fixture.detectChanges();
    fillReviewerIdentity(compiled, 'reviewer@acme.example');
    fixture.detectChanges();

    const roleInput = compiled.querySelectorAll(
      '.manual-review-walkthrough__form input',
    )[1] as HTMLInputElement;
    expect(roleInput.value).toBe('accessibility-reviewer');

    const saveButton = Array.from(compiled.querySelectorAll('button')).find(
      (button: HTMLButtonElement) =>
        button.textContent?.includes('Save manual review'),
    ) as HTMLButtonElement;
    // Pre-filled to the exact required role, so saving is already allowed.
    expect(saveButton.disabled).toBe(false);

    roleInput.value = 'random-role';
    roleInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(saveButton.disabled).toBe(true);
    expect(compiled.textContent).toContain(
      'Must match the required reviewer role',
    );
  });
});

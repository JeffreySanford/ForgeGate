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
      .spyOn(workspace, 'saveManualReview')
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
});

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

    const select = fixture.nativeElement.querySelector('select');
    select.value = procedure.id;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Move focus to the button using Tab.');
    expect(compiled.textContent).toContain(
      'The accessible name and button role are announced.',
    );
    const osInput = compiled.querySelectorAll('input')[2] as HTMLInputElement;
    expect(osInput.value).toBe('Windows');

    await expectNoAccessibilityViolations(compiled);
  });

  it('disables saving until a reviewer identity and environment are entered', () => {
    workspace.procedures.set([procedure]);
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifest = manifestWithProcedure();
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select');
    select.value = procedure.id;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const saveButton = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((button: HTMLButtonElement) =>
      button.textContent?.includes('Save manual review'),
    ) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);
  });

  it('saves a real ManualReview built from the form through the real service method', () => {
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
    const select = compiled.querySelector('select') as HTMLSelectElement;
    select.value = procedure.id;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const reviewerInput = compiled.querySelectorAll('input')[0] as HTMLInputElement;
    reviewerInput.value = 'reviewer@acme.example';
    reviewerInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const saveButton = Array.from(compiled.querySelectorAll('button')).find(
      (button: HTMLButtonElement) =>
        button.textContent?.includes('Save manual review'),
    ) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
    saveButton.click();

    expect(saveSpy).toHaveBeenCalledTimes(1);
    const savedReview = saveSpy.mock.calls[0]?.[0];
    expect(savedReview?.componentVersionId).toBe(
      'acme.design-system.acme-button@0.1.0',
    );
    expect(savedReview?.procedureId).toBe(procedure.id);
    expect(savedReview?.reviewerIdentity).toBe('reviewer@acme.example');
    expect(savedReview?.operatingSystem).toBe('Windows');
    expect(savedReview?.commitOrFingerprint).toBe('a'.repeat(40));
    expect(savedReview?.status).toBe('passed');
  });
});

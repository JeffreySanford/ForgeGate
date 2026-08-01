import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { TestExecution } from '@forgegate/core-evidence';
import { EvidenceTimelineView } from './evidence-timeline-view';
import { expectNoAccessibilityViolations } from '../../test-a11y';
import { WorkspaceService } from '../workspace.service';

function execution(overrides: Partial<TestExecution>): TestExecution {
  return {
    id: 'id',
    componentVersionId: 'component-version',
    gate: 'unit',
    tool: 'vitest',
    toolVersion: '4.1.10',
    adapterVersion: '1.0.0',
    status: 'passed',
    startedAt: '2026-01-01T00:00:00.000Z',
    commitOrFingerprint: 'a'.repeat(40),
    ...overrides,
  };
}

describe('EvidenceTimelineView', () => {
  let workspaceService: WorkspaceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvidenceTimelineView],
    }).compileComponents();
    workspaceService = TestBed.inject(WorkspaceService);
  });

  it('shows an explicit empty state when no workspace is open', async () => {
    const fixture = TestBed.createComponent(EvidenceTimelineView);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.fg-empty-state')?.textContent).toContain(
      'Open a workspace',
    );
    expect(compiled.querySelector('ol')).toBeNull();

    await expectNoAccessibilityViolations(compiled);
  });

  it('shows a distinct empty state when a workspace is open but no evidence has loaded', async () => {
    workspaceService.workspacePath.set('/repos/example');

    const fixture = TestBed.createComponent(EvidenceTimelineView);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.fg-empty-state')?.textContent).toContain(
      'No test evidence',
    );
    expect(compiled.querySelector('ol')).toBeNull();

    await expectNoAccessibilityViolations(compiled);
  });

  it('lists real evidence records newest-first with status and commit', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.testExecutions.set([
      execution({
        id: 'old',
        startedAt: '2026-01-01T00:00:00.000Z',
        status: 'passed',
      }),
      execution({
        id: 'new',
        startedAt: '2026-02-01T00:00:00.000Z',
        status: 'failed',
        gate: 'a11y',
      }),
    ]);

    const fixture = TestBed.createComponent(EvidenceTimelineView);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const items = Array.from(compiled.querySelectorAll('ol > li'));
    expect(items).toHaveLength(2);
    expect(items[0]?.textContent).toContain('a11y');
    expect(items[0]?.textContent).toContain('Failed');
    expect(items[0]?.className).toContain('status-failed');
    expect(items[1]?.textContent).toContain('Passed');
    expect(
      items[1]?.querySelector('.evidence-timeline-view__commit')?.textContent,
    ).toBe('aaaaaaa');

    await expectNoAccessibilityViolations(compiled);
  });

  it('offers no "Show changed files" action for an entry that matches the current commit', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.gitStatus.set({
      branch: 'main',
      commit: 'a'.repeat(40),
      dirty: false,
      changedFiles: [],
    });
    workspaceService.testExecutions.set([
      execution({ commitOrFingerprint: 'a'.repeat(40) }),
    ]);

    const fixture = TestBed.createComponent(EvidenceTimelineView);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('button')).toBeNull();

    await expectNoAccessibilityViolations(compiled);
  });

  it('clicking "Show changed files" on a stale entry loads and renders the real diff', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.gitStatus.set({
      branch: 'main',
      commit: 'b'.repeat(40),
      dirty: false,
      changedFiles: [],
    });
    workspaceService.testExecutions.set([
      execution({ commitOrFingerprint: 'a'.repeat(40) }),
    ]);
    const loadSpy = vi
      .spyOn(workspaceService, 'loadStaleReviewChangedFiles')
      .mockImplementation(async (fromCommit) => {
        workspaceService.staleReviewChangedFiles.set({
          [fromCommit]: { files: ['src/acme-button.ts'], error: null },
        });
      });

    const fixture = TestBed.createComponent(EvidenceTimelineView);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button') as HTMLButtonElement;
    expect(button?.textContent).toContain('Show changed files');
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(loadSpy).toHaveBeenCalledWith('a'.repeat(40));
    expect(compiled.textContent).toContain('src/acme-button.ts');
    // P1.8 "causality, focus": the click caused this content to appear, so
    // focus moves into it — not just a visual entrance.
    const reveal = compiled.querySelector('.evidence-timeline-view__reveal');
    expect(reveal).not.toBeNull();
    expect(document.activeElement).toBe(reveal);

    await expectNoAccessibilityViolations(compiled);
  });
});

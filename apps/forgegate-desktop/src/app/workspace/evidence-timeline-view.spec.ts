import { TestBed } from '@angular/core/testing';
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
    expect(compiled.querySelector('.fg-empty-state')?.textContent).toContain('Open a workspace');
    expect(compiled.querySelector('ol')).toBeNull();

    await expectNoAccessibilityViolations(compiled);
  });

  it('shows a distinct empty state when a workspace is open but no evidence has loaded', async () => {
    workspaceService.workspacePath.set('/repos/example');

    const fixture = TestBed.createComponent(EvidenceTimelineView);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.fg-empty-state')?.textContent).toContain('No test evidence');
    expect(compiled.querySelector('ol')).toBeNull();

    await expectNoAccessibilityViolations(compiled);
  });

  it('lists real evidence records newest-first with status and commit', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.testExecutions.set([
      execution({ id: 'old', startedAt: '2026-01-01T00:00:00.000Z', status: 'passed' }),
      execution({ id: 'new', startedAt: '2026-02-01T00:00:00.000Z', status: 'failed', gate: 'a11y' }),
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
    expect(items[1]?.querySelector('.evidence-timeline-view__commit')?.textContent).toBe('aaaaaaa');

    await expectNoAccessibilityViolations(compiled);
  });
});

import { TestBed } from '@angular/core/testing';
import { expectNoAccessibilityViolations } from '../../test-a11y';
import { WorkspaceService } from '../workspace.service';
import { WorkspaceScanProgressView } from './workspace-scan-progress';

describe('WorkspaceScanProgressView', () => {
  let workspace: WorkspaceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceScanProgressView],
    }).compileComponents();
    workspace = TestBed.inject(WorkspaceService);
  });

  it('stays out of the page until a scan starts', () => {
    const fixture = TestBed.createComponent(WorkspaceScanProgressView);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('shows the current check and the state of every discovery step', () => {
    workspace.scanProgress.set({
      phase: 'storybook',
      state: 'running',
      label: 'Connecting the Storybook story index',
      completed: 3,
      total: 5,
    });

    const fixture = TestBed.createComponent(WorkspaceScanProgressView);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const steps = compiled.querySelectorAll('ol > li');
    expect(steps).toHaveLength(5);
    expect(compiled.querySelector('h2')?.textContent).toContain(
      'Connecting the Storybook story index',
    );
    expect(steps[2]?.textContent).toContain('Complete');
    expect(steps[3]?.textContent).toContain('Checking');
    expect(steps[3]?.getAttribute('aria-current')).toBe('step');
    expect(steps[4]?.textContent).toContain('Pending');
  });

  it('keeps completed progress visible without a false current step', async () => {
    workspace.scanProgress.set({
      phase: 'complete',
      state: 'complete',
      label: 'Workspace scan complete',
      completed: 5,
      total: 5,
    });

    const fixture = TestBed.createComponent(WorkspaceScanProgressView);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('progress')?.getAttribute('value')).toBe('5');
    expect(compiled.querySelectorAll('[aria-current="step"]')).toHaveLength(0);
    expect(
      Array.from(compiled.querySelectorAll('ol strong')).every(
        (status) => status.textContent?.trim() === 'Complete',
      ),
    ).toBe(true);
    await expectNoAccessibilityViolations(compiled);
  });

  it('marks unfinished checks honestly after a failure', () => {
    workspace.scanProgress.set({
      phase: 'failed',
      state: 'failed',
      label: 'Workspace scan failed after 1 of 5 checks',
      completed: 1,
      total: 5,
    });

    const fixture = TestBed.createComponent(WorkspaceScanProgressView);
    fixture.detectChanges();

    const statuses = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('ol strong'),
    ).map((item) => item.textContent?.trim());
    expect(statuses).toEqual([
      'Complete',
      'Not checked',
      'Not checked',
      'Not checked',
      'Not checked',
    ]);
  });
});

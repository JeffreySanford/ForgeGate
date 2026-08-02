import { TestBed } from '@angular/core/testing';
import { AdapterConstellationView } from './adapter-constellation-view';
import { expectNoAccessibilityViolations } from '../../test-a11y';
import { WorkspaceService } from '../workspace.service';

describe('AdapterConstellationView', () => {
  let workspaceService: WorkspaceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdapterConstellationView],
    }).compileComponents();
    workspaceService = TestBed.inject(WorkspaceService);
  });

  it('shows an explicit empty state when no workspace is open', async () => {
    const fixture = TestBed.createComponent(AdapterConstellationView);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.fg-empty-state')?.textContent).toContain(
      'Open a workspace',
    );
    expect(compiled.querySelector('table')).toBeNull();

    await expectNoAccessibilityViolations(compiled);
  });

  it('shows a distinct empty state when a workspace is open but no adapter has reported yet', async () => {
    workspaceService.workspacePath.set('/repos/example');

    const fixture = TestBed.createComponent(AdapterConstellationView);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.fg-empty-state')?.textContent).toContain(
      'No adapter has reported a status yet',
    );
    expect(compiled.querySelector('table')).toBeNull();

    await expectNoAccessibilityViolations(compiled);
  });

  it('aggregates real adapter diagnostics into one row per adapter, showing the worst status', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.adapterDiagnostics.set([
      {
        id: 'test-evidence:a.json',
        adapter: 'test evidence adapter',
        source: 'a.json',
        status: 'loaded',
        rawOutput: '{}',
        error: null,
      },
      {
        id: 'test-evidence:b.json',
        adapter: 'test evidence adapter',
        source: 'b.json',
        status: 'failed',
        rawOutput: null,
        error: 'Unsupported test status "green"',
      },
      {
        id: 'git-status',
        adapter: 'Git workspace adapter',
        source: 'read_git_status',
        status: 'loaded',
        rawOutput: '{}',
        error: null,
      },
    ]);

    const fixture = TestBed.createComponent(AdapterConstellationView);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = Array.from(compiled.querySelectorAll('tbody tr'));
    expect(rows).toHaveLength(2);

    const testEvidenceRow = rows.find((row) =>
      row.textContent?.includes('test evidence adapter'),
    );
    expect(testEvidenceRow?.textContent).toContain('Failed');
    expect(testEvidenceRow?.textContent).toContain('2');
    expect(testEvidenceRow?.textContent).toContain('1 error');

    const gitRow = rows.find((row) =>
      row.textContent?.includes('Git workspace adapter'),
    );
    expect(gitRow?.textContent).toContain('Supported');
    expect(gitRow?.textContent).toContain('None');

    await expectNoAccessibilityViolations(compiled);
  });

  it('shows real setup guidance for an unsupported adapter backed by external tooling, and none for a supported one', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.adapterDiagnostics.set([
      {
        id: 'storybook-index',
        adapter: 'Storybook adapter',
        source: 'storybook-static/index.json',
        status: 'unavailable',
        rawOutput: null,
        error: 'Storybook not detected',
      },
      {
        id: 'git-status',
        adapter: 'Git workspace adapter',
        source: 'read_git_status',
        status: 'loaded',
        rawOutput: '{}',
        error: null,
      },
    ]);

    const fixture = TestBed.createComponent(AdapterConstellationView);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = Array.from(compiled.querySelectorAll('tbody tr'));

    const storybookRow = rows.find((row) =>
      row.textContent?.includes('Storybook adapter'),
    );
    expect(storybookRow?.textContent).toContain('storybook-static/index.json');

    const gitRow = rows.find((row) =>
      row.textContent?.includes('Git workspace adapter'),
    );
    expect(
      gitRow?.querySelector('.adapter-constellation-view__no-guidance'),
    ).not.toBeNull();

    await expectNoAccessibilityViolations(compiled);
  });
});

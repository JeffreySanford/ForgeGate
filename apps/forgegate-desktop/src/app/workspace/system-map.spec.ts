import { TestBed } from '@angular/core/testing';
import { SystemMap } from './system-map';
import { expectNoAccessibilityViolations } from '../../test-a11y';
import {
  WorkspaceService,
  type GitStatus,
  type WorkspaceScan,
} from '../workspace.service';

const scanWithNothingDetected: WorkspaceScan = {
  packageName: null,
  packageManager: null,
  workspaceManager: null,
  storybookProjects: [],
  starlightProjects: [],
  hasZeroheight: false,
  tokenFiles: [],
  testRunners: [],
  visualRegressionProviders: [],
  ciProviders: [],
  customElementsManifests: [],
  uiTechnologies: [],
};

const gitStatus: GitStatus = {
  branch: 'main',
  commit: 'abc1234',
  dirty: false,
};

function rowsAsTuples(compiled: HTMLElement): Array<[string, string, string]> {
  return Array.from(compiled.querySelectorAll('table tbody tr')).map((row) => {
    const cells = Array.from(row.querySelectorAll('th, td')).map(
      (cell) => cell.textContent?.trim() ?? '',
    );
    return [cells[0], cells[1], cells[2]];
  });
}

describe('SystemMap', () => {
  let workspaceService: WorkspaceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemMap],
    }).compileComponents();
    workspaceService = TestBed.inject(WorkspaceService);
  });

  it('reports every relationship as not connected when no workspace is open', async () => {
    const fixture = TestBed.createComponent(SystemMap);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = rowsAsTuples(compiled);
    expect(rows).toHaveLength(8);
    for (const [, status] of rows) {
      expect(status).toBe('not connected');
    }
    expect(
      compiled.querySelector('#system-map-summary')?.textContent,
    ).toContain('No workspace is open yet');
    expect(
      Array.from(compiled.querySelectorAll('.node-status-label')).map((label) =>
        label.textContent?.trim(),
      ),
    ).toEqual(rows.map(([, status]) => status));
  });

  it('reports repository as connected once git status is known, with branch and dirty state', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.gitStatus.set(gitStatus);

    const fixture = TestBed.createComponent(SystemMap);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = rowsAsTuples(compiled);
    const repositoryRow = rows.find(([title]) => title === 'Repository');
    expect(repositoryRow).toEqual(['Repository', 'connected', 'main · clean']);
  });

  it('reports storybook and tokens as connected when the scan detects them', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set({
      ...scanWithNothingDetected,
      packageName: '@acme/design-system',
      storybookProjects: ['apps/storybook'],
      tokenFiles: ['tokens/design-tokens.json'],
    });

    const fixture = TestBed.createComponent(SystemMap);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = rowsAsTuples(compiled);
    expect(rows.find(([title]) => title === 'Component library')).toEqual([
      'Component library',
      'connected',
      '@acme/design-system',
    ]);
    expect(rows.find(([title]) => title === 'Storybook')?.[1]).toBe(
      'connected',
    );
    expect(rows.find(([title]) => title === 'Design tokens')?.[1]).toBe(
      'connected',
    );
  });

  it('reports components as partial when the manifest maps some but not all declarations', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set({
      ...scanWithNothingDetected,
      packageName: '@acme/design-system',
    });
    workspaceService.customElementsManifest.set({
      schemaVersion: '1.0.0',
      modules: [
        {
          kind: 'javascript-module',
          path: 'src/up-button.ts',
          declarations: [
            {
              kind: 'class',
              name: 'UpButton',
              customElement: true,
              tagName: 'up-button',
            },
          ],
        },
        {
          kind: 'javascript-module',
          path: 'src/broken.ts',
          // A tagName containing "." is not a valid identifier segment
          // (buildComponentId's assertSegment), so this declaration maps
          // to a real, reachable failure rather than being silently
          // filtered out like a genuinely missing tagName would be.
          declarations: [
            {
              kind: 'class',
              name: 'Broken',
              customElement: true,
              tagName: 'up.broken',
            },
          ],
        },
      ],
    });

    const fixture = TestBed.createComponent(SystemMap);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = rowsAsTuples(compiled);
    const componentsRow = rows.find(([title]) => title === 'Components');
    expect(componentsRow?.[1]).toBe('partially connected');
    expect(componentsRow?.[2]).toContain('1 mapped');
    expect(componentsRow?.[2]).toContain('1 failed');
  });

  it('always reports release as not connected, since no release feature exists yet', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.gitStatus.set(gitStatus);
    workspaceService.workspaceScan.set({
      ...scanWithNothingDetected,
      packageName: '@acme/design-system',
    });

    const fixture = TestBed.createComponent(SystemMap);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = rowsAsTuples(compiled);
    expect(rows.find(([title]) => title === 'Release')).toEqual([
      'Release',
      'not connected',
      'Release policy not implemented',
    ]);
  });

  it('renders one SVG node per relationship with a descriptive title', async () => {
    const fixture = TestBed.createComponent(SystemMap);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const svgNodes = compiled.querySelectorAll('svg .map-node');
    expect(svgNodes).toHaveLength(8);
    expect(svgNodes[0].querySelector('title')?.textContent).toMatch(
      /Repository, not connected/,
    );
  });

  it('has no automated accessibility violations', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.gitStatus.set(gitStatus);
    workspaceService.workspaceScan.set({
      ...scanWithNothingDetected,
      packageName: '@acme/design-system',
      storybookProjects: ['apps/storybook'],
    });

    const fixture = TestBed.createComponent(SystemMap);
    fixture.detectChanges();
    await fixture.whenStable();

    await expectNoAccessibilityViolations(fixture.nativeElement);
  });
});

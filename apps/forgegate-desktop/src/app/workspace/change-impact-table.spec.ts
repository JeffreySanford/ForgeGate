import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { CustomElementsManifest } from '@forgegate/adapter-web-components';
import { ChangeImpactTable } from './change-impact-table';
import { expectNoAccessibilityViolations } from '../../test-a11y';
import { WorkspaceService, type WorkspaceScan } from '../workspace.service';

const scan: WorkspaceScan = {
  packageName: '@acme/design-system',
  packageManager: 'pnpm',
  workspaceManager: 'nx',
  storybookProjects: [],
  starlightProjects: [],
  hasZeroheight: false,
  tokenFiles: [],
  testRunners: [],
  visualRegressionProviders: [],
  ciProviders: [],
  customElementsManifests: ['custom-elements.json'],
  uiTechnologies: [],
  componentPackages: [],
};

const oneComponentManifest: CustomElementsManifest = {
  schemaVersion: '1.0.0',
  modules: [
    {
      kind: 'javascript-module',
      path: 'src/acme-button.ts',
      declarations: [{ kind: 'class', name: 'AcmeButton', customElement: true, tagName: 'acme-button' }],
    },
  ],
};

describe('ChangeImpactTable', () => {
  let workspaceService: WorkspaceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangeImpactTable],
      providers: [provideRouter([])],
    }).compileComponents();
    workspaceService = TestBed.inject(WorkspaceService);
  });

  it('shows an explicit empty state when no workspace is open', async () => {
    const fixture = TestBed.createComponent(ChangeImpactTable);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.fg-empty-state')?.textContent).toContain('Open a workspace');
    expect(compiled.querySelector('table')).toBeNull();

    await expectNoAccessibilityViolations(compiled);
  });

  it('shows a distinct empty state when a workspace is open with a clean working tree', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.gitStatus.set({
      branch: 'main',
      commit: 'a'.repeat(40),
      dirty: false,
      changedFiles: [],
    });

    const fixture = TestBed.createComponent(ChangeImpactTable);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.fg-empty-state')?.textContent).toContain('clean');
    expect(compiled.querySelector('table')).toBeNull();

    await expectNoAccessibilityViolations(compiled);
  });

  it('matches a real changed file to its owning component and reports unmatched files honestly', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(oneComponentManifest);
    workspaceService.gitStatus.set({
      branch: 'main',
      commit: 'a'.repeat(40),
      dirty: true,
      changedFiles: ['src/acme-button.ts', 'README.md'],
    });

    const fixture = TestBed.createComponent(ChangeImpactTable);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = Array.from(compiled.querySelectorAll('tbody tr'));
    expect(rows).toHaveLength(2);

    const buttonRow = rows.find((row) => row.textContent?.includes('src/acme-button.ts'));
    expect(buttonRow?.querySelector('a')?.getAttribute('href')).toBe(
      '/components/acme.design-system.acme-button',
    );

    const readmeRow = rows.find((row) => row.textContent?.includes('README.md'));
    expect(readmeRow?.textContent).toContain('No component matched');

    await expectNoAccessibilityViolations(compiled);
  });
});

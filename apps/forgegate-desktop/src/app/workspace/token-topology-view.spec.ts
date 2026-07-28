import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { CustomElementsManifest } from '@forgegate/adapter-web-components';
import { createComponentManifest } from '@forgegate/core-manifest';
import { TokenTopologyView } from './token-topology-view';
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

const twoComponentManifest: CustomElementsManifest = {
  schemaVersion: '1.0.0',
  modules: [
    {
      kind: 'javascript-module',
      path: 'src/acme-button.ts',
      declarations: [{ kind: 'class', name: 'AcmeButton', customElement: true, tagName: 'acme-button' }],
    },
    {
      kind: 'javascript-module',
      path: 'src/acme-card.ts',
      declarations: [{ kind: 'class', name: 'AcmeCard', customElement: true, tagName: 'acme-card' }],
    },
  ],
};

describe('TokenTopologyView', () => {
  let workspaceService: WorkspaceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TokenTopologyView],
      providers: [provideRouter([])],
    }).compileComponents();
    workspaceService = TestBed.inject(WorkspaceService);
  });

  it('shows an explicit empty state when no workspace is open', async () => {
    const fixture = TestBed.createComponent(TokenTopologyView);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.fg-empty-state')?.textContent).toContain('Open a workspace');
    expect(compiled.querySelector('table')).toBeNull();

    await expectNoAccessibilityViolations(compiled);
  });

  it('shows a distinct empty state when a workspace is open but no component has a token mapping', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(twoComponentManifest);

    const fixture = TestBed.createComponent(TokenTopologyView);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.fg-empty-state')?.textContent).toContain('Nothing to show');
    expect(compiled.querySelector('table')).toBeNull();

    await expectNoAccessibilityViolations(compiled);
  });

  it('aggregates real per-component token mappings from repository-authored manifest overrides', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(twoComponentManifest);
    workspaceService.componentManifestOverrides.set([
      createComponentManifest({
        id: 'acme.design-system.acme-button',
        framework: 'web-components',
        adapter: 'framework.web-components',
        packagePath: '.',
        tokenMappings: [{ tokenPath: 'color.primary.500', category: 'color', required: true }],
      }),
      createComponentManifest({
        id: 'acme.design-system.acme-card',
        framework: 'web-components',
        adapter: 'framework.web-components',
        packagePath: '.',
        tokenMappings: [{ tokenPath: 'color.primary.500', category: 'color', required: false }],
      }),
    ]);

    const fixture = TestBed.createComponent(TokenTopologyView);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = Array.from(compiled.querySelectorAll('tbody tr'));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.textContent).toContain('color.primary.500');
    expect(rows[0]?.textContent).toContain('color');
    expect(rows[0]?.textContent).toContain('Yes');
    const links = Array.from(rows[0]?.querySelectorAll('a') ?? []);
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/components/acme.design-system.acme-button',
      '/components/acme.design-system.acme-card',
    ]);

    await expectNoAccessibilityViolations(compiled);
  });
});

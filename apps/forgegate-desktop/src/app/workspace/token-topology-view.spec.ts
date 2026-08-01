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
      declarations: [
        {
          kind: 'class',
          name: 'AcmeButton',
          customElement: true,
          tagName: 'acme-button',
        },
      ],
    },
    {
      kind: 'javascript-module',
      path: 'src/acme-card.ts',
      declarations: [
        {
          kind: 'class',
          name: 'AcmeCard',
          customElement: true,
          tagName: 'acme-card',
        },
      ],
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
    expect(compiled.querySelector('.fg-empty-state')?.textContent).toContain(
      'Open a workspace',
    );
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
    const emptyStates = Array.from(
      compiled.querySelectorAll('.fg-empty-state'),
    ).map((element) => element.textContent ?? '');
    // Two independent, separately-sourced empty states: no component token
    // mapping, and no DTCG token file. Neither implies the other.
    expect(emptyStates.some((text) => text.includes('Nothing to show'))).toBe(
      true,
    );
    expect(
      emptyStates.some((text) =>
        text.includes('No DTCG token file was detected'),
      ),
    ).toBe(true);
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
        tokenMappings: [
          { tokenPath: 'color.primary.500', category: 'color', required: true },
        ],
      }),
      createComponentManifest({
        id: 'acme.design-system.acme-card',
        framework: 'web-components',
        adapter: 'framework.web-components',
        packagePath: '.',
        tokenMappings: [
          {
            tokenPath: 'color.primary.500',
            category: 'color',
            required: false,
          },
        ],
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

  it('shows a real state or anatomy-part link when a repository authors one on a token mapping', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(twoComponentManifest);
    workspaceService.componentManifestOverrides.set([
      createComponentManifest({
        id: 'acme.design-system.acme-button',
        framework: 'web-components',
        adapter: 'framework.web-components',
        packagePath: '.',
        tokenMappings: [
          {
            tokenPath: 'color.action-hover',
            category: 'color',
            required: true,
            stateName: 'hover',
          },
        ],
      }),
    ]);

    const fixture = TestBed.createComponent(TokenTopologyView);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('color.action-hover');
    expect(compiled.textContent).toContain('state: hover');

    await expectNoAccessibilityViolations(compiled);
  });

  it('surfaces real broken token references from the parsed DTCG tokens', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.designTokens.set([
      { path: 'primitive.blue', type: 'color', value: '#2563eb' },
      { path: 'semantic.primary', type: 'color', value: '{primitive.blue}' },
      { path: 'semantic.broken', type: 'color', value: '{primitive.missing}' },
      { path: 'semantic.loop', type: 'color', value: '{semantic.loop}' },
    ]);

    const fixture = TestBed.createComponent(TokenTopologyView);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent ?? '';
    expect(text).toContain('4');
    expect(text).toContain('semantic.broken');
    expect(text).toContain('unresolved');
    expect(text).toContain('semantic.loop');
    expect(text).toContain('circular');
    // A resolved alias is not reported as broken.
    expect(compiled.querySelector('caption')?.textContent).toContain(
      'Broken token references',
    );

    await expectNoAccessibilityViolations(compiled);
  });

  it('reports a real hard-coded token value found in Angular component source', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.designTokens.set([
      { path: 'color.action', type: 'color', value: '#3366cc' },
    ]);
    workspaceService.angularComponentSourceFiles.set([
      {
        path: 'src/acme-button.component.ts',
        contents: `styles = { color: '#3366cc' };`,
      },
    ]);

    const fixture = TestBed.createComponent(TokenTopologyView);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent ?? '';
    expect(text).toContain('Hard-coded implementation values');
    expect(text).toContain('color.action');
    expect(text).toContain('#3366cc');
    expect(text).toContain('src/acme-button.component.ts');

    await expectNoAccessibilityViolations(compiled);
  });

  it('does not show the hard-coded-values section when no source matches a token literal', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.designTokens.set([
      { path: 'color.action', type: 'color', value: '#3366cc' },
    ]);
    workspaceService.angularComponentSourceFiles.set([
      { path: 'src/acme-button.component.ts', contents: `color: '#ffffff'` },
    ]);

    const fixture = TestBed.createComponent(TokenTopologyView);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain(
      'Hard-coded implementation values',
    );

    await expectNoAccessibilityViolations(compiled);
  });

  it('reports real theme coverage gaps between sibling groups', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.designTokens.set([
      { path: 'theme.light.surface.background', type: 'color', value: '#fff' },
      { path: 'theme.light.surface.border', type: 'color', value: '#eee' },
      { path: 'theme.dark.surface.background', type: 'color', value: '#000' },
    ]);

    const fixture = TestBed.createComponent(TokenTopologyView);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent ?? '';
    expect(text).toContain('Coverage across');
    expect(text).toContain('surface.border');
    expect(text).toContain('1 of 2 token paths are not defined in every group');

    await expectNoAccessibilityViolations(compiled);
  });
});

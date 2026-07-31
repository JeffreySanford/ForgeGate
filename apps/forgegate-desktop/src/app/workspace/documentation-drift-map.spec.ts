import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { CustomElementsManifest } from '@forgegate/adapter-web-components';
import { createComponentManifest } from '@forgegate/core-manifest';
import { DocumentationDriftMap } from './documentation-drift-map';
import { expectNoAccessibilityViolations } from '../../test-a11y';
import { WorkspaceService, type WorkspaceScan } from '../workspace.service';

const scan: WorkspaceScan = {
  packageName: '@acme/design-system',
  packageManager: 'pnpm',
  workspaceManager: 'nx',
  storybookProjects: [],
  starlightProjects: ['docs'],
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

describe('DocumentationDriftMap', () => {
  let workspaceService: WorkspaceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentationDriftMap],
      providers: [provideRouter([])],
    }).compileComponents();
    workspaceService = TestBed.inject(WorkspaceService);
  });

  it('shows an explicit empty state when no workspace is open', async () => {
    const fixture = TestBed.createComponent(DocumentationDriftMap);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.fg-empty-state')?.textContent).toContain(
      'Open a workspace',
    );
    expect(compiled.querySelector('table')).toBeNull();

    await expectNoAccessibilityViolations(compiled);
  });

  it('shows a distinct empty state when a workspace is open but no component has a documentation target', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(twoComponentManifest);

    const fixture = TestBed.createComponent(DocumentationDriftMap);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.fg-empty-state')?.textContent).toContain(
      'Nothing to compare',
    );
    expect(compiled.querySelector('table')).toBeNull();

    await expectNoAccessibilityViolations(compiled);
  });

  it('aggregates real per-component drift results from repository-authored manifest overrides', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(twoComponentManifest);
    workspaceService.componentManifestOverrides.set([
      createComponentManifest({
        id: 'acme.design-system.acme-button',
        framework: 'web-components',
        adapter: 'framework.web-components',
        packagePath: '.',
        componentVersion: '1.0.0',
        documentationTargets: [
          {
            adapter: 'starlight',
            pathOrPageId: 'docs/button',
            publishedVersion: '1.0.0',
          },
        ],
      }),
      createComponentManifest({
        id: 'acme.design-system.acme-card',
        framework: 'web-components',
        adapter: 'framework.web-components',
        packagePath: '.',
        componentVersion: '2.0.0',
        documentationTargets: [
          {
            adapter: 'starlight',
            pathOrPageId: 'docs/card',
            publishedVersion: '1.0.0',
          },
        ],
      }),
    ]);

    const fixture = TestBed.createComponent(DocumentationDriftMap);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const counts = Array.from(
      compiled.querySelectorAll('.documentation-drift-map__count'),
    ).map((el) => el.textContent?.replace(/\s+/g, ' ').trim());
    expect(counts).toEqual(['1Current', '1Drifted', '0Not evaluated']);

    const rows = Array.from(compiled.querySelectorAll('tbody tr'));
    expect(rows).toHaveLength(2);
    const cardRow = rows.find((row) => row.textContent?.includes('acme-card'));
    expect(cardRow?.textContent).toContain(
      'Drifted — published 1.0.0, current 2.0.0',
    );
    expect(cardRow?.querySelector('a')?.getAttribute('href')).toBe(
      '/components/acme.design-system.acme-card',
    );

    await expectNoAccessibilityViolations(compiled);
  });

  it('links a drifted row to the real publication action, but not a current row', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(twoComponentManifest);
    workspaceService.componentManifestOverrides.set([
      createComponentManifest({
        id: 'acme.design-system.acme-button',
        framework: 'web-components',
        adapter: 'framework.web-components',
        packagePath: '.',
        componentVersion: '1.0.0',
        documentationTargets: [
          {
            adapter: 'starlight',
            pathOrPageId: 'docs/button',
            publishedVersion: '1.0.0',
          },
        ],
      }),
      createComponentManifest({
        id: 'acme.design-system.acme-card',
        framework: 'web-components',
        adapter: 'framework.web-components',
        packagePath: '.',
        componentVersion: '2.0.0',
        documentationTargets: [
          {
            adapter: 'starlight',
            pathOrPageId: 'docs/card',
            publishedVersion: '1.0.0',
          },
        ],
      }),
    ]);

    const fixture = TestBed.createComponent(DocumentationDriftMap);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = Array.from(compiled.querySelectorAll('tbody tr'));
    const cardRow = rows.find((row) => row.textContent?.includes('acme-card'));
    const buttonRow = rows.find((row) =>
      row.textContent?.includes('acme-button'),
    );

    const regenerateLink = Array.from(
      cardRow?.querySelectorAll('a') ?? [],
    ).find((a) => a.textContent?.includes('Regenerate documentation'));
    expect(regenerateLink?.getAttribute('href')).toBe(
      '/components/acme.design-system.acme-card#documentation-title',
    );
    expect(
      Array.from(buttonRow?.querySelectorAll('a') ?? []).some((a) =>
        a.textContent?.includes('Regenerate documentation'),
      ),
    ).toBe(false);
  });
});

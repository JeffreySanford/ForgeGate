import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import {
  parseCustomElementsManifest,
  type CustomElementsManifest,
} from '@forgegate/adapter-web-components';
import {
  createComponentManifest,
  parseComponentManifest,
} from '@forgegate/core-manifest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ComponentDetailPage } from './component-detail-page';
import { expectNoAccessibilityViolations } from '../../test-a11y';
import { WorkspaceService, type WorkspaceScan } from '../workspace.service';
import { parseStorybookIndex } from '../storybook/storybook-index';

const fixtureRoot = [
  resolve(process.cwd(), 'fixtures/acme-button-library'),
  resolve(process.cwd(), '../../fixtures/acme-button-library'),
].find((candidate) => existsSync(candidate));

if (!fixtureRoot) {
  throw new Error(
    'Unable to locate the checked-in acme-button-library fixture',
  );
}

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
  componentManifests: [],
};

const richManifest: CustomElementsManifest = {
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
          members: [
            {
              kind: 'field',
              name: 'variant',
              type: { text: 'string' },
              description: 'Visual variant',
              privacy: 'public',
            },
            {
              kind: 'method',
              name: 'focus',
              description: 'Focuses the button',
              privacy: 'public',
            },
          ],
          events: [
            {
              name: 'acme-click',
              type: { text: 'CustomEvent' },
              description: 'Fired on activation',
            },
          ],
          slots: [{ name: '', description: 'Button label content' }],
          cssParts: [{ name: 'base', description: 'The root element' }],
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

@Component({
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
class HostComponent {}

describe('ComponentDetailPage', () => {
  let workspaceService: WorkspaceService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideRouter([
          { path: 'components/:componentId', component: ComponentDetailPage },
        ]),
      ],
    }).compileComponents();
    workspaceService = TestBed.inject(WorkspaceService);
    router = TestBed.inject(Router);
  });

  it('shows an explicit empty state when no workspace is open', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await router.navigateByUrl('/components/acme.design-system.acme-button');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.component-detail__empty',
      )?.textContent,
    ).toContain('No workspace open yet');
  });

  it('shows an explicit not-found state when the id is not in the connected manifest', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(richManifest);

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await router.navigateByUrl('/components/acme.design-system.does-not-exist');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.component-detail__empty',
      )?.textContent,
    ).toContain('No component with id "acme.design-system.does-not-exist"');
  });

  it('renders real identity, coverage, readiness, and contract data for a matched component', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(richManifest);
    workspaceService.gitStatus.set({
      branch: 'feature/button',
      commit: '1234567890abcdef1234567890abcdef12345678',
      dirty: false,
    });

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await router.navigateByUrl('/components/acme.design-system.acme-button');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('acme-button');
    expect(
      compiled.querySelector('.component-detail__id')?.textContent,
    ).toContain('acme.design-system.acme-button');
    expect(compiled.textContent).toContain('feature/button@12345678');
    expect(compiled.textContent).toContain('clean working tree');
    expect(compiled.textContent).toContain(
      'no evidence records are connected to commit 12345678',
    );

    const coverageCounts = Array.from(
      compiled.querySelectorAll('.component-detail__coverage-strip li'),
    ).map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
    expect(coverageCounts).toEqual([
      '0States',
      '0Stories',
      '0Tokens',
      '0Tests',
      '0Reviews',
      '0Documentation',
    ]);

    expect(
      compiled.querySelector('.component-detail__readiness-status')
        ?.textContent,
    ).toContain('Unknown');
    const reasons = Array.from(
      compiled.querySelectorAll('.component-detail__blocking-reasons li'),
    ).map((li) => li.textContent);
    expect(reasons).toContain(
      'Preview unavailable — Storybook was not detected in this workspace.',
    );
    expect(compiled.textContent).toContain('Preview type: Unavailable');
    expect(compiled.textContent).toContain('Static capture');
    expect(compiled.textContent).toContain('Blueprint reference');
    expect(compiled.textContent).toContain('Temporary generated preview');
    const nextAction = compiled.querySelector('.component-detail__next-action');
    expect(nextAction?.textContent).toContain('Declare required states');
    expect(nextAction?.querySelector('a')?.getAttribute('href')).toBe(
      '#states-title',
    );
    expect(
      compiled.querySelector('#states-title')?.getAttribute('tabindex'),
    ).toBe('-1');
    expect(compiled.textContent).toContain(
      'No manual review procedure is connected',
    );

    expect(compiled.textContent).toContain('variant');
    expect(compiled.textContent).toContain('focus');
    expect(compiled.textContent).toContain('acme-click');
    expect(compiled.textContent).toContain('base');
    const anatomyItems = compiled.querySelectorAll(
      '.component-detail__anatomy li',
    );
    expect(anatomyItems).toHaveLength(2);
    expect(anatomyItems[0]?.textContent).toContain('base');
    expect(anatomyItems[0]?.textContent).toContain('Styling part');
    expect(anatomyItems[0]?.querySelector('a')?.getAttribute('href')).toBe(
      '#contract-style-parts',
    );
    expect(anatomyItems[1]?.textContent).toContain('default');
    expect(anatomyItems[1]?.textContent).toContain('Content slot');
    expect(anatomyItems[1]?.querySelector('a')?.getAttribute('href')).toBe(
      '#contract-content',
    );
    expect(compiled.textContent).toContain(
      'ForgeGate does not infer hidden implementation structure',
    );
  });

  it('updates to show the newly navigated component when moving directly between two detail routes', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(richManifest);

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    await router.navigateByUrl('/components/acme.design-system.acme-button');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent,
    ).toContain('acme-button');

    await router.navigateByUrl('/components/acme.design-system.acme-card');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent,
    ).toContain('acme-card');
    expect(fixture.nativeElement.textContent).toContain(
      'Anatomy not yet described',
    );
  });

  it('preserves the selected component route while replacement scan data settles', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(richManifest);

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await router.navigateByUrl('/components/acme.design-system.acme-button');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/components/acme.design-system.acme-button');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent,
    ).toContain('acme-button');

    workspaceService.customElementsManifest.set({
      schemaVersion: '1.0.0',
      modules: [],
    });
    fixture.detectChanges();

    expect(router.url).toBe('/components/acme.design-system.acme-button');
    expect(fixture.nativeElement.textContent).toContain(
      'No component with id "acme.design-system.acme-button"',
    );

    workspaceService.customElementsManifest.set(richManifest);
    fixture.detectChanges();

    expect(router.url).toBe('/components/acme.design-system.acme-button');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent,
    ).toContain('acme-button');
  });

  it('renders a sandboxed local Storybook preview with source provenance', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set({
      ...scan,
      storybookProjects: ['.storybook'],
    });
    workspaceService.customElementsManifest.set(richManifest);
    workspaceService.storybookIndex.set({
      v: 5,
      entries: {
        'components-acmebutton--primary': {
          type: 'story',
          id: 'components-acmebutton--primary',
          name: 'Primary',
          title: 'Components/AcmeButton',
          importPath: './src/acme-button.stories.ts',
          exportName: 'Primary',
          tags: ['dev', 'test'],
        },
      },
    });

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await router.navigateByUrl('/components/acme.design-system.acme-button');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const frame = compiled.querySelector<HTMLIFrameElement>(
      '.component-detail__preview-frame',
    );
    expect(frame).not.toBeNull();
    expect(frame?.getAttribute('sandbox')).toBe('allow-scripts allow-forms');
    expect(frame?.getAttribute('src')).toContain(
      'components-acmebutton--primary',
    );
    expect(
      compiled.querySelector('.component-detail__preview-provenance')
        ?.textContent,
    ).toContain('./src/acme-button.stories.ts');
    expect(compiled.textContent).toContain(
      'without same-origin or Tauri privileges',
    );
    expect(compiled.textContent).toContain('Preview type: Live Storybook');
    expect(compiled.textContent).toContain(
      'Story mapped; local server availability not verified',
    );
    const openStorybook = Array.from(compiled.querySelectorAll('a')).find(
      (link) => link.textContent?.includes('Open in Storybook'),
    );
    expect(openStorybook?.getAttribute('href')).toContain(
      'components-acmebutton--primary',
    );
    expect(openStorybook?.getAttribute('target')).toBe('_blank');
    expect(openStorybook?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('connects the checked-in fixture Button manifest to its real Storybook index', async () => {
    workspaceService.workspacePath.set(fixtureRoot);
    workspaceService.workspaceScan.set({
      ...scan,
      packageName: '@acme/button-library',
      storybookProjects: ['.storybook'],
      componentManifests: [
        '.forgegate/components/acme.button-library.acme-button.yaml',
      ],
    });
    workspaceService.customElementsManifest.set(
      parseCustomElementsManifest(
        readFileSync(`${fixtureRoot}/custom-elements.json`, 'utf8'),
      ),
    );
    workspaceService.componentManifestOverrides.set([
      parseComponentManifest(
        readFileSync(
          `${fixtureRoot}/.forgegate/components/acme.button-library.acme-button.yaml`,
          'utf8',
        ),
      ),
    ]);
    workspaceService.storybookIndex.set(
      parseStorybookIndex(
        readFileSync(`${fixtureRoot}/storybook-static/index.json`, 'utf8'),
      ),
    );

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await router.navigateByUrl('/components/acme.button-library.acme-button');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const storyButtons = Array.from(
      compiled.querySelectorAll('.component-detail__story-picker button'),
    ).map((button) => button.textContent?.trim());
    expect(storyButtons).toEqual(['Primary', 'Secondary', 'Disabled']);
    expect(
      compiled
        .querySelector('.component-detail__preview-frame')
        ?.getAttribute('src'),
    ).toContain('components-acmebutton--primary');
    expect(compiled.textContent).toContain('./src/acme-button.stories.js');
    const nextAction = compiled.querySelector('.component-detail__next-action');
    expect(nextAction?.textContent).toContain(
      'Refresh automated test evidence',
    );
    expect(nextAction?.querySelector('a')?.getAttribute('href')).toBe(
      '#evidence-title',
    );
  });

  it('merges repository-authored states and token mappings with CEM contract data', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set({
      ...scan,
      tokenFiles: ['tokens/acme.tokens.json'],
      starlightProjects: [''],
      componentManifests: [
        '.forgegate/components/acme.design-system.acme-button.yaml',
      ],
    });
    workspaceService.customElementsManifest.set(richManifest);
    workspaceService.componentManifestOverrides.set([
      createComponentManifest({
        id: 'acme.design-system.acme-button',
        framework: 'web-components',
        adapter: 'framework.web-components',
        packagePath: '.',
        componentVersion: '0.1.0',
        lifecycle: 'candidate',
        states: [
          { name: 'default', required: true },
          { name: 'disabled', required: true },
        ],
        tokenMappings: [
          { tokenPath: 'color.action', category: 'color', required: true },
        ],
        documentationTargets: [
          {
            adapter: 'starlight',
            pathOrPageId: 'src/content/docs/components/button.md',
            publishedVersion: '0.1.0',
          },
        ],
      }),
    ]);

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await router.navigateByUrl('/components/acme.design-system.acme-button');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('2States');
    expect(compiled.textContent).toContain('1Tokens');
    expect(compiled.textContent).toContain('color.action');
    expect(compiled.textContent).toContain('1Documentation');
    expect(compiled.textContent).toContain('tokens/acme.tokens.json');
    expect(compiled.textContent).toContain(
      '.forgegate/components/acme.design-system.acme-button.yaml',
    );
    expect(compiled.textContent).toContain('variant');
    expect(compiled.textContent).toContain(
      'src/content/docs/components/button.md',
    );
    expect(compiled.textContent).toContain('0.1.0');
    expect(compiled.textContent).toContain('Current');
    expect(compiled.textContent).not.toContain(
      'Documentation is drifted or freshness is not evaluated',
    );
    expect(compiled.textContent).not.toContain('No required states declared');
    expect(compiled.textContent).not.toContain('No token mappings connected');
    expect(compiled.textContent).not.toContain(
      'No documentation target connected',
    );
    expect(compiled.textContent).toContain(
      'Part-to-token relationships are not declared',
    );

    const currentOverride = workspaceService.componentManifestOverrides()[0];
    if (!currentOverride) {
      throw new Error('Expected the repository component manifest override');
    }
    workspaceService.componentManifestOverrides.set([
      {
        ...currentOverride,
        documentationTargets: [
          {
            adapter: 'starlight',
            pathOrPageId: 'src/content/docs/components/button.md',
            publishedVersion: '0.0.9',
          },
        ],
      },
    ]);
    fixture.detectChanges();

    expect(compiled.textContent).toContain(
      'Drifted — published 0.0.9, current 0.1.0',
    );
    expect(compiled.textContent).toContain(
      'Documentation is drifted or freshness is not evaluated',
    );
  });

  it('shows configured test evidence, provenance, and conservative freshness', async () => {
    const evidenceCommit = 'a'.repeat(40);
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set({
      ...scan,
      storybookProjects: ['.storybook'],
      testRunners: ['node:test'],
      testEvidenceFiles: ['.forgegate/evidence/acme-button-unit.json'],
    });
    workspaceService.customElementsManifest.set(richManifest);
    workspaceService.storybookIndex.set({
      v: 5,
      entries: {
        'components-acmebutton--primary': {
          type: 'story',
          id: 'components-acmebutton--primary',
          name: 'Primary',
          title: 'Components/AcmeButton',
          importPath: './src/acme-button.stories.ts',
          exportName: 'Primary',
          tags: ['dev', 'test'],
        },
      },
    });
    workspaceService.componentManifestOverrides.set([
      createComponentManifest({
        id: 'acme.design-system.acme-button',
        framework: 'web-components',
        adapter: 'framework.web-components',
        packagePath: '.',
        componentVersion: '0.1.0',
        states: [{ name: 'default', required: true }],
        tokenMappings: [
          { tokenPath: 'color.action', category: 'color', required: true },
        ],
        storyMappings: [
          {
            storybookStoryId: 'components-acmebutton--primary',
            stateName: 'default',
          },
        ],
        testRequirements: [
          { gate: 'unit', scope: 'component', required: true },
        ],
      }),
    ]);
    workspaceService.gitStatus.set({
      branch: 'main',
      commit: evidenceCommit,
      dirty: false,
    });
    workspaceService.testExecutions.set([
      {
        id: 'acme-button-unit',
        componentVersionId: 'acme.design-system.acme-button@0.1.0',
        gate: 'unit',
        tool: 'node:test',
        toolVersion: '22.21.1',
        adapterVersion: '0.1.0',
        status: 'passed',
        startedAt: '2026-07-24T16:00:00.000Z',
        durationMs: 42,
        commitOrFingerprint: evidenceCommit,
        rawArtifactRef: '.forgegate/evidence/raw/acme-button-unit.tap',
      },
    ]);

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await router.navigateByUrl('/components/acme.design-system.acme-button');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const evidencePanel = compiled.querySelector(
      '[aria-labelledby="evidence-title"]',
    );
    expect(evidencePanel?.textContent).toContain('unit');
    expect(evidencePanel?.textContent).toContain('passed');
    expect(evidencePanel?.textContent).toContain('node:test 22.21.1');
    expect(evidencePanel?.textContent).toContain('Current');
    expect(evidencePanel?.textContent).toContain(
      '.forgegate/evidence/raw/acme-button-unit.tap',
    );
    expect(compiled.textContent).toContain(
      'Connected automated evidence is passing',
    );
    expect(
      compiled.querySelector('.component-detail__next-action')?.textContent,
    ).toContain('Define a manual review procedure');

    workspaceService.gitStatus.set({
      branch: 'main',
      commit: 'b'.repeat(40),
      dirty: false,
    });
    fixture.detectChanges();

    expect(evidencePanel?.textContent).toContain(
      'Stale — recorded at aaaaaaaa',
    );
    expect(compiled.textContent).toContain(
      'connected automated evidence is stale',
    );
    expect(compiled.textContent).toContain('Automated evidence is stale');
    expect(
      compiled.querySelector('.component-detail__next-action')?.textContent,
    ).toContain('Refresh automated test evidence');
  });

  it('has no automated accessibility violations for a matched component', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(richManifest);

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await router.navigateByUrl('/components/acme.design-system.acme-button');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    await expectNoAccessibilityViolations(fixture.nativeElement);
  });
});

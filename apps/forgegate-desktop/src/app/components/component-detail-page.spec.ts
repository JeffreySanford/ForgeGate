import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { vi } from 'vitest';
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
import { parseStorybookIndex } from '@forgegate/adapter-storybook';

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
      changedFiles: [],
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

    const nextAction = compiled.querySelector('.component-detail__next-action');
    expect(nextAction?.textContent).toContain(
      'Declare the component states that reviewers must verify',
    );
    expect(nextAction?.querySelector('a')?.getAttribute('href')).toBe(
      '#states-title',
    );
    const remediationItems = Array.from(
      compiled.querySelectorAll('.component-detail__remediation li'),
    ).map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
    expect(remediationItems[0]).toContain('No required states declared');
    expect(remediationItems[0]).toContain(
      '.forgegate/components/acme.design-system.acme-button.yaml',
    );
    expect(remediationItems[0]).toContain('Open states section');
    expect(remediationItems).toEqual(
      expect.arrayContaining([
        expect.stringContaining('No token mappings connected'),
        expect.stringContaining('No automated test requirements declared'),
        expect.stringContaining('No manual review recorded'),
        expect.stringContaining('No documentation target connected'),
      ]),
    );
  });

  it('renders release-decision history and stages a new repository history record', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(richManifest);
    workspaceService.componentManifestOverrides.set([
      createComponentManifest({
        id: 'acme.design-system.acme-button',
        framework: 'web-components',
        adapter: 'framework.web-components',
        packagePath: '.',
        componentVersion: '1.0.0',
        lifecycle: 'candidate',
        policyId: 'acme.baseline',
        policyVersion: '1.0.0',
      }),
    ]);
    workspaceService.releaseDecisionRecords.set([
      {
        id: 'acme-button-release-decision-workflow-record',
        decisionId: 'acme-button-release-decision',
        componentVersionId: 'acme.design-system.acme-button@1.0.0',
        policyId: 'acme.baseline',
        policyVersion: '1.0.0',
        outcome: 'blocked',
        commit: '1234567890abcdef1234567890abcdef12345678',
        decidedAt: '2026-08-02T16:00:00.000Z',
        source: 'forgegate-export-evaluation',
        authorization: 'blocked-no-approval-required',
        notRealApproval: false,
        evidenceIds: [],
        blockingFindingIds: ['acme-button-blocking-0'],
        limitations: [],
      },
    ]);
    const stageSpy = vi
      .spyOn(workspaceService, 'stageReleaseDecisionHistory')
      .mockResolvedValue();

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await router.navigateByUrl('/components/acme.design-system.acme-button');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Release history');
    expect(compiled.textContent).toContain('blocked');
    expect(compiled.textContent).toContain('blocked-no-approval-required');

    const stageButton = Array.from(compiled.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Stage release decision history'),
    );
    stageButton?.click();

    expect(stageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'acme.design-system.acme-button',
        policyId: 'acme.baseline',
      }),
      expect.arrayContaining([
        expect.stringContaining('No automated test requirements declared'),
      ]),
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

  it('clicking "Check live Storybook" queries the live index and shows the real result', async () => {
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
        },
      },
    });
    const querySpy = vi
      .spyOn(workspaceService, 'queryLiveStorybookIndex')
      .mockImplementation(async () => {
        workspaceService.liveStorybookQueryResult.set({
          origin: 'http://localhost:6006',
          storyCount: 3,
        });
      });

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await router.navigateByUrl('/components/acme.design-system.acme-button');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const checkButton = Array.from(compiled.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Check live Storybook'),
    ) as HTMLButtonElement;
    expect(checkButton).toBeDefined();
    checkButton.click();
    fixture.detectChanges();

    expect(querySpy).toHaveBeenCalledWith('http://localhost:6006');
    expect(compiled.textContent).toContain(
      'Verified — live server responded with 3 real indexed entries.',
    );
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
    expect(storyButtons).toEqual(['Primary', 'Disabled']);
    expect(
      compiled
        .querySelector('.component-detail__preview-frame')
        ?.getAttribute('src'),
    ).toContain('components-acmebutton--primary');
    expect(compiled.textContent).toContain('./src/acme-button.stories.js');
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
      testRunners: ['node:test'],
      testEvidenceFiles: ['.forgegate/evidence/acme-button-unit.json'],
    });
    workspaceService.customElementsManifest.set(richManifest);
    workspaceService.componentManifestOverrides.set([
      createComponentManifest({
        id: 'acme.design-system.acme-button',
        framework: 'web-components',
        adapter: 'framework.web-components',
        packagePath: '.',
        componentVersion: '0.1.0',
        testRequirements: [
          { gate: 'unit', scope: 'component', required: true },
        ],
      }),
    ]);
    workspaceService.gitStatus.set({
      branch: 'main',
      commit: evidenceCommit,
      dirty: false,
      changedFiles: [],
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

    workspaceService.gitStatus.set({
      branch: 'main',
      commit: 'b'.repeat(40),
      dirty: false,
      changedFiles: [],
    });
    fixture.detectChanges();

    expect(evidencePanel?.textContent).toContain(
      'Stale — recorded at aaaaaaaa',
    );
    expect(compiled.textContent).toContain(
      'connected automated evidence is stale',
    );
    expect(compiled.textContent).toContain('Automated evidence is stale');
  });

  it('renders real connected manual review evidence and marks it current or stale', async () => {
    const reviewCommit = 'a'.repeat(40);
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(richManifest);
    workspaceService.componentManifestOverrides.set([
      createComponentManifest({
        id: 'acme.design-system.acme-button',
        framework: 'web-components',
        adapter: 'framework.web-components',
        packagePath: '.',
        componentVersion: '0.1.0',
        manualReviewProcedureIds: ['keyboard-and-screen-reader-review'],
      }),
    ]);
    workspaceService.gitStatus.set({
      branch: 'main',
      commit: reviewCommit,
      dirty: false,
      changedFiles: [],
    });
    workspaceService.manualReviews.set([
      {
        id: 'acme-button-keyboard-review',
        componentVersionId: 'acme.design-system.acme-button@0.1.0',
        procedureId: 'keyboard-and-screen-reader-review',
        procedureVersion: '1.0.0',
        reviewerIdentity: 'reviewer@acme.example',
        reviewerRole: 'accessibility-reviewer',
        date: '2026-07-24T16:00:00.000Z',
        operatingSystem: 'macOS 15',
        assistiveTechnology: 'VoiceOver',
        status: 'passed',
        commitOrFingerprint: reviewCommit,
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
    expect(evidencePanel?.textContent).toContain(
      'keyboard-and-screen-reader-review',
    );
    expect(evidencePanel?.textContent).toContain('reviewer@acme.example');
    expect(evidencePanel?.textContent).toContain('macOS 15');
    expect(evidencePanel?.textContent).toContain('VoiceOver');
    expect(evidencePanel?.textContent).toContain('Current');

    workspaceService.gitStatus.set({
      branch: 'main',
      commit: 'b'.repeat(40),
      dirty: false,
      changedFiles: [],
    });
    fixture.detectChanges();

    expect(evidencePanel?.textContent).toContain(
      'Stale — recorded at aaaaaaaa',
    );
  });

  it('clicking "Show changed files" on a stale review loads and renders the real diff', async () => {
    const reviewCommit = 'a'.repeat(40);
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(richManifest);
    workspaceService.componentManifestOverrides.set([
      createComponentManifest({
        id: 'acme.design-system.acme-button',
        framework: 'web-components',
        adapter: 'framework.web-components',
        packagePath: '.',
        componentVersion: '0.1.0',
        manualReviewProcedureIds: ['keyboard-and-screen-reader-review'],
      }),
    ]);
    workspaceService.gitStatus.set({
      branch: 'main',
      commit: 'b'.repeat(40),
      dirty: false,
      changedFiles: [],
    });
    workspaceService.manualReviews.set([
      {
        id: 'acme-button-keyboard-review',
        componentVersionId: 'acme.design-system.acme-button@0.1.0',
        procedureId: 'keyboard-and-screen-reader-review',
        procedureVersion: '1.0.0',
        reviewerIdentity: 'reviewer@acme.example',
        date: '2026-07-24T16:00:00.000Z',
        operatingSystem: 'macOS 15',
        status: 'passed',
        commitOrFingerprint: reviewCommit,
      },
    ]);
    const loadSpy = vi
      .spyOn(workspaceService, 'loadStaleReviewChangedFiles')
      .mockImplementation(async (fromCommit) => {
        workspaceService.staleReviewChangedFiles.set({
          [fromCommit]: {
            files: ['button.component.html', 'button.component.ts'],
            error: null,
          },
        });
      });

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await router.navigateByUrl('/components/acme.design-system.acme-button');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const showButton = Array.from(compiled.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Show changed files'),
    );
    expect(showButton).toBeDefined();
    showButton?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(loadSpy).toHaveBeenCalledWith(reviewCommit);
    const evidencePanel = compiled.querySelector(
      '[aria-labelledby="evidence-title"]',
    );
    expect(evidencePanel?.textContent).toContain('button.component.html');
    expect(evidencePanel?.textContent).toContain('button.component.ts');
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

  it('clicking "Export evidence package" calls the real service method with this component and its evidence', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(richManifest);
    workspaceService.componentManifestOverrides.set([
      createComponentManifest({
        id: 'acme.design-system.acme-button',
        framework: 'web-components',
        adapter: 'framework.web-components',
        packagePath: '.',
        componentVersion: '0.1.0',
      }),
    ]);
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
        commitOrFingerprint: 'a'.repeat(40),
      },
    ]);
    workspaceService.manualReviews.set([
      {
        id: 'acme-button-keyboard-review',
        componentVersionId: 'acme.design-system.acme-button@0.1.0',
        procedureId: 'keyboard-and-screen-reader-review',
        procedureVersion: '1.0.0',
        reviewerIdentity: 'reviewer@acme.example',
        date: '2026-07-24T16:00:00.000Z',
        operatingSystem: 'macOS 15',
        status: 'passed',
        commitOrFingerprint: 'a'.repeat(40),
      },
    ]);
    workspaceService.exceptions.set([
      {
        id: 'acme-button-token-exception',
        findingId: 'acme.design-system.acme-button-blocking-0',
        approvedBy: 'lead-reviewer@acme.example',
        approvedAt: '2026-07-24T16:00:00.000Z',
        rationale: 'Risk accepted until next sprint.',
      },
    ]);
    workspaceService.findings.set([
      {
        id: 'acme-button-keyboard-review-1-step-1',
        componentId: 'acme.design-system.acme-button',
        description: 'Activate using Space. — expected once, fired twice.',
        severity: 'serious',
        status: 'open',
      },
    ]);
    const exportSpy = vi
      .spyOn(workspaceService, 'exportEvidencePackage')
      .mockResolvedValue();

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await router.navigateByUrl('/components/acme.design-system.acme-button');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const exportButton = Array.from(compiled.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Export evidence package'),
    );
    expect(exportButton).toBeDefined();
    exportButton?.click();

    expect(exportSpy).toHaveBeenCalledTimes(1);
    expect(exportSpy.mock.calls[0]?.[0].id).toBe(
      'acme.design-system.acme-button',
    );
    expect(exportSpy.mock.calls[0]?.[1]).toHaveLength(1);
    expect(exportSpy.mock.calls[0]?.[1][0]?.id).toBe('acme-button-unit');
    expect(exportSpy.mock.calls[0]?.[2]).toEqual(
      expect.arrayContaining([expect.any(String)]),
    );
    expect(exportSpy.mock.calls[0]?.[4]).toHaveLength(1);
    expect(exportSpy.mock.calls[0]?.[4]?.[0]?.id).toBe(
      'acme-button-keyboard-review',
    );
    expect(exportSpy.mock.calls[0]?.[5]).toHaveLength(1);
    expect(exportSpy.mock.calls[0]?.[5]?.[0]?.id).toBe(
      'acme-button-token-exception',
    );
    expect(exportSpy.mock.calls[0]?.[6]).toHaveLength(1);
    expect(exportSpy.mock.calls[0]?.[6]?.[0]?.id).toBe(
      'acme-button-keyboard-review-1-step-1',
    );
  });

  it('clicking "Run Unit tests" runs the real configured gate for this exact component', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(richManifest);
    const gateSpy = vi.spyOn(workspaceService, 'runGate').mockResolvedValue();

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await router.navigateByUrl('/components/acme.design-system.acme-button');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const runButton = Array.from(compiled.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Run Unit tests'),
    );
    expect(runButton).toBeDefined();
    runButton?.click();

    expect(gateSpy).toHaveBeenCalledTimes(1);
    expect(gateSpy.mock.calls[0]?.[0]).toBe('unit');
    expect(gateSpy.mock.calls[0]?.[1]?.id).toBe(
      'acme.design-system.acme-button',
    );
  });

  it('shows a staged unit-test result as a real diff and routes Approve/Discard to the workspace service', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(richManifest);
    workspaceService.stagedTestExecution.set({
      execution: {
        id: 'acme.design-system.acme-button-unit-test-1',
        componentVersionId: 'acme.design-system.acme-button@0.1.0',
        gate: 'unit',
        tool: 'npm',
        toolVersion: 'unknown',
        adapterVersion: '1.0.0',
        status: 'failed',
        startedAt: '2026-01-01T00:00:00.000Z',
        commitOrFingerprint: 'a'.repeat(40),
      },
      componentId: 'acme.design-system.acme-button',
      write: {
        stagingId: 'stg-1',
        subdirectory: 'evidence',
        filename: 'acme.design-system.acme-button-unit-test-1.json',
        previousContent: null,
        newContent: '{"status":"failed"}',
      },
    });

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await router.navigateByUrl('/components/acme.design-system.acme-button');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('{"status":"failed"}');

    const approveSpy = vi
      .spyOn(workspaceService, 'approveStagedTestExecution')
      .mockResolvedValue();
    const discardSpy = vi
      .spyOn(workspaceService, 'discardStagedTestExecution')
      .mockResolvedValue();

    const approveButton = Array.from(
      compiled.querySelectorAll('.component-detail__staged-actions button'),
    ).find((button) => button.textContent?.includes('Approve'));
    approveButton?.click();
    expect(approveSpy).toHaveBeenCalledTimes(1);

    const discardButton = Array.from(
      compiled.querySelectorAll('.component-detail__staged-actions button'),
    ).find((button) => button.textContent?.includes('Discard'));
    discardButton?.click();
    expect(discardSpy).toHaveBeenCalledTimes(1);
  });

  it('shows the real saved directory path after a successful export', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(richManifest);
    workspaceService.evidenceExportResult.set({
      directoryPath: '/home/user/exports/acme-button-evidence-1',
    });

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await router.navigateByUrl('/components/acme.design-system.acme-button');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain(
      '/home/user/exports/acme-button-evidence-1',
    );

    await expectNoAccessibilityViolations(compiled);
  });

  describe('evidence history', () => {
    it('loads the real component evidence events on navigation, keyed by componentId', async () => {
      workspaceService.workspacePath.set('/repos/example');
      workspaceService.workspaceScan.set(scan);
      workspaceService.customElementsManifest.set(richManifest);
      const loadSpy = vi
        .spyOn(workspaceService, 'loadComponentEvidenceEvents')
        .mockResolvedValue();

      const fixture = TestBed.createComponent(HostComponent);
      fixture.detectChanges();
      await router.navigateByUrl('/components/acme.design-system.acme-button');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(loadSpy).toHaveBeenCalledWith('acme.design-system.acme-button');
    });

    it('states when persistence is not configured', async () => {
      workspaceService.workspacePath.set('/repos/example');
      workspaceService.workspaceScan.set(scan);
      workspaceService.customElementsManifest.set(richManifest);

      const fixture = TestBed.createComponent(HostComponent);
      fixture.detectChanges();
      await router.navigateByUrl('/components/acme.design-system.acme-button');
      fixture.detectChanges();
      await fixture.whenStable();

      workspaceService.componentEvidenceEvents.set({
        configured: false,
        connected: false,
        events: [],
        error: null,
      });
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('FORGEGATE_DATABASE_URL');

      await expectNoAccessibilityViolations(compiled);
    });

    it('surfaces a connection error rather than hiding it', async () => {
      workspaceService.workspacePath.set('/repos/example');
      workspaceService.workspaceScan.set(scan);
      workspaceService.customElementsManifest.set(richManifest);

      const fixture = TestBed.createComponent(HostComponent);
      fixture.detectChanges();
      await router.navigateByUrl('/components/acme.design-system.acme-button');
      fixture.detectChanges();
      await fixture.whenStable();

      workspaceService.componentEvidenceEvents.set({
        configured: true,
        connected: false,
        events: [],
        error: 'Failed to connect to Postgres: connection refused',
      });
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('[role="alert"]')?.textContent).toContain(
        'connection refused',
      );
    });

    it('states plainly when no readiness changes have been recorded yet', async () => {
      workspaceService.workspacePath.set('/repos/example');
      workspaceService.workspaceScan.set(scan);
      workspaceService.customElementsManifest.set(richManifest);

      const fixture = TestBed.createComponent(HostComponent);
      fixture.detectChanges();
      await router.navigateByUrl('/components/acme.design-system.acme-button');
      fixture.detectChanges();
      await fixture.whenStable();

      workspaceService.componentEvidenceEvents.set({
        configured: true,
        connected: true,
        events: [],
        error: null,
      });
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('No recorded readiness changes');

      await expectNoAccessibilityViolations(compiled);
    });

    it('renders real recorded readiness-change events with short commit hashes', async () => {
      workspaceService.workspacePath.set('/repos/example');
      workspaceService.workspaceScan.set(scan);
      workspaceService.customElementsManifest.set(richManifest);

      const fixture = TestBed.createComponent(HostComponent);
      fixture.detectChanges();
      await router.navigateByUrl('/components/acme.design-system.acme-button');
      fixture.detectChanges();
      await fixture.whenStable();

      workspaceService.componentEvidenceEvents.set({
        configured: true,
        connected: true,
        events: [
          {
            occurredAt: '2026-06-01T10:00:00Z',
            eventKind: 'readiness-changed',
            previousReadiness: 'clear',
            nextReadiness: 'stale',
            previousCommit: 'a'.repeat(40),
            nextCommit: 'b'.repeat(40),
          },
        ],
        error: null,
      });
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const item = compiled.querySelector(
        '.component-detail__evidence-events li',
      );
      expect(item?.textContent).toContain('clear');
      expect(item?.textContent).toContain('stale');
      expect(item?.textContent).toContain('a'.repeat(8));
      expect(item?.textContent).toContain('b'.repeat(8));
      expect(item?.textContent).not.toContain('a'.repeat(40));

      await expectNoAccessibilityViolations(compiled);
    });
  });
});

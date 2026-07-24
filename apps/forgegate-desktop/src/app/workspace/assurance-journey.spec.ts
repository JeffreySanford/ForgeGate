import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { createComponentManifest } from '@forgegate/core-manifest';
import { expectNoAccessibilityViolations } from '../../test-a11y';
import { WorkspaceService, type WorkspaceScan } from '../workspace.service';
import { AssuranceJourney, buildAssuranceJourney } from './assurance-journey';

const connectedScan: WorkspaceScan = {
  packageName: '@acme/button-library',
  packageManager: 'pnpm',
  workspaceManager: 'nx',
  storybookProjects: ['storybook-static'],
  starlightProjects: ['docs'],
  hasZeroheight: false,
  tokenFiles: ['tokens/acme.tokens.json'],
  testRunners: ['vitest'],
  visualRegressionProviders: [],
  ciProviders: ['github-actions'],
  customElementsManifests: ['custom-elements.json'],
  componentPackages: [],
  componentManifests: [
    '.forgegate/components/acme.button-library.acme-button.yaml',
  ],
  uiTechnologies: [],
};

const governedButton = createComponentManifest({
  id: 'acme.button-library.acme-button',
  framework: 'web-components',
  adapter: 'framework.web-components',
  packagePath: '.',
  sourceFiles: ['src/acme-button.js'],
  states: [{ name: 'default', required: true }],
  tokenMappings: [
    { tokenPath: 'color.primary', category: 'color', required: true },
  ],
  storyMappings: [{ storybookStoryId: 'button--default' }],
  testRequirements: [{ gate: 'unit', scope: 'component', required: true }],
  manualReviewProcedureIds: ['keyboard-review'],
  documentationTargets: [
    { adapter: 'starlight', pathOrPageId: 'components/button' },
  ],
});

describe('AssuranceJourney', () => {
  let workspace: WorkspaceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssuranceJourney],
      providers: [provideRouter([])],
    }).compileComponents();
    workspace = TestBed.inject(WorkspaceService);
  });

  it('uses seven unavailable stages when no workspace is open', () => {
    const stages = buildAssuranceJourney(null, null, []);

    expect(stages.map((stage) => stage.title)).toEqual([
      'Discover',
      'Specify',
      'Preview',
      'Test',
      'Review',
      'Document',
      'Release',
    ]);
    expect(stages.every((stage) => stage.status === 'unavailable')).toBe(true);
  });

  it('derives connected stages without treating requirements as passed evidence', () => {
    const stages = buildAssuranceJourney('/repos/acme', connectedScan, [
      governedButton,
    ]);

    expect(stages.map(({ id, status }) => [id, status])).toEqual([
      ['discover', 'complete'],
      ['specify', 'complete'],
      ['preview', 'complete'],
      ['test', 'partial'],
      ['review', 'partial'],
      ['document', 'complete'],
      ['release', 'unavailable'],
    ]);
    expect(stages.find((stage) => stage.id === 'test')?.detail).toContain(
      'Results are not connected yet',
    );
  });

  it('renders the first incomplete actionable stage as the recommendation', async () => {
    workspace.workspacePath.set('/repos/acme');
    workspace.workspaceScan.set(connectedScan);
    workspace.customElementsManifest.set({
      schemaVersion: '1.0.0',
      modules: [
        {
          kind: 'javascript-module',
          path: 'src/acme-button.js',
          declarations: [
            {
              kind: 'class',
              name: 'AcmeButton',
              customElement: true,
              tagName: 'acme-button',
            },
          ],
        },
      ],
    });
    workspace.componentManifestOverrides.set([governedButton]);

    const fixture = TestBed.createComponent(AssuranceJourney);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const stages = compiled.querySelectorAll('ol > li');
    const recommendation = compiled.querySelector(
      '.assurance-journey__recommendation',
    );
    expect(stages).toHaveLength(7);
    expect(recommendation?.textContent).toContain('Test:');
    expect(recommendation?.querySelector('a')?.getAttribute('href')).toBe(
      '/components',
    );
    expect(stages[3]?.getAttribute('aria-current')).toBe('step');
  });

  it('passes automated accessibility checks', async () => {
    workspace.workspacePath.set('/repos/acme');
    workspace.workspaceScan.set(connectedScan);

    const fixture = TestBed.createComponent(AssuranceJourney);
    fixture.detectChanges();
    await fixture.whenStable();

    await expectNoAccessibilityViolations(fixture.nativeElement);
  });
});

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import type { CustomElementsManifest } from '@forgegate/adapter-web-components';
import { createComponentManifest } from '@forgegate/core-manifest';
import { ComponentDetailPage } from './component-detail-page';
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
    expect(reasons).toContain('No Storybook connection (not yet built — P0.6)');

    expect(compiled.textContent).toContain('variant');
    expect(compiled.textContent).toContain('focus');
    expect(compiled.textContent).toContain('acme-click');
    expect(compiled.textContent).toContain('base');
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

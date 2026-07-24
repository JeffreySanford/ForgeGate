import { TestBed } from '@angular/core/testing';
import { WorkspacePage } from './workspace-page';
import { expectNoAccessibilityViolations } from '../../test-a11y';
import { WorkspaceService, type WorkspaceScan } from '../workspace.service';

const emptyScan: WorkspaceScan = {
  packageName: '@up/design-system',
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

describe('WorkspacePage', () => {
  let workspaceService: WorkspaceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspacePage],
    }).compileComponents();
    workspaceService = TestBed.inject(WorkspaceService);
  });

  it('shows an empty state when no workspace is open', async () => {
    const fixture = TestBed.createComponent(WorkspacePage);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(
      compiled.querySelector('.workspace-page__empty')?.textContent,
    ).toContain('No workspace open yet');
  });

  it('renders a component inventory row for each discovered custom element', async () => {
    workspaceService.workspaceScan.set(emptyScan);
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
      ],
    });

    const fixture = TestBed.createComponent(WorkspacePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('up.design-system.up-button');
    expect(compiled.textContent).toContain('src/up-button.ts');
  });

  it('shows a fallback message when the manifest has no custom elements in it', async () => {
    workspaceService.workspaceScan.set(emptyScan);
    workspaceService.customElementsManifest.set({
      schemaVersion: '1.0.0',
      modules: [],
    });

    const fixture = TestBed.createComponent(WorkspacePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain(
      'Manifest present but no custom elements found in it',
    );
  });

  it('shows detected UI and styling technologies with package provenance', async () => {
    workspaceService.workspaceScan.set({
      ...emptyScan,
      uiTechnologies: [
        {
          id: 'primeng',
          name: 'PrimeNG',
          category: 'component-library',
          version: '^20.0.0',
          projectPath: 'apps/portal',
          detectedPackage: 'primeng',
          evidenceSource: 'apps/portal/package.json:dependencies',
          confidence: 'confirmed',
        },
        {
          id: 'bootstrap',
          name: 'Bootstrap',
          category: 'css-component-library',
          version: '^5.3.8',
          projectPath: '.',
          detectedPackage: 'bootstrap',
          evidenceSource: 'package.json:dependencies',
          confidence: 'confirmed',
        },
      ],
    });

    const fixture = TestBed.createComponent(WorkspacePage);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const table = compiled.querySelector(
      '[aria-labelledby="ui-technologies-heading"] table',
    );
    expect(table?.textContent).toContain('PrimeNG');
    expect(table?.textContent).toContain('component-library');
    expect(table?.textContent).toContain(
      'apps/portal/package.json:dependencies',
    );
    expect(table?.textContent).toContain('Bootstrap');
    expect(table?.textContent).toContain('package.json:dependencies');
  });

  it('shows native component signals separately from confirmed inventory', async () => {
    workspaceService.workspaceScan.set(emptyScan);
    workspaceService.nativeComponentSignals.set([
      {
        kind: 'enhanced-native',
        selector: 'button[pButton]',
        nativeElement: 'button',
        provider: 'primeng',
        sourceFile: 'apps/portal/src/app.html',
        line: 12,
        confidence: 'confirmed',
        evidence: 'Native <button> enhanced by [pButton]',
      },
      {
        kind: 'css-component',
        selector: '.ds-button',
        nativeElement: null,
        provider: 'repository',
        sourceFile: 'packages/ui/src/button.scss',
        line: 4,
        confidence: 'candidate',
        evidence: 'Repository-owned component-like CSS selector definition',
      },
    ]);

    const fixture = TestBed.createComponent(WorkspacePage);
    fixture.detectChanges();
    await fixture.whenStable();

    const table = (fixture.nativeElement as HTMLElement).querySelector(
      '[aria-labelledby="native-signals-heading"] table',
    );
    expect(table?.textContent).toContain('button[pButton]');
    expect(table?.textContent).toContain('primeng');
    expect(table?.textContent).toContain('confirmed');
    expect(table?.textContent).toContain('.ds-button');
    expect(table?.textContent).toContain('candidate');
    expect(table?.textContent).toContain('packages/ui/src/button.scss:4');
  });

  it('has no automated accessibility violations with a populated component inventory', async () => {
    workspaceService.workspaceScan.set(emptyScan);
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
      ],
    });

    const fixture = TestBed.createComponent(WorkspacePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    await expectNoAccessibilityViolations(fixture.nativeElement);
  });
});

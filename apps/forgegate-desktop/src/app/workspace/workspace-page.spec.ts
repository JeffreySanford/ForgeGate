import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
      providers: [provideRouter([])],
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

  it('holds the raw component inventory behind a disclosure, with a link to the real designer-ready inventory outside the summary toggle', async () => {
    workspaceService.workspaceScan.set(emptyScan);
    workspaceService.customElementsManifest.set({
      schemaVersion: '1.0.0',
      modules: [
        {
          kind: 'javascript-module',
          path: 'src/up-button.ts',
          declarations: [
            { kind: 'class', name: 'UpButton', customElement: true, tagName: 'up-button' },
          ],
        },
      ],
    });

    const fixture = TestBed.createComponent(WorkspacePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const details = Array.from(compiled.querySelectorAll('details.workspace-page__raw-scan')).find((el) =>
      el.querySelector('summary')?.textContent?.includes('Raw component inventory'),
    );
    expect(details).toBeDefined();
    expect(details?.querySelector('summary')?.textContent).toContain('Raw component inventory (1 mapped)');
    // The link must NOT be inside <summary> — summary is itself an
    // interactive disclosure toggle, and nesting another interactive
    // control inside it is an invalid, axe-flagged ARIA pattern.
    expect(details?.querySelector('summary a')).toBeNull();
    const link = details?.querySelector('a[href="/components"]');
    expect(link?.textContent).toContain('Components');
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

  it('exposes raw adapter output and failures behind diagnostics disclosures', async () => {
    workspaceService.workspaceScan.set(emptyScan);
    workspaceService.adapterDiagnostics.set([
      {
        id: 'storybook-index',
        adapter: 'Storybook adapter',
        source: 'storybook-static/index.json',
        status: 'loaded',
        rawOutput: '{"v":5,"entries":{}}',
        error: null,
      },
      {
        id: 'test-evidence:broken',
        adapter: 'test evidence adapter',
        source: '.forgegate/evidence/broken.json',
        status: 'failed',
        rawOutput: '{"status":"green"}',
        error: 'Unsupported test status "green"',
      },
    ]);

    const fixture = TestBed.createComponent(WorkspacePage);
    fixture.detectChanges();
    await fixture.whenStable();

    const diagnostics = (fixture.nativeElement as HTMLElement).querySelector(
      '[aria-labelledby="adapter-diagnostics-heading"]',
    );
    expect(diagnostics?.textContent).toContain('Storybook adapter');
    expect(diagnostics?.textContent).toContain('storybook-static/index.json');
    expect(diagnostics?.textContent).toContain('{"v":5,"entries":{}}');
    expect(diagnostics?.textContent).toContain('test evidence adapter');
    expect(diagnostics?.textContent).toContain(
      'Unsupported test status "green"',
    );
    expect(diagnostics?.textContent).toContain('{"status":"green"}');
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

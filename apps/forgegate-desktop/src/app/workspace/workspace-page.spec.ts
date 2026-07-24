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

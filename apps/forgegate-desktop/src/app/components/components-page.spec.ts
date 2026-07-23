import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ComponentsPage } from './components-page';
import { expectNoAccessibilityViolations } from '../../test-a11y';
import { WorkspaceService, type WorkspaceScan } from '../workspace.service';
import type { CustomElementsManifest } from '@forgegate/adapter-web-components';

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

describe('ComponentsPage', () => {
  let workspaceService: WorkspaceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentsPage],
      providers: [provideRouter([])],
    }).compileComponents();
    workspaceService = TestBed.inject(WorkspaceService);
  });

  it('shows an explicit empty state when no workspace is open', async () => {
    const fixture = TestBed.createComponent(ComponentsPage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('.components-page__empty')?.textContent).toContain(
      'No workspace open yet',
    );
  });

  it('shows an explicit empty state when no manifest is connected', async () => {
    workspaceService.workspacePath.set('/repos/example');

    const fixture = TestBed.createComponent(ComponentsPage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('.components-page__empty')?.textContent).toContain(
      'No Custom Elements Manifest is connected',
    );
  });

  it('shows an explicit empty state when the manifest declares no components', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set({ schemaVersion: '1.0.0', modules: [] });

    const fixture = TestBed.createComponent(ComponentsPage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('.components-page__empty')?.textContent).toContain(
      'declares no custom elements',
    );
  });

  it('renders a table row per real component, with honest unknown fields', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(twoComponentManifest);

    const fixture = TestBed.createComponent(ComponentsPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = Array.from(compiled.querySelectorAll('.components-page__inventory-table tbody tr'));
    expect(rows).toHaveLength(2);

    const firstRowCells = Array.from(rows[0].querySelectorAll('td')).map((cell) => cell.textContent?.trim());
    expect(firstRowCells).toEqual([
      'web-components',
      'acme.design-system',
      'proposal',
      'Unknown — no evidence connected',
      'Not evaluated',
      'Not reviewed',
      'Not connected',
      'Unknown',
    ]);
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/components/acme.design-system.acme-button');
  });

  it('filters by search text across id and component name', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(twoComponentManifest);

    const fixture = TestBed.createComponent(ComponentsPage);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    component.searchText.set('card');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = Array.from(compiled.querySelectorAll('.components-page__inventory-table tbody tr'));
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('acme-card');
  });

  it('shows an empty state when filters exclude every component', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(twoComponentManifest);

    const fixture = TestBed.createComponent(ComponentsPage);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    component.searchText.set('nonexistent');
    fixture.detectChanges();
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('.components-page__empty')?.textContent).toContain(
      'No components match',
    );
  });

  it('switches to card view and links each card to its detail route', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(twoComponentManifest);

    const fixture = TestBed.createComponent(ComponentsPage);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    component.setViewMode('cards');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.component-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].querySelector('a')?.getAttribute('href')).toBe('/components/acme.design-system.acme-button');
  });

  it('shows mapping failures without hiding the components that did map successfully', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set({
      schemaVersion: '1.0.0',
      modules: [
        ...twoComponentManifest.modules,
        {
          kind: 'javascript-module',
          path: 'src/broken.ts',
          declarations: [{ kind: 'class', name: 'Broken', customElement: true, tagName: 'acme.broken' }],
        },
      ],
    });

    const fixture = TestBed.createComponent(ComponentsPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.components-page__inventory-table tbody tr')).toHaveLength(2);
    expect(compiled.querySelector('.components-page__failures')?.textContent).toContain('Broken');
  });

  it('has no automated accessibility violations with a populated table', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(twoComponentManifest);

    const fixture = TestBed.createComponent(ComponentsPage);
    fixture.detectChanges();
    await fixture.whenStable();

    await expectNoAccessibilityViolations(fixture.nativeElement);
  });

  it('has no automated accessibility violations in card view', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(twoComponentManifest);

    const fixture = TestBed.createComponent(ComponentsPage);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    component.setViewMode('cards');
    fixture.detectChanges();
    await fixture.whenStable();

    await expectNoAccessibilityViolations(fixture.nativeElement);
  });
});

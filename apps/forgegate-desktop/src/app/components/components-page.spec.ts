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

function largeManifest(count: number): CustomElementsManifest {
  return {
    schemaVersion: '1.0.0',
    modules: Array.from({ length: count }, (_, index) => {
      const suffix = index.toString().padStart(3, '0');
      return {
        kind: 'javascript-module' as const,
        path: `src/acme-component-${suffix}.ts`,
        declarations: [
          {
            kind: 'class' as const,
            name: `AcmeComponent${suffix}`,
            customElement: true,
            tagName: `acme-component-${suffix}`,
          },
        ],
      };
    }),
  };
}

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

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.components-page__empty',
      )?.textContent,
    ).toContain('No workspace open yet');
  });

  it('shows an explicit empty state when no manifest is connected', async () => {
    workspaceService.workspacePath.set('/repos/example');

    const fixture = TestBed.createComponent(ComponentsPage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.components-page__empty',
      )?.textContent,
    ).toContain('No Custom Elements Manifest is connected');
  });

  it('shows an explicit empty state when the manifest declares no components', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set({
      schemaVersion: '1.0.0',
      modules: [],
    });

    const fixture = TestBed.createComponent(ComponentsPage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.components-page__empty',
      )?.textContent,
    ).toContain('declares no custom elements');
  });

  it('renders a table row per real component, with honest unknown fields', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(twoComponentManifest);

    const fixture = TestBed.createComponent(ComponentsPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = Array.from(
      compiled.querySelectorAll('.components-page__inventory-table tbody tr'),
    );
    expect(rows).toHaveLength(2);

    const firstRowCells = Array.from(rows[0].querySelectorAll('td')).map(
      (cell) => cell.textContent?.trim(),
    );
    expect(firstRowCells).toEqual([
      'web-components',
      '@acme/design-system',
      'owned',
      'src/acme-button.ts',
      'proposal',
      'Unknown — no evidence connected',
      'Not evaluated',
      'Not reviewed',
      'Not connected',
      'Unknown',
    ]);
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe(
      '/components/acme.design-system.acme-button',
    );
  });

  it('deduplicates repeated declarations and exposes their provenance in diagnostics', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set({
      schemaVersion: '1.0.0',
      modules: [
        ...twoComponentManifest.modules,
        {
          kind: 'javascript-module',
          path: 'dist/acme-button.js',
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

    const fixture = TestBed.createComponent(ComponentsPage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelectorAll(
        '.components-page__inventory-table tbody tr',
      ),
    ).toHaveLength(2);
    expect(
      fixture.nativeElement.querySelector('.components-page__summary')
        ?.textContent,
    ).toContain('3 declarations discovered');
    expect(
      fixture.nativeElement.querySelector('.components-page__summary')
        ?.textContent,
    ).toContain('1 duplicate groups');
    expect(fixture.nativeElement.textContent).toContain(
      '2 declarations across 2 files',
    );
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
    const rows = Array.from(
      compiled.querySelectorAll('.components-page__inventory-table tbody tr'),
    );
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

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.components-page__empty',
      )?.textContent,
    ).toContain('No components match');
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
    expect(cards[0].querySelector('a')?.getAttribute('href')).toBe(
      '/components/acme.design-system.acme-button',
    );
  });

  it('paginates a large library and resets to the first page when filtering', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.workspaceScan.set(scan);
    workspaceService.customElementsManifest.set(largeManifest(225));

    const fixture = TestBed.createComponent(ComponentsPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(
      compiled.querySelectorAll('.components-page__inventory-table tbody tr'),
    ).toHaveLength(50);
    expect(
      compiled.querySelector('.components-page__result-summary')?.textContent,
    ).toContain('Showing 1–50 of 225');
    expect(
      compiled.querySelector('.components-page__pagination')?.textContent,
    ).toContain('Page 1 of 5');

    const next = Array.from(
      compiled.querySelectorAll<HTMLButtonElement>(
        '.components-page__pagination button',
      ),
    ).find((button) => button.textContent?.includes('Next'));
    next?.click();
    next?.click();
    fixture.detectChanges();

    const firstPageThreeRow = compiled.querySelector(
      '.components-page__inventory-table tbody tr',
    );
    expect(firstPageThreeRow?.textContent).toContain('acme-component-100');
    expect(
      compiled.querySelector('.components-page__pagination')?.textContent,
    ).toContain('Page 3 of 5');

    const search = compiled.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    if (!search) throw new Error('Expected the inventory search control');
    search.value = 'component-224';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(
      compiled.querySelectorAll('.components-page__inventory-table tbody tr'),
    ).toHaveLength(1);
    expect(compiled.textContent).toContain('Showing 1–1 of 1');
    expect(compiled.querySelector('.components-page__pagination')).toBeNull();
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
          declarations: [
            {
              kind: 'class',
              name: 'Broken',
              customElement: true,
              tagName: 'acme.broken',
            },
          ],
        },
      ],
    });

    const fixture = TestBed.createComponent(ComponentsPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(
      compiled.querySelectorAll('.components-page__inventory-table tbody tr'),
    ).toHaveLength(2);
    expect(
      compiled.querySelector('.components-page__failures')?.textContent,
    ).toContain('Broken');
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

import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { appRoutes } from './app.routes';
import { expectNoAccessibilityViolations } from '../test-a11y';
import { WorkspaceService, type GitStatus } from './workspace.service';

const gitStatus: GitStatus = { branch: 'main', commit: 'abc1234', dirty: true, changedFiles: [] };

describe('App shell', () => {
  let workspaceService: WorkspaceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(appRoutes)],
    }).compileComponents();
    workspaceService = TestBed.inject(WorkspaceService);
  });

  it('renders the brand and primary navigation', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app-nav__brand')?.textContent).toContain(
      'ForgeGate',
    );
    const links = Array.from(compiled.querySelectorAll('.app-nav a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toEqual([
      '/workspace',
      '/components',
      '/tests',
      '/reviews',
      '/documentation',
      '/releases',
    ]);
  });

  it('labels the not-yet-connected nav entries as coming soon, not silently empty', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const badges = Array.from(compiled.querySelectorAll('.app-nav__badge')).map(
      (el) => el.textContent?.trim(),
    );
    expect(badges).toEqual(['Coming soon', 'Coming soon', 'Coming soon', 'Coming soon']);
  });

  it('shows an explicit empty state in the context bar when no workspace is open', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(
      compiled.querySelector('.workspace-context-bar__empty')?.textContent,
    ).toContain('No workspace open');
  });

  it('shows workspace path and git status facts in the context bar once a workspace is open', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.gitStatus.set(gitStatus);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(
      compiled.querySelector('.workspace-context-bar__path')?.textContent,
    ).toContain('/repos/example');
    const facts = Array.from(
      compiled.querySelectorAll('.workspace-context-bar__fact'),
    ).map((el) => el.textContent?.trim());
    expect(facts).toEqual([
      'Branch main',
      'Commit abc1234',
      'Uncommitted changes',
    ]);
  });

  it('calls WorkspaceService.selectWorkspace when "Open workspace…" is clicked', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const selectWorkspace = vi
      .spyOn(workspaceService, 'selectWorkspace')
      .mockResolvedValue();
    const compiled = fixture.nativeElement as HTMLElement;
    compiled
      .querySelector<HTMLButtonElement>('.workspace-context-bar button')
      ?.click();

    expect(selectWorkspace).toHaveBeenCalledTimes(1);
  });

  it('disables duplicate workspace selection while discovery is running', async () => {
    workspaceService.scanProgress.set({
      phase: 'repository',
      state: 'running',
      label: 'Inspecting repository metadata and configuration',
      completed: 0,
      total: 5,
    });

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const button = (fixture.nativeElement as HTMLElement).querySelector(
      '.workspace-context-bar button',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Scanning workspace');
  });

  it('surfaces a workspace-level error as an alert', async () => {
    workspaceService.error.set('Failed to read git status');

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain(
      'Failed to read git status',
    );
  });

  it('moves focus to the main content landmark after a route change', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    await fixture.whenStable();

    await router.navigateByUrl('/components');
    fixture.detectChanges();
    await fixture.whenStable();

    const main = (fixture.nativeElement as HTMLElement).querySelector(
      '#main-content',
    );
    expect(document.activeElement).toBe(main);
  });

  it('has no automated accessibility violations in the empty state', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    await expectNoAccessibilityViolations(fixture.nativeElement);
  });

  it('has no automated accessibility violations with a workspace open', async () => {
    workspaceService.workspacePath.set('/repos/example');
    workspaceService.gitStatus.set(gitStatus);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    await expectNoAccessibilityViolations(fixture.nativeElement);
  });
});

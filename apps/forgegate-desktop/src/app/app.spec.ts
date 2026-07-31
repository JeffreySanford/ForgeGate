import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { appRoutes } from './app.routes';
import { expectNoAccessibilityViolations } from '../test-a11y';
import { WorkspaceService, type GitStatus } from './workspace.service';

const gitStatus: GitStatus = {
  branch: 'main',
  commit: 'abc1234',
  dirty: true,
  changedFiles: [],
};

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
    expect(badges).toEqual([
      'Coming soon',
      'Coming soon',
      'Coming soon',
      'Coming soon',
    ]);
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

  it('creates no route-leave ghost on the very first navigation, since there is nothing to leave yet', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.fg-route-leave')).toBeNull();
  });

  it('clones the outgoing page into an inert, aria-hidden .fg-route-leave ghost on a real route change', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    await fixture.whenStable();

    const main = (fixture.nativeElement as HTMLElement).querySelector(
      '#main-content',
    ) as HTMLElement;
    const outgoingText = main.textContent;

    await router.navigateByUrl('/components');
    fixture.detectChanges();
    await fixture.whenStable();

    const ghost = main.querySelector('.fg-route-leave');
    expect(ghost).not.toBeNull();
    expect(ghost?.getAttribute('aria-hidden')).toBe('true');
    expect(ghost?.hasAttribute('inert')).toBe(true);
    // The ghost is a real clone of the page that was actually showing,
    // not an empty placeholder.
    expect(ghost?.textContent).toBe(outgoingText);
  });

  it('removes the route-leave ghost via a fallback timer even when animationend never fires', async () => {
    // Real-world regression this guards: a zero-duration CSS animation
    // (e.g. prefers-reduced-motion, confirmed live against a headless
    // Chromium that reports reduced motion by default) does not reliably
    // fire `animationend` in every browser, which left the ghost stuck
    // in the DOM forever before this fallback existed.
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(App);
      const router = TestBed.inject(Router);
      fixture.detectChanges();
      await fixture.whenStable();

      await router.navigateByUrl('/components');
      fixture.detectChanges();
      await fixture.whenStable();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.fg-route-leave')).not.toBeNull();

      // Never dispatch animationend — only the fallback timer should
      // remove it.
      vi.advanceTimersByTime(1000);

      expect(compiled.querySelector('.fg-route-leave')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('handles rapid, back-to-back route changes without throwing or leaving a stuck extra ghost', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    await fixture.whenStable();

    // Two navigations fired in quick succession, with no await between
    // them — a real user clicking a second nav link before the first
    // transition's motion has settled.
    const first = router.navigateByUrl('/components');
    const second = router.navigateByUrl('/workspace');
    await Promise.all([first, second]);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    // Whatever ghost the last completed navigation created, there is
    // never more than one live at once — no accumulation across rapid
    // changes.
    expect(
      compiled.querySelectorAll('.fg-route-leave').length,
    ).toBeLessThanOrEqual(1);
  });

  it('removes the route-leave ghost once its own animation finishes, and never blocks accessibility while present', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    await fixture.whenStable();

    await router.navigateByUrl('/components');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const ghost = compiled.querySelector('.fg-route-leave');
    expect(ghost).not.toBeNull();

    await expectNoAccessibilityViolations(compiled);

    ghost?.dispatchEvent(new Event('animationend'));
    expect(compiled.querySelector('.fg-route-leave')).toBeNull();
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

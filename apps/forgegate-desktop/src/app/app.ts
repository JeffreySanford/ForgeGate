import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  NavigationStart,
  Router,
  RouterModule,
} from '@angular/router';
import { filter } from 'rxjs';
import { WorkspaceService } from './workspace.service';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = 'ForgeGate';
  protected readonly workspace = inject(WorkspaceService);
  private readonly router = inject(Router);
  private readonly mainContent =
    viewChild.required<ElementRef<HTMLElement>>('mainContent');

  constructor() {
    // P1.8's route-transition "leave" half: capture the outgoing content
    // as a ghost right before the router tears it down (NavigationStart
    // fires before deactivation), not after.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.captureLeavingSnapshot());

    // Route-change focus management (P0.2): move focus to the main content
    // landmark on every navigation so a keyboard/screen-reader user isn't
    // silently left focused on a nav link that's no longer where the page
    // content is, per documentation/25's route-change focus requirement.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.mainContent().nativeElement.focus());
  }

  openWorkspace(): void {
    void this.workspace.selectWorkspace();
  }

  /**
   * Clones the current #main-content DOM into a `.fg-route-leave` ghost
   * layered over the incoming route while it fades out — a real
   * overlapping crossfade, not just an arrival fade-in, since Angular's
   * router destroys the outgoing routed component the instant the new
   * one activates with no built-in overlap. Skips the very first
   * navigation (nothing rendered yet to leave from).
   *
   * The clone is marked `inert` and `aria-hidden`: it's a raw duplicate
   * of the outgoing page's interactive elements (links, buttons), and
   * must never be reachable by keyboard or a screen reader while it
   * visually fades out on top of the real, live content underneath.
   *
   * Removal is primarily event-driven (`animationend`), so it stays
   * correct under `prefers-reduced-motion` without any JS branching on
   * motion preference — but a zero-duration animation does not reliably
   * fire `animationend` in every real browser (confirmed live: a
   * headless Chromium environment reporting reduced motion left the
   * ghost stuck in the DOM forever). A `setTimeout` fallback, sized to
   * the animation's own real computed duration plus a small buffer,
   * guarantees removal either way; it's a no-op if `animationend`
   * already ran first, since removing an already-removed node is safe.
   *
   * Rapid, back-to-back navigations (a real user clicking a second nav
   * link before the first transition settles) must never nest one
   * ghost's clone inside another or accumulate more than one at a time:
   * any still-fading ghost from a previous navigation is dropped
   * immediately, and it is never itself included when cloning the
   * current content.
   *
   * The ghost is `position: fixed`, sized and placed with inline styles
   * from a real `getBoundingClientRect()` of `#main-content` — not
   * `position: absolute` with `#main-content` made a positioning context.
   * A real CI screenshot regression caught why that would be wrong:
   * `#main-content` has a real, unrelated `position: absolute` descendant
   * (`system-map.css`'s `.map-legend`), and making `#main-content` itself
   * a positioning context would have silently changed which element that
   * legend positions against on every page rendering the system map.
   */
  private captureLeavingSnapshot(): void {
    const main = this.mainContent().nativeElement;
    for (const previousGhost of Array.from(
      main.querySelectorAll(':scope > .fg-route-leave'),
    )) {
      previousGhost.remove();
    }
    const contentChildren = Array.from(main.children).filter(
      (child) => !child.classList.contains('fg-route-leave'),
    );
    if (contentChildren.length === 0) {
      return;
    }
    const rect = main.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'fg-route-leave';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.setAttribute('inert', '');
    ghost.style.top = `${rect.top}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    for (const child of contentChildren) {
      ghost.appendChild(child.cloneNode(true));
    }
    ghost.addEventListener('animationend', () => ghost.remove(), {
      once: true,
    });
    main.appendChild(ghost);

    const durationMs =
      parseFloat(getComputedStyle(ghost).animationDuration || '0') * 1000;
    setTimeout(() => ghost.remove(), durationMs + 50);
  }
}

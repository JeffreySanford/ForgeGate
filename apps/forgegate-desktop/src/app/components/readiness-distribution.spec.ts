import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentManifest } from '@forgegate/core-manifest';
import { createComponentManifest } from '@forgegate/core-manifest';
import { ReadinessDistribution } from './readiness-distribution';
import { expectNoAccessibilityViolations } from '../../test-a11y';
import type { ComponentSnapshotReadiness } from '../component-readiness';

function manifest(
  id: string,
  lifecycle: ComponentManifest['lifecycle'],
): ComponentManifest {
  return createComponentManifest({
    id,
    framework: 'web-components',
    adapter: 'framework.web-components',
    packagePath: '.',
    lifecycle,
  });
}

@Component({
  imports: [ReadinessDistribution],
  template: `<app-readiness-distribution
    [manifests]="manifests"
    [readinessByComponent]="readinessByComponent"
    [selectedLifecycle]="selected"
    (lifecycleSelect)="onSelect($event)"
  />`,
})
class HostComponent {
  manifests: readonly ComponentManifest[] = [];
  readinessByComponent = new Map<string, ComponentSnapshotReadiness>();
  selected: ComponentManifest['lifecycle'] | null = null;
  lastSelected: ComponentManifest['lifecycle'] | null | undefined;

  onSelect(value: ComponentManifest['lifecycle'] | null): void {
    this.lastSelected = value;
  }
}

describe('ReadinessDistribution', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
  });

  it('shows an explicit empty state with no components', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.readiness-distribution__empty',
      )?.textContent,
    ).toContain('No components to distribute');
  });

  it('groups real components by lifecycle with real counts and percentages', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifests = [
      manifest('acme.lib.a', 'proposal'),
      manifest('acme.lib.b', 'proposal'),
      manifest('acme.lib.c', 'candidate'),
      manifest('acme.lib.d', 'candidate'),
    ];
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const labels = Array.from(
      compiled.querySelectorAll(
        '.readiness-distribution__bar-button .readiness-distribution__bar-label',
      ),
    ).map((el) => el.textContent);
    expect(labels).toEqual(['proposal (2)', 'candidate (2)']);
  });

  it('groups real components by derived readiness with stable status ordering', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifests = [
      manifest('acme.lib.a', 'proposal'),
      manifest('acme.lib.b', 'proposal'),
      manifest('acme.lib.c', 'candidate'),
      manifest('acme.lib.d', 'approved'),
    ];
    fixture.componentInstance.readinessByComponent = new Map([
      ['acme.lib.a', 'clear'],
      ['acme.lib.b', 'warning'],
      ['acme.lib.c', 'blocked'],
      ['acme.lib.d', 'stale'],
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const readinessGroup = compiled.querySelectorAll(
      '.readiness-distribution__group',
    )[1];
    const labels = Array.from(
      readinessGroup.querySelectorAll('.readiness-distribution__bar-label'),
    ).map((el) => el.textContent);
    expect(labels).toEqual([
      'blocked (1)',
      'stale (1)',
      'warning (1)',
      'clear (1)',
    ]);
  });

  it('falls back to unknown when a component has no readiness decision yet', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifests = [manifest('acme.lib.a', 'proposal')];
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const readinessGroup = compiled.querySelectorAll(
      '.readiness-distribution__group',
    )[1];
    expect(readinessGroup.textContent).toContain('unknown (1)');
  });

  it('emits the clicked lifecycle, and toggles it off when clicked again', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifests = [manifest('acme.lib.a', 'proposal')];
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector<HTMLButtonElement>(
      '.readiness-distribution__bar-button',
    );
    button?.click();
    expect(fixture.componentInstance.lastSelected).toBe('proposal');

    fixture.componentInstance.selected = 'proposal';
    fixture.detectChanges();
    button?.click();
    expect(fixture.componentInstance.lastSelected).toBeNull();
  });

  it('lands on the last of several rapid, alternating selections rather than an intermediate one (P1.8 interruption safety)', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifests = [
      manifest('acme.lib.a', 'proposal'),
      manifest('acme.lib.b', 'candidate'),
      manifest('acme.lib.c', 'approved'),
    ];
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = Array.from(
      (
        fixture.nativeElement as HTMLElement
      ).querySelectorAll<HTMLButtonElement>(
        '.readiness-distribution__bar-button',
      ),
    );
    expect(buttons).toHaveLength(3);

    // Simulate a user firing several selections in quick succession
    // (e.g. before a CSS transition from the first click has finished)
    // without waiting for change detection between clicks.
    buttons[0]?.click();
    buttons[1]?.click();
    buttons[2]?.click();

    expect(fixture.componentInstance.lastSelected).toBe('approved');
  });

  it('has no automated accessibility violations', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifests = [
      manifest('acme.lib.a', 'proposal'),
      manifest('acme.lib.b', 'candidate'),
    ];
    fixture.detectChanges();
    await fixture.whenStable();

    await expectNoAccessibilityViolations(fixture.nativeElement);
  });
});

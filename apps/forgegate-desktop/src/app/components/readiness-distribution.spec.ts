import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentManifest } from '@forgegate/core-manifest';
import { createComponentManifest } from '@forgegate/core-manifest';
import { ReadinessDistribution } from './readiness-distribution';
import { expectNoAccessibilityViolations } from '../../test-a11y';

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
    [selectedLifecycle]="selected"
    (lifecycleSelect)="onSelect($event)"
  />`,
})
class HostComponent {
  manifests: readonly ComponentManifest[] = [];
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

  it('always reports readiness as a single unknown bucket, honestly, since no evidence pipeline exists', async () => {
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

  it('gives the graphical lifecycle and readiness bars an equivalent semantic table', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.manifests = [
      manifest('acme.lib.a', 'proposal'),
      manifest('acme.lib.b', 'candidate'),
    ];
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const graphicalLabels = Array.from(
      compiled.querySelectorAll('.readiness-distribution__bar-label'),
    ).map((label) => label.textContent?.trim());
    const tableStates = Array.from(
      compiled.querySelectorAll('.readiness-distribution__table tbody tr'),
    ).map((row) => {
      const cells = row.querySelectorAll('td');
      return `${cells[0]?.textContent?.trim()} (${cells[1]?.textContent?.trim()})`;
    });

    expect(tableStates).toEqual(graphicalLabels);
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

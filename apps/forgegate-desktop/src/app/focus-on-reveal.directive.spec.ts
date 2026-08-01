import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FocusOnRevealDirective } from './focus-on-reveal.directive';

@Component({
  imports: [FocusOnRevealDirective],
  template: `
    @if (show()) {
      <div tabindex="-1" appFocusOnReveal data-testid="reveal">revealed</div>
    }
  `,
})
class HostComponent {
  readonly show = signal(false);
}

describe('FocusOnRevealDirective', () => {
  it('moves keyboard focus to the host element the instant it is created', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.activeElement).not.toBe(
      fixture.nativeElement.querySelector('[data-testid="reveal"]'),
    );

    fixture.componentInstance.show.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const revealed = fixture.nativeElement.querySelector(
      '[data-testid="reveal"]',
    );
    expect(revealed).not.toBeNull();
    expect(document.activeElement).toBe(revealed);
  });
});

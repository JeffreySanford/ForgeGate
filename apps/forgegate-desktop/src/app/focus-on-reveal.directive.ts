import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

/**
 * P1.8 "causality, focus": moves keyboard focus to the host element the
 * instant it is created. Meant for content a user action reveals in place
 * (an `@if` branch that only exists once something real happened), so the
 * causal link between the action and the new content is communicated to
 * screen reader users too, not only through the accompanying entrance
 * animation. Relies on Angular's structural control flow creating a fresh
 * element each time the branch becomes true — there is nothing to "reset"
 * when it becomes false, since the element is destroyed with it.
 *
 * The host element must be programmatically focusable (`tabindex="-1"`).
 */
@Directive({
  selector: '[appFocusOnReveal]',
})
export class FocusOnRevealDirective implements AfterViewInit {
  private readonly element = inject(ElementRef<HTMLElement>);

  ngAfterViewInit(): void {
    this.element.nativeElement.focus();
  }
}

import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

/**
 * A single honest coming-soon placeholder, parametrized by route `data`
 * rather than one bespoke component per nav entry. Exists so Tests,
 * Reviews, Documentation, and Releases can be real nav links with a real
 * (if not yet functional) destination — per P0.2's rule that a nav entry
 * must be either connected or honestly labeled coming-soon, never present
 * with nowhere to go.
 */
@Component({
  selector: 'app-coming-soon-page',
  template: `
    <div class="coming-soon">
      <h1>{{ title() }}</h1>
      <p>{{ description() }}</p>
    </div>
  `,
  styles: `
    .coming-soon {
      padding: var(--fg-space-5);
      max-width: 960px;
    }
    .coming-soon h1 {
      font-size: var(--fg-type-size-xl);
      margin: 0 0 var(--fg-space-2);
    }
    .coming-soon p {
      color: var(--fg-color-text-muted);
    }
  `,
})
export class ComingSoonPage {
  private readonly route = inject(ActivatedRoute);

  protected readonly title = toSignal(
    this.route.data.pipe(map((data) => (data['title'] as string | undefined) ?? 'Coming soon')),
    { initialValue: (this.route.snapshot.data['title'] as string | undefined) ?? 'Coming soon' },
  );

  protected readonly description = toSignal(
    this.route.data.pipe(map((data) => (data['description'] as string | undefined) ?? 'This screen is not built yet.')),
    { initialValue: (this.route.snapshot.data['description'] as string | undefined) ?? 'This screen is not built yet.' },
  );
}

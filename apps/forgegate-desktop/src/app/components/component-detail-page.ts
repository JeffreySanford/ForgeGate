import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Honest coming-soon placeholder. The real Button assurance record is P0.5;
 * this route exists now so a component-inventory row will have somewhere
 * real (not a dead link) to navigate to once P0.4 links rows here.
 */
@Component({
  selector: 'app-component-detail-page',
  template: `
    <div class="coming-soon">
      <h1>Component: {{ componentId }}</h1>
      <p>The component assurance record is not built yet. This route is a placeholder.</p>
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
export class ComponentDetailPage {
  protected readonly componentId = inject(ActivatedRoute).snapshot.paramMap.get('componentId');
}

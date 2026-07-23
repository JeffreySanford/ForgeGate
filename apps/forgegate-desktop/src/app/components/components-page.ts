import { Component } from '@angular/core';

/**
 * Honest coming-soon placeholder (P0.2 checklist: routes may exist ahead of
 * their real screen as long as the state is truthful). The designer-ready
 * inventory itself is P0.4 — this route exists now so navigation and the
 * shell are real before that data-bound screen is built.
 */
@Component({
  selector: 'app-components-page',
  template: `
    <div class="coming-soon">
      <h1>Component inventory</h1>
      <p>The designer-ready component inventory is not built yet. This route is a placeholder.</p>
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
export class ComponentsPage {}

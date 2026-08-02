import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'workspace' },
  {
    path: 'workspace',
    loadComponent: () =>
      import('./workspace/workspace-page').then((m) => m.WorkspacePage),
  },
  {
    path: 'components',
    loadComponent: () =>
      import('./components/components-page').then((m) => m.ComponentsPage),
  },
  {
    path: 'components/:componentId',
    loadComponent: () =>
      import('./components/component-detail-page').then(
        (m) => m.ComponentDetailPage,
      ),
  },
  {
    path: 'accessibility-review',
    loadComponent: () =>
      import('./accessibility-review/accessibility-review-page').then(
        (m) => m.AccessibilityReviewPage,
      ),
  },
  {
    path: 'tests',
    loadComponent: () =>
      import('./coming-soon-page').then((m) => m.ComingSoonPage),
    data: {
      title: 'Tests',
      description:
        'Connected automated test evidence across the whole workspace is not built yet — see one component’s own Tests and evidence section on its assurance record for what exists today.',
    },
  },
  {
    path: 'reviews',
    loadComponent: () =>
      import('./coming-soon-page').then((m) => m.ComingSoonPage),
    data: {
      title: 'Reviews',
      description:
        'Manual review tracking is not built yet. No workspace-wide or per-component review workflow exists.',
    },
  },
  {
    path: 'documentation',
    loadComponent: () =>
      import('./coming-soon-page').then((m) => m.ComingSoonPage),
    data: {
      title: 'Documentation',
      description:
        'A workspace-wide documentation drift view is not built yet — see one component’s own Documentation section on its assurance record for what exists today.',
    },
  },
  {
    path: 'releases',
    loadComponent: () =>
      import('./coming-soon-page').then((m) => m.ComingSoonPage),
    data: {
      title: 'Releases',
      description:
        'Release policy and decisions are not built yet. Nothing in ForgeGate currently evaluates or blocks a release.',
    },
  },
  { path: '**', redirectTo: 'workspace' },
];

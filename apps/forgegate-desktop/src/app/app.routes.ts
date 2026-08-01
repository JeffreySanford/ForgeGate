import { Route } from '@angular/router';
import { AccessibilityReviewPage } from './accessibility-review/accessibility-review-page';
import { ComingSoonPage } from './coming-soon-page';
import { ComponentDetailPage } from './components/component-detail-page';
import { ComponentsPage } from './components/components-page';
import { WorkspacePage } from './workspace/workspace-page';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'workspace' },
  { path: 'workspace', component: WorkspacePage },
  { path: 'components', component: ComponentsPage },
  { path: 'components/:componentId', component: ComponentDetailPage },
  { path: 'accessibility-review', component: AccessibilityReviewPage },
  {
    path: 'tests',
    component: ComingSoonPage,
    data: {
      title: 'Tests',
      description:
        'Connected automated test evidence across the whole workspace is not built yet — see one component’s own Tests and evidence section on its assurance record for what exists today.',
    },
  },
  {
    path: 'reviews',
    component: ComingSoonPage,
    data: {
      title: 'Reviews',
      description:
        'Manual review tracking is not built yet. No workspace-wide or per-component review workflow exists.',
    },
  },
  {
    path: 'documentation',
    component: ComingSoonPage,
    data: {
      title: 'Documentation',
      description:
        'A workspace-wide documentation drift view is not built yet — see one component’s own Documentation section on its assurance record for what exists today.',
    },
  },
  {
    path: 'releases',
    component: ComingSoonPage,
    data: {
      title: 'Releases',
      description:
        'Release policy and decisions are not built yet. Nothing in ForgeGate currently evaluates or blocks a release.',
    },
  },
  { path: '**', redirectTo: 'workspace' },
];

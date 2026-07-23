import { Route } from '@angular/router';
import { ComponentDetailPage } from './components/component-detail-page';
import { ComponentsPage } from './components/components-page';
import { WorkspacePage } from './workspace/workspace-page';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'workspace' },
  { path: 'workspace', component: WorkspacePage },
  { path: 'components', component: ComponentsPage },
  { path: 'components/:componentId', component: ComponentDetailPage },
  { path: '**', redirectTo: 'workspace' },
];

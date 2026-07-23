import type { ComponentVersion, DocumentationTarget } from '@forgegate/core-domain';
import { combineLatest, distinctUntilChanged, map, type Observable } from 'rxjs';

/**
 * A published documentation page is stale whenever it either does not exist
 * yet or was published for a different component version than the one
 * currently live, per the drift rules in documentation/10-documentation-publishing.md
 * and documentation/12-starlight-integration.md.
 */
export function computeDocumentationDrift(
  version: ComponentVersion,
  target: DocumentationTarget | null,
): boolean {
  if (!target) {
    return true;
  }
  return target.publishedVersion !== version.version;
}

export function documentationDrift$(
  version$: Observable<ComponentVersion>,
  target$: Observable<DocumentationTarget | null>,
): Observable<boolean> {
  return combineLatest([version$, target$]).pipe(
    map(([version, target]) => computeDocumentationDrift(version, target)),
    distinctUntilChanged(),
  );
}

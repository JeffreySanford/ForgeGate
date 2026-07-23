import type { ComponentVersion, DocumentationTarget, ReadinessFlag } from '@forgegate/core-domain';
import type { Finding } from '@forgegate/core-evidence';
import { BehaviorSubject, filter, shareReplay, type Observable } from 'rxjs';
import { documentationDrift$ } from './documentation-drift';
import { readiness$ } from './readiness';

/**
 * The central composition point described in documentation/22-reactive-data-flow.md
 * ("Central evidence bus"): current state lives in BehaviorSubjects so late
 * subscribers see it immediately, and the derived readiness$/documentationDrift$
 * streams are shared so multiple UI panels don't each recompute independently.
 */
export class EvidenceBus {
  private readonly findingsSubject = new BehaviorSubject<readonly Finding[]>([]);
  private readonly componentVersionSubject: BehaviorSubject<ComponentVersion | null>;
  private readonly documentationTargetSubject = new BehaviorSubject<DocumentationTarget | null>(null);

  readonly readiness$: Observable<ReadinessFlag>;
  readonly documentationDrift$: Observable<boolean>;

  constructor(initialComponentVersion: ComponentVersion | null = null) {
    this.componentVersionSubject = new BehaviorSubject(initialComponentVersion);

    this.readiness$ = readiness$(this.findingsSubject.asObservable()).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    // documentationDrift$ requires a non-null ComponentVersion; until one is
    // set, there is nothing to compute drift against.
    const componentVersionPresent$ = this.componentVersionSubject.pipe(
      filter((version): version is ComponentVersion => version !== null),
    );

    this.documentationDrift$ = documentationDrift$(
      componentVersionPresent$,
      this.documentationTargetSubject.asObservable(),
    ).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  }

  updateFindings(findings: readonly Finding[]): void {
    this.findingsSubject.next(findings);
  }

  updateComponentVersion(version: ComponentVersion): void {
    this.componentVersionSubject.next(version);
  }

  updateDocumentationTarget(target: DocumentationTarget | null): void {
    this.documentationTargetSubject.next(target);
  }

  get currentFindings(): readonly Finding[] {
    return this.findingsSubject.value;
  }
}

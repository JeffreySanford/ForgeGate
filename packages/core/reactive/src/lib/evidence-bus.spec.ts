import type { ComponentVersion, DocumentationTarget } from '@forgegate/core-domain';
import { createFinding } from '@forgegate/core-evidence';
import { EvidenceBus } from './evidence-bus';

const version: ComponentVersion = {
  id: 'cv-1',
  componentId: 'up.design-system.button',
  version: '1.2.0',
  commitSha: 'a'.repeat(40),
  contractId: 'contract-1',
  lifecycle: 'candidate',
};

describe('EvidenceBus', () => {
  it('starts clear with no findings', () => {
    const bus = new EvidenceBus();
    const seen: string[] = [];
    bus.readiness$.subscribe((value) => seen.push(value));
    expect(seen).toEqual(['clear']);
  });

  it('recomputes readiness for every subscriber when findings change', () => {
    const bus = new EvidenceBus();
    const finding = createFinding({
      id: 'f-1',
      componentId: 'up.design-system.button',
      description: 'Missing accessible name',
      severity: 'critical',
    });

    const panelA: string[] = [];
    const panelB: string[] = [];
    bus.readiness$.subscribe((value) => panelA.push(value));

    bus.updateFindings([finding]);

    // A second panel subscribing late still sees current state immediately,
    // per documentation/22-reactive-data-flow.md's BehaviorSubject rule.
    bus.readiness$.subscribe((value) => panelB.push(value));

    expect(panelA).toEqual(['clear', 'blocked']);
    expect(panelB).toEqual(['blocked']);
    expect(bus.currentFindings).toEqual([finding]);
  });

  it('reports documentation drift as true until a matching target is set', () => {
    const bus = new EvidenceBus(version);
    const seen: boolean[] = [];
    bus.documentationDrift$.subscribe((value) => seen.push(value));

    const staleTarget: DocumentationTarget = {
      id: 'dt-1',
      componentId: 'up.design-system.button',
      adapter: 'starlight',
      pathOrPageId: 'src/content/docs/components/button.mdx',
      publishedVersion: '1.1.0',
    };
    // The initial (no target set) state is already drifted=true, and a
    // stale target is still drifted=true, so distinctUntilChanged
    // suppresses that middle emission — only the transition to a matching
    // target produces a new value.
    bus.updateDocumentationTarget(staleTarget);
    bus.updateDocumentationTarget({ ...staleTarget, publishedVersion: '1.2.0' });

    expect(seen).toEqual([true, false]);
  });
});

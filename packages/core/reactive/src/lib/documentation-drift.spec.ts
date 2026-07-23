import { TestScheduler } from 'rxjs/testing';
import { computeDocumentationDrift, documentationDrift$ } from './documentation-drift';

const version: import('@forgegate/core-domain').ComponentVersion = {
  id: 'cv-1',
  componentId: 'up.design-system.button',
  version: '1.2.0',
  commitSha: 'a'.repeat(40),
  contractId: 'contract-1',
  lifecycle: 'candidate',
};

const currentTarget: import('@forgegate/core-domain').DocumentationTarget = {
  id: 'dt-1',
  componentId: 'up.design-system.button',
  adapter: 'starlight',
  pathOrPageId: 'src/content/docs/components/button.mdx',
  publishedVersion: '1.2.0',
};

const staleTarget = { ...currentTarget, publishedVersion: '1.1.0' };

describe('computeDocumentationDrift', () => {
  it('is drifted when there is no published target at all', () => {
    expect(computeDocumentationDrift(version, null)).toBe(true);
  });

  it('is drifted when the published version does not match the current version', () => {
    expect(computeDocumentationDrift(version, staleTarget)).toBe(true);
  });

  it('is not drifted when the published version matches', () => {
    expect(computeDocumentationDrift(version, currentTarget)).toBe(false);
  });
});

describe('documentationDrift$ (marble)', () => {
  it('recomputes as the component version and target streams change', () => {
    const scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

    scheduler.run(({ cold, expectObservable }) => {
      const version$ = cold('v-----|', { v: version });
      // Each target differs in drift status from the one before it, so no
      // emission is suppressed by distinctUntilChanged: no target (drifted),
      // then current (not drifted), then stale again (drifted).
      const target$ = cold('n-c-s-|', { n: null, c: currentTarget, s: staleTarget });

      expectObservable(documentationDrift$(version$, target$)).toBe('x-y-z-|', {
        x: true,
        y: false,
        z: true,
      });
    });
  });
});

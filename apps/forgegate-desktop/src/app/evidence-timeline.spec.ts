import type { TestExecution } from '@forgegate/core-evidence';
import { computeEvidenceTimeline } from './evidence-timeline';

function execution(overrides: Partial<TestExecution>): TestExecution {
  return {
    id: 'id',
    componentVersionId: 'component-version',
    gate: 'unit',
    tool: 'vitest',
    toolVersion: '4.1.10',
    adapterVersion: '1.0.0',
    status: 'passed',
    startedAt: '2026-01-01T00:00:00.000Z',
    commitOrFingerprint: 'a'.repeat(40),
    ...overrides,
  };
}

describe('computeEvidenceTimeline', () => {
  it('returns an empty list when there is no evidence', () => {
    expect(computeEvidenceTimeline([])).toEqual([]);
  });

  it('orders real evidence records newest-first by startedAt', () => {
    const oldest = execution({ id: 'oldest', startedAt: '2026-01-01T00:00:00.000Z' });
    const middle = execution({ id: 'middle', startedAt: '2026-01-15T00:00:00.000Z' });
    const newest = execution({ id: 'newest', startedAt: '2026-02-01T00:00:00.000Z' });

    const result = computeEvidenceTimeline([middle, oldest, newest]);

    expect(result.map((entry) => entry.id)).toEqual(['newest', 'middle', 'oldest']);
  });

  it('does not mutate the input array', () => {
    const input = [
      execution({ id: 'a', startedAt: '2026-01-01T00:00:00.000Z' }),
      execution({ id: 'b', startedAt: '2026-02-01T00:00:00.000Z' }),
    ];
    const original = [...input];

    computeEvidenceTimeline(input);

    expect(input).toEqual(original);
  });
});

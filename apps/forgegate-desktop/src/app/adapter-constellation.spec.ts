import {
  computeAdapterConstellation,
  setupGuidanceFor,
} from './adapter-constellation';
import type { AdapterDiagnostic } from './workspace.service';

function diagnostic(overrides: Partial<AdapterDiagnostic>): AdapterDiagnostic {
  return {
    id: 'id',
    adapter: 'adapter',
    source: 'source',
    status: 'loaded',
    rawOutput: null,
    error: null,
    ...overrides,
  };
}

describe('computeAdapterConstellation', () => {
  it('returns an empty list when no adapter has reported anything', () => {
    expect(computeAdapterConstellation([])).toEqual([]);
  });

  it('groups multiple diagnostic entries from the same adapter into one row', () => {
    const result = computeAdapterConstellation([
      diagnostic({
        id: 'test-evidence:a.json',
        adapter: 'test evidence adapter',
        status: 'loaded',
      }),
      diagnostic({
        id: 'test-evidence:b.json',
        adapter: 'test evidence adapter',
        status: 'loaded',
      }),
    ]);

    expect(result).toEqual([
      {
        adapter: 'test evidence adapter',
        status: 'loaded',
        sourceCount: 2,
        errors: [],
      },
    ]);
  });

  it('reports the worst status across an adapter group rather than the first or last entry', () => {
    const result = computeAdapterConstellation([
      diagnostic({
        id: 'a',
        adapter: 'component manifest adapter',
        status: 'loaded',
      }),
      diagnostic({
        id: 'b',
        adapter: 'component manifest adapter',
        status: 'failed',
        error: 'boom',
      }),
    ]);

    expect(result).toEqual([
      {
        adapter: 'component manifest adapter',
        status: 'failed',
        sourceCount: 2,
        errors: ['boom'],
      },
    ]);
  });

  it('sorts adapters alphabetically for a stable, real ordering', () => {
    const result = computeAdapterConstellation([
      diagnostic({ id: 'a', adapter: 'Web Components adapter' }),
      diagnostic({ id: 'b', adapter: 'Git workspace adapter' }),
    ]);

    expect(result.map((entry) => entry.adapter)).toEqual([
      'Git workspace adapter',
      'Web Components adapter',
    ]);
  });
});

describe('setupGuidanceFor', () => {
  it('returns real, specific guidance for an adapter backed by external tooling', () => {
    expect(setupGuidanceFor('Storybook adapter')).toContain(
      'storybook-static/index.json',
    );
  });

  it("returns null for ForgeGate's own internal data sources, which have nothing external to set up", () => {
    expect(setupGuidanceFor('workspace scanner')).toBeNull();
    expect(setupGuidanceFor('manual review evidence')).toBeNull();
  });

  it('returns null for an unrecognized adapter name rather than guessing', () => {
    expect(
      setupGuidanceFor('some future adapter nobody has named yet'),
    ).toBeNull();
  });
});

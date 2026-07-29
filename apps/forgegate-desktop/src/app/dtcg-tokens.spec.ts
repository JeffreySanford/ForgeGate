import {
  aliasTarget,
  computeGroupCoverage,
  parseDtcgTokens,
  resolveDtcgAliases,
  topLevelGroups,
  type DtcgToken,
} from './dtcg-tokens';

function token(path: string, value: unknown, type: string | null = 'color'): DtcgToken {
  return { path, type, value };
}

describe('parseDtcgTokens', () => {
  it('rejects input that is not a JSON object', () => {
    expect(() => parseDtcgTokens('[]')).toThrow('must be a JSON object');
    expect(() => parseDtcgTokens('not json')).toThrow('Invalid DTCG token JSON');
  });

  it('collects leaf tokens with their dot-delimited paths', () => {
    const result = parseDtcgTokens(
      JSON.stringify({
        primitive: {
          color: {
            blue: { '50': { $type: 'color', $value: '#eff6ff' } },
          },
        },
      }),
    );

    expect(result.tokens).toEqual([
      { path: 'primitive.color.blue.50', type: 'color', value: '#eff6ff' },
    ]);
    expect(result.failures).toEqual([]);
  });

  it('inherits $type from the nearest ancestor group that declares one', () => {
    const result = parseDtcgTokens(
      JSON.stringify({
        primitive: {
          $type: 'color',
          brand: { $value: '#fff' },
          spacing: { $type: 'dimension', small: { $value: '4px' } },
        },
      }),
    );

    const byPath = new Map(result.tokens.map((t) => [t.path, t]));
    expect(byPath.get('primitive.brand')?.type).toBe('color');
    // A nested group's own $type overrides the inherited one.
    expect(byPath.get('primitive.spacing.small')?.type).toBe('dimension');
  });

  it('reports a null type when nothing in the ancestry declares one', () => {
    const result = parseDtcgTokens(JSON.stringify({ a: { b: { $value: 'x' } } }));
    expect(result.tokens[0]?.type).toBeNull();
  });

  it('carries $description and $extensions through without interpreting them', () => {
    const result = parseDtcgTokens(
      JSON.stringify({
        ps: {
          surface: {
            $type: 'color',
            $value: '#f8fafc',
            $description: 'Application background color.',
            $extensions: { 'public-sector': { theme: 'neutral', mode: 'light' } },
          },
        },
      }),
    );

    expect(result.tokens[0]?.description).toBe('Application background color.');
    expect(result.tokens[0]?.extensions).toEqual({
      'public-sector': { theme: 'neutral', mode: 'light' },
    });
  });

  it('reports a non-object child as a failure rather than dropping it silently', () => {
    const result = parseDtcgTokens(JSON.stringify({ primitive: { broken: 'not-an-object' } }));
    expect(result.tokens).toEqual([]);
    expect(result.failures).toEqual(['primitive.broken']);
  });

  it('carries a composite value through as-is rather than inventing structure for it', () => {
    const shadow = { color: '#000', offsetX: '0', offsetY: '2px', blur: '4px' };
    const result = parseDtcgTokens(
      JSON.stringify({ effect: { card: { $type: 'shadow', $value: shadow } } }),
    );
    expect(result.tokens[0]?.value).toEqual(shadow);
  });
});

describe('aliasTarget', () => {
  it('recognizes a DTCG alias and extracts its path', () => {
    expect(aliasTarget('{primitive.color.blue.500}')).toBe('primitive.color.blue.500');
    expect(aliasTarget('  {a.b}  ')).toBe('a.b');
  });

  it('treats a literal, a partial reference, or a non-string as not an alias', () => {
    expect(aliasTarget('#ffffff')).toBeNull();
    expect(aliasTarget('linear-gradient({a.b}, #fff)')).toBeNull();
    expect(aliasTarget(42)).toBeNull();
    expect(aliasTarget({ nested: true })).toBeNull();
  });
});

describe('resolveDtcgAliases', () => {
  it('marks a token with a literal value as literal', () => {
    const [resolved] = resolveDtcgAliases([token('primitive.blue', '#2563eb')]);
    expect(resolved?.referenceStatus).toBe('literal');
    expect(resolved?.resolvedValue).toBe('#2563eb');
    expect(resolved?.aliasChain).toEqual([]);
  });

  it('follows a multi-hop alias chain to the final literal value', () => {
    const resolved = resolveDtcgAliases([
      token('primitive.blue', '#2563eb'),
      token('semantic.primary', '{primitive.blue}'),
      token('component.button.background', '{semantic.primary}'),
    ]);

    const button = resolved.find((t) => t.path === 'component.button.background');
    expect(button?.referenceStatus).toBe('resolved');
    expect(button?.resolvedValue).toBe('#2563eb');
    expect(button?.aliasChain).toEqual(['semantic.primary', 'primitive.blue']);
  });

  it('reports a reference to a path that does not exist as unresolved, not literal', () => {
    const [resolved] = resolveDtcgAliases([token('semantic.primary', '{primitive.missing}')]);
    expect(resolved?.referenceStatus).toBe('unresolved');
    expect(resolved?.resolvedValue).toBeNull();
    expect(resolved?.aliasChain).toEqual(['primitive.missing']);
  });

  it('detects a direct self-reference as circular rather than looping forever', () => {
    const [resolved] = resolveDtcgAliases([token('a', '{a}')]);
    expect(resolved?.referenceStatus).toBe('circular');
    expect(resolved?.resolvedValue).toBeNull();
  });

  it('detects a multi-token cycle as circular', () => {
    const resolved = resolveDtcgAliases([token('a', '{b}'), token('b', '{c}'), token('c', '{a}')]);
    expect(resolved.map((t) => t.referenceStatus)).toEqual(['circular', 'circular', 'circular']);
  });
});

describe('computeGroupCoverage', () => {
  const themeTokens = [
    token('theme.neutral-light.ps.surface.background', '#fff'),
    token('theme.neutral-light.ps.surface.border', '#eee'),
    token('theme.neutral-dark.ps.surface.background', '#000'),
    // neutral-dark deliberately omits ps.surface.border
  ];

  it('compares sibling groups structurally, without relying on any vendor extension', () => {
    const coverage = computeGroupCoverage(themeTokens, 'theme');

    expect(coverage.siblings).toEqual(['neutral-dark', 'neutral-light']);
    expect(coverage.rows.map((row) => row.relativePath)).toEqual([
      'ps.surface.background',
      'ps.surface.border',
    ]);
  });

  it('reports exactly which sibling groups are missing a token', () => {
    const coverage = computeGroupCoverage(themeTokens, 'theme');

    expect(coverage.incompleteRows).toEqual([
      {
        relativePath: 'ps.surface.border',
        presentIn: ['neutral-light'],
        missingFrom: ['neutral-dark'],
      },
    ]);
  });

  it('reports no incomplete rows when every sibling defines the same tokens', () => {
    const coverage = computeGroupCoverage(
      [
        token('theme.light.a', '#fff'),
        token('theme.dark.a', '#000'),
      ],
      'theme',
    );
    expect(coverage.incompleteRows).toEqual([]);
    expect(coverage.siblings).toEqual(['dark', 'light']);
  });

  it('returns an empty coverage for a group that has no tokens', () => {
    const coverage = computeGroupCoverage([token('primitive.a', '#fff')], 'theme');
    expect(coverage.siblings).toEqual([]);
    expect(coverage.rows).toEqual([]);
  });
});

describe('topLevelGroups', () => {
  it('lists the distinct root groups that contain tokens', () => {
    expect(
      topLevelGroups([
        token('primitive.color.blue', '#fff'),
        token('theme.light.a', '#fff'),
        token('primitive.spacing.sm', '4px'),
      ]),
    ).toEqual(['primitive', 'theme']);
  });
});

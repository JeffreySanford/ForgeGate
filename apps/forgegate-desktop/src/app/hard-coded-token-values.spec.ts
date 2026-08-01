import { describe, expect, it } from 'vitest';
import { findHardCodedTokenValues } from './hard-coded-token-values';
import type { ResolvedDtcgToken } from './dtcg-tokens';

function token(
  overrides: Partial<ResolvedDtcgToken> & { path: string },
): ResolvedDtcgToken {
  return {
    type: 'color',
    value: overrides.resolvedValue ?? '',
    referenceStatus: 'literal',
    aliasChain: [],
    resolvedValue: null,
    ...overrides,
  };
}

describe('findHardCodedTokenValues', () => {
  it('reports a source file that contains a literal token value verbatim', () => {
    const tokens = [token({ path: 'color.action', resolvedValue: '#3366cc' })];
    const files = [
      { path: 'src/button.ts', contents: `styles = { color: '#3366cc' };` },
    ];

    expect(findHardCodedTokenValues(tokens, files)).toEqual([
      {
        tokenPath: 'color.action',
        resolvedValue: '#3366cc',
        sourceFile: 'src/button.ts',
      },
    ]);
  });

  it('does not report a source file that never contains the value', () => {
    const tokens = [token({ path: 'color.action', resolvedValue: '#3366cc' })];
    const files = [{ path: 'src/button.ts', contents: `color: '#ffffff'` }];

    expect(findHardCodedTokenValues(tokens, files)).toEqual([]);
  });

  it('ignores unresolved and circular tokens, which have no real value to search for', () => {
    const tokens = [
      token({
        path: 'color.broken',
        referenceStatus: 'unresolved',
        resolvedValue: null,
      }),
      token({
        path: 'color.loop',
        referenceStatus: 'circular',
        resolvedValue: null,
      }),
    ];
    const files = [{ path: 'src/button.ts', contents: 'anything at all' }];

    expect(findHardCodedTokenValues(tokens, files)).toEqual([]);
  });

  it('ignores non-string resolved values, such as numeric or object token values', () => {
    const tokens = [
      token({ path: 'spacing.unit', resolvedValue: 16 as unknown as string }),
    ];
    const files = [{ path: 'src/button.ts', contents: '16' }];

    expect(findHardCodedTokenValues(tokens, files)).toEqual([]);
  });

  it('ignores values shorter than the noise threshold', () => {
    const tokens = [token({ path: 'spacing.sm', resolvedValue: '4px' })];
    const files = [{ path: 'src/button.ts', contents: 'padding: 4px;' }];

    expect(findHardCodedTokenValues(tokens, files)).toEqual([]);
  });

  it('reports one finding per matching file for each candidate token, resolved aliases included', () => {
    const tokens = [
      token({
        path: 'color.action.hover',
        referenceStatus: 'resolved',
        resolvedValue: '#3366cc',
      }),
    ];
    const files = [
      { path: 'src/a.ts', contents: '#3366cc' },
      { path: 'src/b.ts', contents: '#3366cc, again #3366cc' },
      { path: 'src/c.ts', contents: 'no match here' },
    ];

    expect(findHardCodedTokenValues(tokens, files)).toEqual([
      {
        tokenPath: 'color.action.hover',
        resolvedValue: '#3366cc',
        sourceFile: 'src/a.ts',
      },
      {
        tokenPath: 'color.action.hover',
        resolvedValue: '#3366cc',
        sourceFile: 'src/b.ts',
      },
    ]);
  });

  it('returns nothing when there are no source files to scan', () => {
    const tokens = [token({ path: 'color.action', resolvedValue: '#3366cc' })];
    expect(findHardCodedTokenValues(tokens, [])).toEqual([]);
  });
});

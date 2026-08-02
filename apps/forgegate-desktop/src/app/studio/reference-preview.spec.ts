import {
  computePreviewTokenValues,
  previewSurfaceStyle,
} from './reference-preview';
import type { ResolvedDtcgToken } from '../dtcg-tokens';

function resolvedToken(
  overrides: Partial<ResolvedDtcgToken>,
): ResolvedDtcgToken {
  return {
    path: 'primitive.color.blue.50',
    type: 'color',
    value: '#3366ff',
    referenceStatus: 'literal',
    aliasChain: [],
    resolvedValue: '#3366ff',
    ...overrides,
  };
}

describe('computePreviewTokenValues', () => {
  it('resolves a mapped token slot to its real resolved CSS color value', () => {
    const result = computePreviewTokenValues(
      [{ slotId: 'root.background', tokenPath: 'primitive.color.blue.50' }],
      [resolvedToken({})],
    );

    expect(result).toEqual([
      {
        slotId: 'root.background',
        tokenPath: 'primitive.color.blue.50',
        cssValue: '#3366ff',
      },
    ]);
  });

  it('reports a null cssValue when the mapped token path does not resolve to a real token', () => {
    const result = computePreviewTokenValues(
      [{ slotId: 'root.background', tokenPath: 'does.not.exist' }],
      [resolvedToken({})],
    );

    expect(result[0]?.cssValue).toBeNull();
  });

  it('reports a null cssValue for a non-color resolved value rather than fabricating one', () => {
    const result = computePreviewTokenValues(
      [{ slotId: 'root.spacing', tokenPath: 'primitive.spacing.md' }],
      [
        resolvedToken({
          path: 'primitive.spacing.md',
          type: 'dimension',
          resolvedValue: 16,
        }),
      ],
    );

    expect(result[0]?.cssValue).toBeNull();
  });

  it('reports a null cssValue for an unresolved alias', () => {
    const result = computePreviewTokenValues(
      [{ slotId: 'root.background', tokenPath: 'broken.alias' }],
      [
        resolvedToken({
          path: 'broken.alias',
          referenceStatus: 'unresolved',
          resolvedValue: null,
        }),
      ],
    );

    expect(result[0]?.cssValue).toBeNull();
  });
});

describe('previewSurfaceStyle', () => {
  it('applies a background-colored slot to background-color', () => {
    const style = previewSurfaceStyle([
      { slotId: 'root.background', tokenPath: 'x', cssValue: '#3366ff' },
    ]);

    expect(style).toEqual({ 'background-color': '#3366ff' });
  });

  it('applies a foreground-named slot to color', () => {
    const style = previewSurfaceStyle([
      { slotId: 'root.foreground', tokenPath: 'x', cssValue: '#ffffff' },
    ]);

    expect(style).toEqual({ color: '#ffffff' });
  });

  it('ignores a slot with no resolvable cssValue', () => {
    const style = previewSurfaceStyle([
      { slotId: 'root.background', tokenPath: 'x', cssValue: null },
    ]);

    expect(style).toEqual({});
  });

  it('never applies a slot id it does not recognize, since it has no known style-property meaning', () => {
    const style = previewSurfaceStyle([
      { slotId: 'root.elevation', tokenPath: 'x', cssValue: '#000000' },
    ]);

    expect(style).toEqual({});
  });
});

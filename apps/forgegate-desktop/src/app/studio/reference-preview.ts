import type { ProposalTokenMapping } from '@forgegate/core-manifest';
import type { ResolvedDtcgToken } from '../dtcg-tokens';

/**
 * Workstream 9 — "The Studio can demonstrate proposal changes before
 * framework generation exists." Real proposal data (token mappings,
 * anatomy, states) rendered as a reference preview, never claiming to be
 * repository implementation. Deliberately narrow: no theme/viewport/
 * locale/direction controls, no anatomy-overlay coordinates — a semantic
 * list of anatomy parts and a plain preview surface instead, matching this
 * codebase's established "semantic list alternative" pattern rather than
 * building spatial overlay precision this slice doesn't have data for.
 */
export interface PreviewTokenValue {
  readonly slotId: string;
  readonly tokenPath: string;
  /** The token's real resolved literal value, or `null` when the token
   * path doesn't resolve to a real token, or its resolved value isn't a
   * usable CSS string (e.g. a composite shadow/typography object) — never
   * a fabricated placeholder. */
  readonly cssValue: string | null;
}

/** Real CSS color syntaxes only — never treats an arbitrary string as a
 * color, since a non-color token value (e.g. a font family name) rendered
 * as a background would misrepresent the token. */
const CSS_COLOR_PATTERN =
  /^(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(|oklch\(|[a-z]+)$/;

function asCssColor(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return CSS_COLOR_PATTERN.test(trimmed) ? trimmed : null;
}

export function computePreviewTokenValues(
  tokenMappings: readonly ProposalTokenMapping[],
  resolvedTokens: readonly ResolvedDtcgToken[],
): readonly PreviewTokenValue[] {
  const byPath = new Map(resolvedTokens.map((token) => [token.path, token]));
  return tokenMappings.map((mapping) => {
    const token = byPath.get(mapping.tokenPath);
    return {
      slotId: mapping.slotId,
      tokenPath: mapping.tokenPath,
      cssValue: token ? asCssColor(token.resolvedValue) : null,
    };
  });
}

/**
 * Best-effort mapping from a token slot id's own name to the one real CSS
 * property it plausibly represents — ForgeGate has no per-blueprint
 * style-property semantics yet, so this only recognizes the two
 * conventional suffixes real fixtures use (`background`, `foreground`).
 * Anything else is shown as a value only, in the token-mapping list, never
 * silently applied to a CSS property that might be wrong.
 */
export function previewSurfaceStyle(
  values: readonly PreviewTokenValue[],
): Readonly<Record<string, string>> {
  const style: Record<string, string> = {};
  for (const value of values) {
    if (!value.cssValue) {
      continue;
    }
    if (value.slotId.endsWith('background')) {
      style['background-color'] = value.cssValue;
    } else if (
      value.slotId.endsWith('foreground') ||
      value.slotId.endsWith('color')
    ) {
      style['color'] = value.cssValue;
    }
  }
  return style;
}

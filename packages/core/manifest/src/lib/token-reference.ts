export type TokenCategory = 'color' | 'spacing' | 'typography' | 'motion' | 'elevation' | 'border' | 'other';

/**
 * Maps a component version to a DTCG token it consumes, per
 * documentation/23-design-tokens-and-figma-bridge.md. `tokenPath` uses DTCG
 * dot-path aliasing (e.g. "color.primary.500"), not a ForgeGate-specific format.
 */
export interface TokenReference {
  readonly id: string;
  readonly componentVersionId: string;
  readonly tokenPath: string;
  readonly category: TokenCategory;
  readonly required: boolean;
}

export function createTokenReference(input: {
  id: string;
  componentVersionId: string;
  tokenPath: string;
  category: TokenCategory;
  required?: boolean;
}): TokenReference {
  if (!input.tokenPath.trim()) {
    throw new Error('TokenReference requires a non-empty tokenPath');
  }
  return { ...input, required: input.required ?? true };
}

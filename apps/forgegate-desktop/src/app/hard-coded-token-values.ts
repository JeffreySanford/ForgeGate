import type { ResolvedDtcgToken } from './dtcg-tokens';

/**
 * A token's resolved literal value found written directly in component
 * source, rather than referenced through a token/variable. Detected by
 * substring match, so it is a real occurrence of the exact literal — not a
 * claim that the source *should* have used the token, which would require
 * understanding the surrounding CSS/style context this does not parse.
 */
export interface HardCodedTokenValueFinding {
  readonly tokenPath: string;
  readonly resolvedValue: string;
  readonly sourceFile: string;
}

/** Values too short or generic to search for without flooding results with noise. */
const MIN_VALUE_LENGTH = 4;

/**
 * Compares every resolved DTCG token's literal value against real component
 * source text, reporting each source file that contains that exact literal.
 *
 * Deliberately narrow: only `'literal'`/`'resolved'` tokens with a string
 * value at least `MIN_VALUE_LENGTH` characters are searched (a token
 * resolving to `"4"` or `"0"` would match constantly and mean nothing).
 * `'unresolved'`/`'circular'` tokens have no real value to search for.
 */
export function findHardCodedTokenValues(
  resolvedTokens: readonly ResolvedDtcgToken[],
  sourceFiles: readonly { readonly path: string; readonly contents: string }[],
): readonly HardCodedTokenValueFinding[] {
  const candidates = resolvedTokens.filter(
    (token): token is ResolvedDtcgToken & { resolvedValue: string } =>
      (token.referenceStatus === 'literal' ||
        token.referenceStatus === 'resolved') &&
      typeof token.resolvedValue === 'string' &&
      token.resolvedValue.length >= MIN_VALUE_LENGTH,
  );
  if (candidates.length === 0 || sourceFiles.length === 0) {
    return [];
  }

  const findings: HardCodedTokenValueFinding[] = [];
  for (const file of sourceFiles) {
    for (const token of candidates) {
      if (file.contents.includes(token.resolvedValue)) {
        findings.push({
          tokenPath: token.path,
          resolvedValue: token.resolvedValue,
          sourceFile: file.path,
        });
      }
    }
  }
  return findings;
}

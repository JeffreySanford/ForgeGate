/**
 * A real DTCG (Design Tokens Community Group) parser — the subsystem P1.5's
 * remaining items were blocked on. Validated against a real 269-token
 * production file (`public-sector-federation`'s
 * `packages/tokens/src/design-tokens.json`), not only fixtures.
 *
 * Scope is deliberately the parts of the spec ForgeGate can act on:
 * group/leaf structure, `$type` inheritance, `$value`, `$description`, and
 * alias resolution including unresolved and circular references. Composite
 * token values (shadows, typography objects) are carried through as-is
 * rather than decomposed — ForgeGate has nothing to say about their
 * internals yet, and pretending to parse them would invent structure.
 *
 * One honest limitation, called out because it changes what can be claimed:
 * **the real file above contains zero aliases** — every token is already
 * resolved to a literal. Alias-chain, unresolved-reference, and cycle
 * handling here are therefore built to the DTCG specification and covered
 * by unit tests, but are *not* yet validated against real repository data.
 * Marked as such in TODO.md rather than reported as real-world proven.
 */

/** A `$`-prefixed key is DTCG metadata; anything else is a child group or token. */
function isMetadataKey(key: string): boolean {
  return key.startsWith('$');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface DtcgToken {
  /** Dot-delimited path, e.g. `primitive.color.blue.50`. */
  readonly path: string;
  /**
   * Resolved `$type`, inherited from the nearest ancestor group that
   * declares one — per the DTCG spec, a group's `$type` applies to every
   * descendant that does not override it. Null when nothing in the
   * ancestry declares a type.
   */
  readonly type: string | null;
  readonly value: unknown;
  readonly description?: string;
  readonly extensions?: Record<string, unknown>;
}

export interface DtcgParseResult {
  readonly tokens: readonly DtcgToken[];
  /**
   * Paths that look like tokens but could not be read as one (e.g. a
   * `$value` on a non-object). Reported rather than silently dropped.
   */
  readonly failures: readonly string[];
}

export function parseDtcgTokens(text: string): DtcgParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(
      `Invalid DTCG token JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!isRecord(parsed)) {
    throw new Error('DTCG token file must be a JSON object');
  }

  const tokens: DtcgToken[] = [];
  const failures: string[] = [];

  const walk = (node: Record<string, unknown>, path: string, inheritedType: string | null): void => {
    const declaredType = typeof node['$type'] === 'string' ? (node['$type'] as string) : null;
    const effectiveType = declaredType ?? inheritedType;

    if ('$value' in node) {
      tokens.push({
        path,
        type: effectiveType,
        value: node['$value'],
        ...(typeof node['$description'] === 'string' ? { description: node['$description'] } : {}),
        ...(isRecord(node['$extensions']) ? { extensions: node['$extensions'] } : {}),
      });
      return;
    }

    for (const key of Object.keys(node)) {
      if (isMetadataKey(key)) continue;
      const childPath = path ? `${path}.${key}` : key;
      const child = node[key];
      if (isRecord(child)) {
        walk(child, childPath, effectiveType);
      } else {
        failures.push(childPath);
      }
    }
  };

  walk(parsed, '', null);
  return { tokens, failures };
}

export type TokenReferenceStatus = 'literal' | 'resolved' | 'unresolved' | 'circular';

export interface ResolvedDtcgToken extends DtcgToken {
  readonly referenceStatus: TokenReferenceStatus;
  /**
   * For an alias, every path stepped through in order, ending at the token
   * that holds the literal value (or at the point resolution failed). Empty
   * for a literal token.
   */
  readonly aliasChain: readonly string[];
  /** The final literal value, or null when unresolved or circular. */
  readonly resolvedValue: unknown;
}

/** DTCG alias syntax: a `$value` that is exactly `{some.token.path}`. */
const ALIAS_PATTERN = /^\{([^{}]+)\}$/;

export function aliasTarget(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = ALIAS_PATTERN.exec(value.trim());
  return match?.[1] ?? null;
}

/**
 * Resolves every alias to its final literal value, following chains of any
 * length. A reference to a path that does not exist is reported
 * `'unresolved'`, and a cycle is reported `'circular'` — both are real
 * defects a design system wants surfaced, so neither is silently treated as
 * a literal.
 *
 * Builds one path→token index up front, so resolution is O(tokens + total
 * chain length) rather than re-scanning the token list per hop.
 */
export function resolveDtcgAliases(
  tokens: readonly DtcgToken[],
): readonly ResolvedDtcgToken[] {
  const byPath = new Map<string, DtcgToken>();
  for (const token of tokens) {
    byPath.set(token.path, token);
  }

  return tokens.map((token) => {
    const firstTarget = aliasTarget(token.value);
    if (firstTarget === null) {
      return { ...token, referenceStatus: 'literal', aliasChain: [], resolvedValue: token.value };
    }

    const chain: string[] = [];
    const seen = new Set<string>([token.path]);
    let cursor: string | null = firstTarget;

    while (cursor !== null) {
      if (seen.has(cursor)) {
        return { ...token, referenceStatus: 'circular', aliasChain: [...chain, cursor], resolvedValue: null };
      }
      seen.add(cursor);
      chain.push(cursor);

      const next: DtcgToken | undefined = byPath.get(cursor);
      if (!next) {
        return { ...token, referenceStatus: 'unresolved', aliasChain: chain, resolvedValue: null };
      }
      const onward: string | null = aliasTarget(next.value);
      if (onward === null) {
        return { ...token, referenceStatus: 'resolved', aliasChain: chain, resolvedValue: next.value };
      }
      cursor = onward;
    }

    return { ...token, referenceStatus: 'unresolved', aliasChain: chain, resolvedValue: null };
  });
}

export interface GroupCoverageRow {
  /** Token path relative to each sibling group, e.g. `ps.surface.background`. */
  readonly relativePath: string;
  /** Sibling groups that define this path. */
  readonly presentIn: readonly string[];
  /** Sibling groups that do not. */
  readonly missingFrom: readonly string[];
}

export interface GroupCoverage {
  readonly groupPath: string;
  /** Direct children of `groupPath` — the modes/themes being compared. */
  readonly siblings: readonly string[];
  readonly rows: readonly GroupCoverageRow[];
  /** Rows missing from at least one sibling — the actionable subset. */
  readonly incompleteRows: readonly GroupCoverageRow[];
}

/**
 * Answers "does every theme/mode define the same tokens?" without hardcoding
 * anyone's vendor conventions.
 *
 * DTCG does not standardize themes or modes, and the real file this was
 * validated against encodes them two different ways at once: structurally
 * (`theme.neutral-light.*`, six sibling groups) and in a vendor extension
 * (`$extensions["public-sector"].theme` / `.mode`). Keying off the vendor
 * extension would only ever work for that one organization, so this compares
 * the *structure* instead: take the direct children of `groupPath` as the
 * set being compared, and report which relative token paths are missing from
 * which. That is vendor-neutral and works for any repository that groups
 * modes as siblings, which is the common DTCG convention.
 */
export function computeGroupCoverage(
  tokens: readonly DtcgToken[],
  groupPath: string,
): GroupCoverage {
  const prefix = `${groupPath}.`;
  const siblings = new Set<string>();
  const pathsBySibling = new Map<string, Set<string>>();

  for (const token of tokens) {
    if (!token.path.startsWith(prefix)) continue;
    const remainder = token.path.slice(prefix.length);
    const separator = remainder.indexOf('.');
    if (separator <= 0) continue;
    const sibling = remainder.slice(0, separator);
    const relativePath = remainder.slice(separator + 1);

    siblings.add(sibling);
    const paths = pathsBySibling.get(sibling);
    if (paths) {
      paths.add(relativePath);
    } else {
      pathsBySibling.set(sibling, new Set([relativePath]));
    }
  }

  const siblingList = [...siblings].sort();
  const allRelativePaths = new Set<string>();
  for (const paths of pathsBySibling.values()) {
    for (const path of paths) allRelativePaths.add(path);
  }

  const rows: GroupCoverageRow[] = [...allRelativePaths].sort().map((relativePath) => {
    const presentIn = siblingList.filter((sibling) => pathsBySibling.get(sibling)?.has(relativePath));
    return {
      relativePath,
      presentIn,
      missingFrom: siblingList.filter((sibling) => !presentIn.includes(sibling)),
    };
  });

  return {
    groupPath,
    siblings: siblingList,
    rows,
    incompleteRows: rows.filter((row) => row.missingFrom.length > 0),
  };
}

/** Direct children of the token tree root that contain tokens. */
export function topLevelGroups(tokens: readonly DtcgToken[]): readonly string[] {
  const groups = new Set<string>();
  for (const token of tokens) {
    const separator = token.path.indexOf('.');
    groups.add(separator > 0 ? token.path.slice(0, separator) : token.path);
  }
  return [...groups].sort();
}

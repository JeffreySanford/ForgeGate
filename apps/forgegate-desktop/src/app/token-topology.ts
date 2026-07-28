import type { ComponentManifest, TokenCategory } from '@forgegate/core-manifest';

/**
 * P1.5's real data: repository-authored `.forgegate/components/*.yaml`
 * manifests already carry `tokenMappings` (a real `tokenPath`/`category`/
 * `required` per component, same override mechanism P1.6 aggregated for
 * documentation targets). This aggregates real per-component token
 * mappings across the whole inventory into "which components consume
 * this token" — a real component-token relationship.
 *
 * Deliberately narrow: primitive/semantic token layering, alias chains,
 * unresolved references, theme/mode coverage, and hard-coded
 * implementation values all require actually parsing the DTCG token
 * files `workspace_scan` only *detects* by filename/content today —
 * ForgeGate has no real DTCG parser yet, so none of that is fabricated
 * here. Anatomy-part/state linkage is also not shown: `ManifestTokenMapping`
 * has no per-state field to link from.
 */
export interface TokenUsageEntry {
  readonly tokenPath: string;
  readonly category: TokenCategory;
  readonly required: boolean;
  readonly componentIds: readonly string[];
}

export function computeTokenTopology(
  manifests: readonly ComponentManifest[],
): readonly TokenUsageEntry[] {
  const groups = new Map<
    string,
    { category: TokenCategory; required: boolean; componentIds: string[] }
  >();

  for (const manifest of manifests) {
    for (const mapping of manifest.tokenMappings) {
      const group = groups.get(mapping.tokenPath) ?? {
        category: mapping.category,
        required: false,
        componentIds: [],
      };
      group.required = group.required || mapping.required;
      group.componentIds.push(manifest.id);
      groups.set(mapping.tokenPath, group);
    }
  }

  return Array.from(groups.entries())
    .map(([tokenPath, group]) => ({
      tokenPath,
      category: group.category,
      required: group.required,
      componentIds: group.componentIds,
    }))
    .sort((a, b) => a.tokenPath.localeCompare(b.tokenPath));
}

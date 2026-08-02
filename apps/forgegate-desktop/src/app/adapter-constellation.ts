import type { AdapterDiagnostic } from './workspace.service';

export type AdapterCapabilityStatus = AdapterDiagnostic['status'];

/**
 * P1.7's real data: `WorkspaceService.adapterDiagnostics()` already records
 * one entry per adapter invocation (sometimes several per adapter — e.g.
 * one `test-evidence:<path>` entry per evidence file). This groups those
 * real entries by `adapter` name into one row per adapter, rather than
 * building a decorative vendor-logo wall from a fixed, hand-authored list
 * of "supported adapters" that may not reflect what actually ran.
 *
 * `AdapterDiagnostic.status` only has four real values today (`loaded`,
 * `partial`, `failed`, `unavailable`) — there is no distinct "unconfigured"
 * status in the underlying data, so this does not fabricate one.
 */
export interface AdapterConstellationEntry {
  readonly adapter: string;
  readonly status: AdapterCapabilityStatus;
  readonly sourceCount: number;
  readonly errors: readonly string[];
}

const STATUS_PRIORITY: Record<AdapterCapabilityStatus, number> = {
  failed: 0,
  partial: 1,
  unavailable: 2,
  loaded: 3,
};

/**
 * P1.7's "link to setup guidance" item, built as real inline text rather
 * than a clickable link: the desktop webview's CSP (`default-src 'self'`)
 * blocks navigating to local file paths, and safely opening an external
 * URL or file from the shell needs its own reviewed capability grant this
 * repository does not yet have (see TODO.md). Short, accurate guidance for
 * every adapter that corresponds to real external tooling a repository
 * needs to configure — sourced from each adapter's own real detection
 * logic (`workspace_scan.rs`), not fabricated. Adapters that are ForgeGate's
 * own internal data sources (its own scanner, evidence readers, the
 * blueprint/proposal catalog) have nothing external to set up, so they are
 * deliberately not in this map.
 */
export const ADAPTER_SETUP_GUIDANCE: Readonly<Record<string, string>> = {
  'Storybook adapter':
    'Add a .storybook config at the workspace root or one level into apps/packages/libs, then run a Storybook build so storybook-static/index.json exists for ForgeGate to read.',
  'Custom Elements Manifest analyzer':
    'Configure your Web Components build to emit custom-elements.json (e.g. @custom-elements-manifest/analyzer) at the workspace root.',
  'Web Components adapter':
    'Configure your Web Components build to emit custom-elements.json (e.g. @custom-elements-manifest/analyzer) at the workspace root.',
  'DTCG token adapter':
    'Author a DTCG-shaped token file (containing real $value markers) so ForgeGate can detect and parse it.',
  'Angular adapter':
    'No separate setup — Angular components are discovered directly from real *.component.ts source files already in the workspace.',
  'Starlight build validation':
    'Detect a Starlight project (astro.config with the Starlight integration) and configure commandMappings.starlightBuild in .forgegate/config.yaml so ForgeGate can run it after approval.',
};

export function setupGuidanceFor(adapter: string): string | null {
  return ADAPTER_SETUP_GUIDANCE[adapter] ?? null;
}

export function computeAdapterConstellation(
  diagnostics: readonly AdapterDiagnostic[],
): readonly AdapterConstellationEntry[] {
  const groups = new Map<string, AdapterDiagnostic[]>();
  for (const diagnostic of diagnostics) {
    const group = groups.get(diagnostic.adapter) ?? [];
    group.push(diagnostic);
    groups.set(diagnostic.adapter, group);
  }
  return Array.from(groups.entries())
    .map(([adapter, entries]) => {
      const worstStatus = [...entries].sort(
        (a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status],
      )[0]?.status;
      return {
        adapter,
        status: worstStatus ?? 'unavailable',
        sourceCount: entries.length,
        errors: entries.flatMap((entry) => (entry.error ? [entry.error] : [])),
      };
    })
    .sort((a, b) => a.adapter.localeCompare(b.adapter));
}

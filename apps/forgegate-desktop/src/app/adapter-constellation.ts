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

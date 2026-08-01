import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { computeTokenTopology } from '../token-topology';
import {
  computeGroupCoverage,
  resolveDtcgAliases,
  topLevelGroups,
} from '../dtcg-tokens';
import { findHardCodedTokenValues } from '../hard-coded-token-values';
import { ComponentInventoryService } from '../component-inventory.service';
import { WorkspaceService } from '../workspace.service';

/**
 * P1.5: which components consume which repository-authored token mappings,
 * plus real DTCG analysis of the workspace's own token files — alias
 * resolution (including unresolved and circular references) and theme/mode
 * coverage across sibling groups.
 *
 * Coverage is computed structurally rather than from a vendor extension;
 * see `computeGroupCoverage`. Hard-coded implementation-value detection
 * (`findHardCodedTokenValues`) scans real Angular component source text
 * already read for component discovery — it is honestly scoped to Angular
 * source-scanned components only, since that is the only source text this
 * app retains today; CEM-backed Web Components read no source text at all
 * (see `WorkspaceService.angularComponentSourceFiles`). Anatomy/state
 * linkage is shown when a repository authors it (`ManifestTokenMapping`'s
 * optional `stateName`/`anatomyPartId`), and honestly absent otherwise —
 * most existing mappings still won't have it, since it's new.
 */
@Component({
  selector: 'app-token-topology-view',
  imports: [RouterLink],
  templateUrl: './token-topology-view.html',
  styleUrl: './token-topology-view.css',
})
export class TokenTopologyView {
  protected readonly workspace = inject(WorkspaceService);
  private readonly inventory = inject(ComponentInventoryService);

  protected readonly entries = computed(() =>
    computeTokenTopology(this.inventory.result().manifests),
  );

  private readonly resolvedTokens = computed(() =>
    resolveDtcgAliases(this.workspace.designTokens()),
  );

  protected readonly referenceCounts = computed(() => {
    const resolved = this.resolvedTokens();
    return {
      total: resolved.length,
      literal: resolved.filter((token) => token.referenceStatus === 'literal')
        .length,
      resolved: resolved.filter((token) => token.referenceStatus === 'resolved')
        .length,
      unresolved: resolved.filter(
        (token) => token.referenceStatus === 'unresolved',
      ).length,
      circular: resolved.filter((token) => token.referenceStatus === 'circular')
        .length,
    };
  });

  /** Alias references that do not resolve — the actionable subset. */
  protected readonly brokenReferences = computed(() =>
    this.resolvedTokens().filter(
      (token) =>
        token.referenceStatus === 'unresolved' ||
        token.referenceStatus === 'circular',
    ),
  );

  /**
   * Coverage for every top-level group that actually has sibling subgroups
   * to compare (a flat `primitive` group has nothing to compare, so it is
   * dropped rather than shown as trivially complete).
   */
  protected readonly groupCoverage = computed(() => {
    const tokens = this.workspace.designTokens();
    return topLevelGroups(tokens)
      .map((group) => computeGroupCoverage(tokens, group))
      .filter((coverage) => coverage.siblings.length > 1);
  });

  /**
   * Hard-coded implementation values: real token literals found written
   * directly into Angular component source rather than referenced. See the
   * class doc comment for why this is scoped to Angular source only.
   */
  protected readonly hardCodedValues = computed(() =>
    findHardCodedTokenValues(
      this.resolvedTokens(),
      this.workspace.angularComponentSourceFiles(),
    ),
  );

  protected componentName(id: string): string {
    const parts = id.split('.');
    return parts[parts.length - 1] ?? id;
  }
}

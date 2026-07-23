import { Component, computed, inject } from '@angular/core';
import { ComponentInventoryService } from '../component-inventory.service';
import { WorkspaceService } from '../workspace.service';

export type SystemMapNodeStatus = 'connected' | 'partial' | 'stale' | 'missing';

export interface SystemMapNode {
  readonly id: string;
  readonly title: string;
  readonly meta: string;
  readonly status: SystemMapNodeStatus;
  readonly ariaLabel: string;
}

const STATUS_LABEL: Record<SystemMapNodeStatus, string> = {
  connected: 'connected',
  partial: 'partially connected',
  stale: 'stale',
  missing: 'not connected',
};

interface NodeLayout {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly dotX: number;
  readonly dotY: number;
  readonly titleX: number;
  readonly titleY: number;
  readonly metaX: number;
  readonly metaY: number;
}

/**
 * Fixed screen coordinates for the fixed eight-node topology, viewBox
 * "0 0 820 390". Reused from documentation/prototypes/workspace-command-center.html
 * (already reviewed for layout/spacing) rather than redesigned from scratch.
 */
const NODE_LAYOUT: Record<string, NodeLayout> = {
  repository: { x: 28, y: 156, w: 130, h: 76, dotX: 46, dotY: 175, titleX: 48, titleY: 194, metaX: 48, metaY: 213 },
  'component-library': { x: 250, y: 151, w: 145, h: 86, dotX: 270, dotY: 172, titleX: 270, titleY: 194, metaX: 270, metaY: 214 },
  storybook: { x: 442, y: 48, w: 138, h: 74, dotX: 462, dotY: 68, titleX: 462, titleY: 88, metaX: 462, metaY: 106 },
  tokens: { x: 440, y: 270, w: 142, h: 74, dotX: 460, dotY: 290, titleX: 460, titleY: 310, metaX: 460, metaY: 328 },
  components: { x: 488, y: 151, w: 122, h: 86, dotX: 508, dotY: 172, titleX: 508, titleY: 194, metaX: 508, metaY: 214 },
  'automated-evidence': { x: 670, y: 74, w: 132, h: 74, dotX: 690, dotY: 94, titleX: 690, titleY: 114, metaX: 690, metaY: 132 },
  documentation: { x: 670, y: 238, w: 132, h: 74, dotX: 690, dotY: 258, titleX: 690, titleY: 278, metaX: 690, metaY: 296 },
  release: { x: 688, y: 157, w: 114, h: 74, dotX: 708, dotY: 177, titleX: 708, titleY: 197, metaX: 708, metaY: 215 },
};

const STATUS_CLASS: Record<SystemMapNodeStatus, string> = {
  connected: 'status-connected',
  partial: 'status-partial',
  stale: 'status-stale',
  missing: 'status-missing',
};

/**
 * Real-data system map for P0.3. Topology (which eight relationships exist
 * and how they're laid out) is fixed — every ForgeGate workspace has the
 * same conceptual shape (repository → library → {storybook, tokens} →
 * components → {evidence, documentation} → release). Only each node's
 * *status* is data-driven, computed from WorkspaceService/
 * ComponentInventoryService signals. This deliberately does not attempt a
 * general force-directed graph layout — there is nothing to lay out
 * dynamically yet, since the node set itself doesn't vary.
 *
 * "Automated evidence" and "Documentation" are marked missing/connected
 * based on *tool detection* only (ForgeGate has no real test-run or
 * documentation-drift evidence yet) — never claimed as more than that.
 * "Release" has no backing feature at all yet and is always `missing`.
 * `stale` is defined but never produced by this version — evidence
 * freshness tracking (P1.3) doesn't exist yet, so nothing here can
 * honestly be reported as stale rather than simply missing or connected.
 */
@Component({
  selector: 'app-system-map',
  templateUrl: './system-map.html',
  styleUrl: './system-map.css',
})
export class SystemMap {
  private readonly workspace = inject(WorkspaceService);
  private readonly componentInventory = inject(ComponentInventoryService);

  protected readonly nodes = computed<SystemMapNode[]>(() => {
    const workspaceOpen = this.workspace.workspacePath() !== null;
    const gitStatus = this.workspace.gitStatus();
    const scan = this.workspace.workspaceScan();
    const manifestPresent = this.workspace.customElementsManifest() !== null;
    const { manifests, failures } = this.componentInventory.result();

    const repository = gitStatus
      ? node('repository', 'Repository', 'connected', `${gitStatus.branch} · ${gitStatus.dirty ? 'modified' : 'clean'}`)
      : node('repository', 'Repository', 'missing', workspaceOpen ? 'Not a Git repository' : 'No workspace open');

    const componentLibrary = scan?.packageName
      ? node('component-library', 'Component library', 'connected', scan.packageName)
      : node('component-library', 'Component library', 'missing', scan ? 'No package name detected' : 'Not scanned yet');

    const storybook = scan
      ? scan.storybookProjects.length
        ? node('storybook', 'Storybook', 'connected', `${scan.storybookProjects.length} project(s)`)
        : node('storybook', 'Storybook', 'missing', 'Not detected')
      : node('storybook', 'Storybook', 'missing', 'Not scanned yet');

    const tokens = scan
      ? scan.tokenFiles.length
        ? node('tokens', 'Design tokens', 'connected', `${scan.tokenFiles.length} source(s)`)
        : node('tokens', 'Design tokens', 'missing', 'Not detected')
      : node('tokens', 'Design tokens', 'missing', 'Not scanned yet');

    const components = !manifestPresent
      ? node('components', 'Components', 'missing', 'No Custom Elements Manifest')
      : manifests.length === 0 && failures.length === 0
        ? node('components', 'Components', 'partial', 'Manifest present, no components declared')
        : failures.length > 0
          ? node('components', 'Components', 'partial', `${manifests.length} mapped · ${failures.length} failed`)
          : node('components', 'Components', 'connected', `${manifests.length} component(s)`);

    const automatedEvidence =
      scan && (scan.testRunners.length || scan.ciProviders.length)
        ? node(
            'automated-evidence',
            'Automated evidence',
            'partial',
            `${scan.testRunners.length} test runner(s) detected, no run results connected yet`,
          )
        : node('automated-evidence', 'Automated evidence', 'missing', 'Not detected');

    const documentation =
      scan && (scan.starlightProjects.length || scan.hasZeroheight)
        ? node('documentation', 'Documentation', 'connected', 'Detected')
        : node('documentation', 'Documentation', 'missing', 'Not detected');

    const release = node('release', 'Release', 'missing', 'Not connected — release policy not implemented yet');

    return [repository, componentLibrary, storybook, tokens, components, automatedEvidence, documentation, release];
  });

  protected readonly summary = computed(() => {
    const byId = new Map(this.nodes().map((n) => [n.id, n]));
    const connectedCount = this.nodes().filter((n) => n.status === 'connected').length;
    const componentLibrary = byId.get('component-library');
    if (!this.workspace.workspacePath()) {
      return 'No workspace is open yet.';
    }
    return `${connectedCount} of ${this.nodes().length} tracked relationships are connected. ${componentLibrary?.title}: ${componentLibrary?.meta}.`;
  });

  protected statusLabel(status: SystemMapNodeStatus): string {
    return STATUS_LABEL[status];
  }

  protected statusClass(status: SystemMapNodeStatus): string {
    return STATUS_CLASS[status];
  }

  protected layout(id: string): NodeLayout {
    const layout = NODE_LAYOUT[id];
    if (!layout) {
      throw new Error(`No layout defined for system map node "${id}"`);
    }
    return layout;
  }

  /** Edge status follows the status of the node the relationship leads into. */
  protected edgeClass(targetId: string): string {
    const target = this.nodes().find((n) => n.id === targetId);
    return target ? this.statusClass(target.status) : STATUS_CLASS.missing;
  }
}

function node(id: string, title: string, status: SystemMapNodeStatus, meta: string): SystemMapNode {
  return { id, title, meta, status, ariaLabel: `${title}, ${STATUS_LABEL[status]}, ${meta}` };
}

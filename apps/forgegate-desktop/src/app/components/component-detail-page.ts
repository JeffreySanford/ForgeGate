import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { map } from 'rxjs';
import type {
  ComponentManifest,
  ManifestDocumentationTarget,
} from '@forgegate/core-manifest';
import type { TestExecution } from '@forgegate/core-evidence';
import { ComponentInventoryService } from '../component-inventory.service';
import { WorkspaceService } from '../workspace.service';
import type { StorybookIndexEntry } from '../storybook/storybook-index';
import { computeDocumentationDriftState } from '../documentation-drift';

export interface CoverageItem {
  readonly label: string;
  readonly count: number;
  readonly connected: boolean;
}

export interface AnatomyItem {
  readonly kind: 'Content slot' | 'Styling part';
  readonly name: string;
  readonly description: string;
  readonly contractSectionId: 'contract-content' | 'contract-style-parts';
}

export type PreviewKind =
  | 'live-storybook'
  | 'static-capture'
  | 'blueprint-reference'
  | 'temporary-generated'
  | 'unavailable';

export interface PreviewSourceOption {
  readonly kind: Exclude<PreviewKind, 'unavailable'>;
  readonly label: string;
  readonly status: 'Connected' | 'Not connected' | 'Unsupported here';
  readonly detail: string;
}

const LOCAL_STORYBOOK_ORIGIN = 'http://localhost:6006';

/**
 * The Button/component assurance record (P0.5,
 * documentation/25-designer-ready-vertical-slice.md "Suggested Angular UI
 * composition" — header, preview, coverage strip, readiness rail, states,
 * tokens, contract, evidence, documentation, in one route).
 *
 * The record combines Custom Elements Manifest contract data with connected
 * Storybook, repository-authored state/token/documentation mappings, and test
 * evidence. Any unavailable source is shown as an explicit disconnected or
 * not-evaluated state, per document 25, never as a fabricated value.
 */
@Component({
  selector: 'app-component-detail-page',
  imports: [RouterLink],
  templateUrl: './component-detail-page.html',
  styleUrl: './component-detail-page.css',
})
export class ComponentDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly inventory = inject(ComponentInventoryService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly workspace = inject(WorkspaceService);
  protected readonly selectedStoryId = signal<string | null>(null);

  /**
   * Reactive, not just `route.snapshot` — Angular reuses this component
   * instance when navigating directly from one component's detail route to
   * another's (e.g. via the inventory table), so a one-time snapshot read
   * would keep showing the previous component.
   */
  protected readonly id = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('componentId'))),
    {
      initialValue: this.route.snapshot.paramMap.get('componentId'),
    },
  );

  protected readonly manifest = computed<ComponentManifest | null>(() => {
    const id = this.id();
    return this.inventory.result().manifests.find((m) => m.id === id) ?? null;
  });

  protected readonly authoredManifestPath = computed<string | null>(() => {
    const id = this.manifest()?.id;
    if (!id) return null;
    return (
      this.workspace
        .workspaceScan()
        ?.componentManifests?.find((path) =>
          path.replace(/\\/g, '/').endsWith(`/${id}.yaml`),
        ) ?? null
    );
  });

  protected readonly tokenSourcePath = computed<string | null>(
    () => this.workspace.workspaceScan()?.tokenFiles[0] ?? null,
  );

  protected readonly shortCommit = computed<string | null>(
    () => this.workspace.gitStatus()?.commit.slice(0, 8) ?? null,
  );

  protected readonly testExecutions = computed<readonly TestExecution[]>(() => {
    const manifest = this.manifest();
    if (!manifest) return [];
    const versionId = componentVersionId(manifest);
    return this.workspace
      .testExecutions()
      .filter((execution) => execution.componentVersionId === versionId);
  });

  protected readonly evidenceFreshness = computed<string>(() => {
    const commit = this.shortCommit();
    if (!commit) {
      return 'Not evaluated — current Git revision is unavailable';
    }
    const executions = this.testExecutions();
    if (!executions.length) {
      return `Not evaluated — no evidence records are connected to commit ${commit}`;
    }
    const currentCount = executions.filter((execution) =>
      this.executionIsCurrent(execution),
    ).length;
    return currentCount === executions.length
      ? `Current — ${currentCount} automated execution record(s) match commit ${commit}`
      : `Stale — ${executions.length - currentCount} of ${executions.length} automated execution record(s) do not match commit ${commit}`;
  });

  protected readonly readinessStatus = computed<string>(() => {
    const executions = this.testExecutions();
    if (!executions.length) {
      return 'Unknown — no automated result evidence is connected. Release policy has not been evaluated.';
    }
    if (
      executions.some(
        (execution) =>
          execution.status === 'failed' || execution.status === 'blocked',
      )
    ) {
      return 'Evidence indicates blocked — an automated result failed or was blocked. Release policy has not been evaluated.';
    }
    if (executions.some((execution) => !this.executionIsCurrent(execution))) {
      return 'Unknown — connected automated evidence is stale. Release policy has not been evaluated.';
    }
    if (executions.every((execution) => execution.status === 'passed')) {
      return 'Connected automated evidence is passing. Release policy has not been evaluated.';
    }
    return 'Unknown — connected automated evidence is incomplete. Release policy has not been evaluated.';
  });

  protected documentationDriftState(
    target: ManifestDocumentationTarget,
  ): string {
    return computeDocumentationDriftState(
      target,
      this.manifest()?.componentVersion,
      this.workspace.workspaceScan()?.starlightProjects ?? [],
    ).detail;
  }

  protected readonly coverage = computed<readonly CoverageItem[]>(() => {
    const manifest = this.manifest();
    if (!manifest) {
      return [];
    }
    return [
      {
        label: 'States',
        count: manifest.states.length,
        connected: manifest.states.length > 0,
      },
      {
        label: 'Stories',
        count: manifest.storyMappings.length,
        connected: manifest.storyMappings.length > 0,
      },
      {
        label: 'Tokens',
        count: manifest.tokenMappings.length,
        connected: manifest.tokenMappings.length > 0,
      },
      {
        label: 'Tests',
        count: manifest.testRequirements.length,
        connected: manifest.testRequirements.length > 0,
      },
      {
        label: 'Reviews',
        count: manifest.manualReviewProcedureIds.length,
        connected: manifest.manualReviewProcedureIds.length > 0,
      },
      {
        label: 'Documentation',
        count: manifest.documentationTargets.length,
        connected: manifest.documentationTargets.length > 0,
      },
    ];
  });

  protected readonly anatomy = computed<readonly AnatomyItem[]>(() => {
    const manifest = this.manifest();
    if (!manifest) return [];
    const content: AnatomyItem[] = manifest.contract.content.map((member) => ({
      kind: 'Content slot',
      name: member.name,
      description: member.description ?? 'No description declared.',
      contractSectionId: 'contract-content',
    }));
    const stylingParts: AnatomyItem[] = manifest.contract.styleParts
      .filter((member) => !member.name.startsWith('--'))
      .map((member) => ({
        kind: 'Styling part',
        name: member.name,
        description: member.description ?? 'No description declared.',
        contractSectionId: 'contract-style-parts',
      }));
    return [...stylingParts, ...content];
  });

  protected readonly stories = computed<readonly StorybookIndexEntry[]>(() => {
    const manifest = this.manifest();
    const index = this.workspace.storybookIndex();
    if (!manifest || !index) return [];
    const mappedIds = new Set(
      manifest.storyMappings.map((mapping) => mapping.storybookStoryId),
    );
    return Object.values(index.entries).filter((entry) =>
      mappedIds.has(entry.id),
    );
  });

  protected readonly activeStory = computed<StorybookIndexEntry | null>(() => {
    const stories = this.stories();
    return (
      stories.find((story) => story.id === this.selectedStoryId()) ??
      stories[0] ??
      null
    );
  });

  protected readonly previewKind = computed<PreviewKind>(() =>
    this.activeStory() ? 'live-storybook' : 'unavailable',
  );

  protected readonly previewHref = computed<string | null>(() => {
    const story = this.activeStory();
    return story
      ? `${LOCAL_STORYBOOK_ORIGIN}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`
      : null;
  });

  protected readonly previewUrl = computed<SafeResourceUrl | null>(() => {
    const href = this.previewHref();
    return href ? this.sanitizer.bypassSecurityTrustResourceUrl(href) : null;
  });

  protected readonly previewUnavailableReason = computed<string>(() => {
    const scan = this.workspace.workspaceScan();
    const manifest = this.manifest();
    if (!scan?.storybookProjects.length) {
      return 'Storybook was not detected in this workspace.';
    }
    if (this.workspace.storybookIndexError()) {
      return 'The Storybook index was found but could not be validated.';
    }
    if (!this.workspace.storybookIndex()) {
      return 'Storybook was detected, but storybook-static/index.json is not connected.';
    }
    if (!manifest?.storyMappings.length) {
      return 'No Storybook story is mapped to this component.';
    }
    return 'The mapped story IDs were not found in the connected Storybook index.';
  });

  protected readonly previewSources = computed<readonly PreviewSourceOption[]>(
    () => {
      const story = this.activeStory();
      return [
        {
          kind: 'live-storybook',
          label: 'Live Storybook',
          status: story ? 'Connected' : 'Not connected',
          detail: story
            ? `Mapped to ${story.id}; availability of the local runtime is not probed.`
            : this.previewUnavailableReason(),
        },
        {
          kind: 'static-capture',
          label: 'Static capture',
          status: 'Not connected',
          detail: 'No static preview artifact is declared for this component.',
        },
        {
          kind: 'blueprint-reference',
          label: 'Blueprint reference',
          status: 'Unsupported here',
          detail:
            'Blueprint references belong to Blueprint Studio, not repository evidence.',
        },
        {
          kind: 'temporary-generated',
          label: 'Temporary generated preview',
          status: 'Unsupported here',
          detail:
            'No temporary generation adapter is connected to this record.',
        },
      ];
    },
  );

  protected readonly blockingReasons = computed<readonly string[]>(() => {
    const manifest = this.manifest();
    if (!manifest) {
      return [];
    }
    const reasons: string[] = [];
    if (manifest.states.length === 0)
      reasons.push('No required states declared');
    if (this.previewKind() === 'unavailable')
      reasons.push(`Preview unavailable — ${this.previewUnavailableReason()}`);
    if (manifest.tokenMappings.length === 0)
      reasons.push('No token mappings connected');
    const executions = this.testExecutions();
    if (manifest.testRequirements.length === 0)
      reasons.push('No automated test requirements declared');
    else if (executions.length === 0)
      reasons.push('No automated test results connected');
    else if (
      executions.some(
        (execution) =>
          execution.status === 'failed' || execution.status === 'blocked',
      )
    )
      reasons.push('Automated evidence contains a failed or blocked result');
    else if (
      executions.some((execution) => !this.executionIsCurrent(execution))
    )
      reasons.push('Automated evidence is stale');
    if (manifest.manualReviewProcedureIds.length === 0)
      reasons.push('No manual review recorded');
    if (manifest.documentationTargets.length === 0)
      reasons.push('No documentation target connected');
    else if (
      manifest.documentationTargets.some(
        (target) => this.documentationDriftState(target) !== 'Current',
      )
    )
      reasons.push('Documentation is drifted or freshness is not evaluated');
    return reasons;
  });

  /**
   * One focused next step, not a policy decision — this picks the first
   * entry off the same `blockingReasons` list already shown, the same
   * "first incomplete thing wins" approach `AssuranceJourney` already
   * uses at the workspace level (not a new concept invented here). There
   * is no authoring UI yet to link to for "declare a required state" or
   * "connect a token mapping", so the action always points at
   * `/workspace`, where the underlying connections (Storybook, tokens,
   * tests, docs) actually get configured today.
   */
  protected readonly recommendedNextAction = computed<string | null>(() => {
    if (!this.manifest()) {
      return null;
    }
    return this.blockingReasons()[0] ?? null;
  });

  protected executionFreshness(execution: TestExecution): string {
    if (!/^[0-9a-f]{40}$/i.test(execution.commitOrFingerprint)) {
      return 'Not evaluated — evidence uses a source fingerprint rather than a Git commit';
    }
    return this.executionIsCurrent(execution)
      ? 'Current'
      : `Stale — recorded at ${execution.commitOrFingerprint.slice(0, 8)}`;
  }

  private executionIsCurrent(execution: TestExecution): boolean {
    const commit = this.workspace.gitStatus()?.commit;
    return (
      !!commit &&
      /^[0-9a-f]{40}$/i.test(execution.commitOrFingerprint) &&
      execution.commitOrFingerprint.toLowerCase() === commit.toLowerCase()
    );
  }

  protected componentName(id: string): string {
    const parts = id.split('.');
    return parts[parts.length - 1] ?? id;
  }
}

function componentVersionId(manifest: ComponentManifest): string {
  return manifest.componentVersion
    ? `${manifest.id}@${manifest.componentVersion}`
    : manifest.id;
}

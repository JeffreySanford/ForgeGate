import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { map } from 'rxjs';
import type { ManualReview, TestExecution } from '@forgegate/core-evidence';
import {
  componentManifestPath,
  type ComponentManifest,
  type ManifestDocumentationTarget,
} from '@forgegate/core-manifest';
import { ComponentInventoryService } from '../component-inventory.service';
import { WorkspaceService } from '../workspace.service';
import type { StorybookIndexEntry } from '../storybook/storybook-index';
import { computeDocumentationDriftState } from '../documentation-drift';
import { ManualReviewWalkthrough } from './manual-review-walkthrough';

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

export interface RemediationAction {
  readonly id: string;
  readonly reason: string;
  readonly action: string;
  readonly source: string;
  readonly destinationLabel: string;
  readonly fragment: string;
  readonly evidence?: string;
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
  imports: [RouterLink, ManualReviewWalkthrough],
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

  /** Loads this component's derived readiness-change history whenever the
   * route's componentId or the open workspace changes — mirrors `id`'s own
   * reactivity note above: this component instance is reused across
   * component-to-component navigation. */
  private readonly loadEvidenceEventsOnRouteChange = effect(() => {
    const id = this.id();
    const workspacePath = this.workspace.workspacePath();
    if (!id || !workspacePath) {
      this.workspace.componentEvidenceEvents.set(null);
      return;
    }
    void this.workspace.loadComponentEvidenceEvents(id);
  });

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

  protected shortEventCommit(commit: string | null): string {
    return commit ? commit.slice(0, 8) : 'unknown';
  }

  protected readonly testExecutions = computed<readonly TestExecution[]>(() => {
    const manifest = this.manifest();
    if (!manifest) return [];
    const versionId = componentVersionId(manifest);
    return this.workspace
      .testExecutions()
      .filter((execution) => execution.componentVersionId === versionId);
  });

  protected readonly manualReviews = computed<readonly ManualReview[]>(() => {
    const manifest = this.manifest();
    if (!manifest) return [];
    const versionId = componentVersionId(manifest);
    return this.workspace
      .manualReviews()
      .filter((review) => review.componentVersionId === versionId);
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
    return this.remediationActions().map((action) => action.reason);
  });

  protected readonly remediationActions = computed<
    readonly RemediationAction[]
  >(() => {
    const manifest = this.manifest();
    if (!manifest) {
      return [];
    }
    const actions: RemediationAction[] = [];
    const manifestSource = this.manifestSource(manifest);
    if (manifest.states.length === 0) {
      actions.push({
        id: 'states',
        reason: 'No required states declared',
        action:
          'Declare the component states that reviewers must verify, such as default, hover, focus, disabled, loading, and error.',
        source: manifestSource,
        destinationLabel: 'Open states section',
        fragment: 'states-title',
        evidence:
          'ForgeGate found no states in this component manifest or CEM-derived mapping.',
      });
    }
    if (this.previewKind() === 'unavailable')
      actions.push({
        id: 'preview',
        reason: `Preview unavailable — ${this.previewUnavailableReason()}`,
        action:
          'Connect a Storybook index and map at least one story ID to this component.',
        source: manifestSource,
        destinationLabel: 'Open preview section',
        fragment: 'preview-title',
        evidence:
          this.workspace.workspaceScan()?.storybookProjects.join(', ') ||
          'No Storybook project detected for this workspace.',
      });
    if (manifest.tokenMappings.length === 0) {
      actions.push({
        id: 'tokens',
        reason: 'No token mappings connected',
        action:
          'Map required design tokens to the component so visual changes can be reviewed against the contract.',
        source: this.tokenSourcePath()
          ? `${manifestSource}; token source ${this.tokenSourcePath()}`
          : manifestSource,
        destinationLabel: 'Open token mapping',
        fragment: 'tokens-title',
        evidence:
          this.workspace.workspaceScan()?.tokenFiles.join(', ') ||
          'No DTCG token file detected for this workspace.',
      });
    }
    const executions = this.testExecutions();
    if (manifest.testRequirements.length === 0) {
      actions.push({
        id: 'test-requirements',
        reason: 'No automated test requirements declared',
        action:
          'Declare required automated gates for this component before evidence can be judged complete.',
        source: manifestSource,
        destinationLabel: 'Open tests and evidence',
        fragment: 'evidence-title',
        evidence:
          this.workspace.workspaceScan()?.testRunners.join(', ') ||
          'No test runner detected for this workspace.',
      });
    } else if (executions.length === 0) {
      actions.push({
        id: 'test-results',
        reason: 'No automated test results connected',
        action:
          'Add a ForgeGate evidence JSON file for the required automated gates, or export a supported Playwright evidence envelope.',
        source: '.forgegate/evidence/*.json',
        destinationLabel: 'Open tests and evidence',
        fragment: 'evidence-title',
        evidence:
          this.workspace.workspaceScan()?.testEvidenceFiles?.join(', ') ||
          'No test evidence files detected.',
      });
    } else if (
      executions.some(
        (execution) =>
          execution.status === 'failed' || execution.status === 'blocked',
      )
    ) {
      actions.push({
        id: 'test-failure',
        reason: 'Automated evidence contains a failed or blocked result',
        action:
          'Inspect the failing raw artifact, fix the component or test contract, and reconnect a passing result.',
        source: '.forgegate/evidence/*.json',
        destinationLabel: 'Open tests and evidence',
        fragment: 'evidence-title',
        evidence: executions
          .filter(
            (execution) =>
              execution.status === 'failed' || execution.status === 'blocked',
          )
          .map((execution) => execution.rawArtifactRef ?? execution.id)
          .join(', '),
      });
    } else if (
      executions.some((execution) => !this.executionIsCurrent(execution))
    ) {
      actions.push({
        id: 'test-stale',
        reason: 'Automated evidence is stale',
        action:
          'Rerun the required gates on the current repository commit and replace the stale evidence record.',
        source: '.forgegate/evidence/*.json',
        destinationLabel: 'Open tests and evidence',
        fragment: 'evidence-title',
        evidence: `Current repository revision is ${this.shortCommit() ?? 'unavailable'}.`,
      });
    }
    if (manifest.manualReviewProcedureIds.length === 0) {
      actions.push({
        id: 'manual-review',
        reason: 'No manual review recorded',
        action:
          'Declare a manual keyboard and screen-reader review procedure ID; review decisions are still a separate unsupported workflow.',
        source: manifestSource,
        destinationLabel: 'Open readiness section',
        fragment: 'readiness-title',
        evidence:
          'No manual review procedure IDs are declared on this component.',
      });
    }
    if (manifest.documentationTargets.length === 0) {
      actions.push({
        id: 'documentation',
        reason: 'No documentation target connected',
        action:
          'Map the component to its documentation target so published guidance can be checked for freshness.',
        source: manifestSource,
        destinationLabel: 'Open documentation',
        fragment: 'documentation-title',
        evidence:
          this.workspace.workspaceScan()?.starlightProjects.join(', ') ||
          'No documentation target is declared on this component.',
      });
    } else if (
      manifest.documentationTargets.some(
        (target) => this.documentationDriftState(target) !== 'Current',
      )
    ) {
      actions.push({
        id: 'documentation-drift',
        reason: 'Documentation is drifted or freshness is not evaluated',
        action:
          'Update the mapped documentation page or its published component version to match the current component version.',
        source: manifest.documentationTargets
          .map(
            (target) =>
              target.pathOrPageId ?? `${target.adapter} target without path`,
          )
          .join(', '),
        destinationLabel: 'Open documentation',
        fragment: 'documentation-title',
        evidence: manifest.documentationTargets
          .map((target) => this.documentationDriftState(target))
          .join(', '),
      });
    }
    return actions;
  });

  protected readonly recommendedRemediation =
    computed<RemediationAction | null>(
      () => this.remediationActions()[0] ?? null,
    );

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

  protected manualReviewFreshness(review: ManualReview): string {
    if (!/^[0-9a-f]{40}$/i.test(review.commitOrFingerprint)) {
      return 'Not evaluated — evidence uses a source fingerprint rather than a Git commit';
    }
    const commit = this.workspace.gitStatus()?.commit;
    return commit &&
      review.commitOrFingerprint.toLowerCase() === commit.toLowerCase()
      ? 'Current'
      : `Stale — recorded at ${review.commitOrFingerprint.slice(0, 8)}`;
  }

  protected manualReviewIsStale(review: ManualReview): boolean {
    if (!/^[0-9a-f]{40}$/i.test(review.commitOrFingerprint)) {
      return false;
    }
    const commit = this.workspace.gitStatus()?.commit;
    return (
      !!commit &&
      review.commitOrFingerprint.toLowerCase() !== commit.toLowerCase()
    );
  }

  protected showStaleReviewChangedFiles(review: ManualReview): void {
    void this.workspace.loadStaleReviewChangedFiles(
      review.commitOrFingerprint,
    );
  }

  protected componentName(id: string): string {
    const parts = id.split('.');
    return parts[parts.length - 1] ?? id;
  }

  protected exportEvidencePackage(): void {
    const manifest = this.manifest();
    if (!manifest) {
      return;
    }
    void this.workspace.exportEvidencePackage(
      manifest,
      this.testExecutions(),
      this.blockingReasons(),
      undefined,
      this.manualReviews(),
      this.workspace.exceptions(),
      this.workspace.findings(),
    );
  }

  private manifestSource(manifest: ComponentManifest): string {
    return this.authoredManifestPath() ?? componentManifestPath(manifest.id);
  }
}

function componentVersionId(manifest: ComponentManifest): string {
  return manifest.componentVersion
    ? `${manifest.id}@${manifest.componentVersion}`
    : manifest.id;
}

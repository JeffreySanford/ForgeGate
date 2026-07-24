import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { map } from 'rxjs';
import type { ComponentManifest } from '@forgegate/core-manifest';
import { ComponentInventoryService } from '../component-inventory.service';
import { WorkspaceService } from '../workspace.service';
import type { StorybookIndexEntry } from '../storybook/storybook-index';

export interface CoverageItem {
  readonly label: string;
  readonly count: number;
  readonly connected: boolean;
}

/**
 * The Button/component assurance record (P0.5,
 * documentation/25-designer-ready-vertical-slice.md "Suggested Angular UI
 * composition" — header, preview, coverage strip, readiness rail, states,
 * tokens, contract, evidence, documentation, in one route).
 *
 * Scoped honestly to what's real today: the contract panel (inputs,
 * outputs, slots, methods, style parts) is real, rich data straight from
 * the Custom Elements Manifest mapping. Everything that depends on a
 * feature ForgeGate doesn't have yet — Storybook connection (P0.6), a
 * findings/evidence pipeline, token mapping, manual review, documentation
 * drift — is shown as an explicit disconnected/not-evaluated state, per
 * document 25 ("The UI should render these as clear disconnected or
 * not-evaluated states"), never a fabricated value.
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

  protected documentationConnection(
    adapter: string,
    pathOrPageId?: string,
  ): string {
    if (this.isDocumentationAdapterDetected(adapter, pathOrPageId)) {
      return 'Target configured; drift not evaluated';
    }
    return 'Target configured; adapter not detected';
  }

  protected isDocumentationAdapterDetected(
    adapter: string,
    pathOrPageId?: string,
  ): boolean {
    if (adapter !== 'starlight' || !pathOrPageId) return false;
    const normalizedPath = pathOrPageId.replace(/\\/g, '/');
    return (
      this.workspace
        .workspaceScan()
        ?.starlightProjects.some(
          (project) =>
            project === '' ||
            project === '.' ||
            normalizedPath.startsWith(`${project}/`),
        ) ?? false
    );
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

  protected readonly previewUrl = computed<SafeResourceUrl | null>(() => {
    const story = this.activeStory();
    if (!story) return null;
    const url = `http://localhost:6006/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  protected readonly blockingReasons = computed<readonly string[]>(() => {
    const manifest = this.manifest();
    if (!manifest) {
      return [];
    }
    const reasons: string[] = [];
    if (manifest.states.length === 0)
      reasons.push('No required states declared');
    if (manifest.storyMappings.length === 0)
      reasons.push('No Storybook connection (not yet built — P0.6)');
    if (manifest.tokenMappings.length === 0)
      reasons.push('No token mappings connected');
    if (manifest.testRequirements.length === 0)
      reasons.push('No automated evidence connected');
    if (manifest.manualReviewProcedureIds.length === 0)
      reasons.push('No manual review recorded');
    if (manifest.documentationTargets.length === 0)
      reasons.push('No documentation target connected');
    return reasons;
  });

  protected componentName(id: string): string {
    const parts = id.split('.');
    return parts[parts.length - 1] ?? id;
  }
}

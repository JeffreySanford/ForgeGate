import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ComponentManifest } from '@forgegate/core-manifest';
import { ComponentInventoryService } from '../component-inventory.service';
import { WorkspaceService, type WorkspaceScan } from '../workspace.service';

export type AssuranceStageStatus =
  'complete' | 'partial' | 'blocked' | 'unavailable';

export interface AssuranceStage {
  readonly id:
    | 'discover'
    | 'specify'
    | 'preview'
    | 'test'
    | 'review'
    | 'document'
    | 'release';
  readonly title: string;
  readonly status: AssuranceStageStatus;
  readonly detail: string;
  readonly actionLabel?: string;
  readonly actionLink?: readonly string[];
}

const STATUS_LABEL: Record<AssuranceStageStatus, string> = {
  complete: 'Complete',
  partial: 'Needs work',
  blocked: 'Blocked',
  unavailable: 'Not connected',
};

@Component({
  selector: 'app-assurance-journey',
  imports: [RouterLink],
  templateUrl: './assurance-journey.html',
  styleUrl: './assurance-journey.css',
})
export class AssuranceJourney {
  private readonly workspace = inject(WorkspaceService);
  private readonly inventory = inject(ComponentInventoryService);

  protected readonly stages = computed(() =>
    buildAssuranceJourney(
      this.workspace.workspacePath(),
      this.workspace.workspaceScan(),
      this.inventory.result().manifests,
    ),
  );

  protected readonly recommendedStage = computed(
    () =>
      this.stages().find(
        (stage) =>
          stage.status !== 'complete' && stage.actionLink !== undefined,
      ) ?? null,
  );

  protected statusLabel(status: AssuranceStageStatus): string {
    return STATUS_LABEL[status];
  }
}

export function buildAssuranceJourney(
  workspacePath: string | null,
  scan: WorkspaceScan | null,
  manifests: readonly ComponentManifest[],
): readonly AssuranceStage[] {
  if (!workspacePath) {
    return stageDefinitions().map((stage) => ({
      ...stage,
      status: 'unavailable',
      detail: 'Open a workspace to evaluate this stage.',
    }));
  }

  const total = manifests.length;
  const componentLink = ['/components'] as const;
  const specified = manifests.filter(
    (manifest) =>
      manifest.states.length > 0 && manifest.tokenMappings.length > 0,
  ).length;
  const previewed = manifests.filter(
    (manifest) => manifest.storyMappings.length > 0,
  ).length;
  const testsDeclared = manifests.filter(
    (manifest) => manifest.testRequirements.length > 0,
  ).length;
  const reviewsDeclared = manifests.filter(
    (manifest) => manifest.manualReviewProcedureIds.length > 0,
  ).length;
  const documented = manifests.filter((manifest) =>
    manifest.documentationTargets.some((target) =>
      documentationAdapterIsConnected(target.adapter, scan),
    ),
  ).length;

  return [
    {
      id: 'discover',
      title: 'Discover',
      status: total > 0 ? 'complete' : 'blocked',
      detail:
        total > 0
          ? countDetail(total, total, 'component discovered')
          : 'No components have been mapped from a supported manifest.',
      actionLabel: total > 0 ? 'Open inventory' : 'Review discovery',
      actionLink: total > 0 ? componentLink : ['/workspace'],
    },
    {
      id: 'specify',
      title: 'Specify',
      status: aggregateStatus(specified, total),
      detail: countDetail(
        specified,
        total,
        'component has required states and token mappings',
      ),
      actionLabel: 'Open component specifications',
      actionLink: componentLink,
    },
    {
      id: 'preview',
      title: 'Preview',
      status: aggregateStatus(previewed, total),
      detail: countDetail(
        previewed,
        total,
        'component has a mapped Storybook story',
      ),
      actionLabel: 'Open preview mappings',
      actionLink: componentLink,
    },
    {
      id: 'test',
      title: 'Test',
      status: testsDeclared > 0 ? 'partial' : 'blocked',
      detail:
        testsDeclared > 0
          ? `${countDetail(testsDeclared, total, 'component has test requirements')} Results are not connected yet.`
          : 'No component test requirements or test results are connected.',
      actionLabel: 'Open test requirements',
      actionLink: componentLink,
    },
    {
      id: 'review',
      title: 'Review',
      status: reviewsDeclared > 0 ? 'partial' : 'blocked',
      detail:
        reviewsDeclared > 0
          ? `${countDetail(reviewsDeclared, total, 'component has a manual review procedure')} Review decisions are not connected yet.`
          : 'No manual review procedures or decisions are connected.',
      actionLabel: 'Open review requirements',
      actionLink: componentLink,
    },
    {
      id: 'document',
      title: 'Document',
      status: aggregateStatus(documented, total),
      detail: countDetail(
        documented,
        total,
        'component has a target on a detected documentation adapter',
      ),
      actionLabel: 'Open documentation mappings',
      actionLink: componentLink,
    },
    {
      id: 'release',
      title: 'Release',
      status: 'unavailable',
      detail:
        'Release decisions are not connected, so ForgeGate cannot claim approval.',
    },
  ];
}

function stageDefinitions(): ReadonlyArray<
  Pick<AssuranceStage, 'id' | 'title'>
> {
  return [
    { id: 'discover', title: 'Discover' },
    { id: 'specify', title: 'Specify' },
    { id: 'preview', title: 'Preview' },
    { id: 'test', title: 'Test' },
    { id: 'review', title: 'Review' },
    { id: 'document', title: 'Document' },
    { id: 'release', title: 'Release' },
  ];
}

function aggregateStatus(
  complete: number,
  total: number,
): AssuranceStageStatus {
  if (total === 0 || complete === 0) return 'blocked';
  return complete === total ? 'complete' : 'partial';
}

function countDetail(
  complete: number,
  total: number,
  singularDescription: string,
): string {
  const description =
    complete === 1 ? singularDescription : pluralize(singularDescription);
  return `${complete} of ${total} ${description}.`;
}

function pluralize(description: string): string {
  return description
    .replace('component has', 'components have')
    .replace('component discovered', 'components discovered');
}

function documentationAdapterIsConnected(
  adapter: ComponentManifest['documentationTargets'][number]['adapter'],
  scan: WorkspaceScan | null,
): boolean {
  if (!scan) return false;
  if (adapter === 'starlight') return scan.starlightProjects.length > 0;
  if (adapter === 'storybook') return scan.storybookProjects.length > 0;
  return scan.hasZeroheight;
}

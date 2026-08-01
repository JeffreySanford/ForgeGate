import type {
  Finding,
  ManualReview,
  TestExecution,
} from '@forgegate/core-evidence';
import type { ComponentManifest } from '@forgegate/core-manifest';
import { findingsFromBlockingReasons } from './evidence-export';
import { computeDocumentationDriftState } from './documentation-drift';
import type { StorybookIndex } from '@forgegate/adapter-storybook';

export type ComponentSnapshotReadiness =
  'blocked' | 'warning' | 'stale' | 'clear' | 'unknown';

export interface ComponentReadinessEvaluation {
  readonly readiness: ComponentSnapshotReadiness;
  readonly findingSummary: {
    readonly status: ComponentSnapshotReadiness;
    readonly findings: readonly Finding[];
    readonly reason: string | null;
  };
  readonly blockingReasons: readonly string[];
}

export interface ComponentReadinessInput {
  readonly manifest: ComponentManifest;
  readonly testExecutions: readonly TestExecution[];
  readonly manualReviews: readonly ManualReview[];
  /**
   * Real findings already persisted for this component — today always one
   * per failed/blocked guided-review step
   * (`findingsFromManualReviewStepResults`, written by
   * `WorkspaceService.approveStagedManualReview`). Merged into `findingSummary`
   * below so a reviewer sees the specific "Activate using Space fired
   * twice" finding, not only the generic "Manual review contains a failed
   * or blocked result" blocking reason. Readiness blocked/stale/warning
   * classification itself does not change here — the manual review's own
   * `status` field (already the worst-of-steps rollup) already drives
   * that through the existing blocking-reason check below.
   */
  readonly persistedFindings?: readonly Finding[];
  readonly currentCommit: string | null;
  readonly storybookProjects: readonly string[];
  readonly storybookIndex: StorybookIndex | null;
  readonly storybookIndexError: string | null;
  readonly starlightProjects: readonly string[];
}

export function evaluateComponentReadiness(
  input: ComponentReadinessInput,
): ComponentReadinessEvaluation {
  const blockingReasons = componentBlockingReasons(input);
  const blockingReasonFindings = findingsFromBlockingReasons(
    input.manifest.id,
    blockingReasons,
  );
  const blockingReasonFindingIds = new Set(
    blockingReasonFindings.map((finding) => finding.id),
  );
  const relevantPersistedFindings = (input.persistedFindings ?? []).filter(
    (finding) =>
      finding.componentId === input.manifest.id &&
      finding.status === 'open' &&
      !blockingReasonFindingIds.has(finding.id),
  );
  const findings = [...blockingReasonFindings, ...relevantPersistedFindings];
  const readiness = classifyReadiness(blockingReasons);

  return {
    readiness,
    findingSummary: {
      status: readiness,
      findings,
      reason:
        findings.length === 0
          ? 'No blocking findings were derived from connected component evidence.'
          : null,
    },
    blockingReasons,
  };
}

export function componentVersionId(manifest: ComponentManifest): string {
  return manifest.componentVersion
    ? `${manifest.id}@${manifest.componentVersion}`
    : manifest.id;
}

function componentBlockingReasons(
  input: ComponentReadinessInput,
): readonly string[] {
  const { manifest, testExecutions } = input;
  const reasons: string[] = [];

  if (manifest.states.length === 0) reasons.push('No required states declared');

  const previewUnavailableReason = getPreviewUnavailableReason(input);
  if (previewUnavailableReason) {
    reasons.push(`Preview unavailable - ${previewUnavailableReason}`);
  }

  if (manifest.tokenMappings.length === 0) {
    reasons.push('No token mappings connected');
  }

  if (manifest.testRequirements.length === 0) {
    reasons.push('No automated test requirements declared');
  } else if (testExecutions.length === 0) {
    reasons.push('No automated test results connected');
  } else if (
    testExecutions.some(
      (execution) =>
        execution.status === 'failed' || execution.status === 'blocked',
    )
  ) {
    reasons.push('Automated evidence contains a failed or blocked result');
  } else if (
    testExecutions.some(
      (execution) => !executionIsCurrent(execution, input.currentCommit),
    )
  ) {
    reasons.push('Automated evidence is stale');
  }

  if (manifest.manualReviewProcedureIds.length === 0) {
    reasons.push('No manual review recorded');
  } else if (input.manualReviews.length === 0) {
    reasons.push('No manual review results connected');
  } else if (
    input.manualReviews.some(
      (review) => review.status === 'failed' || review.status === 'blocked',
    )
  ) {
    reasons.push('Manual review contains a failed or blocked result');
  } else if (
    input.manualReviews.some(
      (review) => !executionIsCurrent(review, input.currentCommit),
    )
  ) {
    reasons.push('Manual review evidence is stale');
  }

  if (manifest.documentationTargets.length === 0) {
    reasons.push('No documentation target connected');
  } else if (
    manifest.documentationTargets.some(
      (target) =>
        computeDocumentationDriftState(
          target,
          manifest.componentVersion,
          input.starlightProjects,
        ).status !== 'current',
    )
  ) {
    reasons.push('Documentation is drifted or freshness is not evaluated');
  }

  return reasons;
}

function classifyReadiness(
  blockingReasons: readonly string[],
): ComponentSnapshotReadiness {
  if (
    blockingReasons.some((reason) =>
      reason.includes('failed or blocked result'),
    )
  ) {
    return 'blocked';
  }
  if (
    blockingReasons.some(
      (reason) =>
        reason.includes('stale') ||
        reason.includes('drifted or freshness is not evaluated'),
    )
  ) {
    return 'stale';
  }
  return blockingReasons.length ? 'warning' : 'clear';
}

function getPreviewUnavailableReason(
  input: ComponentReadinessInput,
): string | null {
  const { manifest, storybookProjects, storybookIndex, storybookIndexError } =
    input;
  if (!storybookProjects.length) {
    return 'Storybook was not detected in this workspace.';
  }
  if (storybookIndexError) {
    return 'The Storybook index was found but could not be validated.';
  }
  if (!storybookIndex) {
    return 'Storybook was detected, but storybook-static/index.json is not connected.';
  }
  if (!manifest.storyMappings.length) {
    return 'No Storybook story is mapped to this component.';
  }
  const mappedIds = new Set(
    manifest.storyMappings.map((mapping) => mapping.storybookStoryId),
  );
  const storyIsConnected = Object.values(storybookIndex.entries).some((entry) =>
    mappedIds.has(entry.id),
  );
  return storyIsConnected
    ? null
    : 'The mapped story IDs were not found in the connected Storybook index.';
}

function executionIsCurrent(
  execution: { readonly commitOrFingerprint: string },
  currentCommit: string | null,
): boolean {
  return (
    !!currentCommit &&
    /^[0-9a-f]{40}$/i.test(execution.commitOrFingerprint) &&
    execution.commitOrFingerprint.toLowerCase() === currentCommit.toLowerCase()
  );
}

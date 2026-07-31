import type { ManualReview, TestExecution } from '@forgegate/core-evidence';
import type { ComponentDiscovery } from './component-inventory.service';

/**
 * P1.4: changed files (from `git status --porcelain`, already
 * workspace-root-relative) matched against each discovered component's own
 * `sourceFiles`, then cross-referenced through that component to the other
 * artifacts ForgeGate already knows about it — its stories, test
 * executions, manual reviews, and documentation targets.
 *
 * **The cross-reference is transitive through the component, and says so.**
 * ForgeGate does not have a direct file→story or file→test dependency
 * graph, and inventing one would be exactly the "dependency precision the
 * adapter does not possess" that P1.4 warns against. What it does have is
 * real and sufficient to be useful: a changed file belongs to a component
 * (via CEM `sourceFiles`), and that component has real `storyMappings`,
 * real `TestExecution` and `ManualReview` records keyed by its component
 * version, and real `documentationTargets`. So "this file changed,
 * therefore these stories, tests, and reviews relate to it" is a real
 * inference — it just runs through the component rather than being
 * observed directly, and the UI labels it that way rather than implying a
 * precise dependency edge.
 *
 * Release-decision cross-referencing is still genuinely not implemented:
 * a release decision is computed per component at export time rather than
 * stored, so there is no persisted decision for a changed file to point
 * at.
 *
 * A file with no matching component is reported as unmatched rather than
 * hidden.
 */
export interface ChangeImpactEntry {
  readonly filePath: string;
  readonly affectedComponentIds: readonly string[];
  /** Storybook story ids, via each affected component's `storyMappings`. */
  readonly affectedStoryIds: readonly string[];
  /** Test execution ids, via each affected component's version id. */
  readonly affectedTestExecutionIds: readonly string[];
  /** Manual review ids, via each affected component's version id. */
  readonly affectedManualReviewIds: readonly string[];
  /** Documentation page ids/paths, via each component's `documentationTargets`. */
  readonly affectedDocumentationTargets: readonly string[];
}

function componentVersionId(manifest: {
  id: string;
  componentVersion?: string;
}): string {
  return manifest.componentVersion
    ? `${manifest.id}@${manifest.componentVersion}`
    : manifest.id;
}

export function computeChangeImpact(
  changedFiles: readonly string[],
  discoveries: readonly Pick<ComponentDiscovery, 'manifest' | 'sourceFiles'>[],
  testExecutions: readonly TestExecution[] = [],
  manualReviews: readonly ManualReview[] = [],
): readonly ChangeImpactEntry[] {
  // Every index below is built exactly once, so each changed file resolves
  // through O(1) lookups rather than re-scanning the component list —
  // these all feed a `computed()` that recomputes on any dependency change.
  const componentIdsByFilePath = new Map<string, string[]>();
  const storyIdsByComponentId = new Map<string, readonly string[]>();
  const documentationByComponentId = new Map<string, readonly string[]>();
  const versionIdByComponentId = new Map<string, string>();

  for (const discovery of discoveries) {
    const { manifest } = discovery;
    for (const filePath of discovery.sourceFiles) {
      const componentIds = componentIdsByFilePath.get(filePath);
      if (componentIds) {
        componentIds.push(manifest.id);
      } else {
        componentIdsByFilePath.set(filePath, [manifest.id]);
      }
    }
    storyIdsByComponentId.set(
      manifest.id,
      manifest.storyMappings.map((mapping) => mapping.storybookStoryId),
    );
    documentationByComponentId.set(
      manifest.id,
      manifest.documentationTargets.map(
        (target) =>
          target.pathOrPageId ?? `${target.adapter} (unknown location)`,
      ),
    );
    versionIdByComponentId.set(manifest.id, componentVersionId(manifest));
  }

  const testExecutionIdsByVersionId = new Map<string, string[]>();
  for (const execution of testExecutions) {
    const ids = testExecutionIdsByVersionId.get(execution.componentVersionId);
    if (ids) {
      ids.push(execution.id);
    } else {
      testExecutionIdsByVersionId.set(execution.componentVersionId, [
        execution.id,
      ]);
    }
  }

  const manualReviewIdsByVersionId = new Map<string, string[]>();
  for (const review of manualReviews) {
    const ids = manualReviewIdsByVersionId.get(review.componentVersionId);
    if (ids) {
      ids.push(review.id);
    } else {
      manualReviewIdsByVersionId.set(review.componentVersionId, [review.id]);
    }
  }

  return changedFiles.map((filePath) => {
    const affectedComponentIds = componentIdsByFilePath.get(filePath) ?? [];
    return {
      filePath,
      affectedComponentIds,
      affectedStoryIds: dedupe(
        affectedComponentIds.flatMap(
          (id) => storyIdsByComponentId.get(id) ?? [],
        ),
      ),
      affectedTestExecutionIds: dedupe(
        affectedComponentIds.flatMap((id) => {
          const versionId = versionIdByComponentId.get(id);
          return versionId
            ? (testExecutionIdsByVersionId.get(versionId) ?? [])
            : [];
        }),
      ),
      affectedManualReviewIds: dedupe(
        affectedComponentIds.flatMap((id) => {
          const versionId = versionIdByComponentId.get(id);
          return versionId
            ? (manualReviewIdsByVersionId.get(versionId) ?? [])
            : [];
        }),
      ),
      affectedDocumentationTargets: dedupe(
        affectedComponentIds.flatMap(
          (id) => documentationByComponentId.get(id) ?? [],
        ),
      ),
    };
  });
}

/** Two components sharing a source file can share stories or docs. */
function dedupe(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

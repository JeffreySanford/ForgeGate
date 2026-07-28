import type { ComponentManifest, ManifestDocumentationTarget } from '@forgegate/core-manifest';

export type DocumentationDriftStatus = 'current' | 'drifted' | 'not-evaluated';

export interface DocumentationDriftResult {
  readonly status: DocumentationDriftStatus;
  /** Always a real, human-readable explanation — never blank, even for 'current'. */
  readonly detail: string;
}

/**
 * Shared with `ComponentDetailPage` (originally lived there as a private
 * method before P1.6 needed the same computation aggregated across every
 * component in the inventory, not just one). Pure and side-effect free so
 * both call sites — and this module's own tests — exercise the exact same
 * logic, not two copies that can silently drift from each other.
 *
 * Requires a real Starlight page-detection to consider a target
 * "evaluated" at all: a `pathOrPageId` alone doesn't prove the page
 * exists in a Starlight project ForgeGate actually detected in this
 * workspace. Version comparison only happens once both the component's
 * own current version and the target's recorded published version are
 * present — anything short of that is reported as an explicit
 * not-evaluated reason, never guessed.
 */
export function computeDocumentationDriftState(
  target: ManifestDocumentationTarget,
  currentVersion: string | undefined,
  starlightProjects: readonly string[],
): DocumentationDriftResult {
  if (!isDocumentationAdapterDetected(target.adapter, target.pathOrPageId, starlightProjects)) {
    return { status: 'not-evaluated', detail: 'Not evaluated — adapter not detected' };
  }
  if (!currentVersion) {
    return { status: 'not-evaluated', detail: 'Not evaluated — current component version is unavailable' };
  }
  if (!target.publishedVersion) {
    return { status: 'not-evaluated', detail: 'Not evaluated — published component version is unavailable' };
  }
  return target.publishedVersion === currentVersion
    ? { status: 'current', detail: 'Current' }
    : { status: 'drifted', detail: `Drifted — published ${target.publishedVersion}, current ${currentVersion}` };
}

export function isDocumentationAdapterDetected(
  adapter: string,
  pathOrPageId: string | undefined,
  starlightProjects: readonly string[],
): boolean {
  if (adapter !== 'starlight' || !pathOrPageId) return false;
  const normalizedPath = pathOrPageId.replace(/\\/g, '/');
  return starlightProjects.some(
    (project) => project === '' || project === '.' || normalizedPath.startsWith(`${project}/`),
  );
}

export interface ComponentDocumentationDrift {
  readonly componentId: string;
  readonly target: ManifestDocumentationTarget;
  readonly result: DocumentationDriftResult;
}

/**
 * Every documentation target across every component, each with its own
 * drift result — the real aggregation P1.6 needs. A component with no
 * documentation targets contributes nothing (there is nothing to compare,
 * not an implicit "current"); that honestly shows up as the component
 * being absent from this list rather than a fabricated entry.
 */
export function computeWorkspaceDocumentationDrift(
  manifests: readonly ComponentManifest[],
  starlightProjects: readonly string[],
): readonly ComponentDocumentationDrift[] {
  return manifests.flatMap((manifest) =>
    manifest.documentationTargets.map((target) => ({
      componentId: manifest.id,
      target,
      result: computeDocumentationDriftState(target, manifest.componentVersion, starlightProjects),
    })),
  );
}

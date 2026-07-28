import type { ComponentDiscovery } from './component-inventory.service';

/**
 * P1.4's narrow real slice: changed files (from `git status --porcelain`,
 * already workspace-root-relative) matched against each discovered
 * component's own `sourceFiles` (also workspace-root-relative — CEM module
 * paths as reported by the custom-elements.json the workspace already
 * built). Exact-path matching only; no story/test/review/documentation
 * cross-reference yet. Per TODO.md P1.4: "begin conservatively and show
 * uncertainty, never imply dependency precision the adapter does not
 * possess" — a file with no matching component is reported as unmatched
 * rather than hidden, and this never claims to know about non-component
 * artifacts (stories, tests, docs) it hasn't actually mapped.
 */
export interface ChangeImpactEntry {
  readonly filePath: string;
  readonly affectedComponentIds: readonly string[];
}

export function computeChangeImpact(
  changedFiles: readonly string[],
  discoveries: readonly Pick<ComponentDiscovery, 'manifest' | 'sourceFiles'>[],
): readonly ChangeImpactEntry[] {
  return changedFiles.map((filePath) => ({
    filePath,
    affectedComponentIds: discoveries
      .filter((discovery) => discovery.sourceFiles.includes(filePath))
      .map((discovery) => discovery.manifest.id),
  }));
}

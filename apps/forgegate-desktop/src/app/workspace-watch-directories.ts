import type { WorkspaceScan } from './workspace.service';

/**
 * Chooses which real directories a filesystem watcher should watch,
 * derived entirely from what a scan already found — not a blind recursive
 * watch of the whole workspace.
 *
 * This is the deliberate answer to the real risk a whole-tree recursive
 * watch has: a monorepo's `node_modules` can hold tens of thousands of
 * directories, and watching it wastes OS watch resources and floods the
 * debouncer with events from a single `pnpm install` that have nothing to
 * do with the workspace's own source. `scan_workspace` already excludes
 * `node_modules` (and `.git`, `dist`, `.nx`, etc.) when it discovers
 * component packages, token files, and UI source files — reusing exactly
 * those real, already-vetted paths means the watcher inherits that
 * exclusion for free, by construction, rather than needing its own
 * ignore-list at the OS-watch level.
 *
 * Always includes the workspace root as a **non-recursive** entry, so a
 * top-level file change (`package.json`, a new `.forgegate/config.yaml`)
 * is still seen without recursing into everything under it.
 */
export interface WorkspaceWatchDirectory {
  readonly path: string;
  readonly recursive: boolean;
}

const UI_SOURCE_FILE_WATCH_DEPTH = 3;

function parentAtDepth(filePath: string, depth: number): string {
  const segments = filePath.split('/');
  return segments.slice(0, Math.min(depth, Math.max(segments.length - 1, 1))).join('/');
}

function parentDirectory(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/');
  return lastSlash > 0 ? filePath.slice(0, lastSlash) : '.';
}

/**
 * Drops any directory that is itself inside another directory already in
 * the list — watching `apps/frontend` recursively already covers
 * `apps/frontend/src`, so keeping both would be a redundant second watch
 * over the same files.
 */
function dropNestedDirectories(paths: readonly string[]): readonly string[] {
  const sorted = [...new Set(paths)].sort((a, b) => a.length - b.length);
  const kept: string[] = [];
  for (const path of sorted) {
    const isNested = kept.some((existing) => path === existing || path.startsWith(`${existing}/`));
    if (!isNested) {
      kept.push(path);
    }
  }
  return kept;
}

export function computeWorkspaceWatchDirectories(
  scan: Pick<WorkspaceScan, 'componentPackages' | 'tokenFiles' | 'uiSourceFiles'>,
): readonly WorkspaceWatchDirectory[] {
  const recursiveCandidates = [
    ...scan.componentPackages.map((candidate) => candidate.path),
    ...scan.tokenFiles.map((file) => parentDirectory(file)),
    ...(scan.uiSourceFiles ?? []).map((file) => parentAtDepth(file, UI_SOURCE_FILE_WATCH_DEPTH)),
  ].filter((path) => path !== '.' && path !== '');

  const recursive = dropNestedDirectories(recursiveCandidates).map((path) => ({
    path,
    recursive: true,
  }));

  return [{ path: '.', recursive: false }, ...recursive];
}

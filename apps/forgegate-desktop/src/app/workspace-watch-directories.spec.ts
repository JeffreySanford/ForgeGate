import { computeWorkspaceWatchDirectories } from './workspace-watch-directories';

function scan(overrides: {
  componentPackages?: { path: string }[];
  tokenFiles?: string[];
  uiSourceFiles?: string[];
}) {
  return {
    componentPackages: [],
    tokenFiles: [],
    uiSourceFiles: [],
    ...overrides,
  };
}

describe('computeWorkspaceWatchDirectories', () => {
  it('always includes the workspace root as non-recursive', () => {
    const result = computeWorkspaceWatchDirectories(scan({}));
    expect(result).toEqual([{ path: '.', recursive: false }]);
  });

  it('watches each real component package path recursively', () => {
    const result = computeWorkspaceWatchDirectories(
      scan({
        componentPackages: [
          { path: 'apps/starlight' },
          { path: 'packages/tokens' },
        ],
      }),
    );

    expect(result).toEqual([
      { path: '.', recursive: false },
      { path: 'apps/starlight', recursive: true },
      { path: 'packages/tokens', recursive: true },
    ]);
  });

  it('watches the parent directory of each real token file, not the file itself', () => {
    const result = computeWorkspaceWatchDirectories(
      scan({ tokenFiles: ['packages/tokens/src/design-tokens.json'] }),
    );

    expect(result).toContainEqual({ path: 'packages/tokens/src', recursive: true });
  });

  it("derives a real watch root for Angular source with no componentPackages at all — the phase-2-cosmic case", () => {
    const result = computeWorkspaceWatchDirectories(
      scan({
        uiSourceFiles: [
          'apps/frontend/src/app/base/header/header.component.ts',
          'apps/frontend/src/app/base/sidebar/sidebar.component.ts',
          'apps/frontend/src/app/features/dashboard/dashboard.component.ts',
        ],
      }),
    );

    // Collapsed to one shared, real ancestor rather than one watch per file.
    expect(result).toEqual([
      { path: '.', recursive: false },
      { path: 'apps/frontend/src', recursive: true },
    ]);
  });

  it('drops a directory nested inside another already being watched, to avoid a redundant double watch', () => {
    const result = computeWorkspaceWatchDirectories(
      scan({
        componentPackages: [{ path: 'apps/frontend' }],
        uiSourceFiles: ['apps/frontend/src/app/header.component.ts'],
      }),
    );

    expect(result).toEqual([
      { path: '.', recursive: false },
      { path: 'apps/frontend', recursive: true },
    ]);
  });

  it('deduplicates identical directories from different sources', () => {
    const result = computeWorkspaceWatchDirectories(
      scan({
        componentPackages: [{ path: 'packages/tokens' }],
        tokenFiles: ['packages/tokens/tokens.json'],
      }),
    );

    expect(result.filter((entry) => entry.path === 'packages/tokens')).toHaveLength(1);
  });

  it('never produces a watch path that reaches into node_modules, because the scan never reported one', () => {
    // Real scan data never contains node_modules paths (scan_workspace
    // excludes it at discovery time) — this documents that invariant by
    // showing ordinary real-shaped input produces no such path.
    const result = computeWorkspaceWatchDirectories(
      scan({
        componentPackages: [{ path: 'packages/ui-patterns' }],
        uiSourceFiles: ['apps/qa-remote/src/stories/button.stories.ts'],
      }),
    );

    expect(result.some((entry) => entry.path.includes('node_modules'))).toBe(false);
  });
});

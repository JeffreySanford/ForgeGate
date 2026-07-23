import type { ManifestStoryMapping } from '@forgegate/core-manifest';

export interface StorybookIndexEntry {
  readonly type: string;
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly importPath: string;
  readonly exportName?: string;
  readonly tags: readonly string[];
}

export interface StorybookIndex {
  readonly v: number;
  readonly entries: Readonly<Record<string, StorybookIndexEntry>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(
  record: Record<string, unknown>,
  property: string,
  context: string,
): string {
  const value = record[property];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(
      `${context} requires a non-empty string property "${property}"`,
    );
  }
  return value;
}

function parseEntry(entryKey: string, value: unknown): StorybookIndexEntry {
  if (!isRecord(value)) {
    throw new Error(`Storybook index entry "${entryKey}" must be an object`);
  }

  const rawTags = value['tags'];
  if (
    rawTags !== undefined &&
    (!Array.isArray(rawTags) || rawTags.some((tag) => typeof tag !== 'string'))
  ) {
    throw new Error(
      `Storybook index entry "${entryKey}" property "tags" must be an array of strings`,
    );
  }

  const exportName = value['exportName'];
  if (exportName !== undefined && typeof exportName !== 'string') {
    throw new Error(
      `Storybook index entry "${entryKey}" property "exportName" must be a string`,
    );
  }

  return {
    type: requireString(value, 'type', `Storybook index entry "${entryKey}"`),
    id: requireString(value, 'id', `Storybook index entry "${entryKey}"`),
    name: requireString(value, 'name', `Storybook index entry "${entryKey}"`),
    title: requireString(value, 'title', `Storybook index entry "${entryKey}"`),
    importPath: requireString(
      value,
      'importPath',
      `Storybook index entry "${entryKey}"`,
    ),
    exportName,
    tags: rawTags ?? [],
  };
}

/**
 * Parses Storybook's generated `index.json` without trusting JSON input.
 * Storybook currently writes a numeric `v`, but ForgeGate treats it as
 * optional so older or hand-authored fixture indexes remain readable.
 */
export function parseStorybookIndex(text: string): StorybookIndex {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(
      `Invalid Storybook index JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!isRecord(parsed)) {
    throw new Error('Storybook index must be a JSON object');
  }

  const rawEntries = parsed['entries'];
  if (!isRecord(rawEntries)) {
    throw new Error('Storybook index requires an "entries" object');
  }

  const rawVersion = parsed['v'];
  const version = typeof rawVersion === 'number' ? rawVersion : 0;
  const entries: Record<string, StorybookIndexEntry> = {};

  for (const [entryKey, value] of Object.entries(rawEntries)) {
    entries[entryKey] = parseEntry(entryKey, value);
  }

  return { v: version, entries };
}

function comparableSourcePath(path: string): string {
  return path
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/[?#].*$/, '')
    .replace(/\.(?:stories|story)\.[^./]+$/i, '')
    .replace(/\.[^./]+$/, '');
}

/**
 * Associates Storybook story entries with component source files by their
 * normalized source path. Documentation entries and unrelated stories are
 * deliberately excluded from the component manifest mapping.
 */
export function findStoriesForSourceFiles(
  index: StorybookIndex,
  sourceFiles: readonly string[],
): readonly ManifestStoryMapping[] {
  const comparableSources = new Set(sourceFiles.map(comparableSourcePath));

  return Object.values(index.entries)
    .filter(
      (entry) =>
        entry.type === 'story' &&
        comparableSources.has(comparableSourcePath(entry.importPath)),
    )
    .map((entry) => ({ storybookStoryId: entry.id }));
}

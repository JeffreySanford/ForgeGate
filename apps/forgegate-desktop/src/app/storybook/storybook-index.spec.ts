import { findStoriesForSourceFiles, parseStorybookIndex } from './storybook-index';

const storyEntry = {
  type: 'story',
  id: 'components-acmebutton--primary',
  name: 'Primary',
  title: 'Components/AcmeButton',
  importPath: './src/acme-button.stories.js',
  exportName: 'Primary',
  tags: ['dev', 'test'],
};

describe('parseStorybookIndex', () => {
  it('parses a numeric Storybook index version and entries', () => {
    const index = parseStorybookIndex(
      JSON.stringify({
        v: 5,
        entries: { [storyEntry.id]: storyEntry },
      }),
    );

    expect(index.v).toBe(5);
    expect(index.entries[storyEntry.id]).toEqual(storyEntry);
  });

  it('defaults a missing or non-numeric version to zero', () => {
    const withoutVersion = parseStorybookIndex(
      JSON.stringify({
        entries: { [storyEntry.id]: storyEntry },
      }),
    );
    const stringVersion = parseStorybookIndex(
      JSON.stringify({
        v: '5',
        entries: { [storyEntry.id]: storyEntry },
      }),
    );

    expect(withoutVersion.v).toBe(0);
    expect(stringVersion.v).toBe(0);
  });

  it('rejects an index without an entries object', () => {
    expect(() => parseStorybookIndex(JSON.stringify({ v: 5 }))).toThrow(
      'Storybook index requires an "entries" object',
    );
  });
});

describe('findStoriesForSourceFiles', () => {
  it('maps matching stories and excludes docs and unrelated entries', () => {
    const index = parseStorybookIndex(
      JSON.stringify({
        v: 5,
        entries: {
          [storyEntry.id]: storyEntry,
          'components-acmebutton--docs': {
            ...storyEntry,
            type: 'docs',
            id: 'components-acmebutton--docs',
            name: 'Docs',
          },
          'components-other--primary': {
            ...storyEntry,
            id: 'components-other--primary',
            title: 'Components/Other',
            importPath: './src/other.stories.js',
          },
        },
      }),
    );

    expect(findStoriesForSourceFiles(index, ['src/acme-button.js'])).toEqual([
      { storybookStoryId: storyEntry.id },
    ]);
  });

  it('normalizes Windows source paths', () => {
    const index = parseStorybookIndex(
      JSON.stringify({
        v: 5,
        entries: { [storyEntry.id]: storyEntry },
      }),
    );

    expect(findStoriesForSourceFiles(index, ['src\\acme-button.js'])).toEqual([
      { storybookStoryId: storyEntry.id },
    ]);
  });
});

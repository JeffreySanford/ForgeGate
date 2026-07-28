import { computeChangeImpact } from './change-impact';

describe('computeChangeImpact', () => {
  it('returns an empty list when nothing changed', () => {
    expect(computeChangeImpact([], [])).toEqual([]);
  });

  it('reports a changed file as unmatched when no discovered component owns it', () => {
    const result = computeChangeImpact(['apps/forgegate-desktop/src/app/app.css'], []);

    expect(result).toEqual([
      { filePath: 'apps/forgegate-desktop/src/app/app.css', affectedComponentIds: [] },
    ]);
  });

  it('matches a changed file to every discovery whose sourceFiles include it', () => {
    const discoveries = [
      {
        manifest: { id: 'acme.design-system.acme-button' },
        sourceFiles: ['src/acme-button.ts'],
      },
      {
        manifest: { id: 'acme.design-system.acme-card' },
        sourceFiles: ['src/acme-card.ts'],
      },
    ];

    const result = computeChangeImpact(
      ['src/acme-button.ts', 'README.md'],
      discoveries,
    );

    expect(result).toEqual([
      {
        filePath: 'src/acme-button.ts',
        affectedComponentIds: ['acme.design-system.acme-button'],
      },
      { filePath: 'README.md', affectedComponentIds: [] },
    ]);
  });

  it('reports every component that shares a source file, not just the first', () => {
    const discoveries = [
      {
        manifest: { id: 'acme.design-system.acme-button' },
        sourceFiles: ['src/shared.ts'],
      },
      {
        manifest: { id: 'acme.design-system.acme-toggle' },
        sourceFiles: ['src/shared.ts'],
      },
    ];

    const result = computeChangeImpact(['src/shared.ts'], discoveries);

    expect(result).toEqual([
      {
        filePath: 'src/shared.ts',
        affectedComponentIds: [
          'acme.design-system.acme-button',
          'acme.design-system.acme-toggle',
        ],
      },
    ]);
  });
});

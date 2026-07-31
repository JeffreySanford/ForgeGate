import { createComponentManifest } from '@forgegate/core-manifest';
import type { ManualReview, TestExecution } from '@forgegate/core-evidence';
import { computeChangeImpact } from './change-impact';

type ManifestInput = Parameters<typeof createComponentManifest>[0];

function discovery(
  id: string,
  sourceFiles: readonly string[],
  overrides: Partial<ManifestInput> = {},
) {
  return {
    manifest: createComponentManifest({
      id,
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      ...overrides,
    }),
    sourceFiles,
  };
}

function execution(overrides: Partial<TestExecution>): TestExecution {
  return {
    id: 'run-1',
    componentVersionId: 'acme.design-system.acme-button@1.0.0',
    gate: 'unit',
    tool: 'vitest',
    toolVersion: '4.1.10',
    adapterVersion: '1.0.0',
    status: 'passed',
    startedAt: '2026-01-01T00:00:00.000Z',
    commitOrFingerprint: 'a'.repeat(40),
    ...overrides,
  };
}

function review(overrides: Partial<ManualReview>): ManualReview {
  return {
    id: 'review-1',
    componentVersionId: 'acme.design-system.acme-button@1.0.0',
    procedureId: 'keyboard-and-screen-reader-review',
    procedureVersion: '1.0.0',
    reviewerIdentity: 'reviewer@acme.example',
    date: '2026-01-01T00:00:00.000Z',
    operatingSystem: 'Windows',
    status: 'passed',
    commitOrFingerprint: 'a'.repeat(40),
    ...overrides,
  };
}

describe('computeChangeImpact', () => {
  it('returns an empty list when nothing changed', () => {
    expect(computeChangeImpact([], [])).toEqual([]);
  });

  it('reports a changed file as unmatched when no discovered component owns it', () => {
    const result = computeChangeImpact(
      ['apps/forgegate-desktop/src/app/app.css'],
      [],
    );

    expect(result).toEqual([
      {
        filePath: 'apps/forgegate-desktop/src/app/app.css',
        affectedComponentIds: [],
        affectedStoryIds: [],
        affectedTestExecutionIds: [],
        affectedManualReviewIds: [],
        affectedDocumentationTargets: [],
      },
    ]);
  });

  it('matches a changed file to every discovery whose sourceFiles include it', () => {
    const result = computeChangeImpact(
      ['src/acme-button.ts', 'README.md'],
      [
        discovery('acme.design-system.acme-button', ['src/acme-button.ts']),
        discovery('acme.design-system.acme-card', ['src/acme-card.ts']),
      ],
    );

    expect(result.map((entry) => entry.affectedComponentIds)).toEqual([
      ['acme.design-system.acme-button'],
      [],
    ]);
  });

  it('reports every component that shares a source file, not just the first', () => {
    const result = computeChangeImpact(
      ['src/shared.ts'],
      [
        discovery('acme.design-system.acme-button', ['src/shared.ts']),
        discovery('acme.design-system.acme-toggle', ['src/shared.ts']),
      ],
    );

    expect(result[0]?.affectedComponentIds).toEqual([
      'acme.design-system.acme-button',
      'acme.design-system.acme-toggle',
    ]);
  });

  it("cross-references a changed file to its component's real stories", () => {
    const result = computeChangeImpact(
      ['src/acme-button.ts'],
      [
        discovery('acme.design-system.acme-button', ['src/acme-button.ts'], {
          storyMappings: [
            { storybookStoryId: 'components-acmebutton--primary' },
            { storybookStoryId: 'components-acmebutton--disabled' },
          ],
        }),
      ],
    );

    expect(result[0]?.affectedStoryIds).toEqual([
      'components-acmebutton--primary',
      'components-acmebutton--disabled',
    ]);
  });

  it("cross-references a changed file to its component version's real test executions", () => {
    const result = computeChangeImpact(
      ['src/acme-button.ts'],
      [
        discovery('acme.design-system.acme-button', ['src/acme-button.ts'], {
          componentVersion: '1.0.0',
        }),
      ],
      [
        execution({ id: 'run-unit' }),
        execution({ id: 'run-a11y' }),
        // Belongs to a different component version — must not be attributed.
        execution({
          id: 'run-other',
          componentVersionId: 'acme.design-system.acme-card@1.0.0',
        }),
      ],
    );

    expect(result[0]?.affectedTestExecutionIds).toEqual([
      'run-unit',
      'run-a11y',
    ]);
  });

  it("cross-references a changed file to its component version's real manual reviews", () => {
    const result = computeChangeImpact(
      ['src/acme-button.ts'],
      [
        discovery('acme.design-system.acme-button', ['src/acme-button.ts'], {
          componentVersion: '1.0.0',
        }),
      ],
      [],
      [
        review({ id: 'review-keyboard' }),
        review({ id: 'review-screen-reader' }),
        // Belongs to a different component version — must not be attributed.
        review({
          id: 'review-other',
          componentVersionId: 'acme.design-system.acme-card@1.0.0',
        }),
      ],
    );

    expect(result[0]?.affectedManualReviewIds).toEqual([
      'review-keyboard',
      'review-screen-reader',
    ]);
  });

  it("cross-references a changed file to its component's real documentation targets", () => {
    const result = computeChangeImpact(
      ['src/acme-button.ts'],
      [
        discovery('acme.design-system.acme-button', ['src/acme-button.ts'], {
          documentationTargets: [
            { adapter: 'starlight', pathOrPageId: 'docs/button' },
            // No pathOrPageId — reported by adapter rather than dropped.
            { adapter: 'zeroheight' },
          ],
        }),
      ],
    );

    expect(result[0]?.affectedDocumentationTargets).toEqual([
      'docs/button',
      'zeroheight (unknown location)',
    ]);
  });

  it('deduplicates artifacts shared by two components that both own the changed file', () => {
    const shared = { storyMappings: [{ storybookStoryId: 'shared--story' }] };
    const result = computeChangeImpact(
      ['src/shared.ts'],
      [
        discovery('acme.design-system.a', ['src/shared.ts'], shared),
        discovery('acme.design-system.b', ['src/shared.ts'], shared),
      ],
    );

    expect(result[0]?.affectedStoryIds).toEqual(['shared--story']);
  });

  it('attributes nothing when the changed file matches no component, even with evidence present', () => {
    const result = computeChangeImpact(
      ['README.md'],
      [
        discovery('acme.design-system.acme-button', ['src/acme-button.ts'], {
          componentVersion: '1.0.0',
          storyMappings: [
            { storybookStoryId: 'components-acmebutton--primary' },
          ],
        }),
      ],
      [execution({ id: 'run-unit' })],
    );

    expect(result[0]).toEqual({
      filePath: 'README.md',
      affectedComponentIds: [],
      affectedStoryIds: [],
      affectedTestExecutionIds: [],
      affectedManualReviewIds: [],
      affectedDocumentationTargets: [],
    });
  });
});

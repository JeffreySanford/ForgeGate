import { createComponentManifest } from '@forgegate/core-manifest';
import type { TestExecution } from '@forgegate/core-evidence';
import {
  componentVersionId,
  evaluateComponentReadiness,
} from './component-readiness';

const commit = 'a'.repeat(40);

function execution(overrides: Partial<TestExecution> = {}): TestExecution {
  return {
    id: 'unit-pass',
    componentVersionId: 'acme.lib.button@1.0.0',
    gate: 'unit',
    tool: 'vitest',
    toolVersion: '4.1.10',
    adapterVersion: '1.0.0',
    status: 'passed',
    startedAt: '2026-01-01T00:00:00.000Z',
    commitOrFingerprint: commit,
    ...overrides,
  };
}

function completeManifest() {
  return createComponentManifest({
    id: 'acme.lib.button',
    framework: 'web-components',
    adapter: 'framework.web-components',
    packagePath: '.',
    componentVersion: '1.0.0',
    states: [{ name: 'default', required: true }],
    tokenMappings: [
      { tokenPath: 'color.action', category: 'color', required: true },
    ],
    storyMappings: [{ storybookStoryId: 'components-button--default' }],
    testRequirements: [{ gate: 'unit', scope: 'component', required: true }],
    manualReviewProcedureIds: ['default-review'],
    documentationTargets: [
      {
        adapter: 'starlight',
        pathOrPageId: 'docs/button',
        publishedVersion: '1.0.0',
      },
    ],
  });
}

function evaluate(
  overrides: Partial<Parameters<typeof evaluateComponentReadiness>[0]> = {},
) {
  const manifest = overrides.manifest ?? completeManifest();
  return evaluateComponentReadiness({
    manifest,
    testExecutions: [execution()],
    currentCommit: commit,
    storybookProjects: ['apps/storybook'],
    storybookIndex: {
      v: 5,
      entries: {
        default: {
          type: 'story',
          id: 'components-button--default',
          title: 'Components/Button',
          name: 'Default',
          importPath: './button.stories.ts',
          tags: [],
        },
      },
    },
    storybookIndexError: null,
    starlightProjects: ['docs'],
    ...overrides,
  });
}

describe('evaluateComponentReadiness', () => {
  it('returns clear when required component evidence is present and current', () => {
    const result = evaluate();

    expect(result.readiness).toBe('clear');
    expect(result.findingSummary).toEqual({
      status: 'clear',
      findings: [],
      reason:
        'No blocking findings were derived from connected component evidence.',
    });
  });

  it('returns blocked when automated evidence failed or was blocked', () => {
    const result = evaluate({
      testExecutions: [execution({ status: 'failed' })],
    });

    expect(result.readiness).toBe('blocked');
    expect(result.findingSummary.findings).toContainEqual(
      expect.objectContaining({
        description: 'Automated evidence contains a failed or blocked result',
        severity: 'serious',
      }),
    );
  });

  it('returns stale when connected automated evidence is for another commit', () => {
    const result = evaluate({
      testExecutions: [execution({ commitOrFingerprint: 'b'.repeat(40) })],
    });

    expect(result.readiness).toBe('stale');
    expect(result.findingSummary.findings).toContainEqual(
      expect.objectContaining({
        description: 'Automated evidence is stale',
        severity: 'moderate',
      }),
    );
  });

  it('returns warning when required evidence connections are incomplete', () => {
    const result = evaluate({
      manifest: createComponentManifest({
        id: 'acme.lib.button',
        framework: 'web-components',
        adapter: 'framework.web-components',
        packagePath: '.',
      }),
      testExecutions: [],
      storybookProjects: [],
      storybookIndex: null,
      starlightProjects: [],
    });

    expect(result.readiness).toBe('warning');
    expect(result.findingSummary.findings.length).toBeGreaterThan(1);
  });
});

describe('componentVersionId', () => {
  it('uses the manifest version when present', () => {
    expect(componentVersionId(completeManifest())).toBe(
      'acme.lib.button@1.0.0',
    );
  });
});

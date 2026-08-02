import type { AutomatedEvidenceArtifact } from '@forgegate/core-evidence';
import { buildAutomatedEvidenceDetail } from './evidence-detail';

function artifact(
  overrides: Partial<AutomatedEvidenceArtifact>,
): AutomatedEvidenceArtifact {
  return {
    kind: 'axe-json',
    id: 'artifact-1',
    componentVersionId: 'acme.lib.button@1.0.0',
    gate: 'accessibility',
    tool: 'axe-core',
    toolVersion: '4.10.3',
    adapterVersion: '0.1.0',
    commitOrFingerprint: 'a'.repeat(40),
    rawArtifactRef: '.forgegate/evidence/raw/report.json',
    report: {},
    ...overrides,
  };
}

describe('buildAutomatedEvidenceDetail', () => {
  it('summarizes axe violations without embedding node HTML', () => {
    const detail = buildAutomatedEvidenceDetail(
      artifact({
        report: {
          violations: [
            {
              id: 'color-contrast',
              impact: 'serious',
              help: 'Elements must meet minimum color contrast ratio.',
              nodes: [{ html: '<button style="color:#aaa">Save</button>' }],
            },
          ],
          incomplete: [],
          passes: [{ id: 'button-name', nodes: [] }],
        },
      }),
    );

    expect(detail.summary).toContain('violations');
    expect(detail.metrics).toContainEqual({ label: 'Violations', value: 1 });
    expect(detail.metrics).toContainEqual({ label: 'Affected nodes', value: 1 });
    expect(detail.observations[0]).toMatchObject({
      label: 'Violation: color-contrast',
      severity: 'serious',
    });
    expect(JSON.stringify(detail)).not.toContain('<button');
  });

  it('summarizes Playwright stats and named failures', () => {
    const detail = buildAutomatedEvidenceDetail(
      artifact({
        kind: 'playwright-json',
        tool: 'playwright',
        report: {
          stats: {
            expected: 2,
            skipped: 1,
            unexpected: 1,
            flaky: 0,
            duration: 1200,
          },
          errors: [],
          suites: [
            {
              title: 'button',
              specs: [
                {
                  title: 'activates',
                  tests: [
                    {
                      results: [
                        {
                          status: 'failed',
                          error: { message: 'Expected click handler once' },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      }),
    );

    expect(detail.summary).toContain('failing');
    expect(detail.metrics).toContainEqual({
      label: 'Unexpected checks',
      value: 1,
    });
    expect(detail.observations[0]).toMatchObject({
      label: 'button / activates',
      detail: 'Expected click handler once',
    });
  });

  it('summarizes Storybook interaction status counts', () => {
    const detail = buildAutomatedEvidenceDetail(
      artifact({
        kind: 'storybook-interactions-json',
        tool: 'storybook/test-runner',
        report: {
          stories: [
            { id: 'button--primary', status: 'passed' },
            {
              id: 'button--disabled',
              status: 'failed',
              error: { message: 'Expected disabled state' },
            },
          ],
        },
      }),
    );

    expect(detail.summary).toContain('failed stories');
    expect(detail.metrics).toContainEqual({ label: 'Stories', value: 2 });
    expect(detail.metrics).toContainEqual({ label: 'Failed', value: 1 });
    expect(detail.observations[0]).toMatchObject({
      label: 'button--disabled',
      detail: 'Expected disabled state',
    });
  });

  it('summarizes Jest and Vitest assertion failures through one contract', () => {
    const detail = buildAutomatedEvidenceDetail(
      artifact({
        kind: 'vitest-json',
        tool: 'vitest',
        report: {
          success: false,
          numPassedTests: 3,
          numFailedTests: 1,
          numPendingTests: 0,
          numPassedTestSuites: 1,
          numFailedTestSuites: 1,
          testResults: [
            {
              name: 'button.test.ts',
              assertionResults: [
                {
                  status: 'failed',
                  fullName: 'button emits activate once',
                  failureMessages: ['Expected one event, received two'],
                },
              ],
            },
          ],
        },
      }),
    );

    expect(detail.summary).toContain('failing unit tests');
    expect(detail.metrics).toContainEqual({ label: 'Failed tests', value: 1 });
    expect(detail.metrics).toContainEqual({ label: 'Success flag', value: 'false' });
    expect(detail.observations[0]).toMatchObject({
      label: 'button emits activate once',
      detail: 'Expected one event, received two',
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  parseTestEvidenceFile,
  parseTestExecution,
} from './test-execution-json';

const validExecution = {
  id: 'acme-button-unit-2026-07-24',
  componentVersionId: 'acme.button-library.acme-button@0.1.0',
  gate: 'unit',
  tool: 'node:test',
  toolVersion: '22.21.1',
  adapterVersion: '0.1.0',
  status: 'passed',
  startedAt: '2026-07-24T16:00:00.000Z',
  durationMs: 42,
  commitOrFingerprint: '95e7160868275025e94ff0ff0d3a397785a92868',
  rawArtifactRef: '.forgegate/evidence/raw/acme-button-unit.tap',
};

describe('parseTestExecution', () => {
  it('parses a schema-valid repository execution', () => {
    expect(parseTestExecution(JSON.stringify(validExecution))).toEqual(
      validExecution,
    );
  });

  it('rejects malformed JSON', () => {
    expect(() => parseTestExecution('{')).toThrow(
      'Test execution is not valid JSON',
    );
  });

  it('rejects unknown statuses and missing provenance', () => {
    expect(() =>
      parseTestExecution(
        JSON.stringify({
          ...validExecution,
          status: 'green',
          toolVersion: undefined,
        }),
      ),
    ).toThrow('Test execution does not match the schema');
  });
});

describe('parseTestEvidenceFile', () => {
  it('keeps ForgeGate-native evidence as a single execution', () => {
    expect(parseTestEvidenceFile(JSON.stringify(validExecution))).toEqual({
      adapter: 'ForgeGate test execution',
      executions: [validExecution],
      automatedArtifacts: [],
    });
  });

  it('normalizes a Playwright JSON report envelope into commit-bound evidence', () => {
    expect(
      parseTestEvidenceFile(
        JSON.stringify({
          format: 'playwright-json',
          id: 'acme-button-playwright',
          componentVersionId: 'acme.button-library.acme-button@0.1.0',
          gate: 'interaction',
          toolVersion: '1.56.0',
          commitOrFingerprint: '95e7160868275025e94ff0ff0d3a397785a92868',
          rawArtifactRef: '.forgegate/evidence/raw/playwright-report.json',
          report: {
            stats: {
              startTime: '2026-07-24T16:10:00.000Z',
              duration: 1200,
              expected: 8,
              skipped: 1,
              unexpected: 0,
              flaky: 0,
            },
            errors: [],
            suites: [],
          },
        }),
      ),
    ).toEqual({
      adapter: 'Playwright JSON',
      executions: [
        {
          id: 'acme-button-playwright',
          componentVersionId: 'acme.button-library.acme-button@0.1.0',
          gate: 'interaction',
          tool: 'playwright',
          toolVersion: '1.56.0',
          adapterVersion: '0.1.0',
          status: 'passed',
          startedAt: '2026-07-24T16:10:00.000Z',
          durationMs: 1200,
          commitOrFingerprint: '95e7160868275025e94ff0ff0d3a397785a92868',
          rawArtifactRef: '.forgegate/evidence/raw/playwright-report.json',
        },
      ],
      automatedArtifacts: [
        {
          kind: 'playwright-json',
          id: 'acme-button-playwright',
          componentVersionId: 'acme.button-library.acme-button@0.1.0',
          gate: 'interaction',
          tool: 'playwright',
          toolVersion: '1.56.0',
          adapterVersion: '0.1.0',
          commitOrFingerprint: '95e7160868275025e94ff0ff0d3a397785a92868',
          rawArtifactRef: '.forgegate/evidence/raw/playwright-report.json',
          report: {
            stats: {
              startTime: '2026-07-24T16:10:00.000Z',
              duration: 1200,
              expected: 8,
              skipped: 1,
              unexpected: 0,
              flaky: 0,
            },
            errors: [],
            suites: [],
          },
        },
      ],
    });
  });

  it.each([
    [{ unexpected: 1, expected: 7, skipped: 0, flaky: 0 }, 'failed'],
    [{ unexpected: 0, expected: 7, skipped: 0, flaky: 1 }, 'warning'],
    [{ unexpected: 0, expected: 0, skipped: 7, flaky: 0 }, 'skipped'],
  ] as const)('maps Playwright stats %o to %s', (stats, expectedStatus) => {
    const result = parseTestEvidenceFile(
      JSON.stringify({
        format: 'playwright-json',
        id: `playwright-${expectedStatus}`,
        componentVersionId: 'acme.button-library.acme-button@0.1.0',
        toolVersion: '1.56.0',
        commitOrFingerprint: '95e7160868275025e94ff0ff0d3a397785a92868',
        report: {
          stats: {
            startTime: '2026-07-24T16:10:00.000Z',
            duration: 100,
            ...stats,
          },
          errors: [],
        },
      }),
    );

    expect(result.executions[0]?.status).toBe(expectedStatus);
  });

  it('rejects Playwright reports without explicit ForgeGate provenance', () => {
    expect(() =>
      parseTestEvidenceFile(
        JSON.stringify({
          format: 'playwright-json',
          id: 'raw-playwright',
          toolVersion: '1.56.0',
          report: {
            stats: {
              startTime: '2026-07-24T16:10:00.000Z',
              duration: 100,
              expected: 1,
              skipped: 0,
              unexpected: 0,
              flaky: 0,
            },
          },
        }),
      ),
    ).toThrow('Playwright evidence requires componentVersionId');
  });

  it('normalizes an axe JSON report envelope into commit-bound evidence', () => {
    expect(
      parseTestEvidenceFile(
        JSON.stringify({
          format: 'axe-json',
          id: 'acme-button-axe',
          componentVersionId: 'acme.button-library.acme-button@0.1.0',
          toolVersion: '4.10.3',
          commitOrFingerprint: '95e7160868275025e94ff0ff0d3a397785a92868',
          rawArtifactRef: '.forgegate/evidence/raw/axe-results.json',
          report: {
            timestamp: '2026-07-24T16:20:00.000Z',
            testEngine: {
              name: 'axe-core',
              version: '4.10.3',
            },
            violations: [],
            incomplete: [],
            passes: [{ id: 'button-name', nodes: [] }],
            inapplicable: [],
          },
        }),
      ),
    ).toEqual({
      adapter: 'Axe JSON',
      executions: [
        {
          id: 'acme-button-axe',
          componentVersionId: 'acme.button-library.acme-button@0.1.0',
          gate: 'axe',
          tool: 'axe-core',
          toolVersion: '4.10.3',
          adapterVersion: '0.1.0',
          status: 'passed',
          startedAt: '2026-07-24T16:20:00.000Z',
          commitOrFingerprint: '95e7160868275025e94ff0ff0d3a397785a92868',
          rawArtifactRef: '.forgegate/evidence/raw/axe-results.json',
        },
      ],
      automatedArtifacts: [
        {
          kind: 'axe-json',
          id: 'acme-button-axe',
          componentVersionId: 'acme.button-library.acme-button@0.1.0',
          gate: 'axe',
          tool: 'axe-core',
          toolVersion: '4.10.3',
          adapterVersion: '0.1.0',
          commitOrFingerprint: '95e7160868275025e94ff0ff0d3a397785a92868',
          rawArtifactRef: '.forgegate/evidence/raw/axe-results.json',
          report: {
            timestamp: '2026-07-24T16:20:00.000Z',
            testEngine: {
              name: 'axe-core',
              version: '4.10.3',
            },
            violations: [],
            incomplete: [],
            passes: [{ id: 'button-name', nodes: [] }],
            inapplicable: [],
          },
        },
      ],
    });
  });

  it.each([
    [
      { violations: [{ id: 'color-contrast' }], incomplete: [], passes: [] },
      'failed',
    ],
    [
      { violations: [], incomplete: [{ id: 'aria-valid-attr' }], passes: [] },
      'warning',
    ],
    [{ violations: [], incomplete: [], passes: [] }, 'passed'],
  ] as const)(
    'maps axe result buckets %o to %s',
    (reportBuckets, expectedStatus) => {
      const result = parseTestEvidenceFile(
        JSON.stringify({
          format: 'axe-json',
          id: `axe-${expectedStatus}`,
          componentVersionId: 'acme.button-library.acme-button@0.1.0',
          toolVersion: '4.10.3',
          commitOrFingerprint: '95e7160868275025e94ff0ff0d3a397785a92868',
          report: {
            timestamp: '2026-07-24T16:20:00.000Z',
            ...reportBuckets,
          },
        }),
      );

      expect(result.executions[0]?.status).toBe(expectedStatus);
    },
  );

  it('rejects axe reports without explicit ForgeGate provenance', () => {
    expect(() =>
      parseTestEvidenceFile(
        JSON.stringify({
          format: 'axe-json',
          id: 'raw-axe',
          toolVersion: '4.10.3',
          report: {
            timestamp: '2026-07-24T16:20:00.000Z',
            violations: [],
            incomplete: [],
            passes: [],
          },
        }),
      ),
    ).toThrow('Axe evidence requires componentVersionId');
  });

  it('normalizes a Storybook interactions JSON report envelope into commit-bound evidence', () => {
    expect(
      parseTestEvidenceFile(
        JSON.stringify({
          format: 'storybook-interactions-json',
          id: 'acme-button-storybook-interactions',
          componentVersionId: 'acme.button-library.acme-button@0.1.0',
          toolVersion: '9.0.0',
          commitOrFingerprint: '95e7160868275025e94ff0ff0d3a397785a92868',
          rawArtifactRef: '.forgegate/evidence/raw/storybook-interactions.json',
          report: {
            startedAt: '2026-07-24T16:30:00.000Z',
            durationMs: 830,
            stories: [
              {
                id: 'button--primary',
                title: 'Button',
                name: 'Primary',
                status: 'passed',
              },
            ],
          },
        }),
      ),
    ).toEqual({
      adapter: 'Storybook interactions JSON',
      executions: [
        {
          id: 'acme-button-storybook-interactions',
          componentVersionId: 'acme.button-library.acme-button@0.1.0',
          gate: 'storybook-interaction',
          tool: 'storybook/test-runner',
          toolVersion: '9.0.0',
          adapterVersion: '0.1.0',
          status: 'passed',
          startedAt: '2026-07-24T16:30:00.000Z',
          durationMs: 830,
          commitOrFingerprint: '95e7160868275025e94ff0ff0d3a397785a92868',
          rawArtifactRef: '.forgegate/evidence/raw/storybook-interactions.json',
        },
      ],
      automatedArtifacts: [
        {
          kind: 'storybook-interactions-json',
          id: 'acme-button-storybook-interactions',
          componentVersionId: 'acme.button-library.acme-button@0.1.0',
          gate: 'storybook-interaction',
          tool: 'storybook/test-runner',
          toolVersion: '9.0.0',
          adapterVersion: '0.1.0',
          commitOrFingerprint: '95e7160868275025e94ff0ff0d3a397785a92868',
          rawArtifactRef: '.forgegate/evidence/raw/storybook-interactions.json',
          report: {
            startedAt: '2026-07-24T16:30:00.000Z',
            durationMs: 830,
            stories: [
              {
                id: 'button--primary',
                title: 'Button',
                name: 'Primary',
                status: 'passed',
              },
            ],
          },
        },
      ],
    });
  });

  it.each([
    [[{ status: 'passed' }, { status: 'failed' }], 'failed'],
    [[{ status: 'passed' }, { status: 'flaky' }], 'warning'],
    [[{ status: 'skipped' }, { status: 'pending' }], 'skipped'],
    [[{ status: 'success' }, { status: 'ok' }], 'passed'],
  ] as const)(
    'maps Storybook interaction story statuses %o to %s',
    (stories, expectedStatus) => {
      const result = parseTestEvidenceFile(
        JSON.stringify({
          format: 'storybook-interactions-json',
          id: `storybook-${expectedStatus}`,
          componentVersionId: 'acme.button-library.acme-button@0.1.0',
          toolVersion: '9.0.0',
          commitOrFingerprint: '95e7160868275025e94ff0ff0d3a397785a92868',
          report: {
            startedAt: '2026-07-24T16:30:00.000Z',
            stories,
          },
        }),
      );

      expect(result.executions[0]?.status).toBe(expectedStatus);
    },
  );

  it('rejects Storybook interaction reports without explicit ForgeGate provenance', () => {
    expect(() =>
      parseTestEvidenceFile(
        JSON.stringify({
          format: 'storybook-interactions-json',
          id: 'raw-storybook-interactions',
          toolVersion: '9.0.0',
          report: {
            startedAt: '2026-07-24T16:30:00.000Z',
            stories: [{ status: 'passed' }],
          },
        }),
      ),
    ).toThrow('Storybook evidence requires componentVersionId');
  });

  it('normalizes a Jest JSON report envelope into commit-bound evidence', () => {
    expect(
      parseTestEvidenceFile(
        JSON.stringify({
          format: 'jest-json',
          id: 'acme-button-jest',
          componentVersionId: 'acme.button-library.acme-button@0.1.0',
          toolVersion: '29.7.0',
          commitOrFingerprint: '95e7160868275025e94ff0ff0d3a397785a92868',
          rawArtifactRef: '.forgegate/evidence/raw/jest-results.json',
          report: {
            success: true,
            startTime: 1721838000000,
            numFailedTests: 0,
            numPassedTests: 3,
            numPendingTests: 0,
            testResults: [{ endTime: 1721838000420 }],
          },
        }),
      ),
    ).toEqual({
      adapter: 'Jest JSON',
      executions: [
        {
          id: 'acme-button-jest',
          componentVersionId: 'acme.button-library.acme-button@0.1.0',
          gate: 'unit',
          tool: 'jest',
          toolVersion: '29.7.0',
          adapterVersion: '0.1.0',
          status: 'passed',
          startedAt: '2024-07-24T16:20:00.000Z',
          durationMs: 420,
          commitOrFingerprint: '95e7160868275025e94ff0ff0d3a397785a92868',
          rawArtifactRef: '.forgegate/evidence/raw/jest-results.json',
        },
      ],
      automatedArtifacts: [
        {
          kind: 'jest-json',
          id: 'acme-button-jest',
          componentVersionId: 'acme.button-library.acme-button@0.1.0',
          gate: 'unit',
          tool: 'jest',
          toolVersion: '29.7.0',
          adapterVersion: '0.1.0',
          commitOrFingerprint: '95e7160868275025e94ff0ff0d3a397785a92868',
          rawArtifactRef: '.forgegate/evidence/raw/jest-results.json',
          report: {
            success: true,
            startTime: 1721838000000,
            numFailedTests: 0,
            numPassedTests: 3,
            numPendingTests: 0,
            testResults: [{ endTime: 1721838000420 }],
          },
        },
      ],
    });
  });

  it.each([
    [
      {
        numFailedTests: 1,
        numPassedTests: 2,
        numPendingTests: 0,
        success: false,
      },
      'failed',
    ],
    [
      {
        numFailedTests: 0,
        numPassedTests: 0,
        numPendingTests: 3,
        success: true,
      },
      'skipped',
    ],
    [
      {
        numFailedTests: 0,
        numPassedTests: 3,
        numPendingTests: 0,
        success: true,
      },
      'passed',
    ],
  ] as const)('maps Jest stats %o to %s', (stats, expectedStatus) => {
    const result = parseTestEvidenceFile(
      JSON.stringify({
        format: 'jest-json',
        id: `jest-${expectedStatus}`,
        componentVersionId: 'acme.button-library.acme-button@0.1.0',
        toolVersion: '29.7.0',
        commitOrFingerprint: '95e7160868275025e94ff0ff0d3a397785a92868',
        report: { startTime: 1721838000000, ...stats },
      }),
    );

    expect(result.executions[0]?.status).toBe(expectedStatus);
  });

  it('rejects Jest reports without explicit ForgeGate provenance', () => {
    expect(() =>
      parseTestEvidenceFile(
        JSON.stringify({
          format: 'jest-json',
          id: 'raw-jest',
          toolVersion: '29.7.0',
          report: {
            startTime: 1721838000000,
            success: true,
            numPassedTests: 1,
          },
        }),
      ),
    ).toThrow('Jest evidence requires componentVersionId');
  });

  it('normalizes a Vitest JSON report envelope into commit-bound evidence using the same Jest-compatible shape', () => {
    const result = parseTestEvidenceFile(
      JSON.stringify({
        format: 'vitest-json',
        id: 'acme-button-vitest',
        componentVersionId: 'acme.button-library.acme-button@0.1.0',
        gate: 'unit',
        toolVersion: '4.1.10',
        commitOrFingerprint: '95e7160868275025e94ff0ff0d3a397785a92868',
        report: {
          success: true,
          startTime: 1721838000000,
          numFailedTests: 0,
          numPassedTests: 5,
          numPendingTests: 0,
          testResults: [],
        },
      }),
    );

    expect(result.adapter).toBe('Vitest JSON');
    expect(result.executions[0]).toMatchObject({
      tool: 'vitest',
      status: 'passed',
    });
    expect(result.automatedArtifacts[0]?.kind).toBe('vitest-json');
  });

  it('rejects Vitest reports without explicit ForgeGate provenance', () => {
    expect(() =>
      parseTestEvidenceFile(
        JSON.stringify({
          format: 'vitest-json',
          id: 'raw-vitest',
          toolVersion: '4.1.10',
          report: {
            startTime: 1721838000000,
            success: true,
            numPassedTests: 1,
          },
        }),
      ),
    ).toThrow('Vitest evidence requires componentVersionId');
  });
});

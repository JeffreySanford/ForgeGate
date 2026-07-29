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
});

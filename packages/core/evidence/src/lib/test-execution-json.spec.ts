import { describe, expect, it } from 'vitest';
import { parseTestExecution } from './test-execution-json';

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

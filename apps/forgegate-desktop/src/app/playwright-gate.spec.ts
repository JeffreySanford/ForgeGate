import { describe, expect, it } from 'vitest';
import { createComponentManifest } from '@forgegate/core-manifest';
import {
  PLAYWRIGHT_COMMAND_MAPPING_KEY,
  PLAYWRIGHT_REPORT_PATH_MAPPING_KEY,
  buildPlaywrightGateExecution,
} from './playwright-gate';

function manifest() {
  return createComponentManifest({
    id: 'acme.button-library.acme-button',
    framework: 'web-components',
    adapter: 'framework.web-components',
    packagePath: 'packages/acme-button',
    componentVersion: '0.1.0',
  });
}

describe('playwright command mapping keys', () => {
  it('are distinct real config keys', () => {
    expect(PLAYWRIGHT_COMMAND_MAPPING_KEY).toBe('playwright');
    expect(PLAYWRIGHT_REPORT_PATH_MAPPING_KEY).toBe('playwrightReportPath');
    expect(PLAYWRIGHT_COMMAND_MAPPING_KEY).not.toBe(
      PLAYWRIGHT_REPORT_PATH_MAPPING_KEY,
    );
  });
});

describe('buildPlaywrightGateExecution', () => {
  it('reuses the real playwright-json envelope parser to derive a failed status from unexpected results', () => {
    const execution = buildPlaywrightGateExecution(
      manifest(),
      { stats: { unexpected: 1, expected: 3 } },
      '2026-01-01T00:00:00.000Z',
      'a'.repeat(40),
      '.forgegate/playwright-report.json',
      7300,
    );

    expect(execution.gate).toBe('interaction');
    expect(execution.tool).toBe('playwright');
    expect(execution.componentVersionId).toBe(
      'acme.button-library.acme-button@0.1.0',
    );
    expect(execution.status).toBe('failed');
    expect(execution.startedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(execution.commitOrFingerprint).toBe('a'.repeat(40));
    expect(execution.durationMs).toBe(7300);
    expect(execution.rawArtifactRef).toBe('.forgegate/playwright-report.json');
  });

  it('derives a passed status from a real report with only expected results', () => {
    const execution = buildPlaywrightGateExecution(
      manifest(),
      { stats: { expected: 5, unexpected: 0 } },
      '2026-01-01T00:00:00.000Z',
      'a'.repeat(40),
      null,
      null,
    );

    expect(execution.status).toBe('passed');
    expect(execution.rawArtifactRef).toBeUndefined();
    expect(execution.durationMs).toBeUndefined();
  });

  it('honestly reports toolVersion as unknown rather than guessing', () => {
    const execution = buildPlaywrightGateExecution(
      manifest(),
      { stats: {} },
      '2026-01-01T00:00:00.000Z',
      'a'.repeat(40),
      null,
      null,
    );

    expect(execution.toolVersion).toBe('unknown');
  });
});

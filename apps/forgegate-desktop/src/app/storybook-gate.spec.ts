import { describe, expect, it } from 'vitest';
import { createComponentManifest } from '@forgegate/core-manifest';
import {
  STORYBOOK_COMMAND_MAPPING_KEY,
  STORYBOOK_REPORT_PATH_MAPPING_KEY,
  buildStorybookGateExecution,
} from './storybook-gate';

function manifest() {
  return createComponentManifest({
    id: 'acme.button-library.acme-button',
    framework: 'web-components',
    adapter: 'framework.web-components',
    packagePath: 'packages/acme-button',
    componentVersion: '0.1.0',
  });
}

describe('storybook command mapping keys', () => {
  it('are distinct real config keys', () => {
    expect(STORYBOOK_COMMAND_MAPPING_KEY).toBe('storybookTest');
    expect(STORYBOOK_REPORT_PATH_MAPPING_KEY).toBe('storybookTestReportPath');
    expect(STORYBOOK_COMMAND_MAPPING_KEY).not.toBe(
      STORYBOOK_REPORT_PATH_MAPPING_KEY,
    );
  });
});

describe('buildStorybookGateExecution', () => {
  it('reuses the real storybook-interactions-json envelope parser to derive a failed status', () => {
    const execution = buildStorybookGateExecution(
      manifest(),
      { stories: [{ id: 'button--primary', status: 'failed' }] },
      '2026-01-01T00:00:00.000Z',
      'a'.repeat(40),
      '.forgegate/storybook-report.json',
      6100,
    );

    expect(execution.gate).toBe('storybook-interaction');
    expect(execution.tool).toBe('storybook/test-runner');
    expect(execution.componentVersionId).toBe(
      'acme.button-library.acme-button@0.1.0',
    );
    expect(execution.status).toBe('failed');
    expect(execution.startedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(execution.commitOrFingerprint).toBe('a'.repeat(40));
    expect(execution.durationMs).toBe(6100);
    expect(execution.rawArtifactRef).toBe('.forgegate/storybook-report.json');
  });

  it('derives a passed status from a real report with every story passing', () => {
    const execution = buildStorybookGateExecution(
      manifest(),
      { stories: [{ id: 'button--primary', status: 'passed' }] },
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
    const execution = buildStorybookGateExecution(
      manifest(),
      { stories: [] },
      '2026-01-01T00:00:00.000Z',
      'a'.repeat(40),
      null,
      null,
    );

    expect(execution.toolVersion).toBe('unknown');
  });
});

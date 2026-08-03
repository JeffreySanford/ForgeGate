import { describe, expect, it } from 'vitest';
import { createComponentManifest } from '@forgegate/core-manifest';
import {
  AXE_COMMAND_MAPPING_KEY,
  AXE_REPORT_PATH_MAPPING_KEY,
  buildAxeGateExecution,
} from './axe-gate';

function manifest() {
  return createComponentManifest({
    id: 'acme.button-library.acme-button',
    framework: 'web-components',
    adapter: 'framework.web-components',
    packagePath: 'packages/acme-button',
    componentVersion: '0.1.0',
  });
}

describe('axe command mapping keys', () => {
  it('are distinct real config keys', () => {
    expect(AXE_COMMAND_MAPPING_KEY).toBe('axe');
    expect(AXE_REPORT_PATH_MAPPING_KEY).toBe('axeReportPath');
    expect(AXE_COMMAND_MAPPING_KEY).not.toBe(AXE_REPORT_PATH_MAPPING_KEY);
  });
});

describe('buildAxeGateExecution', () => {
  it('reuses the real axe-json envelope parser to derive a failed status from violations', () => {
    const execution = buildAxeGateExecution(
      manifest(),
      {
        violations: [{ id: 'color-contrast' }],
        passes: [],
        incomplete: [],
        testEngine: { name: 'axe-core', version: '4.9.1' },
      },
      '2026-01-01T00:00:00.000Z',
      'a'.repeat(40),
      '.forgegate/axe-report.json',
      4200,
    );

    expect(execution.gate).toBe('axe');
    expect(execution.tool).toBe('axe-core');
    expect(execution.componentVersionId).toBe(
      'acme.button-library.acme-button@0.1.0',
    );
    expect(execution.status).toBe('failed');
    expect(execution.startedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(execution.commitOrFingerprint).toBe('a'.repeat(40));
    expect(execution.durationMs).toBe(4200);
    expect(execution.rawArtifactRef).toBe('.forgegate/axe-report.json');
  });

  it('derives a passed status from a real report with no violations or incomplete checks', () => {
    const execution = buildAxeGateExecution(
      manifest(),
      {
        violations: [],
        passes: [{ id: 'label' }],
        incomplete: [],
        testEngine: { name: 'axe-core', version: '4.9.1' },
      },
      '2026-01-01T00:00:00.000Z',
      'a'.repeat(40),
      null,
      null,
    );

    expect(execution.status).toBe('passed');
    expect(execution.rawArtifactRef).toBeUndefined();
    expect(execution.durationMs).toBeUndefined();
  });

  it('derives a warning status from incomplete checks without violations', () => {
    const execution = buildAxeGateExecution(
      manifest(),
      {
        violations: [],
        passes: [],
        incomplete: [{ id: 'color-contrast' }],
        testEngine: { name: 'axe-core', version: '4.9.1' },
      },
      '2026-01-01T00:00:00.000Z',
      'a'.repeat(40),
      null,
      null,
    );

    expect(execution.status).toBe('warning');
  });

  it('resolves toolVersion from report.testEngine.version, never guessing', () => {
    const execution = buildAxeGateExecution(
      manifest(),
      {
        violations: [],
        passes: [],
        incomplete: [],
        testEngine: { name: 'axe-core', version: '4.9.1' },
      },
      '2026-01-01T00:00:00.000Z',
      'a'.repeat(40),
      null,
      null,
    );

    expect(execution.toolVersion).toBe('4.9.1');
  });
});

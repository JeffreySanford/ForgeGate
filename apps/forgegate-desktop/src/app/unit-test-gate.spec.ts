import { describe, expect, it } from 'vitest';
import { createComponentManifest } from '@forgegate/core-manifest';
import {
  UNIT_TEST_GATE_ADAPTER_VERSION,
  buildUnitTestExecution,
  unitTestGateStatus,
} from './unit-test-gate';
import type { CommandResult, WorkspaceCommandPlan } from './workspace.service';

function manifest() {
  return createComponentManifest({
    id: 'acme.button-library.acme-button',
    framework: 'web-components',
    adapter: 'framework.web-components',
    packagePath: 'packages/acme-button',
    componentVersion: '0.1.0',
  });
}

const plan: WorkspaceCommandPlan = {
  command: 'npm',
  args: ['test'],
  commandText: 'npm test',
};

function result(overrides: Partial<CommandResult>): CommandResult {
  return {
    exitCode: 0,
    stdout: '',
    stderr: '',
    timedOut: false,
    cancelled: false,
    durationMs: 1234,
    artifactPath: null,
    ...overrides,
  };
}

describe('unitTestGateStatus', () => {
  it('reports passed for a real exit code of 0', () => {
    expect(unitTestGateStatus(result({ exitCode: 0 }))).toBe('passed');
  });

  it('reports failed for a real nonzero exit code', () => {
    expect(unitTestGateStatus(result({ exitCode: 1 }))).toBe('failed');
  });

  it('reports incomplete for a cancelled run, not failed', () => {
    expect(
      unitTestGateStatus(result({ exitCode: null, cancelled: true })),
    ).toBe('incomplete');
  });

  it('reports incomplete for a timed-out run, not failed', () => {
    expect(unitTestGateStatus(result({ exitCode: null, timedOut: true }))).toBe(
      'incomplete',
    );
  });
});

describe('buildUnitTestExecution', () => {
  it('builds a real TestExecution attributed to the exact component whose package ran', () => {
    const execution = buildUnitTestExecution(
      manifest(),
      plan,
      result({ exitCode: 0 }),
      '2026-01-01T00:00:00.000Z',
      'a'.repeat(40),
    );

    expect(execution.componentVersionId).toBe(
      'acme.button-library.acme-button@0.1.0',
    );
    expect(execution.gate).toBe('unit');
    expect(execution.tool).toBe('npm');
    expect(execution.toolVersion).toBe('unknown');
    expect(execution.adapterVersion).toBe(UNIT_TEST_GATE_ADAPTER_VERSION);
    expect(execution.status).toBe('passed');
    expect(execution.startedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(execution.durationMs).toBe(1234);
    expect(execution.commitOrFingerprint).toBe('a'.repeat(40));
  });

  it('honestly omits rawArtifactRef when no artifact was captured', () => {
    const execution = buildUnitTestExecution(
      manifest(),
      plan,
      result({ artifactPath: null }),
      '2026-01-01T00:00:00.000Z',
      'a'.repeat(40),
    );
    expect(execution.rawArtifactRef).toBeUndefined();
  });

  it('records a real captured artifact path when one exists', () => {
    const execution = buildUnitTestExecution(
      manifest(),
      plan,
      result({ artifactPath: '/tmp/forgegate/run-1.json' }),
      '2026-01-01T00:00:00.000Z',
      'a'.repeat(40),
    );
    expect(execution.rawArtifactRef).toBe('/tmp/forgegate/run-1.json');
  });

  it('records a real failed status without fabricating a passed result', () => {
    const execution = buildUnitTestExecution(
      manifest(),
      plan,
      result({ exitCode: 1 }),
      '2026-01-01T00:00:00.000Z',
      'a'.repeat(40),
    );
    expect(execution.status).toBe('failed');
  });
});

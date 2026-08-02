import { describe, expect, it } from 'vitest';
import { createComponentManifest } from '@forgegate/core-manifest';
import {
  PROCESS_GATE_ADAPTER_VERSION,
  PROCESS_GATE_DEFINITIONS,
  buildProcessGateExecution,
  processGateStatus,
} from './process-gate';
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
  args: ['run', 'lint'],
  commandText: 'npm run lint',
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

describe('PROCESS_GATE_DEFINITIONS', () => {
  it('defines unit, lint, and build with distinct real commandMappings keys', () => {
    const keys = PROCESS_GATE_DEFINITIONS.map((gate) => gate.commandMappingKey);
    expect(keys).toEqual(['unitTest', 'lint', 'build']);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('processGateStatus', () => {
  it('reports passed for a real exit code of 0', () => {
    expect(processGateStatus(result({ exitCode: 0 }))).toBe('passed');
  });

  it('reports failed for a real nonzero exit code', () => {
    expect(processGateStatus(result({ exitCode: 1 }))).toBe('failed');
  });

  it('reports incomplete for a cancelled run, not failed', () => {
    expect(processGateStatus(result({ exitCode: null, cancelled: true }))).toBe(
      'incomplete',
    );
  });

  it('reports incomplete for a timed-out run, not failed', () => {
    expect(processGateStatus(result({ exitCode: null, timedOut: true }))).toBe(
      'incomplete',
    );
  });
});

describe('buildProcessGateExecution', () => {
  it('builds a real TestExecution tagged with the exact gate that ran', () => {
    const execution = buildProcessGateExecution(
      'lint',
      manifest(),
      plan,
      result({ exitCode: 0 }),
      '2026-01-01T00:00:00.000Z',
      'a'.repeat(40),
    );

    expect(execution.gate).toBe('lint');
    expect(execution.componentVersionId).toBe(
      'acme.button-library.acme-button@0.1.0',
    );
    expect(execution.tool).toBe('npm');
    expect(execution.toolVersion).toBe('unknown');
    expect(execution.adapterVersion).toBe(PROCESS_GATE_ADAPTER_VERSION);
    expect(execution.status).toBe('passed');
    expect(execution.startedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(execution.durationMs).toBe(1234);
    expect(execution.commitOrFingerprint).toBe('a'.repeat(40));
  });

  it('gives unit, lint, and build distinct ids for the same component and instant', () => {
    const shared = manifest();
    const now = '2026-01-01T00:00:00.000Z';
    const commit = 'a'.repeat(40);
    const ids = (['unit', 'lint', 'build'] as const).map(
      (gate) =>
        buildProcessGateExecution(gate, shared, plan, result({}), now, commit)
          .id,
    );
    expect(new Set(ids).size).toBe(3);
  });

  it('honestly omits rawArtifactRef when no artifact was captured', () => {
    const execution = buildProcessGateExecution(
      'build',
      manifest(),
      plan,
      result({ artifactPath: null }),
      '2026-01-01T00:00:00.000Z',
      'a'.repeat(40),
    );
    expect(execution.rawArtifactRef).toBeUndefined();
  });

  it('records a real captured artifact path when one exists', () => {
    const execution = buildProcessGateExecution(
      'build',
      manifest(),
      plan,
      result({ artifactPath: '/tmp/forgegate/run-1.json' }),
      '2026-01-01T00:00:00.000Z',
      'a'.repeat(40),
    );
    expect(execution.rawArtifactRef).toBe('/tmp/forgegate/run-1.json');
  });

  it('records a real failed status without fabricating a passed result', () => {
    const execution = buildProcessGateExecution(
      'build',
      manifest(),
      plan,
      result({ exitCode: 1 }),
      '2026-01-01T00:00:00.000Z',
      'a'.repeat(40),
    );
    expect(execution.status).toBe('failed');
  });
});

import type { ResultStatus } from '@forgegate/core-domain';
import type { TestExecution } from '@forgegate/core-evidence';
import type { ComponentManifest } from '@forgegate/core-manifest';
import { componentVersionId } from './component-readiness';
import type { CommandResult, WorkspaceCommandPlan } from './workspace.service';

/**
 * P0.8-adjacent: ForgeGate actually running a target repository's own
 * configured `commandMappings.unitTest` command (`run_workspace_command`),
 * scoped to one component's own package directory
 * (`ComponentManifest.packagePath`) — not ingesting a `.forgegate/evidence/*.json`
 * file the repository already produced.
 *
 * Deliberately narrow: this reads only the real process exit code, not any
 * test-runner-specific report format, so it cannot report per-test detail —
 * only whether the configured command as a whole passed, failed, or didn't
 * finish. `toolVersion` is honestly recorded as `'unknown'` rather than
 * guessed, since nothing here parses tool-specific output to learn it.
 */
export const UNIT_TEST_GATE_ADAPTER_VERSION = '1.0.0';

export function unitTestGateStatus(result: CommandResult): ResultStatus {
  if (result.cancelled || result.timedOut) {
    return 'incomplete';
  }
  return result.exitCode === 0 ? 'passed' : 'failed';
}

export function buildUnitTestExecution(
  manifest: ComponentManifest,
  plan: WorkspaceCommandPlan,
  result: CommandResult,
  startedAt: string,
  commitOrFingerprint: string,
): TestExecution {
  return {
    id: `${manifest.id}-unit-test-${Date.now()}`,
    componentVersionId: componentVersionId(manifest),
    gate: 'unit',
    tool: plan.command,
    toolVersion: 'unknown',
    adapterVersion: UNIT_TEST_GATE_ADAPTER_VERSION,
    status: unitTestGateStatus(result),
    startedAt,
    durationMs: result.durationMs,
    commitOrFingerprint,
    ...(result.artifactPath ? { rawArtifactRef: result.artifactPath } : {}),
  };
}

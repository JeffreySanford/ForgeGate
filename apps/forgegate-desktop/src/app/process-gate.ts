import type { ResultStatus } from '@forgegate/core-domain';
import type { TestExecution } from '@forgegate/core-evidence';
import type { ComponentManifest } from '@forgegate/core-manifest';
import { componentVersionId } from './component-readiness';
import type { CommandResult, WorkspaceCommandPlan } from './workspace.service';

/**
 * P0.8-adjacent: ForgeGate actually running a target repository's own
 * configured command (`run_workspace_command`), scoped to one component's
 * own package directory (`ComponentManifest.packagePath`) — not ingesting a
 * `.forgegate/evidence/*.json` file the repository already produced.
 *
 * Deliberately narrow, for every gate defined here: only the real process
 * exit code is read, not any tool-specific report format, so none of these
 * can report per-test detail — only whether the configured command as a
 * whole passed, failed, or didn't finish. `toolVersion` is honestly
 * recorded as `'unknown'` rather than guessed. This is the right scope for
 * `unit`/`lint`/`build`, which are naturally pass/fail-by-exit-code with no
 * structured report ForgeGate would otherwise discard. It is deliberately
 * NOT extended to Storybook interaction tests, Playwright, or axe here —
 * unlike unit/lint/build, ForgeGate already has real structured-report
 * parsers for those tools on the *ingest* path (`playwright-json`,
 * `axe-json`, `storybook-interactions-json` envelopes in
 * `packages/core/evidence`), and reusing the exit-code-only shape for them
 * would silently throw that detail away. Running those gates for real needs
 * its own design (where the tool's structured report lands, and reusing
 * the existing envelope parsers to read it) — a real decision, not a
 * mechanical repeat of this file.
 */
export const PROCESS_GATE_ADAPTER_VERSION = '1.0.0';

export type ProcessGateId = 'unit' | 'lint' | 'build';

export interface ProcessGateDefinition {
  readonly id: ProcessGateId;
  readonly label: string;
  /** The `.forgegate/config.yaml` `commandMappings` key this gate reads. */
  readonly commandMappingKey: string;
  readonly timeoutSeconds: number;
}

export const PROCESS_GATE_DEFINITIONS: readonly ProcessGateDefinition[] = [
  {
    id: 'unit',
    label: 'Unit tests',
    commandMappingKey: 'unitTest',
    timeoutSeconds: 300,
  },
  {
    id: 'lint',
    label: 'Lint',
    commandMappingKey: 'lint',
    timeoutSeconds: 180,
  },
  {
    id: 'build',
    label: 'Build',
    commandMappingKey: 'build',
    timeoutSeconds: 600,
  },
];

export function processGateStatus(result: CommandResult): ResultStatus {
  if (result.cancelled || result.timedOut) {
    return 'incomplete';
  }
  return result.exitCode === 0 ? 'passed' : 'failed';
}

export function buildProcessGateExecution(
  gate: ProcessGateId,
  manifest: ComponentManifest,
  plan: WorkspaceCommandPlan,
  result: CommandResult,
  startedAt: string,
  commitOrFingerprint: string,
): TestExecution {
  return {
    id: `${manifest.id}-${gate}-${Date.now()}`,
    componentVersionId: componentVersionId(manifest),
    gate,
    tool: plan.command,
    toolVersion: 'unknown',
    adapterVersion: PROCESS_GATE_ADAPTER_VERSION,
    status: processGateStatus(result),
    startedAt,
    durationMs: result.durationMs,
    commitOrFingerprint,
    ...(result.artifactPath ? { rawArtifactRef: result.artifactPath } : {}),
  };
}

import type { ComponentManifest } from '@forgegate/core-manifest';
import {
  parseTestEvidenceFile,
  type TestExecution,
} from '@forgegate/core-evidence';
import { componentVersionId } from './component-readiness';

/**
 * The Storybook half of TODO.md's "Running Storybook/Playwright/axe for
 * real" plan, following the exact structure `axe-gate.ts` already proved:
 * run the workspace's own configured `storybookTest` command, then read the
 * JSON report it produces at `storybookTestReportPath` and hand it to the
 * existing `storybook-interactions-json` envelope parser
 * (`parseTestEvidenceFile`) rather than deriving status a second time.
 *
 * Unlike axe, a Storybook test-runner report does not self-report a tool
 * version the same way `report.testEngine.version` does, and this narrow
 * slice deliberately does not read the target package's installed version
 * from `package.json` (a real decision documented as still open in
 * TODO.md). `toolVersion` is honestly `'unknown'` here, the same fallback
 * `process-gate.ts` already uses for `unit`/`lint`/`build` — never guessed.
 */
export const STORYBOOK_GATE_TIMEOUT_SECONDS = 300;
export const STORYBOOK_COMMAND_MAPPING_KEY = 'storybookTest';
export const STORYBOOK_REPORT_PATH_MAPPING_KEY = 'storybookTestReportPath';
const STORYBOOK_GATE_TOOL_VERSION = 'unknown';

export function buildStorybookGateExecution(
  manifest: ComponentManifest,
  report: unknown,
  startedAt: string,
  commitOrFingerprint: string,
  rawArtifactRef: string | null,
  durationMs: number | null,
): TestExecution {
  const envelope = {
    format: 'storybook-interactions-json',
    id: `${manifest.id}-storybook-${Date.now()}`,
    componentVersionId: componentVersionId(manifest),
    gate: 'storybook-interaction',
    toolVersion: STORYBOOK_GATE_TOOL_VERSION,
    commitOrFingerprint,
    startedAt,
    report,
    ...(rawArtifactRef ? { rawArtifactRef } : {}),
    ...(durationMs === null ? {} : { durationMs }),
  };
  const parsed = parseTestEvidenceFile(JSON.stringify(envelope));
  const [execution] = parsed.executions;
  if (!execution) {
    throw new Error(
      'The Storybook interactions report did not produce a test execution.',
    );
  }
  return execution;
}

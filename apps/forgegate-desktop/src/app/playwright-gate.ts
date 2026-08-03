import type { ComponentManifest } from '@forgegate/core-manifest';
import {
  parseTestEvidenceFile,
  type TestExecution,
} from '@forgegate/core-evidence';
import { componentVersionId } from './component-readiness';

/**
 * The Playwright half of TODO.md's "Running Storybook/Playwright/axe for
 * real" plan, following the exact structure `axe-gate.ts` and
 * `storybook-gate.ts` already proved: run the workspace's own configured
 * `playwright` command, then read the JSON report it produces at
 * `playwrightReportPath` and hand it to the existing `playwright-json`
 * envelope parser (`parseTestEvidenceFile`) rather than deriving status a
 * second time.
 *
 * Like Storybook, a Playwright JSON report does not self-report a tool
 * version, and this narrow slice deliberately does not read the target
 * package's installed version from `package.json` (a real decision
 * documented as still open in TODO.md). `toolVersion` is honestly
 * `'unknown'` here, the same fallback `process-gate.ts` and
 * `storybook-gate.ts` already use — never guessed.
 */
export const PLAYWRIGHT_GATE_TIMEOUT_SECONDS = 300;
export const PLAYWRIGHT_COMMAND_MAPPING_KEY = 'playwright';
export const PLAYWRIGHT_REPORT_PATH_MAPPING_KEY = 'playwrightReportPath';
const PLAYWRIGHT_GATE_TOOL_VERSION = 'unknown';

export function buildPlaywrightGateExecution(
  manifest: ComponentManifest,
  report: unknown,
  startedAt: string,
  commitOrFingerprint: string,
  rawArtifactRef: string | null,
  durationMs: number | null,
): TestExecution {
  const envelope = {
    format: 'playwright-json',
    id: `${manifest.id}-playwright-${Date.now()}`,
    componentVersionId: componentVersionId(manifest),
    gate: 'interaction',
    toolVersion: PLAYWRIGHT_GATE_TOOL_VERSION,
    commitOrFingerprint,
    startedAt,
    report,
    ...(rawArtifactRef ? { rawArtifactRef } : {}),
    ...(durationMs === null ? {} : { durationMs }),
  };
  const parsed = parseTestEvidenceFile(JSON.stringify(envelope));
  const [execution] = parsed.executions;
  if (!execution) {
    throw new Error('The Playwright report did not produce a test execution.');
  }
  return execution;
}

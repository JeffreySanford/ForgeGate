import type { ComponentManifest } from '@forgegate/core-manifest';
import {
  parseTestEvidenceFile,
  type TestExecution,
} from '@forgegate/core-evidence';
import { componentVersionId } from './component-readiness';

/**
 * P2 MVP-hardening slice: actually running a target repository's own
 * configured `axe` command for real (`commandMappings.axe`), then reading
 * the JSON report it produces at `commandMappings.axeReportPath` — unlike
 * `process-gate.ts`'s `unit`/`lint`/`build` gates, this reuses the existing
 * `axe-json` envelope parser (`parseTestEvidenceFile`) so a "run" result
 * and an "imported" `.forgegate/evidence/*.json` result of the same tool
 * can never silently disagree on what counts as a pass. Deliberately built
 * first among Storybook/Playwright/axe per TODO.md's own plan: axe's report
 * is a single flat JSON document with no browser-orchestration nuance, and
 * its parser already has a real `toolVersion` fallback
 * (`report.testEngine.version`) so nothing here has to guess one.
 */
export const AXE_GATE_TIMEOUT_SECONDS = 180;
export const AXE_COMMAND_MAPPING_KEY = 'axe';
export const AXE_REPORT_PATH_MAPPING_KEY = 'axeReportPath';

/**
 * Wraps a raw `axe-core` JSON report (already parsed) into the same
 * envelope shape `parseTestEvidenceFile` accepts on the ingest path, then
 * hands it to that same parser rather than deriving status here a second
 * time.
 */
export function buildAxeGateExecution(
  manifest: ComponentManifest,
  report: unknown,
  startedAt: string,
  commitOrFingerprint: string,
  rawArtifactRef: string | null,
  durationMs: number | null,
): TestExecution {
  const envelope = {
    format: 'axe-json',
    id: `${manifest.id}-axe-${Date.now()}`,
    componentVersionId: componentVersionId(manifest),
    gate: 'axe',
    commitOrFingerprint,
    startedAt,
    report,
    ...(rawArtifactRef ? { rawArtifactRef } : {}),
    ...(durationMs === null ? {} : { durationMs }),
  };
  const parsed = parseTestEvidenceFile(JSON.stringify(envelope));
  const [execution] = parsed.executions;
  if (!execution) {
    throw new Error('The axe report did not produce a test execution.');
  }
  return execution;
}

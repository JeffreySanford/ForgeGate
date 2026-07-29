import { createValidator, describeErrors } from '@forgegate/core-domain';
import type { TestExecution } from './evidence';
import { testExecutionSchema } from './schemas';

const validate = createValidator<TestExecution>(testExecutionSchema);
const PLAYWRIGHT_ADAPTER_VERSION = '0.1.0';
const AXE_ADAPTER_VERSION = '0.1.0';

export interface ParsedTestEvidence {
  readonly adapter: 'ForgeGate test execution' | 'Playwright JSON' | 'Axe JSON';
  readonly executions: readonly TestExecution[];
  readonly automatedArtifacts: readonly AutomatedEvidenceArtifact[];
}

export interface AutomatedEvidenceArtifact {
  readonly kind: 'playwright-json' | 'axe-json';
  readonly id: string;
  readonly componentVersionId: string;
  readonly gate: string;
  readonly tool: 'playwright' | 'axe-core';
  readonly toolVersion: string;
  readonly adapterVersion: string;
  readonly commitOrFingerprint: string;
  readonly rawArtifactRef: string | null;
  readonly report: unknown;
}

/**
 * Parses a repository-owned `.forgegate/evidence/*.json` execution record.
 * Invalid evidence is rejected rather than allowed to influence readiness.
 */
export function parseTestExecution(jsonText: string): TestExecution {
  const parsed = parseJson(jsonText);

  if (!validate(parsed)) {
    throw new Error(
      `Test execution does not match the schema: ${describeErrors(validate)}`,
    );
  }

  return parsed;
}

/**
 * Parses one repository-owned evidence artifact. ForgeGate-native
 * `TestExecution` JSON yields one execution. A `playwright-json` or
 * `axe-json` envelope yields a normalized execution only when the
 * repository supplies the component version and commit/fingerprint that
 * native tool JSON does not carry itself.
 */
export function parseTestEvidenceFile(jsonText: string): ParsedTestEvidence {
  const parsed = parseJson(jsonText);

  if (validate(parsed)) {
    return {
      adapter: 'ForgeGate test execution',
      executions: [parsed],
      automatedArtifacts: [],
    };
  }

  if (isRecord(parsed) && parsed['format'] === 'playwright-json') {
    const normalized = normalizePlaywrightJsonEvidence(parsed);
    return {
      adapter: 'Playwright JSON',
      executions: [normalized.execution],
      automatedArtifacts: [normalized.artifact],
    };
  }

  if (isRecord(parsed) && parsed['format'] === 'axe-json') {
    const normalized = normalizeAxeJsonEvidence(parsed);
    return {
      adapter: 'Axe JSON',
      executions: [normalized.execution],
      automatedArtifacts: [normalized.artifact],
    };
  }

  throw new Error(
    `Test evidence does not match a supported schema: ${describeErrors(validate)}`,
  );
}

function parseJson(jsonText: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Test execution is not valid JSON: ${String(error)}`);
  }
  return parsed;
}

function normalizePlaywrightJsonEvidence(envelope: Record<string, unknown>): {
  readonly execution: TestExecution;
  readonly artifact: AutomatedEvidenceArtifact;
} {
  const report = requireRecord(envelope['report'], 'report', 'Playwright');
  const stats = requireRecord(report['stats'], 'report.stats', 'Playwright');
  const id = requireString(envelope['id'], 'id', 'Playwright');
  const componentVersionId = requireString(
    envelope['componentVersionId'],
    'componentVersionId',
    'Playwright',
  );
  const gate = readString(envelope['gate']) ?? 'interaction';
  const toolVersion = requireString(
    envelope['toolVersion'],
    'toolVersion',
    'Playwright',
  );
  const adapterVersion =
    readString(envelope['adapterVersion']) ?? PLAYWRIGHT_ADAPTER_VERSION;
  const commitOrFingerprint = requireString(
    envelope['commitOrFingerprint'],
    'commitOrFingerprint',
    'Playwright',
  );
  const startedAt =
    readString(envelope['startedAt']) ??
    readString(stats['startTime']) ??
    requireString(stats['startTime'], 'report.stats.startTime', 'Playwright');
  const durationMs =
    readNumber(envelope['durationMs']) ?? readNumber(stats['duration']);
  const rawArtifactRef = readString(envelope['rawArtifactRef']);

  const execution: TestExecution = {
    id,
    componentVersionId,
    gate,
    tool: 'playwright',
    toolVersion,
    adapterVersion,
    status: playwrightStatus(report, stats),
    startedAt,
    ...(durationMs === undefined ? {} : { durationMs }),
    commitOrFingerprint,
    ...(rawArtifactRef === undefined ? {} : { rawArtifactRef }),
  };

  if (!validate(execution)) {
    throw new Error(
      `Normalized Playwright evidence does not match the TestExecution schema: ${describeErrors(validate)}`,
    );
  }

  return {
    execution,
    artifact: {
      kind: 'playwright-json',
      id,
      componentVersionId,
      gate,
      tool: 'playwright',
      toolVersion,
      adapterVersion,
      commitOrFingerprint,
      rawArtifactRef: rawArtifactRef ?? null,
      report,
    },
  };
}

function normalizeAxeJsonEvidence(envelope: Record<string, unknown>): {
  readonly execution: TestExecution;
  readonly artifact: AutomatedEvidenceArtifact;
} {
  const report = requireRecord(envelope['report'], 'report', 'Axe');
  const id = requireString(envelope['id'], 'id', 'Axe');
  const componentVersionId = requireString(
    envelope['componentVersionId'],
    'componentVersionId',
    'Axe',
  );
  const gate = readString(envelope['gate']) ?? 'axe';
  const toolVersion =
    readString(envelope['toolVersion']) ??
    readAxeTestEngineVersion(report) ??
    requireString(envelope['toolVersion'], 'toolVersion', 'Axe');
  const adapterVersion =
    readString(envelope['adapterVersion']) ?? AXE_ADAPTER_VERSION;
  const commitOrFingerprint = requireString(
    envelope['commitOrFingerprint'],
    'commitOrFingerprint',
    'Axe',
  );
  const startedAt =
    readString(envelope['startedAt']) ??
    readString(report['timestamp']) ??
    requireString(report['timestamp'], 'report.timestamp', 'Axe');
  const durationMs = readNumber(envelope['durationMs']);
  const rawArtifactRef = readString(envelope['rawArtifactRef']);

  const execution: TestExecution = {
    id,
    componentVersionId,
    gate,
    tool: 'axe-core',
    toolVersion,
    adapterVersion,
    status: axeStatus(report),
    startedAt,
    ...(durationMs === undefined ? {} : { durationMs }),
    commitOrFingerprint,
    ...(rawArtifactRef === undefined ? {} : { rawArtifactRef }),
  };

  if (!validate(execution)) {
    throw new Error(
      `Normalized Axe evidence does not match the TestExecution schema: ${describeErrors(validate)}`,
    );
  }

  return {
    execution,
    artifact: {
      kind: 'axe-json',
      id,
      componentVersionId,
      gate,
      tool: 'axe-core',
      toolVersion,
      adapterVersion,
      commitOrFingerprint,
      rawArtifactRef: rawArtifactRef ?? null,
      report,
    },
  };
}

function playwrightStatus(
  report: Record<string, unknown>,
  stats: Record<string, unknown>,
): TestExecution['status'] {
  const unexpected = readNumber(stats['unexpected']) ?? 0;
  const interrupted = readNumber(stats['interrupted']) ?? 0;
  const flaky = readNumber(stats['flaky']) ?? 0;
  const expected = readNumber(stats['expected']) ?? 0;
  const skipped = readNumber(stats['skipped']) ?? 0;
  const errors = Array.isArray(report['errors']) ? report['errors'].length : 0;

  if (unexpected > 0 || interrupted > 0 || errors > 0) {
    return 'failed';
  }
  if (flaky > 0) {
    return 'warning';
  }
  if (expected === 0 && skipped > 0) {
    return 'skipped';
  }
  if (expected > 0) {
    return 'passed';
  }
  return 'unknown';
}

function axeStatus(report: Record<string, unknown>): TestExecution['status'] {
  const violations = readArray(report['violations']);
  const incomplete = readArray(report['incomplete']);
  const passes = readArray(report['passes']);

  if ((violations?.length ?? 0) > 0) {
    return 'failed';
  }
  if ((incomplete?.length ?? 0) > 0) {
    return 'warning';
  }
  if (violations !== undefined || passes !== undefined) {
    return 'passed';
  }
  return 'unknown';
}

function readAxeTestEngineVersion(
  report: Record<string, unknown>,
): string | undefined {
  const testEngine = report['testEngine'];
  if (!isRecord(testEngine)) {
    return undefined;
  }
  return readString(testEngine['version']);
}

function requireRecord(
  value: unknown,
  label: string,
  evidenceType: 'Playwright' | 'Axe',
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${evidenceType} evidence requires ${label}`);
  }
  return value;
}

function requireString(
  value: unknown,
  label: string,
  evidenceType: 'Playwright' | 'Axe',
): string {
  const result = readString(value);
  if (result === undefined) {
    throw new Error(`${evidenceType} evidence requires ${label}`);
  }
  return result;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function readArray(value: unknown): readonly unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

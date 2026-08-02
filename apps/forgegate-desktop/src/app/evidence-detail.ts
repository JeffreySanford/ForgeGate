import type { AutomatedEvidenceArtifact } from '@forgegate/core-evidence';

export interface AutomatedEvidenceDetailMetric {
  readonly label: string;
  readonly value: string | number;
}

export interface AutomatedEvidenceDetailObservation {
  readonly label: string;
  readonly detail: string;
  readonly severity?: string;
}

export interface AutomatedEvidenceDetail {
  readonly id: string;
  readonly sourceArtifactId: string;
  readonly kind: AutomatedEvidenceArtifact['kind'];
  readonly gate: string;
  readonly tool: string;
  readonly summary: string;
  readonly metrics: readonly AutomatedEvidenceDetailMetric[];
  readonly observations: readonly AutomatedEvidenceDetailObservation[];
  readonly limitations: readonly string[];
}

export function buildAutomatedEvidenceDetails(
  artifacts: readonly AutomatedEvidenceArtifact[],
): readonly AutomatedEvidenceDetail[] {
  return artifacts.map((artifact) => buildAutomatedEvidenceDetail(artifact));
}

export function buildAutomatedEvidenceDetail(
  artifact: AutomatedEvidenceArtifact,
): AutomatedEvidenceDetail {
  switch (artifact.kind) {
    case 'playwright-json':
      return buildPlaywrightDetail(artifact);
    case 'axe-json':
      return buildAxeDetail(artifact);
    case 'storybook-interactions-json':
      return buildStorybookInteractionsDetail(artifact);
    case 'jest-json':
    case 'vitest-json':
      return buildJestLikeDetail(artifact);
  }
}

function buildPlaywrightDetail(
  artifact: AutomatedEvidenceArtifact,
): AutomatedEvidenceDetail {
  const report = readRecord(artifact.report);
  const stats = report ? readRecord(report['stats']) : undefined;
  const unexpected = readNumber(stats?.['unexpected']) ?? 0;
  const interrupted = readNumber(stats?.['interrupted']) ?? 0;
  const flaky = readNumber(stats?.['flaky']) ?? 0;
  const expected = readNumber(stats?.['expected']) ?? 0;
  const skipped = readNumber(stats?.['skipped']) ?? 0;
  const duration = readNumber(stats?.['duration']);
  const errors = readArray(report?.['errors']) ?? [];
  const observations = [
    ...errors.slice(0, 5).map((error, index) => ({
      label: `Reporter error ${index + 1}`,
      detail: firstText(error) ?? 'Playwright reported an unnamed error.',
      severity: 'serious',
    })),
    ...collectPlaywrightFailures(report).slice(0, 5),
  ];

  return {
    id: `${artifact.id}-detail`,
    sourceArtifactId: artifact.id,
    kind: artifact.kind,
    gate: artifact.gate,
    tool: artifact.tool,
    summary:
      unexpected || interrupted
        ? 'Playwright reported failing or interrupted browser checks.'
        : flaky
          ? 'Playwright passed with flaky checks that need review.'
          : 'Playwright completed without failing checks in the parsed report.',
    metrics: compactMetrics([
      ['Expected checks', expected],
      ['Skipped checks', skipped],
      ['Unexpected checks', unexpected],
      ['Flaky checks', flaky],
      ['Interrupted checks', interrupted],
      ['Reporter errors', errors.length],
      ['Duration', duration === undefined ? undefined : formatMs(duration)],
    ]),
    observations,
    limitations: [
      'ForgeGate summarizes Playwright report stats and failure titles only; traces, screenshots, stdout, and attachments remain in the raw artifact or attachment plan.',
    ],
  };
}

function buildAxeDetail(
  artifact: AutomatedEvidenceArtifact,
): AutomatedEvidenceDetail {
  const report = readRecord(artifact.report);
  const violations = readArray(report?.['violations']) ?? [];
  const incomplete = readArray(report?.['incomplete']) ?? [];
  const passes = readArray(report?.['passes']) ?? [];
  const observations = [
    ...violations.slice(0, 5).map((violation) =>
      axeObservation(violation, 'Violation', 'serious'),
    ),
    ...incomplete.slice(0, 5).map((item) =>
      axeObservation(item, 'Incomplete check', 'moderate'),
    ),
  ];

  return {
    id: `${artifact.id}-detail`,
    sourceArtifactId: artifact.id,
    kind: artifact.kind,
    gate: artifact.gate,
    tool: artifact.tool,
    summary: violations.length
      ? 'Axe reported accessibility violations that require disposition.'
      : incomplete.length
        ? 'Axe found incomplete checks that require manual review.'
        : 'Axe completed without violations in the parsed report.',
    metrics: [
      { label: 'Violations', value: violations.length },
      { label: 'Incomplete checks', value: incomplete.length },
      { label: 'Passing checks', value: passes.length },
      { label: 'Affected nodes', value: countAxeNodes(violations) },
    ],
    observations,
    limitations: [
      'ForgeGate summarizes axe rule ids, impact, and affected-node counts only; node HTML and target selectors stay in the raw artifact to avoid noisy or sensitive report output.',
    ],
  };
}

function buildStorybookInteractionsDetail(
  artifact: AutomatedEvidenceArtifact,
): AutomatedEvidenceDetail {
  const report = readRecord(artifact.report);
  const stories =
    readArray(report?.['stories']) ??
    readArray(report?.['results']) ??
    readArray(report?.['tests']) ??
    [];
  const statusCounts = countStatuses(stories);
  const observations = stories
    .filter((story) => {
      const status = normalizeStatus(readString(readRecord(story)?.['status']));
      return status === 'failed' || status === 'warning';
    })
    .slice(0, 5)
    .map((story) => {
      const record = readRecord(story);
      const status = normalizeStatus(readString(record?.['status'])) ?? 'issue';
      return {
        label: readString(record?.['id']) ?? readString(record?.['name']) ?? status,
        detail:
          firstText(record?.['error']) ??
          readString(record?.['message']) ??
          readString(record?.['title']) ??
          'Storybook interaction returned a non-passing status.',
        severity: status === 'failed' ? 'serious' : 'moderate',
      };
    });

  return {
    id: `${artifact.id}-detail`,
    sourceArtifactId: artifact.id,
    kind: artifact.kind,
    gate: artifact.gate,
    tool: artifact.tool,
    summary: statusCounts.failed
      ? 'Storybook interactions include failed stories.'
      : statusCounts.warning
        ? 'Storybook interactions include warnings or flaky stories.'
        : 'Storybook interactions completed without failing stories in the parsed report.',
    metrics: [
      { label: 'Stories', value: stories.length },
      { label: 'Passed', value: statusCounts.passed },
      { label: 'Failed', value: statusCounts.failed },
      { label: 'Warnings', value: statusCounts.warning },
      { label: 'Skipped', value: statusCounts.skipped },
      { label: 'Unknown', value: statusCounts.unknown },
    ],
    observations,
    limitations: [
      'ForgeGate summarizes Storybook story ids and statuses only; browser logs and rendered DOM details remain in the raw artifact.',
    ],
  };
}

function buildJestLikeDetail(
  artifact: AutomatedEvidenceArtifact,
): AutomatedEvidenceDetail {
  const report = readRecord(artifact.report);
  const failed = readNumber(report?.['numFailedTests']) ?? 0;
  const passed = readNumber(report?.['numPassedTests']) ?? 0;
  const pending = readNumber(report?.['numPendingTests']) ?? 0;
  const failedSuites = readNumber(report?.['numFailedTestSuites']) ?? 0;
  const passedSuites = readNumber(report?.['numPassedTestSuites']) ?? 0;
  const testResults = readArray(report?.['testResults']) ?? [];
  const observations = collectJestFailures(testResults).slice(0, 5);

  return {
    id: `${artifact.id}-detail`,
    sourceArtifactId: artifact.id,
    kind: artifact.kind,
    gate: artifact.gate,
    tool: artifact.tool,
    summary: failed || failedSuites
      ? `${artifact.tool} reported failing unit tests.`
      : `${artifact.tool} completed without failing unit tests in the parsed report.`,
    metrics: compactMetrics([
      ['Passed tests', passed],
      ['Failed tests', failed],
      ['Pending tests', pending],
      ['Passed suites', passedSuites],
      ['Failed suites', failedSuites],
      ['Success flag', readBoolean(report?.['success'])],
    ]),
    observations,
    limitations: [
      'ForgeGate summarizes Jest/Vitest suite and assertion status only; snapshots, console output, coverage payloads, and stack traces remain in the raw artifact.',
    ],
  };
}

function collectPlaywrightFailures(
  report: Record<string, unknown> | undefined,
): AutomatedEvidenceDetailObservation[] {
  const observations: AutomatedEvidenceDetailObservation[] = [];
  const visitSuite = (suite: unknown, parentTitle: string): void => {
    const suiteRecord = readRecord(suite);
    if (!suiteRecord) {
      return;
    }
    const suiteTitle = joinTitle(parentTitle, readString(suiteRecord['title']));
    for (const spec of readArray(suiteRecord['specs']) ?? []) {
      const specRecord = readRecord(spec);
      const specTitle = joinTitle(suiteTitle, readString(specRecord?.['title']));
      for (const test of readArray(specRecord?.['tests']) ?? []) {
        const testRecord = readRecord(test);
        for (const result of readArray(testRecord?.['results']) ?? []) {
          const resultRecord = readRecord(result);
          const status = readString(resultRecord?.['status']);
          if (
            status === 'failed' ||
            status === 'timedOut' ||
            status === 'interrupted'
          ) {
            observations.push({
              label: specTitle || 'Unnamed Playwright check',
              detail:
                firstText(resultRecord?.['error']) ??
                `Playwright result status: ${status}.`,
              severity: 'serious',
            });
          }
        }
      }
    }
    for (const child of readArray(suiteRecord['suites']) ?? []) {
      visitSuite(child, suiteTitle);
    }
  };
  for (const suite of readArray(report?.['suites']) ?? []) {
    visitSuite(suite, '');
  }
  return observations;
}

function collectJestFailures(
  testResults: readonly unknown[],
): AutomatedEvidenceDetailObservation[] {
  return testResults.flatMap((suite) => {
    const suiteRecord = readRecord(suite);
    const suiteName = readString(suiteRecord?.['name']) ?? 'Unnamed test suite';
    return (readArray(suiteRecord?.['assertionResults']) ?? [])
      .filter((assertion) => readRecord(assertion)?.['status'] === 'failed')
      .map((assertion) => {
        const assertionRecord = readRecord(assertion);
        return {
          label:
            readString(assertionRecord?.['fullName']) ??
            readString(assertionRecord?.['title']) ??
            suiteName,
          detail:
            firstFailureMessage(assertionRecord?.['failureMessages']) ??
            'Unit test assertion failed.',
          severity: 'serious',
        };
      });
  });
}

function axeObservation(
  value: unknown,
  labelPrefix: string,
  severity: string,
): AutomatedEvidenceDetailObservation {
  const record = readRecord(value);
  const id = readString(record?.['id']) ?? 'unnamed-rule';
  const impact = readString(record?.['impact']);
  const nodes = readArray(record?.['nodes']) ?? [];
  const help =
    readString(record?.['help']) ??
    readString(record?.['description']) ??
    'No axe rule description was provided.';
  return {
    label: `${labelPrefix}: ${id}`,
    detail: `${help} (${nodes.length} affected node${nodes.length === 1 ? '' : 's'}).`,
    ...(impact ? { severity: impact } : { severity }),
  };
}

function countStatuses(items: readonly unknown[]): {
  readonly passed: number;
  readonly failed: number;
  readonly warning: number;
  readonly skipped: number;
  readonly unknown: number;
} {
  return items.reduce<{
    passed: number;
    failed: number;
    warning: number;
    skipped: number;
    unknown: number;
  }>(
    (counts, item) => {
      const status =
        normalizeStatus(readString(readRecord(item)?.['status'])) ?? 'unknown';
      return { ...counts, [status]: counts[status] + 1 };
    },
    { passed: 0, failed: 0, warning: 0, skipped: 0, unknown: 0 },
  );
}

function normalizeStatus(
  status: string | undefined,
): 'passed' | 'failed' | 'warning' | 'skipped' | 'unknown' | undefined {
  switch (status?.toLowerCase()) {
    case 'passed':
    case 'pass':
    case 'success':
    case 'ok':
      return 'passed';
    case 'failed':
    case 'fail':
    case 'error':
    case 'timedout':
    case 'timed-out':
      return 'failed';
    case 'warning':
    case 'warn':
    case 'flaky':
      return 'warning';
    case 'skipped':
    case 'skip':
    case 'pending':
      return 'skipped';
    case 'unknown':
      return 'unknown';
    default:
      return undefined;
  }
}

function countAxeNodes(items: readonly unknown[]): number {
  return items.reduce<number>(
    (total, item) =>
      total + (readArray(readRecord(item)?.['nodes'])?.length ?? 0),
    0,
  );
}

function compactMetrics(
  entries: readonly (readonly [
    string,
    string | number | boolean | undefined,
  ])[],
): AutomatedEvidenceDetailMetric[] {
  return entries
    .filter((entry): entry is readonly [string, string | number | boolean] =>
      entry[1] !== undefined,
    )
    .map(([label, value]) => ({
      label,
      value: typeof value === 'boolean' ? String(value) : value,
    }));
}

function formatMs(value: number): string {
  return `${value} ms`;
}

function joinTitle(parent: string, child: string | undefined): string {
  if (!child) {
    return parent;
  }
  return parent ? `${parent} / ${child}` : child;
}

function firstText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return firstLine(value);
  }
  const record = readRecord(value);
  return (
    firstLine(readString(record?.['message'])) ??
    firstLine(readString(record?.['value'])) ??
    firstLine(readString(record?.['stack']))
  );
}

function firstFailureMessage(value: unknown): string | undefined {
  const messages = readArray(value);
  if (!messages?.length) {
    return undefined;
  }
  return firstText(messages[0]);
}

function firstLine(value: string | undefined): string | undefined {
  const line = value?.split(/\r?\n/).find((part) => part.trim().length > 0);
  return line?.trim();
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readArray(value: unknown): readonly unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

import { createComponentManifest } from '@forgegate/core-manifest';
import type {
  AutomatedEvidenceArtifact,
  Exception,
  ManualReview,
  TestExecution,
} from '@forgegate/core-evidence';
import {
  buildEvidenceExport,
  componentVersionId,
  findingsFromBlockingReasons,
  type EvidenceExportResult,
} from './evidence-export';

function requireFile(result: EvidenceExportResult, name: string): string {
  const content = result.files[name];
  if (content === undefined) {
    throw new Error(`Expected exported file "${name}" to exist`);
  }
  return content;
}

function execution(overrides: Partial<TestExecution>): TestExecution {
  return {
    id: 'id',
    componentVersionId: 'component-version',
    gate: 'unit',
    tool: 'vitest',
    toolVersion: '4.1.10',
    adapterVersion: '1.0.0',
    status: 'passed',
    startedAt: '2026-01-01T00:00:00.000Z',
    commitOrFingerprint: 'a'.repeat(40),
    ...overrides,
  };
}

function manualReview(overrides: Partial<ManualReview>): ManualReview {
  return {
    id: 'acme-button-keyboard-review',
    componentVersionId: 'acme.lib.button@1.0.0',
    procedureId: 'keyboard-and-screen-reader-review',
    procedureVersion: '1.0.0',
    reviewerIdentity: 'reviewer@example.com',
    date: '2026-01-01T00:00:00.000Z',
    operatingSystem: 'macOS 15',
    status: 'passed',
    commitOrFingerprint: 'a'.repeat(40),
    ...overrides,
  };
}

function exception(overrides: Partial<Exception>): Exception {
  return {
    id: 'acme-button-token-exception',
    findingId: 'acme.lib.button-blocking-0',
    approvedBy: 'lead-reviewer@example.com',
    approvedAt: '2026-01-01T00:00:00.000Z',
    rationale: 'Risk accepted until next sprint.',
    ...overrides,
  };
}

function playwrightArtifact(
  overrides: Partial<AutomatedEvidenceArtifact>,
): AutomatedEvidenceArtifact {
  return {
    kind: 'playwright-json',
    id: 'playwright-run-1',
    componentVersionId: 'acme.lib.button@1.0.0',
    gate: 'interaction',
    tool: 'playwright',
    toolVersion: '1.56.0',
    adapterVersion: '0.1.0',
    commitOrFingerprint: 'a'.repeat(40),
    rawArtifactRef: '.forgegate/evidence/raw/playwright-report.json',
    report: {
      stats: {
        startTime: '2026-01-01T00:00:00.000Z',
        duration: 1000,
        expected: 3,
        skipped: 0,
        unexpected: 0,
        flaky: 0,
      },
      errors: [],
      suites: [],
    },
    ...overrides,
  };
}

function axeArtifact(
  overrides: Partial<AutomatedEvidenceArtifact>,
): AutomatedEvidenceArtifact {
  return {
    kind: 'axe-json',
    id: 'axe-run-1',
    componentVersionId: 'acme.lib.button@1.0.0',
    gate: 'axe',
    tool: 'axe-core',
    toolVersion: '4.10.3',
    adapterVersion: '0.1.0',
    commitOrFingerprint: 'a'.repeat(40),
    rawArtifactRef: '.forgegate/evidence/raw/axe-results.json',
    report: {
      timestamp: '2026-01-01T00:00:00.000Z',
      violations: [],
      incomplete: [],
      passes: [{ id: 'button-name', nodes: [] }],
    },
    ...overrides,
  };
}

function storybookInteractionArtifact(
  overrides: Partial<AutomatedEvidenceArtifact>,
): AutomatedEvidenceArtifact {
  return {
    kind: 'storybook-interactions-json',
    id: 'storybook-interactions-run-1',
    componentVersionId: 'acme.lib.button@1.0.0',
    gate: 'storybook-interaction',
    tool: 'storybook/test-runner',
    toolVersion: '9.0.0',
    adapterVersion: '0.1.0',
    commitOrFingerprint: 'a'.repeat(40),
    rawArtifactRef: '.forgegate/evidence/raw/storybook-interactions.json',
    report: {
      startedAt: '2026-01-01T00:00:00.000Z',
      stories: [{ id: 'button--primary', status: 'passed' }],
    },
    ...overrides,
  };
}

describe('componentVersionId', () => {
  it('combines id and componentVersion when a version is known', () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
    });
    expect(componentVersionId(manifest)).toBe('acme.lib.button@1.0.0');
  });

  it('falls back to the bare id when no version is known', () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
    });
    expect(componentVersionId(manifest)).toBe('acme.lib.button');
  });
});

describe('findingsFromBlockingReasons', () => {
  it('returns an empty list for no blocking reasons', () => {
    expect(findingsFromBlockingReasons('acme.lib.button', [])).toEqual([]);
  });

  it('creates one real, open Finding per blocking reason with a stable, unique id', () => {
    const findings = findingsFromBlockingReasons('acme.lib.button', [
      'No required states declared',
      'No token mappings connected',
    ]);

    expect(findings).toEqual([
      {
        id: 'acme.lib.button-blocking-0',
        componentId: 'acme.lib.button',
        description: 'No required states declared',
        severity: 'minor',
        status: 'open',
      },
      {
        id: 'acme.lib.button-blocking-1',
        componentId: 'acme.lib.button',
        description: 'No token mappings connected',
        severity: 'minor',
        status: 'open',
      },
    ]);
  });

  it('classifies a confirmed automated-evidence failure as serious', () => {
    const [finding] = findingsFromBlockingReasons('acme.lib.button', [
      'Automated evidence contains a failed or blocked result',
    ]);
    expect(finding?.severity).toBe('serious');
  });

  it('classifies stale automated evidence as moderate', () => {
    const [finding] = findingsFromBlockingReasons('acme.lib.button', [
      'Automated evidence is stale',
    ]);
    expect(finding?.severity).toBe('moderate');
  });

  it('classifies every other incompleteness gap as minor', () => {
    const [finding] = findingsFromBlockingReasons('acme.lib.button', [
      'No manual review recorded',
    ]);
    expect(finding?.severity).toBe('minor');
  });
});

describe('buildEvidenceExport', () => {
  it('includes only the sections ForgeGate has real data for, and explains every excluded one', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
    });

    const result = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [],
      starlightProjects: [],
    });

    expect(Object.keys(result.files).sort()).toEqual([
      'checksums.sha256',
      'documentation-status.json',
      'manifest.json',
      'report.html',
      'test-summary.json',
    ]);

    const manifestJson = JSON.parse(requireFile(result, 'manifest.json'));
    expect(manifestJson.componentId).toBe('acme.lib.button');
    expect(manifestJson.componentVersionId).toBe('acme.lib.button@1.0.0');
    expect(manifestJson.includesCredentials).toBe(false);
    expect(Object.keys(manifestJson.excludes).sort()).toEqual([
      'attachments/',
      'automated/',
      'exceptions/',
      'manual/',
      'policy-snapshot.json',
      'release-decision.json',
    ]);
    // No policy authored on this fixture, so the exclusion explains itself.
    expect(manifestJson.excludes['release-decision.json']).toContain(
      'No policy is authored',
    );
  });

  it('records the real repository commit, and reports its absence honestly', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
    });

    const withCommit = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [],
      starlightProjects: [],
      repositoryCommit: 'a'.repeat(40),
    });
    expect(
      JSON.parse(requireFile(withCommit, 'manifest.json')).repositoryCommit,
    ).toBe('a'.repeat(40));
    expect(requireFile(withCommit, 'report.html')).toContain('a'.repeat(40));

    const withoutCommit = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [],
      starlightProjects: [],
    });
    expect(
      JSON.parse(requireFile(withoutCommit, 'manifest.json')).repositoryCommit,
    ).toBeNull();
    expect(requireFile(withoutCommit, 'report.html')).toContain(
      'no Git status for this workspace',
    );
  });

  it('renders a real report.html covering connected sections and naming the unconnected ones', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
      documentationTargets: [
        {
          adapter: 'starlight',
          pathOrPageId: 'docs/button',
          publishedVersion: '1.0.0',
        },
      ],
    });

    const result = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [
        execution({ gate: 'a11y', tool: 'axe-core', status: 'passed' }),
      ],
      starlightProjects: ['docs'],
      blockingReasons: ['No manual review recorded'],
    });

    const report = requireFile(result, 'report.html');
    expect(report).toContain('<!doctype html>');
    expect(report).toContain('acme.lib.button@1.0.0');
    expect(report).toContain('a11y');
    expect(report).toContain('axe-core');
    expect(report).toContain('No manual review recorded');
    expect(report).toContain('docs/button');
    // Every documented-but-unconnected section is named in the report,
    // not silently dropped.
    expect(report).toContain('policy-snapshot.json');
    expect(report).toContain('release-decision.json');
    expect(report).toContain('exceptions/');
  });

  it('exports a fully real blocked release decision, with no approver involved', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
      policyId: 'acme.baseline',
      policyVersion: '2.1.0',
    });

    const result = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [],
      starlightProjects: [],
      blockingReasons: ['No token mappings connected'],
      repositoryCommit: 'a'.repeat(40),
    });

    const decision = JSON.parse(requireFile(result, 'release-decision.json'));
    expect(decision.outcome).toBe('blocked');
    expect(decision.approver).toBeUndefined();
    expect(decision.notRealApproval).toBeUndefined();
    expect(decision.policyVersion).toBe('2.1.0');

    const manifestJson = JSON.parse(requireFile(result, 'manifest.json'));
    expect(manifestJson.notRealApproval).toBeUndefined();
    expect(Object.keys(manifestJson.excludes)).not.toContain(
      'release-decision.json',
    );
    expect(requireFile(result, 'report.html')).not.toContain(
      'NOT A REAL APPROVAL',
    );
  });

  it('marks a test-harness approval unmistakably in the decision, the manifest, and the report', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
      policyId: 'acme.baseline',
      policyVersion: '2.1.0',
    });

    const result = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [],
      starlightProjects: [],
      blockingReasons: [],
      repositoryCommit: 'a'.repeat(40),
      approver: { identity: 'e2e-harness', provenance: 'test-harness' },
    });

    const decision = JSON.parse(requireFile(result, 'release-decision.json'));
    expect(decision.outcome).toBe('authorized-candidate');
    expect(decision.approver).toBe('e2e-harness');
    // The marker travels with the file itself, not only the manifest.
    expect(decision.notRealApproval).toBe(true);

    const manifestJson = JSON.parse(requireFile(result, 'manifest.json'));
    expect(manifestJson.notRealApproval).toBe(true);
    expect(manifestJson.notRealApprovalWarning).toContain(
      'must not be treated as a real approval',
    );

    const report = requireFile(result, 'report.html');
    expect(report).toContain('NOT A REAL APPROVAL');
    expect(report).toContain('TEST HARNESS');
  });

  it('does not mark a real human approval as not-real', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
      policyId: 'acme.baseline',
      policyVersion: '2.1.0',
    });

    const result = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [],
      starlightProjects: [],
      blockingReasons: [],
      repositoryCommit: 'a'.repeat(40),
      approver: { identity: 'lead@example.com', provenance: 'human' },
    });

    const decision = JSON.parse(requireFile(result, 'release-decision.json'));
    expect(decision.outcome).toBe('authorized-candidate');
    expect(decision.approver).toBe('lead@example.com');
    expect(decision.notRealApproval).toBeUndefined();
    expect(requireFile(result, 'report.html')).not.toContain(
      'NOT A REAL APPROVAL',
    );
  });

  it('escapes untrusted repository-derived text rather than injecting it into the report as markup', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
    });

    const result = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [],
      starlightProjects: [],
      blockingReasons: ['<script>alert("xss")</script>'],
    });

    const report = requireFile(result, 'report.html');
    expect(report).not.toContain('<script>alert');
    expect(report).toContain(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });

  it('names the export directory after the real component version id', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
    });

    const result = await buildEvidenceExport({
      id: '42',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [],
      starlightProjects: [],
    });

    expect(result.directoryName).toBe('acme.lib.button-1.0.0-evidence-42');
  });

  it('writes real test executions into test-summary.json', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
    });
    const executions = [
      execution({ id: 'run-1', gate: 'unit', status: 'passed' }),
    ];

    const result = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: executions,
      starlightProjects: [],
    });

    const testSummary = JSON.parse(requireFile(result, 'test-summary.json'));
    expect(testSummary).toEqual(executions);
  });

  it('writes imported Playwright reports as a first-class automated artifact when raw evidence is preserved', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
    });
    const artifacts = [
      playwrightArtifact({ id: 'matching-playwright' }),
      playwrightArtifact({
        id: 'other-component-playwright',
        componentVersionId: 'acme.lib.card@1.0.0',
      }),
    ];

    const result = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [],
      automatedArtifacts: artifacts,
      starlightProjects: [],
    });

    expect(Object.keys(result.files)).toContain(
      'automated/playwright-results.json',
    );
    const playwrightResults = JSON.parse(
      requireFile(result, 'automated/playwright-results.json'),
    );
    expect(playwrightResults).toHaveLength(1);
    expect(playwrightResults[0]).toMatchObject({
      kind: 'playwright-json',
      id: 'matching-playwright',
      componentVersionId: 'acme.lib.button@1.0.0',
      report: {
        stats: {
          expected: 3,
        },
      },
    });

    const manifestJson = JSON.parse(requireFile(result, 'manifest.json'));
    expect(manifestJson.contents).toContain(
      'automated/playwright-results.json',
    );
    expect(manifestJson.checksums).toHaveProperty(
      'automated/playwright-results.json',
    );
    expect(Object.keys(manifestJson.excludes)).not.toContain('automated/');
    expect(manifestJson.excludes).toMatchObject({
      'automated/axe-results.json':
        'No axe-native result artifact is connected for this component yet.',
      'automated/interaction-results.json':
        'No Storybook interaction result artifact is connected for this component yet.',
    });
  });

  it('writes imported axe reports as a first-class automated artifact when raw evidence is preserved', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
    });
    const artifacts = [
      axeArtifact({ id: 'matching-axe' }),
      axeArtifact({
        id: 'other-component-axe',
        componentVersionId: 'acme.lib.card@1.0.0',
      }),
    ];

    const result = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [],
      automatedArtifacts: artifacts,
      starlightProjects: [],
    });

    expect(Object.keys(result.files)).toContain('automated/axe-results.json');
    const axeResults = JSON.parse(
      requireFile(result, 'automated/axe-results.json'),
    );
    expect(axeResults).toHaveLength(1);
    expect(axeResults[0]).toMatchObject({
      kind: 'axe-json',
      id: 'matching-axe',
      componentVersionId: 'acme.lib.button@1.0.0',
      report: {
        passes: [{ id: 'button-name' }],
      },
    });

    const manifestJson = JSON.parse(requireFile(result, 'manifest.json'));
    expect(manifestJson.contents).toContain('automated/axe-results.json');
    expect(manifestJson.checksums).toHaveProperty('automated/axe-results.json');
    expect(Object.keys(manifestJson.excludes)).not.toContain('automated/');
    expect(manifestJson.excludes).toMatchObject({
      'automated/playwright-results.json':
        'No Playwright result artifact is connected for this component yet.',
      'automated/interaction-results.json':
        'No Storybook interaction result artifact is connected for this component yet.',
    });
  });

  it('writes imported Storybook interaction reports as a first-class automated artifact when raw evidence is preserved', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
    });
    const artifacts = [
      storybookInteractionArtifact({ id: 'matching-storybook-interactions' }),
      storybookInteractionArtifact({
        id: 'other-component-storybook-interactions',
        componentVersionId: 'acme.lib.card@1.0.0',
      }),
    ];

    const result = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [],
      automatedArtifacts: artifacts,
      starlightProjects: [],
    });

    expect(Object.keys(result.files)).toContain(
      'automated/interaction-results.json',
    );
    const interactionResults = JSON.parse(
      requireFile(result, 'automated/interaction-results.json'),
    );
    expect(interactionResults).toHaveLength(1);
    expect(interactionResults[0]).toMatchObject({
      kind: 'storybook-interactions-json',
      id: 'matching-storybook-interactions',
      componentVersionId: 'acme.lib.button@1.0.0',
      report: {
        stories: [{ id: 'button--primary', status: 'passed' }],
      },
    });

    const manifestJson = JSON.parse(requireFile(result, 'manifest.json'));
    expect(manifestJson.contents).toContain(
      'automated/interaction-results.json',
    );
    expect(manifestJson.checksums).toHaveProperty(
      'automated/interaction-results.json',
    );
    expect(Object.keys(manifestJson.excludes)).not.toContain('automated/');
    expect(manifestJson.excludes).toMatchObject({
      'automated/axe-results.json':
        'No axe-native result artifact is connected for this component yet.',
      'automated/playwright-results.json':
        'No Playwright result artifact is connected for this component yet.',
    });
  });

  it('writes one real manual/<id>.json file per connected manual review, scoped to this component version', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
    });
    const reviews = [
      manualReview({ id: 'acme-button-keyboard-review' }),
      manualReview({
        id: 'other-component-review',
        componentVersionId: 'acme.lib.card@1.0.0',
      }),
    ];

    const result = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [],
      manualReviews: reviews,
      starlightProjects: [],
    });

    expect(Object.keys(result.files)).toContain(
      'manual/acme-button-keyboard-review.json',
    );
    expect(Object.keys(result.files)).not.toContain(
      'manual/other-component-review.json',
    );
    const reviewContent = JSON.parse(
      requireFile(result, 'manual/acme-button-keyboard-review.json'),
    );
    expect(reviewContent).toEqual(reviews[0]);

    const manifestJson = JSON.parse(requireFile(result, 'manifest.json'));
    expect(manifestJson.contents).toContain(
      'manual/acme-button-keyboard-review.json',
    );
    expect(manifestJson.checksums).toHaveProperty(
      'manual/acme-button-keyboard-review.json',
    );
    expect(Object.keys(manifestJson.excludes)).not.toContain('manual/');
    expect(requireFile(result, 'report.html')).toContain(
      'keyboard-and-screen-reader-review',
    );
  });

  it('leaves manual/ excluded when no manual review matches this component version', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
    });

    const result = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [],
      manualReviews: [manualReview({ componentVersionId: 'acme.lib.card@1.0.0' })],
      starlightProjects: [],
    });

    expect(Object.keys(result.files).some((name) => name.startsWith('manual/'))).toBe(
      false,
    );
    const manifestJson = JSON.parse(requireFile(result, 'manifest.json'));
    expect(manifestJson.excludes['manual/']).toBe(
      'No manual review result is connected for this component yet.',
    );
  });

  it('writes one real exceptions/<id>.json file when it approves one of this export\'s own findings', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
    });

    const result = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [],
      blockingReasons: ['No token mappings connected'],
      exceptions: [exception({ findingId: 'acme.lib.button-blocking-0' })],
      starlightProjects: [],
    });

    expect(Object.keys(result.files)).toContain(
      'exceptions/acme-button-token-exception.json',
    );
    const exceptionContent = JSON.parse(
      requireFile(result, 'exceptions/acme-button-token-exception.json'),
    );
    expect(exceptionContent.findingId).toBe('acme.lib.button-blocking-0');

    const manifestJson = JSON.parse(requireFile(result, 'manifest.json'));
    expect(manifestJson.contents).toContain(
      'exceptions/acme-button-token-exception.json',
    );
    expect(Object.keys(manifestJson.excludes)).not.toContain('exceptions/');
    expect(requireFile(result, 'report.html')).toContain(
      'Risk accepted until next sprint.',
    );
  });

  it('leaves exceptions/ excluded when no exception approves any of this export\'s own findings', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
    });

    const result = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [],
      blockingReasons: ['No token mappings connected'],
      // Approves a finding from a completely different export/component —
      // an exception is scoped to the specific finding it was granted
      // against, not to "any finding this component ever has".
      exceptions: [exception({ findingId: 'acme.lib.card-blocking-0' })],
      starlightProjects: [],
    });

    expect(
      Object.keys(result.files).some((name) => name.startsWith('exceptions/')),
    ).toBe(false);
    const manifestJson = JSON.parse(requireFile(result, 'manifest.json'));
    expect(manifestJson.excludes['exceptions/']).toBe(
      "No exception approves any of this export's findings yet.",
    );
  });

  it('computes real per-target documentation drift into documentation-status.json', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '2.0.0',
      documentationTargets: [
        {
          adapter: 'starlight',
          pathOrPageId: 'docs/button',
          publishedVersion: '1.0.0',
        },
      ],
    });

    const result = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [],
      starlightProjects: ['docs'],
    });

    const documentationStatus = JSON.parse(
      requireFile(result, 'documentation-status.json'),
    );
    expect(documentationStatus).toEqual([
      {
        adapter: 'starlight',
        pathOrPageId: 'docs/button',
        status: 'drifted',
        detail: 'Drifted — published 1.0.0, current 2.0.0',
      },
    ]);
  });

  it('writes one real findings/<id>.json file per blocking reason, and none when there are no blocking reasons', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
    });

    const withoutFindings = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [],
      starlightProjects: [],
    });
    expect(
      Object.keys(withoutFindings.files).some((name) =>
        name.startsWith('findings/'),
      ),
    ).toBe(false);

    const withFindings = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [],
      starlightProjects: [],
      blockingReasons: [
        'No token mappings connected',
        'Automated evidence contains a failed or blocked result',
      ],
    });
    const findingFiles = Object.keys(withFindings.files)
      .filter((name) => name.startsWith('findings/'))
      .sort();
    expect(findingFiles).toEqual([
      'findings/acme.lib.button-blocking-0.json',
      'findings/acme.lib.button-blocking-1.json',
    ]);

    const firstFinding = JSON.parse(
      requireFile(withFindings, 'findings/acme.lib.button-blocking-0.json'),
    );
    expect(firstFinding).toMatchObject({
      componentId: 'acme.lib.button',
      description: 'No token mappings connected',
      severity: 'minor',
      status: 'open',
    });
    const secondFinding = JSON.parse(
      requireFile(withFindings, 'findings/acme.lib.button-blocking-1.json'),
    );
    expect(secondFinding.severity).toBe('serious');
  });

  it('produces real, verifiable SHA-256 checksums for every included content file', async () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
    });

    const result = await buildEvidenceExport({
      id: 'export-1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      manifest,
      testExecutions: [],
      starlightProjects: [],
    });

    const manifestJson = JSON.parse(requireFile(result, 'manifest.json'));
    const checksumLines = requireFile(result, 'checksums.sha256')
      .trim()
      .split('\n');
    // One line per content file — every file in the package except
    // manifest.json (which carries the checksums) and the checksums file
    // itself, which cannot contain its own hash.
    expect(checksumLines).toHaveLength(Object.keys(result.files).length - 2);
    expect(checksumLines).toHaveLength(
      Object.keys(manifestJson.checksums).length,
    );

    for (const [name, expectedHash] of Object.entries(manifestJson.checksums)) {
      const bytes = new TextEncoder().encode(requireFile(result, name));
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const actualHash = Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
      expect(actualHash).toBe(expectedHash);
      expect(checksumLines).toContain(`${expectedHash}  ${name}`);
    }
  });
});

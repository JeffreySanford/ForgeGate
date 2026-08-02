import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createComponentManifest } from '@forgegate/core-manifest';
import { TAURI_INVOKE } from './tauri-invoke';
import { TAURI_LISTEN } from './tauri-listen';
import {
  isWorkspaceRelativeRawArtifactRef,
  parseWorkspaceCommandMapping,
  WorkspaceService,
} from './workspace.service';

const invokeMock = vi.fn();

const scanFixture = {
  packageName: '@up/design-system',
  packageManager: 'pnpm',
  workspaceManager: 'nx',
  storybookProjects: [],
  starlightProjects: [],
  hasZeroheight: false,
  tokenFiles: [],
  testRunners: ['vitest'],
  visualRegressionProviders: [],
  ciProviders: ['github-actions'],
  customElementsManifests: [],
  uiTechnologies: [],
  componentPackages: [
    {
      name: '@up/design-system',
      path: 'packages/design-system',
      sourceGlob: 'src/**/*.{js,ts,jsx,tsx}',
      outputDirectory: 'dist',
      manifestPath: 'dist/custom-elements.json',
    },
  ],
};

const scanFixtureWithCem = {
  ...scanFixture,
  customElementsManifests: ['dist/custom-elements.json'],
};

const scanFixtureWithComponentManifest = {
  ...scanFixture,
  componentManifests: ['.forgegate/components/up.design-system.up-button.yaml'],
};

const scanFixtureWithEvidence = {
  ...scanFixture,
  testEvidenceFiles: [
    '.forgegate/evidence/acme-button-unit.json',
    '.forgegate/evidence/broken.json',
  ],
};

const scanFixtureWithManualReviews = {
  ...scanFixture,
  manualReviewFiles: [
    '.forgegate/manual-reviews/acme-button-keyboard-review.json',
    '.forgegate/manual-reviews/broken.json',
  ],
};

const scanFixtureWithExceptions = {
  ...scanFixture,
  exceptionFiles: [
    '.forgegate/exceptions/acme-button-token-exception.json',
    '.forgegate/exceptions/broken.json',
  ],
};

const scanFixtureWithProcedures = {
  ...scanFixture,
  procedureFiles: [
    '.forgegate/procedures/keyboard-and-screen-reader-review.yaml',
    '.forgegate/procedures/broken.yaml',
  ],
};

const scanFixtureWithBlueprints = {
  ...scanFixture,
  blueprintFiles: [
    '.forgegate/blueprints/blueprint.button.yaml',
    '.forgegate/blueprints/broken.yaml',
  ],
};

const scanFixtureWithReleaseDecisions = {
  ...scanFixture,
  releaseDecisionFiles: [
    '.forgegate/release-decisions/acme-button-release-decision-workflow-record.json',
    '.forgegate/release-decisions/broken.json',
  ],
};

const gitStatusFixture = {
  branch: 'master',
  commit: 'a'.repeat(40),
  dirty: false,
  changedFiles: [],
};

const listenMock = vi.fn();

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function evidencePackageFiles(
  files: Readonly<Record<string, string>>,
): Promise<Readonly<Record<string, string>>> {
  const checksums: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    checksums[path] = await sha256Hex(content);
  }
  return {
    ...files,
    'manifest.json': JSON.stringify(
      {
        id: 'package-1',
        componentVersionId: 'acme.design-system.acme-button@1.0.0',
        exportedAt: '2026-08-02T12:00:00.000Z',
        checksums,
        contents: Object.keys(files),
        includesCredentials: false,
      },
      null,
      2,
    ),
    'checksums.sha256': `${Object.entries(checksums)
      .map(([path, hash]) => `${hash}  ${path}`)
      .join('\n')}\n`,
  };
}

describe('parseWorkspaceCommandMapping', () => {
  it('splits a repository-configured command into executable and args', () => {
    expect(
      parseWorkspaceCommandMapping(
        'pnpm nx run docs:build --configuration production',
      ),
    ).toEqual({
      command: 'pnpm',
      args: ['nx', 'run', 'docs:build', '--configuration', 'production'],
      commandText: 'pnpm nx run docs:build --configuration production',
    });
  });

  it('preserves quoted arguments without invoking a shell', () => {
    expect(
      parseWorkspaceCommandMapping(
        'pnpm nx run "docs site:build" --flag="a b"',
      ),
    ).toEqual({
      command: 'pnpm',
      args: ['nx', 'run', 'docs site:build', '--flag=a b'],
      commandText: 'pnpm nx run "docs site:build" --flag="a b"',
    });
  });

  it('rejects an empty command mapping', () => {
    expect(() => parseWorkspaceCommandMapping('   ')).toThrow(
      'Command mapping must not be empty.',
    );
  });

  it('rejects an unterminated quote', () => {
    expect(() =>
      parseWorkspaceCommandMapping('pnpm nx run "docs:build'),
    ).toThrow('Command mapping contains an unterminated quote.');
  });
});

describe('isWorkspaceRelativeRawArtifactRef', () => {
  it('accepts guarded workspace-relative text artifact refs only', () => {
    expect(
      isWorkspaceRelativeRawArtifactRef('.forgegate/evidence/raw/unit.tap'),
    ).toBe(true);
    expect(isWorkspaceRelativeRawArtifactRef('reports/axe.json')).toBe(true);
    expect(isWorkspaceRelativeRawArtifactRef('/tmp/unit.tap')).toBe(false);
    expect(isWorkspaceRelativeRawArtifactRef('D:/tmp/unit.tap')).toBe(false);
    expect(isWorkspaceRelativeRawArtifactRef('../unit.tap')).toBe(false);
    expect(isWorkspaceRelativeRawArtifactRef('reports\\unit.tap')).toBe(false);
    expect(isWorkspaceRelativeRawArtifactRef('screenshots/button.png')).toBe(
      false,
    );
  });
});

describe('WorkspaceService', () => {
  let service: WorkspaceService;

  beforeEach(() => {
    invokeMock.mockReset();
    listenMock.mockReset();
    listenMock.mockResolvedValue(vi.fn());
    TestBed.configureTestingModule({
      providers: [
        { provide: TAURI_INVOKE, useValue: invokeMock },
        { provide: TAURI_LISTEN, useValue: listenMock },
      ],
    });
    service = TestBed.inject(WorkspaceService);
  });

  it('does nothing when the user cancels the folder picker', async () => {
    invokeMock.mockResolvedValueOnce(null);

    await service.selectWorkspace();

    expect(service.workspacePath()).toBeNull();
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith('select_workspace');
    expect(service.scanProgress()).toBeNull();
  });

  it('loads Git status, workspace scan, and an absent repository config', async () => {
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixture)
      .mockResolvedValueOnce(null);

    await service.selectWorkspace();

    expect(service.workspacePath()).toBe('D:/repos/ForgeGate');
    expect(service.gitStatus()).toEqual(gitStatusFixture);
    expect(service.workspaceScan()).toEqual(scanFixture);
    expect(service.repositoryConfig()).toBeNull();
    expect(service.repositoryConfigError()).toBeNull();
    expect(invokeMock).toHaveBeenCalledWith('read_evidence_history_trend', {
      path: 'D:/repos/ForgeGate',
    });
    expect(service.error()).toBeNull();
    expect(service.scanProgress()).toEqual({
      phase: 'complete',
      state: 'complete',
      label: 'Workspace scan complete',
      completed: 5,
      total: 5,
    });
  });

  it('reports selection and repository inspection while their work is in flight', async () => {
    let resolvePath!: (path: string) => void;
    let resolveStatus!: (status: typeof gitStatusFixture) => void;
    const pathPromise = new Promise<string>((resolve) => {
      resolvePath = resolve;
    });
    const statusPromise = new Promise<typeof gitStatusFixture>((resolve) => {
      resolveStatus = resolve;
    });
    invokeMock
      .mockReturnValueOnce(pathPromise)
      .mockReturnValueOnce(statusPromise)
      .mockResolvedValueOnce(scanFixture)
      .mockResolvedValueOnce(null);

    const selection = service.selectWorkspace();
    expect(service.scanProgress()?.phase).toBe('selecting');

    resolvePath('D:/repos/ForgeGate');
    await vi.waitFor(() => {
      expect(service.scanProgress()?.phase).toBe('repository');
    });

    resolveStatus(gitStatusFixture);
    await selection;
    expect(service.scanProgress()?.phase).toBe('complete');
  });

  it('ignores a duplicate selection request while a scan is running', async () => {
    let resolvePath!: (path: null) => void;
    invokeMock.mockReturnValueOnce(
      new Promise<null>((resolve) => {
        resolvePath = resolve;
      }),
    );

    const selection = service.selectWorkspace();
    await service.selectWorkspace();

    expect(invokeMock).toHaveBeenCalledTimes(1);
    resolvePath(null);
    await selection;
  });

  it('parses a present, valid repository config file', async () => {
    const yaml = [
      'configVersion: 0.1.0',
      'projectMappings: []',
      'packageMappings: []',
      'commandMappings: {}',
      'documentationMappings: {}',
      'adapterConfiguration: {}',
      'ignorePatterns: []',
      'safeWriteLocations:',
      '  - src/content/docs/generated/**',
      '',
    ].join('\n');

    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixture)
      .mockResolvedValueOnce(yaml);

    await service.selectWorkspace();

    expect(service.repositoryConfig()?.safeWriteLocations).toEqual([
      'src/content/docs/generated/**',
    ]);
    expect(service.repositoryConfigError()).toBeNull();
  });

  it('reports a malformed repository config without clearing Git status or the scan', async () => {
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixture)
      .mockResolvedValueOnce('not: [valid');

    await service.selectWorkspace();

    expect(service.gitStatus()).toEqual(gitStatusFixture);
    expect(service.workspaceScan()).toEqual(scanFixture);
    expect(service.repositoryConfig()).toBeNull();
    expect(service.repositoryConfigError()).toContain('not valid YAML');
  });

  it('loads valid test evidence and isolates an invalid sibling record', async () => {
    const execution = {
      id: 'acme-button-unit',
      componentVersionId: 'up.design-system.up-button@0.1.0',
      gate: 'unit',
      tool: 'vitest',
      toolVersion: '4.1.10',
      adapterVersion: '0.1.0',
      status: 'passed',
      startedAt: '2026-07-24T16:00:00.000Z',
      durationMs: 50,
      commitOrFingerprint: 'a'.repeat(40),
      rawArtifactRef: '.forgegate/evidence/raw/unit.tap',
    };
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixtureWithEvidence)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify(execution))
      .mockResolvedValueOnce('{"status":"green"}');

    await service.selectWorkspace();

    expect(service.testExecutions()).toEqual([execution]);
    expect(service.testExecutionError()).toContain(
      '.forgegate/evidence/broken.json',
    );
    expect(service.workspaceScan()).toEqual(scanFixtureWithEvidence);
    expect(
      service
        .adapterDiagnostics()
        .find(
          (diagnostic) =>
            diagnostic.id ===
            'test-evidence:.forgegate/evidence/acme-button-unit.json',
        ),
    ).toMatchObject({
      status: 'loaded',
      rawOutput: JSON.stringify(execution),
      error: null,
    });
    expect(
      service
        .adapterDiagnostics()
        .find(
          (diagnostic) =>
            diagnostic.id === 'test-evidence:.forgegate/evidence/broken.json',
        ),
    ).toMatchObject({
      status: 'failed',
      rawOutput: '{"status":"green"}',
    });
  });

  it('loads valid manual review evidence and isolates an invalid sibling record', async () => {
    const review = {
      id: 'acme-button-keyboard-review',
      componentVersionId: 'up.design-system.up-button@0.1.0',
      procedureId: 'keyboard-and-screen-reader-review',
      procedureVersion: '1.0.0',
      reviewerIdentity: 'reviewer@example.com',
      date: '2026-07-24T16:00:00.000Z',
      operatingSystem: 'macOS 15',
      status: 'passed',
      commitOrFingerprint: 'a'.repeat(40),
    };
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixtureWithManualReviews)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify(review))
      .mockResolvedValueOnce('{"status":"green"}');

    await service.selectWorkspace();

    expect(service.manualReviews()).toEqual([review]);
    expect(service.manualReviewError()).toContain(
      '.forgegate/manual-reviews/broken.json',
    );
    expect(
      service
        .adapterDiagnostics()
        .find(
          (diagnostic) =>
            diagnostic.id ===
            'manual-review:.forgegate/manual-reviews/acme-button-keyboard-review.json',
        ),
    ).toMatchObject({
      status: 'loaded',
      rawOutput: JSON.stringify(review),
      error: null,
    });
    expect(
      service
        .adapterDiagnostics()
        .find(
          (diagnostic) =>
            diagnostic.id ===
            'manual-review:.forgegate/manual-reviews/broken.json',
        ),
    ).toMatchObject({
      status: 'failed',
      rawOutput: '{"status":"green"}',
    });
  });

  it('loads valid exception evidence and isolates an invalid sibling record', async () => {
    const record = {
      id: 'acme-button-token-exception',
      findingId: 'up.design-system.up-button-blocking-0',
      approvedBy: 'lead-reviewer@example.com',
      approvedAt: '2026-07-24T16:00:00.000Z',
      rationale: 'Token migration scheduled for next quarter.',
    };
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixtureWithExceptions)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify(record))
      .mockResolvedValueOnce('{"status":"green"}');

    await service.selectWorkspace();

    expect(service.exceptions()).toEqual([record]);
    expect(service.exceptionError()).toContain(
      '.forgegate/exceptions/broken.json',
    );
    expect(
      service
        .adapterDiagnostics()
        .find(
          (diagnostic) =>
            diagnostic.id ===
            'exception:.forgegate/exceptions/acme-button-token-exception.json',
        ),
    ).toMatchObject({
      status: 'loaded',
      rawOutput: JSON.stringify(record),
      error: null,
    });
    expect(
      service
        .adapterDiagnostics()
        .find(
          (diagnostic) =>
            diagnostic.id === 'exception:.forgegate/exceptions/broken.json',
        ),
    ).toMatchObject({
      status: 'failed',
      rawOutput: '{"status":"green"}',
    });
  });

  it('loads a valid manual review procedure and isolates an invalid sibling record', async () => {
    const procedureYaml = [
      'id: keyboard-and-screen-reader-review',
      'version: 1.0.0',
      'appliesTo: [button]',
      'steps:',
      '  - action: Move focus to the button using Tab.',
      '    expected: The accessible name and button role are announced.',
    ].join('\n');
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixtureWithProcedures)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(procedureYaml)
      .mockResolvedValueOnce('id: [unterminated');

    await service.selectWorkspace();

    expect(service.procedures()).toEqual([
      {
        id: 'keyboard-and-screen-reader-review',
        version: '1.0.0',
        appliesTo: ['button'],
        steps: [
          {
            action: 'Move focus to the button using Tab.',
            expected: 'The accessible name and button role are announced.',
          },
        ],
      },
    ]);
    expect(service.procedureError()).toContain(
      '.forgegate/procedures/broken.yaml',
    );
    expect(
      service
        .adapterDiagnostics()
        .find(
          (diagnostic) =>
            diagnostic.id ===
            'procedure:.forgegate/procedures/keyboard-and-screen-reader-review.yaml',
        ),
    ).toMatchObject({ status: 'loaded', error: null });
    expect(
      service
        .adapterDiagnostics()
        .find(
          (diagnostic) =>
            diagnostic.id === 'procedure:.forgegate/procedures/broken.yaml',
        ),
    ).toMatchObject({ status: 'failed' });
  });

  it('loads a valid blueprint and isolates an invalid sibling record', async () => {
    const blueprintYaml = [
      'id: blueprint.button',
      'version: 1.0.0',
      'name: Button',
      'purpose: Trigger a primary or secondary application action.',
      'requiredStates: [default, hover, focus-visible, active, disabled]',
      'inspectorGroups: []',
      'tokenSlots: []',
    ].join('\n');
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixtureWithBlueprints)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(blueprintYaml)
      .mockResolvedValueOnce('id: [unterminated');

    await service.selectWorkspace();

    expect(service.blueprints()).toEqual([
      {
        id: 'blueprint.button',
        version: '1.0.0',
        name: 'Button',
        purpose: 'Trigger a primary or secondary application action.',
        requiredStates: [
          'default',
          'hover',
          'focus-visible',
          'active',
          'disabled',
        ],
        inspectorGroups: [],
        tokenSlots: [],
      },
    ]);
    expect(service.blueprintError()).toContain(
      '.forgegate/blueprints/broken.yaml',
    );
    expect(
      service
        .adapterDiagnostics()
        .find(
          (diagnostic) =>
            diagnostic.id ===
            'blueprint:.forgegate/blueprints/blueprint.button.yaml',
        ),
    ).toMatchObject({ status: 'loaded', error: null });
    expect(
      service
        .adapterDiagnostics()
        .find(
          (diagnostic) =>
            diagnostic.id === 'blueprint:.forgegate/blueprints/broken.yaml',
        ),
    ).toMatchObject({ status: 'failed' });
  });

  it('loads valid release decision history and isolates an invalid sibling record', async () => {
    const record = {
      id: 'acme-button-release-decision-workflow-record',
      decisionId: 'acme-button-release-decision',
      componentVersionId: 'up.design-system.up-button@0.1.0',
      policyId: 'up.baseline',
      policyVersion: '1.0.0',
      outcome: 'blocked',
      commit: 'a'.repeat(40),
      decidedAt: '2026-08-02T16:00:00.000Z',
      source: 'forgegate-export-evaluation',
      authorization: 'blocked-no-approval-required',
      notRealApproval: false,
      evidenceIds: ['unit-run'],
      blockingFindingIds: ['up-button-blocking-0'],
      limitations: ['Blocked records require no approver.'],
    };
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixtureWithReleaseDecisions)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify(record))
      .mockResolvedValueOnce('{"authorization":"unknown"}');

    await service.selectWorkspace();

    expect(service.releaseDecisionRecords()).toEqual([record]);
    expect(service.releaseDecisionRecordError()).toContain(
      '.forgegate/release-decisions/broken.json',
    );
    expect(
      service
        .adapterDiagnostics()
        .find(
          (diagnostic) =>
            diagnostic.id ===
            'release-decision:.forgegate/release-decisions/acme-button-release-decision-workflow-record.json',
        ),
    ).toMatchObject({
      adapter: 'release decision history',
      status: 'loaded',
      rawOutput: JSON.stringify(record),
      error: null,
    });
    expect(
      service
        .adapterDiagnostics()
        .find(
          (diagnostic) =>
            diagnostic.id ===
            'release-decision:.forgegate/release-decisions/broken.json',
        ),
    ).toMatchObject({ status: 'failed' });
  });

  it('loads Playwright JSON evidence envelopes without treating raw reports as provenance', async () => {
    const scanFixtureWithPlaywrightEvidence = {
      ...scanFixture,
      testEvidenceFiles: ['.forgegate/evidence/acme-button-playwright.json'],
    };
    const playwrightEvidence = {
      format: 'playwright-json',
      id: 'acme-button-playwright',
      componentVersionId: 'up.design-system.up-button@0.1.0',
      gate: 'interaction',
      toolVersion: '1.56.0',
      commitOrFingerprint: 'b'.repeat(40),
      rawArtifactRef: '.forgegate/evidence/raw/playwright-report.json',
      report: {
        stats: {
          startTime: '2026-07-24T17:00:00.000Z',
          duration: 1500,
          expected: 9,
          skipped: 0,
          unexpected: 0,
          flaky: 0,
        },
        errors: [],
        suites: [],
      },
    };
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixtureWithPlaywrightEvidence)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify(playwrightEvidence));

    await service.selectWorkspace();

    expect(service.testExecutions()).toEqual([
      {
        id: 'acme-button-playwright',
        componentVersionId: 'up.design-system.up-button@0.1.0',
        gate: 'interaction',
        tool: 'playwright',
        toolVersion: '1.56.0',
        adapterVersion: '0.1.0',
        status: 'passed',
        startedAt: '2026-07-24T17:00:00.000Z',
        durationMs: 1500,
        commitOrFingerprint: 'b'.repeat(40),
        rawArtifactRef: '.forgegate/evidence/raw/playwright-report.json',
      },
    ]);
    expect(service.automatedEvidenceArtifacts()).toEqual([
      {
        kind: 'playwright-json',
        id: 'acme-button-playwright',
        componentVersionId: 'up.design-system.up-button@0.1.0',
        gate: 'interaction',
        tool: 'playwright',
        toolVersion: '1.56.0',
        adapterVersion: '0.1.0',
        commitOrFingerprint: 'b'.repeat(40),
        rawArtifactRef: '.forgegate/evidence/raw/playwright-report.json',
        report: playwrightEvidence.report,
      },
    ]);
    expect(service.testExecutionError()).toBeNull();
    expect(
      service
        .adapterDiagnostics()
        .find(
          (diagnostic) =>
            diagnostic.id ===
            'test-evidence:.forgegate/evidence/acme-button-playwright.json',
        ),
    ).toMatchObject({
      adapter: 'Playwright JSON evidence adapter',
      status: 'loaded',
      rawOutput: JSON.stringify(playwrightEvidence),
      error: null,
    });
  });

  it('loads axe JSON evidence envelopes without treating raw reports as provenance', async () => {
    const scanFixtureWithAxeEvidence = {
      ...scanFixture,
      testEvidenceFiles: ['.forgegate/evidence/acme-button-axe.json'],
    };
    const axeEvidence = {
      format: 'axe-json',
      id: 'acme-button-axe',
      componentVersionId: 'up.design-system.up-button@0.1.0',
      toolVersion: '4.10.3',
      commitOrFingerprint: 'b'.repeat(40),
      rawArtifactRef: '.forgegate/evidence/raw/axe-results.json',
      report: {
        timestamp: '2026-07-24T17:10:00.000Z',
        violations: [],
        incomplete: [],
        passes: [{ id: 'button-name', nodes: [] }],
      },
    };
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixtureWithAxeEvidence)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify(axeEvidence));

    await service.selectWorkspace();

    expect(service.testExecutions()).toEqual([
      {
        id: 'acme-button-axe',
        componentVersionId: 'up.design-system.up-button@0.1.0',
        gate: 'axe',
        tool: 'axe-core',
        toolVersion: '4.10.3',
        adapterVersion: '0.1.0',
        status: 'passed',
        startedAt: '2026-07-24T17:10:00.000Z',
        commitOrFingerprint: 'b'.repeat(40),
        rawArtifactRef: '.forgegate/evidence/raw/axe-results.json',
      },
    ]);
    expect(service.automatedEvidenceArtifacts()).toEqual([
      {
        kind: 'axe-json',
        id: 'acme-button-axe',
        componentVersionId: 'up.design-system.up-button@0.1.0',
        gate: 'axe',
        tool: 'axe-core',
        toolVersion: '4.10.3',
        adapterVersion: '0.1.0',
        commitOrFingerprint: 'b'.repeat(40),
        rawArtifactRef: '.forgegate/evidence/raw/axe-results.json',
        report: axeEvidence.report,
      },
    ]);
    expect(service.testExecutionError()).toBeNull();
    expect(
      service
        .adapterDiagnostics()
        .find(
          (diagnostic) =>
            diagnostic.id ===
            'test-evidence:.forgegate/evidence/acme-button-axe.json',
        ),
    ).toMatchObject({
      adapter: 'axe JSON evidence adapter',
      status: 'loaded',
      rawOutput: JSON.stringify(axeEvidence),
      error: null,
    });
  });

  it('loads Storybook interactions JSON evidence envelopes without treating raw reports as provenance', async () => {
    const scanFixtureWithStorybookInteractionEvidence = {
      ...scanFixture,
      testEvidenceFiles: [
        '.forgegate/evidence/acme-button-storybook-interactions.json',
      ],
    };
    const storybookEvidence = {
      format: 'storybook-interactions-json',
      id: 'acme-button-storybook-interactions',
      componentVersionId: 'up.design-system.up-button@0.1.0',
      toolVersion: '9.0.0',
      commitOrFingerprint: 'b'.repeat(40),
      rawArtifactRef: '.forgegate/evidence/raw/storybook-interactions.json',
      report: {
        startedAt: '2026-07-24T17:20:00.000Z',
        durationMs: 640,
        stories: [{ id: 'button--primary', status: 'passed' }],
      },
    };
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixtureWithStorybookInteractionEvidence)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify(storybookEvidence));

    await service.selectWorkspace();

    expect(service.testExecutions()).toEqual([
      {
        id: 'acme-button-storybook-interactions',
        componentVersionId: 'up.design-system.up-button@0.1.0',
        gate: 'storybook-interaction',
        tool: 'storybook/test-runner',
        toolVersion: '9.0.0',
        adapterVersion: '0.1.0',
        status: 'passed',
        startedAt: '2026-07-24T17:20:00.000Z',
        durationMs: 640,
        commitOrFingerprint: 'b'.repeat(40),
        rawArtifactRef: '.forgegate/evidence/raw/storybook-interactions.json',
      },
    ]);
    expect(service.automatedEvidenceArtifacts()).toEqual([
      {
        kind: 'storybook-interactions-json',
        id: 'acme-button-storybook-interactions',
        componentVersionId: 'up.design-system.up-button@0.1.0',
        gate: 'storybook-interaction',
        tool: 'storybook/test-runner',
        toolVersion: '9.0.0',
        adapterVersion: '0.1.0',
        commitOrFingerprint: 'b'.repeat(40),
        rawArtifactRef: '.forgegate/evidence/raw/storybook-interactions.json',
        report: storybookEvidence.report,
      },
    ]);
    expect(service.testExecutionError()).toBeNull();
    expect(
      service
        .adapterDiagnostics()
        .find(
          (diagnostic) =>
            diagnostic.id ===
            'test-evidence:.forgegate/evidence/acme-button-storybook-interactions.json',
        ),
    ).toMatchObject({
      adapter: 'Storybook interactions JSON evidence adapter',
      status: 'loaded',
      rawOutput: JSON.stringify(storybookEvidence),
      error: null,
    });
  });

  it('does not attempt to read a Custom Elements Manifest when none was found', async () => {
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixture)
      .mockResolvedValueOnce(null);

    await service.selectWorkspace();

    // select_workspace, read_git_status, read_workspace_scan,
    // read_repository_config_file, read_evidence_history_trend,
    // start_workspace_watch — no read_workspace_scan for a CEM that was
    // never found.
    expect(invokeMock).toHaveBeenCalledTimes(6);
    expect(service.customElementsManifest()).toBeNull();
    expect(service.customElementsManifestError()).toBeNull();
  });

  it('loads persisted evidence history for the selected workspace', async () => {
    const trend = {
      configured: true,
      connected: true,
      snapshots: [
        {
          id: 1,
          scannedAt: '2026-01-15T15:00:00Z',
          sourceCommit: 'a'.repeat(40),
          dirty: false,
          componentCount: 4,
          componentSnapshotCount: 4,
          readinessSummary: {
            total: 4,
            readiness: { unknown: 4 },
            lifecycle: { proposal: 4 },
          },
          adapterSummary: { total: 1, byStatus: { loaded: 1 } },
          seeded: true,
          seedLabel: 'dev-history-2026-07',
        },
      ],
      error: null,
    };
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixture)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(trend);

    await service.selectWorkspace();

    expect(service.evidenceHistoryTrend()).toEqual(trend);
    expect(service.persistenceError()).toBeNull();
  });

  it('keeps a persisted evidence history connection failure separate from scan state', async () => {
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixture)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        configured: true,
        connected: false,
        snapshots: [],
        error: 'Failed to connect to Postgres',
      });

    await service.selectWorkspace();

    expect(service.workspaceScan()).toEqual(scanFixture);
    expect(service.error()).toBeNull();
    expect(service.persistenceError()).toBe('Failed to connect to Postgres');
  });

  it('reads and parses the first Custom Elements Manifest the scan found', async () => {
    const cemJson = JSON.stringify({
      schemaVersion: '1.0.0',
      modules: [
        {
          kind: 'javascript-module',
          path: 'src/up-button.ts',
          declarations: [
            {
              kind: 'class',
              name: 'UpButton',
              customElement: true,
              tagName: 'up-button',
            },
          ],
        },
      ],
    });

    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixtureWithCem)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(cemJson);

    await service.selectWorkspace();

    expect(invokeMock).toHaveBeenCalledWith('read_text_file', {
      workspacePath: 'D:/repos/ForgeGate',
      relativePath: 'dist/custom-elements.json',
    });
    expect(service.customElementsManifest()?.modules).toHaveLength(1);
    expect(service.customElementsManifestError()).toBeNull();
    expect(
      service
        .adapterDiagnostics()
        .find((diagnostic) => diagnostic.id === 'custom-elements-manifest'),
    ).toMatchObject({
      adapter: 'Web Components adapter',
      source: 'dist/custom-elements.json',
      status: 'loaded',
      rawOutput: cemJson,
      error: null,
    });
  });

  it('reports a Custom Elements Manifest read/parse failure without clearing the workspace scan', async () => {
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixtureWithCem)
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(
        'dist/custom-elements.json does not exist in this workspace',
      );

    await service.selectWorkspace();

    expect(service.workspaceScan()).toEqual(scanFixtureWithCem);
    expect(service.customElementsManifest()).toBeNull();
    expect(service.customElementsManifestError()).toBe(
      'dist/custom-elements.json does not exist in this workspace',
    );
  });

  it('loads and validates repository-controlled component manifests', async () => {
    const yaml = [
      'schemaVersion: 0.1.0',
      'id: up.design-system.up-button',
      'framework: web-components',
      'adapter: framework.web-components',
      'packagePath: .',
      'sourceFiles: [src/up-button.ts]',
      'lifecycle: candidate',
      'reviewers: []',
      'contract:',
      '  inputs: []',
      '  outputs: []',
      '  content: []',
      '  publicMethods: []',
      '  styleParts: []',
      'states:',
      '  - name: default',
      '    required: true',
      'themes: []',
      'densities: []',
      'viewports: []',
      'environments: []',
      'tokenMappings:',
      '  - tokenPath: color.action',
      '    category: color',
      '    required: true',
      'storyMappings: []',
      'testRequirements: []',
      'manualReviewProcedureIds: []',
      'documentationTargets: []',
      'consumerApplicationIds: []',
      '',
    ].join('\n');

    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixtureWithComponentManifest)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(yaml);

    await service.selectWorkspace();

    expect(service.componentManifestOverrides()).toHaveLength(1);
    expect(service.componentManifestOverrides()[0]?.states[0]?.name).toBe(
      'default',
    );
    expect(
      service.componentManifestOverrides()[0]?.tokenMappings[0]?.tokenPath,
    ).toBe('color.action');
    expect(service.componentManifestError()).toBeNull();
  });

  it('does not generate until a component package is explicitly selected when several exist', async () => {
    const ambiguousScan = {
      ...scanFixture,
      componentPackages: [
        ...scanFixture.componentPackages,
        {
          ...scanFixture.componentPackages[0],
          name: '@up/card',
          path: 'packages/card',
        },
      ],
    };
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(ambiguousScan)
      .mockResolvedValueOnce(null);
    await service.selectWorkspace();
    invokeMock.mockReset();

    await service.generateCustomElementsManifest();

    expect(invokeMock).not.toHaveBeenCalled();
    expect(service.cemGenerationPlan()).toBeNull();
  });

  it('does nothing if asked to generate a manifest before a workspace is selected', async () => {
    await service.generateCustomElementsManifest();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('does nothing if asked to cancel when no generation is running', async () => {
    await service.cancelGeneratingCustomElementsManifest();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('invokes cancel_workspace_command while generation is running', async () => {
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixture)
      .mockResolvedValueOnce(null);
    await service.selectWorkspace();
    invokeMock.mockReset();

    let resolveRun!: (value: unknown) => void;
    const runPromise = new Promise((resolve) => {
      resolveRun = resolve;
    });
    invokeMock.mockReturnValueOnce(runPromise);

    const generatePromise = service.generateCustomElementsManifest();
    expect(service.cemGenerationRunning()).toBe(true);
    // Let the pending `await this.listen(...)` inside generateCustomElementsManifest
    // resolve so its continuation actually reaches (and calls) `invoke('run_workspace_command')`
    // before cancel is requested — otherwise cancel's own invoke call would race ahead
    // and consume the queued run_workspace_command mock value instead.
    await Promise.resolve();
    await Promise.resolve();

    invokeMock.mockResolvedValueOnce(true);
    await service.cancelGeneratingCustomElementsManifest();
    expect(invokeMock).toHaveBeenCalledWith('cancel_workspace_command');

    resolveRun({
      exitCode: null,
      stdout: '',
      stderr: '',
      timedOut: false,
      cancelled: true,
      artifactPath: null,
      durationMs: 300,
    });
    await generatePromise;
    expect(service.cemGenerationResult()?.cancelled).toBe(true);
  });

  it('reports a cancelled result distinctly from a timeout when the user cancels generation', async () => {
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixture)
      .mockResolvedValueOnce(null);
    await service.selectWorkspace();
    invokeMock.mockReset();

    invokeMock.mockResolvedValueOnce({
      exitCode: null,
      stdout: '',
      stderr: '',
      timedOut: false,
      cancelled: true,
      artifactPath: null,
      durationMs: 300,
    });

    await service.generateCustomElementsManifest();

    expect(service.cemGenerationResult()?.cancelled).toBe(true);
    expect(service.cemGenerationResult()?.timedOut).toBe(false);
    expect(service.cemGenerationRunning()).toBe(false);
  });

  it('appends real streamed output lines as they arrive, and unlistens once generation finishes', async () => {
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixture)
      .mockResolvedValueOnce(null);
    await service.selectWorkspace();
    invokeMock.mockReset();

    const unlistenSpy = vi.fn();
    let emitLine!: (line: string) => void;
    listenMock.mockImplementationOnce(async (_event, handler) => {
      emitLine = (line: string) =>
        handler({ payload: { runId: 1, stream: 'stdout', line } });
      return unlistenSpy;
    });
    invokeMock.mockResolvedValueOnce({
      exitCode: 0,
      stdout: '',
      stderr: '',
      timedOut: false,
      cancelled: false,
      artifactPath: null,
      durationMs: 10,
    });
    invokeMock.mockResolvedValueOnce(
      JSON.stringify({ schemaVersion: '1.0.0', modules: [] }),
    );

    const generatePromise = service.generateCustomElementsManifest();
    await Promise.resolve();
    await Promise.resolve();

    expect(emitLine).toBeDefined();
    emitLine('wrote custom-elements.json');
    expect(service.cemGenerationLiveOutput()).toBe(
      'wrote custom-elements.json\n',
    );

    await generatePromise;

    expect(unlistenSpy).toHaveBeenCalled();
  });

  it('runs the analyzer and refreshes the scan and manifest on a successful exit', async () => {
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixture)
      .mockResolvedValueOnce(null);
    await service.selectWorkspace();
    invokeMock.mockReset();

    const cemJson = JSON.stringify({ schemaVersion: '1.0.0', modules: [] });
    invokeMock
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'wrote custom-elements.json',
        stderr: '',
        timedOut: false,
        cancelled: false,
        artifactPath: '/tmp/forgegate-artifacts/42.json',
        durationMs: 900,
      })
      .mockResolvedValueOnce(cemJson);

    await service.generateCustomElementsManifest();

    expect(invokeMock).toHaveBeenNthCalledWith(1, 'run_workspace_command', {
      workspacePath: 'D:/repos/ForgeGate',
      relativeCwd: 'packages/design-system',
      command: 'npx',
      args: [
        '@custom-elements-manifest/analyzer',
        'analyze',
        '--litelement',
        '--globs',
        'src/**/*.{js,ts,jsx,tsx}',
        '--exclude',
        'node_modules/**',
        '--exclude',
        'dist/**',
        '--exclude',
        'coverage/**',
        '--exclude',
        '.nx/**',
        '--exclude',
        'storybook-static/**',
        '--outdir',
        'dist',
      ],
      timeoutSeconds: 120,
    });
    expect(service.cemGenerationResult()?.exitCode).toBe(0);
    expect(service.cemGenerationResult()?.artifactPath).toBe(
      '/tmp/forgegate-artifacts/42.json',
    );
    expect(service.workspaceScan()?.customElementsManifests).toContain(
      'packages/design-system/dist/custom-elements.json',
    );
    expect(service.customElementsManifest()).not.toBeNull();
    expect(service.cemGenerationRunning()).toBe(false);
  });

  it('reports a non-zero exit without touching the existing scan or manifest', async () => {
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixture)
      .mockResolvedValueOnce(null);
    await service.selectWorkspace();
    invokeMock.mockReset();

    invokeMock.mockResolvedValueOnce({
      exitCode: 1,
      stdout: '',
      stderr: 'command not found: npx',
      timedOut: false,
      cancelled: false,
      artifactPath: null,
      durationMs: 50,
    });

    await service.generateCustomElementsManifest();

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(service.cemGenerationResult()?.exitCode).toBe(1);
    expect(service.workspaceScan()).toEqual(scanFixture);
    expect(service.customElementsManifest()).toBeNull();
  });

  it('reports a failure to even start the analyzer on its own signal', async () => {
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixture)
      .mockResolvedValueOnce(null);
    await service.selectWorkspace();
    invokeMock.mockReset();

    invokeMock.mockRejectedValueOnce(
      'Failed to start "npx": program not found',
    );

    await service.generateCustomElementsManifest();

    expect(service.cemGenerationError()).toBe(
      'Failed to start "npx": program not found',
    );
    expect(service.cemGenerationRunning()).toBe(false);
  });

  it('surfaces an error and clears Git status, scan, and config when the status read fails', async () => {
    invokeMock
      .mockResolvedValueOnce('D:/not-a-git-repo')
      .mockRejectedValueOnce('Workspace path does not exist')
      .mockResolvedValueOnce(scanFixture)
      .mockResolvedValueOnce(null);

    await service.selectWorkspace();

    expect(service.gitStatus()).toBeNull();
    expect(service.workspaceScan()).toBeNull();
    expect(service.repositoryConfig()).toBeNull();
    expect(service.error()).toBe('Workspace path does not exist');
  });

  describe('exportEvidencePackage', () => {
    const manifest = createComponentManifest({
      id: 'acme.lib.button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
    });

    it('does nothing if an export is already running', async () => {
      service.evidenceExportRunning.set(true);

      await service.exportEvidencePackage(manifest, []);

      expect(invokeMock).not.toHaveBeenCalled();
    });

    it('is a quiet no-op when the user cancels the folder dialog', async () => {
      invokeMock.mockResolvedValueOnce(null);

      await service.exportEvidencePackage(manifest, []);

      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(invokeMock).toHaveBeenCalledWith('pick_export_directory');
      expect(service.evidenceExportResult()).toBeNull();
      expect(service.evidenceExportError()).toBeNull();
      expect(service.evidenceExportRunning()).toBe(false);
    });

    it('writes a real evidence package once a destination is chosen', async () => {
      invokeMock
        .mockResolvedValueOnce('/home/user/exports')
        .mockResolvedValueOnce(
          '/home/user/exports/acme.lib.button-1.0.0-evidence-uuid',
        );

      await service.exportEvidencePackage(manifest, []);

      expect(invokeMock).toHaveBeenNthCalledWith(1, 'pick_export_directory');
      const [secondCallName, secondCallArgs] = invokeMock.mock.calls[1] as [
        string,
        {
          parentDirectory: string;
          directoryName: string;
          files: Record<string, string>;
        },
      ];
      expect(secondCallName).toBe('write_evidence_package');
      expect(secondCallArgs.parentDirectory).toBe('/home/user/exports');
      expect(secondCallArgs.directoryName).toContain(
        'acme.lib.button-1.0.0-evidence-',
      );
      expect(Object.keys(secondCallArgs.files).sort()).toEqual([
        'checksums.sha256',
        'documentation-status.json',
        'manifest.json',
        'redaction-plan.json',
        'report.html',
        'test-summary.json',
      ]);
      expect(service.evidenceExportResult()).toEqual({
        directoryPath: '/home/user/exports/acme.lib.button-1.0.0-evidence-uuid',
      });
      expect(service.evidenceExportRunning()).toBe(false);
    });

    it('includes matching preserved Playwright artifacts in the exported evidence package', async () => {
      service.automatedEvidenceArtifacts.set([
        {
          kind: 'playwright-json',
          id: 'matching-playwright',
          componentVersionId: 'acme.lib.button@1.0.0',
          gate: 'interaction',
          tool: 'playwright',
          toolVersion: '1.56.0',
          adapterVersion: '0.1.0',
          commitOrFingerprint: 'a'.repeat(40),
          rawArtifactRef: '.forgegate/evidence/raw/playwright-report.json',
          report: {
            stats: {
              startTime: '2026-07-24T17:00:00.000Z',
              duration: 1500,
              expected: 9,
              skipped: 0,
              unexpected: 0,
              flaky: 0,
            },
            errors: [],
            suites: [],
          },
        },
        {
          kind: 'playwright-json',
          id: 'other-component-playwright',
          componentVersionId: 'acme.lib.card@1.0.0',
          gate: 'interaction',
          tool: 'playwright',
          toolVersion: '1.56.0',
          adapterVersion: '0.1.0',
          commitOrFingerprint: 'a'.repeat(40),
          rawArtifactRef: null,
          report: { stats: { expected: 1 } },
        },
      ]);
      invokeMock
        .mockResolvedValueOnce('/home/user/exports')
        .mockResolvedValueOnce(
          '/home/user/exports/acme.lib.button-1.0.0-evidence-uuid',
        );

      await service.exportEvidencePackage(manifest, []);

      const [, secondCallArgs] = invokeMock.mock.calls[1] as [
        string,
        { files: Record<string, string> },
      ];
      expect(Object.keys(secondCallArgs.files)).toContain(
        'automated/playwright-results.json',
      );
      const playwrightResults = JSON.parse(
        secondCallArgs.files['automated/playwright-results.json'] ?? '[]',
      );
      expect(playwrightResults).toHaveLength(1);
      expect(playwrightResults[0].id).toBe('matching-playwright');
    });

    it('copies readable workspace-relative raw artifact text into redacted attachment files', async () => {
      service.workspacePath.set('/repo');
      const execution = {
        id: 'unit-run',
        componentVersionId: 'acme.lib.button@1.0.0',
        gate: 'unit',
        tool: 'vitest',
        toolVersion: '4.1.10',
        adapterVersion: '0.1.0',
        status: 'passed' as const,
        startedAt: '2026-01-01T00:00:00.000Z',
        commitOrFingerprint: 'a'.repeat(40),
        rawArtifactRef: '.forgegate/evidence/raw/unit.tap',
      };
      invokeMock
        .mockResolvedValueOnce('/home/user/exports')
        .mockResolvedValueOnce(
          'ok 1 unit\nAPI_TOKEN=plain-secret\nAuthorization: Bearer abc.def\n',
        )
        .mockResolvedValueOnce(
          '/home/user/exports/acme.lib.button-1.0.0-evidence-uuid',
        );

      await service.exportEvidencePackage(manifest, [execution]);

      expect(invokeMock).toHaveBeenNthCalledWith(2, 'read_text_file', {
        workspacePath: '/repo',
        relativePath: '.forgegate/evidence/raw/unit.tap',
      });
      const [, thirdCallArgs] = invokeMock.mock.calls[2] as [
        string,
        { files: Record<string, string> },
      ];
      expect(thirdCallArgs.files['attachments/files/unit-run.txt']).toBe(
        'ok 1 unit\nAPI_TOKEN=[REDACTED]\nAuthorization: Bearer [REDACTED]\n',
      );
      const attachmentIndex = JSON.parse(
        thirdCallArgs.files['attachments/index.json'] ?? '{}',
      );
      expect(attachmentIndex.attachments[0]).toMatchObject({
        sourceEvidenceId: 'unit-run',
        status: 'copied-redacted',
        targetPath: 'attachments/files/unit-run.txt',
      });
    });

    it("records the workspace's real current commit in the exported manifest", async () => {
      service.gitStatus.set(gitStatusFixture);
      invokeMock
        .mockResolvedValueOnce('/home/user/exports')
        .mockResolvedValueOnce(
          '/home/user/exports/acme.lib.button-1.0.0-evidence-uuid',
        );

      await service.exportEvidencePackage(manifest, []);

      const [, secondCallArgs] = invokeMock.mock.calls[1] as [
        string,
        { files: Record<string, string> },
      ];
      const manifestContent = secondCallArgs.files['manifest.json'];
      expect(manifestContent).toBeDefined();
      expect(JSON.parse(manifestContent ?? '{}').repositoryCommit).toBe(
        gitStatusFixture.commit,
      );
    });

    it('reads a configured external policy document into the exported policy snapshot', async () => {
      service.workspacePath.set('/repo');
      service.gitStatus.set(gitStatusFixture);
      service.repositoryConfig.set({
        configVersion: '0.1.0',
        projectMappings: [],
        packageMappings: [],
        commandMappings: {},
        documentationMappings: {},
        policyMappings: [
          {
            policyId: 'acme.baseline',
            policyVersion: '1.0.0',
            path: '.forgegate/policies/acme-baseline.yaml',
          },
        ],
        adapterConfiguration: {},
        ignorePatterns: [],
        safeWriteLocations: ['src/content/docs/generated/**'],
      });
      const policyManifest = createComponentManifest({
        id: 'acme.lib.button',
        framework: 'web-components',
        adapter: 'framework.web-components',
        packagePath: '.',
        componentVersion: '1.0.0',
        policyId: 'acme.baseline',
        policyVersion: '1.0.0',
      });
      invokeMock
        .mockResolvedValueOnce('/home/user/exports')
        .mockResolvedValueOnce('id: acme.baseline\nversion: 1.0.0\n')
        .mockResolvedValueOnce(
          '/home/user/exports/acme.lib.button-1.0.0-evidence-uuid',
        );

      await service.exportEvidencePackage(policyManifest, []);

      expect(invokeMock).toHaveBeenNthCalledWith(2, 'read_text_file', {
        workspacePath: '/repo',
        relativePath: '.forgegate/policies/acme-baseline.yaml',
      });
      const [, thirdCallArgs] = invokeMock.mock.calls[2] as [
        string,
        { files: Record<string, string> },
      ];
      const snapshot = JSON.parse(
        thirdCallArgs.files['policy-snapshot.json'] ?? '{}',
      );
      expect(snapshot.externalPolicyDocument).toMatchObject({
        policyId: 'acme.baseline',
        policyVersion: '1.0.0',
        source: 'repository-policy-document',
        path: '.forgegate/policies/acme-baseline.yaml',
        format: 'yaml',
        commit: gitStatusFixture.commit,
      });
      expect(snapshot.externalPolicyDocument.checksumSha256).toMatch(
        /^[a-f0-9]{64}$/,
      );
    });

    it('writes a real findings/<id>.json file for each real blocking reason passed in', async () => {
      invokeMock
        .mockResolvedValueOnce('/home/user/exports')
        .mockResolvedValueOnce(
          '/home/user/exports/acme.lib.button-1.0.0-evidence-uuid',
        );

      await service.exportEvidencePackage(
        manifest,
        [],
        ['No token mappings connected'],
      );

      const [, secondCallArgs] = invokeMock.mock.calls[1] as [
        string,
        { files: Record<string, string> },
      ];
      expect(Object.keys(secondCallArgs.files)).toContain(
        'findings/acme.lib.button-blocking-0.json',
      );
      const findingContent =
        secondCallArgs.files['findings/acme.lib.button-blocking-0.json'];
      expect(findingContent).toBeDefined();
      expect(JSON.parse(findingContent ?? '{}').description).toBe(
        'No token mappings connected',
      );
    });

    it('writes a real manual/<id>.json file for a manual review scoped to this component version', async () => {
      invokeMock
        .mockResolvedValueOnce('/home/user/exports')
        .mockResolvedValueOnce(
          '/home/user/exports/acme.lib.button-1.0.0-evidence-uuid',
        );

      await service.exportEvidencePackage(manifest, [], [], undefined, [
        {
          id: 'acme-button-keyboard-review',
          componentVersionId: 'acme.lib.button@1.0.0',
          procedureId: 'keyboard-and-screen-reader-review',
          procedureVersion: '1.0.0',
          reviewerIdentity: 'reviewer@example.com',
          date: '2026-01-01T00:00:00.000Z',
          operatingSystem: 'macOS 15',
          status: 'passed',
          commitOrFingerprint: 'a'.repeat(40),
        },
        {
          id: 'other-component-review',
          componentVersionId: 'acme.lib.card@1.0.0',
          procedureId: 'keyboard-and-screen-reader-review',
          procedureVersion: '1.0.0',
          reviewerIdentity: 'reviewer@example.com',
          date: '2026-01-01T00:00:00.000Z',
          operatingSystem: 'macOS 15',
          status: 'passed',
          commitOrFingerprint: 'a'.repeat(40),
        },
      ]);

      const [, secondCallArgs] = invokeMock.mock.calls[1] as [
        string,
        { files: Record<string, string> },
      ];
      expect(Object.keys(secondCallArgs.files)).toContain(
        'manual/acme-button-keyboard-review.json',
      );
      expect(Object.keys(secondCallArgs.files)).not.toContain(
        'manual/other-component-review.json',
      );
    });

    it("writes a real exceptions/<id>.json file for an exception approving one of this export's findings", async () => {
      invokeMock
        .mockResolvedValueOnce('/home/user/exports')
        .mockResolvedValueOnce(
          '/home/user/exports/acme.lib.button-1.0.0-evidence-uuid',
        );

      await service.exportEvidencePackage(
        manifest,
        [],
        ['No token mappings connected'],
        undefined,
        [],
        [
          {
            id: 'acme-button-token-exception',
            findingId: 'acme.lib.button-blocking-0',
            approvedBy: 'lead-reviewer@example.com',
            approvedAt: '2026-01-01T00:00:00.000Z',
            rationale: 'Risk accepted until next sprint.',
          },
        ],
      );

      const [, secondCallArgs] = invokeMock.mock.calls[1] as [
        string,
        { files: Record<string, string> },
      ];
      expect(Object.keys(secondCallArgs.files)).toContain(
        'exceptions/acme-button-token-exception.json',
      );
    });

    it('reports a write failure without leaving the running flag stuck', async () => {
      invokeMock
        .mockResolvedValueOnce('/home/user/exports')
        .mockRejectedValueOnce(
          'Failed to write manifest.json: permission denied',
        );

      await service.exportEvidencePackage(manifest, []);

      expect(service.evidenceExportError()).toBe(
        'Failed to write manifest.json: permission denied',
      );
      expect(service.evidenceExportResult()).toBeNull();
      expect(service.evidenceExportRunning()).toBe(false);
    });
  });

  describe('filesystem watch', () => {
    async function selectWithScanFixture(): Promise<void> {
      invokeMock
        .mockResolvedValueOnce('D:/repos/ForgeGate')
        .mockResolvedValueOnce(gitStatusFixture)
        .mockResolvedValueOnce(scanFixture)
        .mockResolvedValueOnce(null);
      await service.selectWorkspace();
      invokeMock.mockReset();
    }

    it('starts a real watch over the directories computed from the real scan, after a successful selection', async () => {
      invokeMock
        .mockResolvedValueOnce('D:/repos/ForgeGate')
        .mockResolvedValueOnce(gitStatusFixture)
        .mockResolvedValueOnce(scanFixture)
        .mockResolvedValueOnce(null);

      await service.selectWorkspace();

      const watchCall = invokeMock.mock.calls.find(
        ([name]) => name === 'start_workspace_watch',
      );
      expect(watchCall).toBeDefined();
      const [, args] = watchCall as [
        string,
        { workspacePath: string; directories: unknown[] },
      ];
      expect(args.workspacePath).toBe('D:/repos/ForgeGate');
      expect(args.directories).toEqual([
        { path: '.', recursive: false },
        { path: 'packages/design-system', recursive: true },
      ]);
    });

    it('records the watch as an honest unavailable adapter diagnostic on failure, without failing the scan', async () => {
      invokeMock
        .mockResolvedValueOnce('D:/repos/ForgeGate')
        .mockResolvedValueOnce(gitStatusFixture)
        .mockResolvedValueOnce(scanFixture)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          configured: false,
          connected: false,
          snapshots: [],
          error: null,
        })
        .mockRejectedValueOnce('No real directory could be watched');

      await service.selectWorkspace();

      expect(service.workspaceScan()).not.toBeNull();
      const diagnostic = service
        .adapterDiagnostics()
        .find((entry) => entry.id === 'workspace-watch');
      expect(diagnostic?.status).toBe('unavailable');
      expect(diagnostic?.error).toBe('No real directory could be watched');
    });

    it('sets filesystemChangesDetected from a real workspace-changed event', async () => {
      let emitChange!: (payload: {
        changedPaths: string[];
        truncated: boolean;
      }) => void;
      listenMock.mockImplementation(
        async (eventName: string, handler: (event: unknown) => void) => {
          if (eventName === 'workspace-changed') {
            emitChange = (payload) => handler({ payload });
          }
          return vi.fn();
        },
      );

      await selectWithScanFixture();

      expect(emitChange).toBeDefined();
      emitChange({ changedPaths: ['src/acme-button.ts'], truncated: false });

      expect(service.filesystemChangesDetected()).toEqual({
        paths: ['src/acme-button.ts'],
        truncated: false,
      });
    });

    it('does nothing if asked to rescan when no workspace is open', async () => {
      await service.rescanWorkspace();
      expect(invokeMock).not.toHaveBeenCalled();
    });

    it('rescans the already-open workspace with no folder dialog, and clears any pending change notice first', async () => {
      await selectWithScanFixture();
      service.filesystemChangesDetected.set({
        paths: ['x.ts'],
        truncated: false,
      });

      invokeMock
        .mockResolvedValueOnce(gitStatusFixture)
        .mockResolvedValueOnce(scanFixture)
        .mockResolvedValueOnce(null);

      await service.rescanWorkspace();

      expect(invokeMock).not.toHaveBeenCalledWith('select_workspace');
      expect(service.workspacePath()).toBe('D:/repos/ForgeGate');
      expect(service.filesystemChangesDetected()).toBeNull();
    });

    it('marks justRescanned true after a real rescan completes, for the P1.8 rescan-triggered entrance', async () => {
      await selectWithScanFixture();
      expect(service.justRescanned()).toBe(false);

      invokeMock
        .mockResolvedValueOnce(gitStatusFixture)
        .mockResolvedValueOnce(scanFixture)
        .mockResolvedValueOnce(null);

      await service.rescanWorkspace();

      expect(service.justRescanned()).toBe(true);
    });

    it('never sets justRescanned after the initial open — there is nothing to refresh yet', async () => {
      await selectWithScanFixture();

      expect(service.justRescanned()).toBe(false);
    });

    it('does not set justRescanned when a rescan fails', async () => {
      await selectWithScanFixture();

      invokeMock.mockRejectedValueOnce('Permission denied');

      await service.rescanWorkspace();

      expect(service.justRescanned()).toBe(false);
    });

    it('sets justRescanned true again for a second rapid rescan, once the consumer has reset it from the first', async () => {
      await selectWithScanFixture();

      invokeMock
        .mockResolvedValueOnce(gitStatusFixture)
        .mockResolvedValueOnce(scanFixture)
        .mockResolvedValueOnce(null);
      await service.rescanWorkspace();
      expect(service.justRescanned()).toBe(true);

      // The consuming view resets this on its own animation's
      // animationend, the same way SystemMap does, before the next real
      // rescan would realistically finish.
      service.justRescanned.set(false);

      invokeMock
        .mockResolvedValueOnce(gitStatusFixture)
        .mockResolvedValueOnce(scanFixture)
        .mockResolvedValueOnce(null);
      await service.rescanWorkspace();

      expect(service.justRescanned()).toBe(true);
    });

    it('clears the change notice without rescanning when dismissed', async () => {
      await selectWithScanFixture();
      service.filesystemChangesDetected.set({
        paths: ['x.ts'],
        truncated: false,
      });

      service.dismissFilesystemChanges();

      expect(service.filesystemChangesDetected()).toBeNull();
      expect(invokeMock).not.toHaveBeenCalled();
    });
  });

  describe('loadComponentEvidenceEvents', () => {
    it('does nothing and clears the signal if no workspace is open', async () => {
      service.componentEvidenceEvents.set({
        configured: true,
        connected: true,
        events: [],
        error: null,
      });

      await service.loadComponentEvidenceEvents('acme.design-system.button');

      expect(service.componentEvidenceEvents()).toBeNull();
      expect(invokeMock).not.toHaveBeenCalled();
    });

    it('loads real recorded readiness-change events for the given component', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      const events = {
        configured: true,
        connected: true,
        events: [
          {
            occurredAt: '2026-06-01T10:00:00Z',
            eventKind: 'readiness-changed',
            previousReadiness: 'clear',
            nextReadiness: 'stale',
            previousCommit: 'a'.repeat(40),
            nextCommit: 'b'.repeat(40),
          },
        ],
        error: null,
      };
      invokeMock.mockResolvedValueOnce(events);

      await service.loadComponentEvidenceEvents('acme.design-system.button');

      expect(invokeMock).toHaveBeenCalledWith(
        'read_component_evidence_events',
        {
          path: 'D:/repos/ForgeGate',
          componentId: 'acme.design-system.button',
        },
      );
      expect(service.componentEvidenceEvents()).toEqual(events);
    });

    it('surfaces a real IPC failure as a connection error rather than throwing', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      invokeMock.mockRejectedValueOnce('Failed to connect to Postgres');

      await service.loadComponentEvidenceEvents('acme.design-system.button');

      expect(service.componentEvidenceEvents()).toEqual({
        configured: true,
        connected: false,
        events: [],
        error: 'Failed to connect to Postgres',
      });
    });
  });

  describe('stageManualReview / approveStagedManualReview / discardStagedManualReview', () => {
    const componentId = 'acme.design-system.acme-button';
    const review = {
      id: 'acme.design-system.acme-button-keyboard-and-screen-reader-review-1',
      componentVersionId: 'acme.design-system.acme-button@0.1.0',
      procedureId: 'keyboard-and-screen-reader-review',
      procedureVersion: '1.0.0',
      reviewerIdentity: 'reviewer@acme.example',
      date: '2026-07-24T16:00:00.000Z',
      operatingSystem: 'Windows',
      status: 'passed' as const,
      commitOrFingerprint: 'a'.repeat(40),
    };
    const stagedReviewWrite = {
      stagingId: 'stg-1',
      subdirectory: 'manual-reviews',
      filename: `${review.id}.json`,
      previousContent: null,
      newContent: JSON.stringify(review, null, 2),
    };

    it('does nothing if no workspace is open', async () => {
      await service.stageManualReview(review, componentId);

      expect(invokeMock).not.toHaveBeenCalled();
    });

    it('stages a real manual review write without touching manualReviews or writing anything real', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      invokeMock.mockResolvedValueOnce(stagedReviewWrite);

      await service.stageManualReview(review, componentId);

      expect(invokeMock).toHaveBeenCalledWith('stage_manual_review', {
        workspacePath: 'D:/repos/ForgeGate',
        reviewId: review.id,
        content: JSON.stringify(review, null, 2),
      });
      expect(service.stagedManualReview()).toEqual({
        review,
        componentId,
        reviewWrite: stagedReviewWrite,
        findingWrites: [],
      });
      expect(service.manualReviews()).toEqual([]);
      expect(service.saveManualReviewRunning()).toBe(false);
    });

    it('surfaces a real staging failure without losing the running flag', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      invokeMock.mockRejectedValueOnce('Permission denied');

      await service.stageManualReview(review, componentId);

      expect(service.saveManualReviewError()).toBe('Permission denied');
      expect(service.saveManualReviewRunning()).toBe(false);
      expect(service.stagedManualReview()).toBeNull();
    });

    it('does nothing if a stage is already running', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.saveManualReviewRunning.set(true);

      await service.stageManualReview(review, componentId);

      expect(invokeMock).not.toHaveBeenCalled();
    });

    it('stages no finding when every step passed', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      invokeMock.mockResolvedValueOnce(stagedReviewWrite);

      await service.stageManualReview(
        {
          ...review,
          stepResults: [
            {
              stepIndex: 0,
              action: 'Move focus using Tab.',
              expected: 'Focus moves to the button.',
              status: 'passed',
            },
          ],
        },
        componentId,
      );

      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(invokeMock).not.toHaveBeenCalledWith(
        'stage_finding',
        expect.anything(),
      );
      expect(service.stagedManualReview()?.findingWrites).toEqual([]);
    });

    it('stages one linked finding per failed or blocked step without touching findings', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      const reviewWithFailure = {
        ...review,
        stepResults: [
          {
            stepIndex: 0,
            action: 'Move focus using Tab.',
            expected: 'Focus moves to the button.',
            status: 'passed' as const,
          },
          {
            stepIndex: 1,
            action: 'Activate using Space.',
            expected: 'The configured action occurs exactly once.',
            status: 'failed' as const,
            note: 'Activation fired twice.',
          },
        ],
      };
      const stagedFindingWrite = {
        stagingId: 'stg-2',
        subdirectory: 'findings',
        filename: `${review.id}-step-1.json`,
        previousContent: null,
        newContent: 'irrelevant for this assertion',
      };
      invokeMock
        .mockResolvedValueOnce(stagedReviewWrite)
        .mockResolvedValueOnce(stagedFindingWrite);

      await service.stageManualReview(reviewWithFailure, componentId);

      expect(invokeMock).toHaveBeenNthCalledWith(2, 'stage_finding', {
        workspacePath: 'D:/repos/ForgeGate',
        findingId: `${review.id}-step-1`,
        content: expect.stringContaining('"status": "open"'),
      });
      const staged = service.stagedManualReview();
      expect(staged?.findingWrites).toHaveLength(1);
      expect(staged?.findingWrites[0]?.finding).toMatchObject({
        id: `${review.id}-step-1`,
        componentId,
        sourceEvidenceId: review.id,
        standardOrPolicyRef: review.procedureId,
        severity: 'serious',
      });
      expect(staged?.findingWrites[0]?.write).toEqual(stagedFindingWrite);
      expect(service.findings()).toEqual([]);
    });

    it('surfaces a finding staging failure without ever setting a staged review', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      invokeMock
        .mockResolvedValueOnce(stagedReviewWrite)
        .mockRejectedValueOnce('Permission denied');

      await service.stageManualReview(
        {
          ...review,
          stepResults: [
            {
              stepIndex: 0,
              action: 'Activate using Space.',
              expected: 'The configured action occurs exactly once.',
              status: 'blocked',
            },
          ],
        },
        componentId,
      );

      expect(service.saveManualReviewError()).toBe('Permission denied');
      expect(service.stagedManualReview()).toBeNull();
      expect(service.manualReviews()).toEqual([]);
      expect(service.findings()).toEqual([]);
    });

    it('approves a staged review and its findings, updates manualReviews/findings, and clears staged state', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      const finding = {
        id: `${review.id}-step-1`,
        componentId,
        description: 'x',
        severity: 'serious' as const,
        status: 'open' as const,
      };
      const stagedFindingWrite = {
        stagingId: 'stg-2',
        subdirectory: 'findings',
        filename: `${review.id}-step-1.json`,
        previousContent: null,
        newContent: JSON.stringify(finding, null, 2),
      };
      service.stagedManualReview.set({
        review,
        componentId,
        reviewWrite: stagedReviewWrite,
        findingWrites: [{ finding, write: stagedFindingWrite }],
      });
      invokeMock
        .mockResolvedValueOnce(
          `D:/repos/ForgeGate/.forgegate/manual-reviews/${review.id}.json`,
        )
        .mockResolvedValueOnce(
          `D:/repos/ForgeGate/.forgegate/findings/${finding.id}.json`,
        );

      await service.approveStagedManualReview();

      expect(invokeMock).toHaveBeenNthCalledWith(
        1,
        'approve_staged_evidence_write',
        {
          workspacePath: 'D:/repos/ForgeGate',
          stagingId: 'stg-1',
          subdirectory: 'manual-reviews',
          filename: stagedReviewWrite.filename,
        },
      );
      expect(invokeMock).toHaveBeenNthCalledWith(
        2,
        'approve_staged_evidence_write',
        {
          workspacePath: 'D:/repos/ForgeGate',
          stagingId: 'stg-2',
          subdirectory: 'findings',
          filename: stagedFindingWrite.filename,
        },
      );
      expect(service.manualReviews()).toEqual([review]);
      expect(service.findings()).toEqual([finding]);
      expect(service.stagedManualReview()).toBeNull();
      expect(service.approveManualReviewRunning()).toBe(false);
    });

    it('does nothing to approve when there is no staged review', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');

      await service.approveStagedManualReview();

      expect(invokeMock).not.toHaveBeenCalled();
    });

    it('surfaces an approval failure without silently clearing the staged review', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.stagedManualReview.set({
        review,
        componentId,
        reviewWrite: stagedReviewWrite,
        findingWrites: [],
      });
      invokeMock.mockRejectedValueOnce('Permission denied');

      await service.approveStagedManualReview();

      expect(service.approveManualReviewError()).toBe('Permission denied');
      expect(service.stagedManualReview()).not.toBeNull();
      expect(service.manualReviews()).toEqual([]);
    });

    it('discards a staged review and its findings without ever committing them', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      const stagedFindingWrite = {
        stagingId: 'stg-2',
        subdirectory: 'findings',
        filename: 'x.json',
        previousContent: null,
        newContent: '{}',
      };
      service.stagedManualReview.set({
        review,
        componentId,
        reviewWrite: stagedReviewWrite,
        findingWrites: [
          {
            finding: {
              id: 'x',
              componentId,
              description: 'x',
              severity: 'serious',
              status: 'open',
            },
            write: stagedFindingWrite,
          },
        ],
      });
      invokeMock.mockResolvedValue(undefined);

      await service.discardStagedManualReview();

      expect(invokeMock).toHaveBeenNthCalledWith(
        1,
        'discard_staged_evidence_write',
        { workspacePath: 'D:/repos/ForgeGate', stagingId: 'stg-1' },
      );
      expect(invokeMock).toHaveBeenNthCalledWith(
        2,
        'discard_staged_evidence_write',
        { workspacePath: 'D:/repos/ForgeGate', stagingId: 'stg-2' },
      );
      expect(service.stagedManualReview()).toBeNull();
      expect(service.manualReviews()).toEqual([]);
      expect(service.findings()).toEqual([]);
    });

    it('does nothing to discard when there is no staged review', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');

      await service.discardStagedManualReview();

      expect(invokeMock).not.toHaveBeenCalled();
    });
  });

  describe('stageReleaseDecisionHistory / approveStagedReleaseDecision / discardStagedReleaseDecision', () => {
    const manifest = createComponentManifest({
      id: 'acme.design-system.acme-button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
      lifecycle: 'candidate',
      policyId: 'acme.baseline',
      policyVersion: '1.0.0',
    });
    const stagedWrite = {
      stagingId: 'stg-1',
      subdirectory: 'release-decisions',
      filename:
        'acme.design-system.acme-button-release-decision-workflow-record.json',
      previousContent: null,
      newContent: '{"outcome":"blocked"}',
    };

    it('stages a blocked release-decision workflow record into repository history', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.gitStatus.set(gitStatusFixture);
      service.testExecutions.set([
        {
          id: 'unit-run',
          componentVersionId: 'acme.design-system.acme-button@1.0.0',
          gate: 'unit',
          tool: 'vitest',
          toolVersion: '4.1.10',
          adapterVersion: '0.1.0',
          status: 'passed',
          startedAt: '2026-08-02T16:00:00.000Z',
          commitOrFingerprint: gitStatusFixture.commit,
        },
      ]);
      invokeMock.mockResolvedValueOnce(stagedWrite);

      await service.stageReleaseDecisionHistory(manifest, [
        'No manual review is current.',
      ]);

      expect(invokeMock).toHaveBeenCalledWith('stage_release_decision', {
        workspacePath: 'D:/repos/ForgeGate',
        decisionId:
          'acme.design-system.acme-button-release-decision-workflow-record',
        content: expect.stringContaining(
          '"authorization": "blocked-no-approval-required"',
        ),
      });
      expect(invokeMock.mock.calls[0]?.[1].content).toContain(
        '"evidenceIds": [\n    "unit-run"\n  ]',
      );
      expect(service.stagedReleaseDecision()).toMatchObject({
        componentId: manifest.id,
        write: stagedWrite,
        record: {
          outcome: 'blocked',
          policyId: 'acme.baseline',
          policyVersion: '1.0.0',
          notRealApproval: false,
        },
      });
    });

    it('refuses to stage a clean release candidate without a real approver', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.gitStatus.set(gitStatusFixture);

      await service.stageReleaseDecisionHistory(manifest, []);

      expect(invokeMock).not.toHaveBeenCalled();
      expect(service.stagedReleaseDecision()).toBeNull();
      expect(service.stageReleaseDecisionError()).toContain(
        'requires a named approver',
      );
    });

    it('approves a staged release decision and updates loaded release history', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.stagedReleaseDecision.set({
        componentId: manifest.id,
        write: stagedWrite,
        record: {
          id: 'acme.design-system.acme-button-release-decision-workflow-record',
          decisionId: 'acme.design-system.acme-button-release-decision',
          componentVersionId: 'acme.design-system.acme-button@1.0.0',
          policyId: 'acme.baseline',
          policyVersion: '1.0.0',
          outcome: 'blocked',
          commit: gitStatusFixture.commit,
          decidedAt: '2026-08-02T16:00:00.000Z',
          source: 'forgegate-export-evaluation',
          authorization: 'blocked-no-approval-required',
          notRealApproval: false,
          evidenceIds: ['unit-run'],
          blockingFindingIds: ['acme.design-system.acme-button-blocking-0'],
          limitations: [],
        },
      });
      invokeMock.mockResolvedValueOnce(
        'D:/repos/ForgeGate/.forgegate/release-decisions/acme.design-system.acme-button-release-decision-workflow-record.json',
      );

      await service.approveStagedReleaseDecision();

      expect(invokeMock).toHaveBeenCalledWith('approve_staged_evidence_write', {
        workspacePath: 'D:/repos/ForgeGate',
        stagingId: stagedWrite.stagingId,
        subdirectory: 'release-decisions',
        filename:
          'acme.design-system.acme-button-release-decision-workflow-record.json',
      });
      expect(service.releaseDecisionRecords()).toHaveLength(1);
      expect(service.stagedReleaseDecision()).toBeNull();
      expect(service.saveReleaseDecisionResult()?.path).toContain(
        '.forgegate/release-decisions',
      );
    });

    it('discards a staged release decision without writing repository history', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.stagedReleaseDecision.set({
        componentId: manifest.id,
        write: stagedWrite,
        record: {
          id: 'acme.design-system.acme-button-release-decision-workflow-record',
          decisionId: 'acme.design-system.acme-button-release-decision',
          componentVersionId: 'acme.design-system.acme-button@1.0.0',
          policyId: 'acme.baseline',
          policyVersion: '1.0.0',
          outcome: 'blocked',
          commit: gitStatusFixture.commit,
          decidedAt: '2026-08-02T16:00:00.000Z',
          source: 'forgegate-export-evaluation',
          authorization: 'blocked-no-approval-required',
          notRealApproval: false,
          evidenceIds: [],
          blockingFindingIds: [],
          limitations: [],
        },
      });

      await service.discardStagedReleaseDecision();

      expect(invokeMock).toHaveBeenCalledWith('discard_staged_evidence_write', {
        workspacePath: 'D:/repos/ForgeGate',
        stagingId: stagedWrite.stagingId,
      });
      expect(service.stagedReleaseDecision()).toBeNull();
    });
  });

  describe('generateAndStageStarlightPage / approveStagedStarlightPage / discardStagedStarlightPage', () => {
    const manifest = createComponentManifest({
      id: 'acme.design-system.acme-button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: '.',
      componentVersion: '1.0.0',
      lifecycle: 'candidate',
    });
    const stagedPageWrite = {
      stagingId: 'stg-1',
      relativePath:
        'apps/starlight/src/content/docs/components/acme-button--for-designers.mdx',
      previousContent: null,
      newContent: '# Acme Button',
    };
    const stagedReportDataWrite = {
      stagingId: 'stg-2',
      relativePath:
        'apps/starlight/src/data/forgegate/components/acme-button--for-designers.json',
      previousContent: null,
      newContent: '{"componentId":"acme.design-system.acme-button"}\n',
    };
    const stagedRegistryReportDataWrite = {
      stagingId: 'stg-3',
      relativePath: 'apps/starlight/src/data/forgegate/components/index.json',
      previousContent: null,
      newContent: '{"componentCount":1}\n',
    };
    const stagedAttachmentReviewWrite = {
      stagingId: 'stg-4',
      relativePath:
        '.forgegate/attachment-reviews/acme.design-system.acme-button-designer-imported-attachments.json',
      previousContent: null,
      newContent: '{"kind":"forgegate.imported-attachment-review"}\n',
    };

    it('does nothing if no workspace is open', async () => {
      await service.generateAndStageStarlightPage(manifest);

      expect(invokeMock).not.toHaveBeenCalled();
    });

    it('surfaces an honest error when no Starlight project was detected', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.workspaceScan.set({ ...scanFixture, starlightProjects: [] });

      await service.generateAndStageStarlightPage(manifest);

      expect(invokeMock).not.toHaveBeenCalled();
      expect(service.starlightPageError()).toBe(
        'No Starlight project detected in this workspace.',
      );
      expect(service.stagedStarlightPage()).toBeNull();
    });

    it("generates and stages a real page at the detected project's conventional path", async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.workspaceScan.set({
        ...scanFixture,
        starlightProjects: ['apps/starlight'],
      });
      service.testExecutions.set([
        {
          id: 'axe-acme-button',
          componentVersionId: 'acme.design-system.acme-button@1.0.0',
          gate: 'accessibility',
          tool: 'axe',
          toolVersion: '4.9.0',
          adapterVersion: '0.1.0',
          status: 'passed',
          startedAt: '2026-07-31T12:00:00.000Z',
          commitOrFingerprint: 'abc123',
        },
      ]);
      service.manualReviews.set([
        {
          id: 'review-acme-button',
          componentVersionId: 'acme.design-system.acme-button@1.0.0',
          procedureId: 'keyboard-and-screen-reader-review',
          procedureVersion: '1.0.0',
          reviewerIdentity: 'designer@example.test',
          date: '2026-07-31',
          operatingSystem: 'Windows 11',
          status: 'passed',
          commitOrFingerprint: 'abc123',
        },
      ]);
      service.findings.set([
        {
          id: 'acme-button-focus-visible',
          componentId: 'acme.design-system.acme-button',
          description: 'Focus-visible treatment needs stronger contrast.',
          severity: 'moderate',
          status: 'open',
        },
      ]);
      invokeMock
        .mockRejectedValueOnce('not a file')
        .mockResolvedValueOnce(stagedPageWrite)
        .mockResolvedValueOnce(stagedReportDataWrite);

      await service.generateAndStageStarlightPage(manifest);

      expect(invokeMock).toHaveBeenNthCalledWith(1, 'read_text_file', {
        workspacePath: 'D:/repos/ForgeGate',
        relativePath:
          'apps/starlight/src/content/docs/components/acme-button--for-designers.mdx',
      });
      expect(invokeMock).toHaveBeenNthCalledWith(2, 'stage_starlight_page', {
        workspacePath: 'D:/repos/ForgeGate',
        relativePath:
          'apps/starlight/src/content/docs/components/acme-button--for-designers.mdx',
        content: expect.stringContaining(
          'componentId: "acme.design-system.acme-button"',
        ),
      });
      expect(invokeMock.mock.calls[1]?.[1].content).toContain(
        'import forgegateReport from "../../../data/forgegate/components/acme-button--for-designers.json";',
      );
      expect(invokeMock).toHaveBeenNthCalledWith(3, 'stage_starlight_page', {
        workspacePath: 'D:/repos/ForgeGate',
        relativePath:
          'apps/starlight/src/data/forgegate/components/acme-button--for-designers.json',
        content: expect.stringContaining(
          '"componentId": "acme.design-system.acme-button"',
        ),
      });
      expect(invokeMock.mock.calls[2]?.[1].content).toContain(
        '"id": "axe-acme-button"',
      );
      expect(invokeMock.mock.calls[2]?.[1].content).toContain(
        '".forgegate/components/acme.design-system.acme-button.yaml"',
      );
      expect(invokeMock.mock.calls[2]?.[1].content).toContain(
        '"id": "review-acme-button"',
      );
      expect(invokeMock.mock.calls[2]?.[1].content).toContain(
        'Focus-visible treatment needs stronger contrast.',
      );
      expect(service.stagedStarlightPage()).toEqual({
        componentId: manifest.id,
        template: 'designer',
        write: stagedPageWrite,
        writes: [stagedPageWrite, stagedReportDataWrite],
      });
      expect(service.starlightPageRunning()).toBe(false);
    });

    it('imports a verified evidence package and stages regenerated Starlight data from it', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.workspaceScan.set({
        ...scanFixture,
        starlightProjects: ['apps/starlight'],
      });
      const files = await evidencePackageFiles({
        'test-summary.json': JSON.stringify([
          {
            id: 'package-unit-run',
            componentVersionId: 'acme.design-system.acme-button@1.0.0',
            gate: 'unit',
            tool: 'vitest',
            toolVersion: '4.1.10',
            adapterVersion: '0.1.0',
            status: 'passed',
            startedAt: '2026-08-02T12:00:00.000Z',
            commitOrFingerprint: 'b'.repeat(40),
          },
        ]),
        'automated/details.json': JSON.stringify([
          {
            id: 'package-unit-run-detail',
            sourceArtifactId: 'package-unit-run',
            kind: 'vitest-json',
            gate: 'unit',
            tool: 'vitest',
            summary: 'Vitest reported 5 passed tests.',
            metrics: [{ label: 'Passed', value: 5 }],
            observations: [],
            limitations: ['Loaded from package.'],
          },
        ]),
        'release-decisions/acme-button-release-workflow-record.json':
          JSON.stringify({
            id: 'acme-button-release-workflow-record',
            decisionId: 'acme-button-release-decision',
            componentVersionId: 'acme.design-system.acme-button@1.0.0',
            policyId: 'acme.baseline',
            policyVersion: '1.0.0',
            outcome: 'blocked',
            commit: 'b'.repeat(40),
            decidedAt: '2026-08-02T13:00:00.000Z',
            source: 'forgegate-export-evaluation',
            authorization: 'blocked-no-approval-required',
            notRealApproval: false,
            evidenceIds: ['package-unit-run'],
            blockingFindingIds: [],
            limitations: [],
          }),
      });
      invokeMock
        .mockResolvedValueOnce('D:/exports/acme-button-evidence')
        .mockResolvedValueOnce(files)
        .mockRejectedValueOnce('not a file')
        .mockResolvedValueOnce(stagedPageWrite)
        .mockResolvedValueOnce(stagedReportDataWrite);

      await service.importEvidencePackageAndStageStarlightPage(manifest);

      expect(invokeMock).toHaveBeenNthCalledWith(
        1,
        'pick_evidence_package_directory',
      );
      expect(invokeMock).toHaveBeenNthCalledWith(
        2,
        'read_evidence_package_files',
        { packageDirectory: 'D:/exports/acme-button-evidence' },
      );
      expect(invokeMock).toHaveBeenNthCalledWith(5, 'stage_starlight_page', {
        workspacePath: 'D:/repos/ForgeGate',
        relativePath:
          'apps/starlight/src/data/forgegate/components/acme-button--for-designers.json',
        content: expect.stringContaining('"id": "package-unit-run"'),
      });
      expect(invokeMock.mock.calls[4]?.[1].content).toContain(
        'Vitest reported 5 passed tests.',
      );
      expect(invokeMock.mock.calls[4]?.[1].content).toContain(
        '"authorization": "blocked-no-approval-required"',
      );
      expect(service.starlightEvidencePackageImportResult()).toMatchObject({
        directoryPath: 'D:/exports/acme-button-evidence',
        integrityStatus: 'verified',
        testExecutionCount: 1,
        automatedDetailCount: 1,
        releaseDecisionRecordCount: 1,
        copiedAttachmentFileCount: 0,
      });
      expect(service.stagedStarlightPage()).toEqual({
        componentId: manifest.id,
        template: 'designer',
        write: stagedPageWrite,
        writes: [stagedPageWrite, stagedReportDataWrite],
      });
    });

    it('does not stage Starlight output when package integrity is unavailable', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.workspaceScan.set({
        ...scanFixture,
        starlightProjects: ['apps/starlight'],
      });
      invokeMock
        .mockResolvedValueOnce('D:/exports/broken-package')
        .mockResolvedValueOnce({ 'test-summary.json': '[]' });

      await service.importEvidencePackageAndStageStarlightPage(manifest);

      expect(invokeMock).toHaveBeenCalledTimes(2);
      expect(service.starlightEvidencePackageImportError()).toContain(
        'manifest.json is not present',
      );
      expect(service.stagedStarlightPage()).toBeNull();
    });

    it('pauses imported Starlight regeneration for copied attachment review', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.workspaceScan.set({
        ...scanFixture,
        starlightProjects: ['apps/starlight'],
      });
      const files = await evidencePackageFiles({
        'test-summary.json': JSON.stringify([
          {
            id: 'package-unit-run',
            componentVersionId: 'acme.design-system.acme-button@1.0.0',
            gate: 'unit',
            tool: 'vitest',
            toolVersion: '4.1.10',
            adapterVersion: '0.1.0',
            status: 'passed',
            startedAt: '2026-08-02T12:00:00.000Z',
            commitOrFingerprint: 'b'.repeat(40),
            rawArtifactRef: '.forgegate/evidence/raw/unit-run.txt',
          },
        ]),
        'automated/details.json': '[]',
        'attachments/index.json': JSON.stringify({
          attachments: [
            {
              id: 'package-unit-run-attachment',
              sourceEvidenceId: 'package-unit-run',
              sourcePath: '.forgegate/evidence/raw/unit-run.txt',
              targetPath: 'attachments/files/package-unit-run.txt',
              status: 'copied-redacted',
              redactionRequired: true,
            },
          ],
          limitations: [],
        }),
        'attachments/files/package-unit-run.txt':
          'TOKEN=[REDACTED]\nTests passed.',
      });
      invokeMock
        .mockResolvedValueOnce('D:/exports/acme-button-evidence')
        .mockResolvedValueOnce(files);

      await service.importEvidencePackageAndStageStarlightPage(manifest);

      expect(invokeMock).toHaveBeenCalledTimes(2);
      expect(service.stagedStarlightPage()).toBeNull();
      expect(service.starlightEvidencePackageAttachmentReview()).toMatchObject({
        directoryPath: 'D:/exports/acme-button-evidence',
        copiedAttachmentFiles: [
          expect.objectContaining({
            sourceEvidenceId: 'package-unit-run',
            targetPath: 'attachments/files/package-unit-run.txt',
            redactedPreview: 'TOKEN=[REDACTED]\nTests passed.',
            lineCount: 2,
            reviewStatus: 'requires-review',
            reviewDecision: 'excluded-from-report',
          }),
        ],
      });
      service.setStarlightEvidencePackageAttachmentDecision(
        'attachments/files/package-unit-run.txt',
        'approved-for-future-policy',
      );
      expect(
        service.starlightEvidencePackageAttachmentReview()
          ?.copiedAttachmentFiles[0]?.reviewDecision,
      ).toBe('approved-for-future-policy');

      invokeMock
        .mockRejectedValueOnce('not a file')
        .mockResolvedValueOnce(stagedPageWrite)
        .mockResolvedValueOnce(stagedReportDataWrite)
        .mockResolvedValueOnce(stagedAttachmentReviewWrite);

      await service.continueStarlightEvidencePackageImportWithoutAttachments();

      expect(service.starlightEvidencePackageAttachmentReview()).toBeNull();
      expect(invokeMock).toHaveBeenNthCalledWith(5, 'stage_starlight_page', {
        workspacePath: 'D:/repos/ForgeGate',
        relativePath:
          'apps/starlight/src/data/forgegate/components/acme-button--for-designers.json',
        content: expect.stringContaining('"id": "package-unit-run"'),
      });
      expect(invokeMock.mock.calls[4]?.[1].content).not.toContain(
        'attachments/files/package-unit-run.txt',
      );
      expect(invokeMock).toHaveBeenNthCalledWith(6, 'stage_starlight_page', {
        workspacePath: 'D:/repos/ForgeGate',
        relativePath:
          '.forgegate/attachment-reviews/acme.design-system.acme-button-designer-imported-attachments.json',
        content: expect.stringContaining(
          '"kind": "forgegate.imported-attachment-review"',
        ),
      });
      const reviewRecord = JSON.parse(invokeMock.mock.calls[5]?.[1].content);
      expect(reviewRecord.attachments).toEqual([
        expect.objectContaining({
          sourceEvidenceId: 'package-unit-run',
          targetPath: 'attachments/files/package-unit-run.txt',
          reviewDecision: 'approved-for-future-policy',
        }),
      ]);
      expect(JSON.stringify(reviewRecord)).not.toContain('TOKEN=[REDACTED]');
      expect(service.stagedStarlightPage()).toEqual({
        componentId: manifest.id,
        template: 'designer',
        write: stagedPageWrite,
        writes: [
          stagedPageWrite,
          stagedReportDataWrite,
          stagedAttachmentReviewWrite,
        ],
      });
    });

    it('discards a copied attachment package review without staging output', async () => {
      service.starlightEvidencePackageAttachmentReview.set({
        directoryPath: 'D:/exports/acme-button-evidence',
        copiedAttachmentFiles: [
          {
            sourceEvidenceId: 'package-unit-run',
            sourcePath: '.forgegate/evidence/raw/unit-run.txt',
            targetPath: 'attachments/files/package-unit-run.txt',
            redactionRequired: true,
            sizeBytes: 31,
            lineCount: 2,
            redactedPreview: 'TOKEN=[REDACTED]\nTests passed.',
            previewTruncated: false,
            reviewStatus: 'requires-review',
            reviewDecision: 'excluded-from-report',
          },
        ],
        limitation: 'Copied attachment files require review.',
      });

      service.discardStarlightEvidencePackageAttachmentReview();

      expect(service.starlightEvidencePackageAttachmentReview()).toBeNull();
      expect(service.stagedStarlightPage()).toBeNull();
    });

    it('derives the default Starlight template from repository adapter configuration', () => {
      service.repositoryConfig.set({
        configVersion: '0.1.0',
        projectMappings: [],
        packageMappings: [],
        commandMappings: {},
        documentationMappings: {},
        adapterConfiguration: {
          starlight: {
            defaultAudience: 'balanced',
            packageAudiences: {
              '.': 'developer-heavy',
            },
            componentAudiences: {
              'acme.design-system.acme-button': 'designer-heavy',
            },
          },
        },
        ignorePatterns: [],
        safeWriteLocations: ['apps/starlight/src/content/docs/**'],
      });

      expect(service.starlightDefaultTemplateFor(manifest)).toBe('designer');
      expect(
        service.starlightDefaultTemplateFor(
          createComponentManifest({
            id: 'acme.design-system.acme-card',
            framework: 'web-components',
            adapter: 'framework.web-components',
            packagePath: '.',
          }),
        ),
      ).toBe('developer');
    });

    it('generates and stages a registry index without reading a protected component overview', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.workspaceScan.set({
        ...scanFixture,
        starlightProjects: ['apps/starlight'],
      });
      const registryWrite = {
        ...stagedPageWrite,
        relativePath: 'apps/starlight/src/content/docs/components/index.mdx',
      };
      invokeMock
        .mockResolvedValueOnce(registryWrite)
        .mockResolvedValueOnce(stagedRegistryReportDataWrite)
        .mockResolvedValueOnce(stagedReportDataWrite);

      await service.generateAndStageStarlightPage(manifest, 'registry-index', [
        manifest,
      ]);

      expect(invokeMock).toHaveBeenCalledTimes(3);
      expect(invokeMock).toHaveBeenNthCalledWith(1, 'stage_starlight_page', {
        workspacePath: 'D:/repos/ForgeGate',
        relativePath: 'apps/starlight/src/content/docs/components/index.mdx',
        content: expect.stringContaining(
          '<ComponentRegistry report={forgegateRegistry} />',
        ),
      });
      expect(invokeMock.mock.calls[0]?.[1].content).toContain(
        'import forgegateRegistry from "../../../data/forgegate/components/index.json";',
      );
      expect(invokeMock.mock.calls[0]?.[1].content).toContain(
        'import acmeButtonReport from "../../../data/forgegate/components/acme-button--for-designers.json";',
      );
      expect(invokeMock.mock.calls[0]?.[1].content).toContain(
        'report={acmeButtonReport}',
      );
      expect(invokeMock).toHaveBeenNthCalledWith(2, 'stage_starlight_page', {
        workspacePath: 'D:/repos/ForgeGate',
        relativePath: 'apps/starlight/src/data/forgegate/components/index.json',
        content: expect.stringContaining('"componentCount": 1'),
      });
      expect(invokeMock).toHaveBeenNthCalledWith(3, 'stage_starlight_page', {
        workspacePath: 'D:/repos/ForgeGate',
        relativePath:
          'apps/starlight/src/data/forgegate/components/acme-button--for-designers.json',
        content: expect.stringContaining(
          '"componentId": "acme.design-system.acme-button"',
        ),
      });
      expect(invokeMock.mock.calls[2]?.[1].content).toContain(
        '".forgegate/components/acme.design-system.acme-button.yaml"',
      );
      expect(service.stagedStarlightPage()).toEqual({
        componentId: null,
        template: 'registry-index',
        write: registryWrite,
        writes: [
          registryWrite,
          stagedRegistryReportDataWrite,
          stagedReportDataWrite,
        ],
      });
    });

    it('preserves a real prior overview section when regenerating over an existing page', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.workspaceScan.set({
        ...scanFixture,
        starlightProjects: ['apps/starlight'],
      });
      const existingPage = [
        '<!-- forgegate:user-content:start overview -->',
        'A real, human-authored purpose.',
        '<!-- forgegate:user-content:end overview -->',
      ].join('\n');
      invokeMock
        .mockResolvedValueOnce(existingPage)
        .mockResolvedValueOnce(stagedPageWrite)
        .mockResolvedValueOnce(stagedReportDataWrite);

      await service.generateAndStageStarlightPage(manifest);

      const stageCall = invokeMock.mock.calls[1];
      expect(stageCall?.[1].content).toContain(
        'A real, human-authored purpose.',
      );
    });

    it('surfaces a real staging failure without losing the running flag', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.workspaceScan.set({
        ...scanFixture,
        starlightProjects: ['apps/starlight'],
      });
      invokeMock
        .mockRejectedValueOnce('not a file')
        .mockRejectedValueOnce('Permission denied');

      await service.generateAndStageStarlightPage(manifest);

      expect(service.starlightPageError()).toBe('Permission denied');
      expect(service.starlightPageRunning()).toBe(false);
      expect(service.stagedStarlightPage()).toBeNull();
    });

    it('approves a staged page, updates the result, and clears staged state', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.stagedStarlightPage.set({
        componentId: manifest.id,
        template: 'designer',
        write: stagedPageWrite,
        writes: [stagedPageWrite, stagedReportDataWrite],
      });
      invokeMock
        .mockResolvedValueOnce(
          'D:/repos/ForgeGate/apps/starlight/src/content/docs/components/acme-button--for-designers.mdx',
        )
        .mockResolvedValueOnce(
          'D:/repos/ForgeGate/apps/starlight/src/data/forgegate/components/acme-button--for-designers.json',
        );

      await service.approveStagedStarlightPage();

      expect(invokeMock).toHaveBeenNthCalledWith(
        1,
        'approve_staged_relative_write',
        {
          workspacePath: 'D:/repos/ForgeGate',
          stagingId: 'stg-1',
          relativePath:
            'apps/starlight/src/content/docs/components/acme-button--for-designers.mdx',
        },
      );
      expect(invokeMock).toHaveBeenNthCalledWith(
        2,
        'approve_staged_relative_write',
        {
          workspacePath: 'D:/repos/ForgeGate',
          stagingId: 'stg-2',
          relativePath:
            'apps/starlight/src/data/forgegate/components/acme-button--for-designers.json',
        },
      );
      expect(service.starlightPageResult()).toEqual({
        path: 'D:/repos/ForgeGate/apps/starlight/src/content/docs/components/acme-button--for-designers.mdx',
      });
      expect(service.starlightBuildSkipped()).toBe(
        'No starlightBuild command is configured in .forgegate/config.yaml.',
      );
      expect(service.stagedStarlightPage()).toBeNull();
    });

    it('runs the configured Starlight build validation command after approval', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.repositoryConfig.set({
        configVersion: '0.1.0',
        projectMappings: [],
        packageMappings: [],
        commandMappings: {
          starlightBuild: 'pnpm nx run docs:build --configuration production',
        },
        documentationMappings: {},
        adapterConfiguration: {},
        ignorePatterns: [],
        safeWriteLocations: ['apps/starlight/src/content/docs/**'],
      });
      service.stagedStarlightPage.set({
        componentId: manifest.id,
        template: 'designer',
        write: stagedPageWrite,
        writes: [stagedPageWrite, stagedReportDataWrite],
      });
      const buildResult = {
        exitCode: 0,
        stdout: 'built',
        stderr: '',
        timedOut: false,
        cancelled: false,
        durationMs: 1200,
        artifactPath: 'C:/Temp/forgegate-artifacts/1.json',
      };
      invokeMock
        .mockResolvedValueOnce(
          'D:/repos/ForgeGate/apps/starlight/src/content/docs/components/acme-button--for-designers.mdx',
        )
        .mockResolvedValueOnce(
          'D:/repos/ForgeGate/apps/starlight/src/data/forgegate/components/acme-button--for-designers.json',
        )
        .mockResolvedValueOnce(buildResult);

      await service.approveStagedStarlightPage();

      expect(invokeMock).toHaveBeenNthCalledWith(
        1,
        'approve_staged_relative_write',
        {
          workspacePath: 'D:/repos/ForgeGate',
          stagingId: 'stg-1',
          relativePath:
            'apps/starlight/src/content/docs/components/acme-button--for-designers.mdx',
        },
      );
      expect(invokeMock).toHaveBeenNthCalledWith(
        2,
        'approve_staged_relative_write',
        {
          workspacePath: 'D:/repos/ForgeGate',
          stagingId: 'stg-2',
          relativePath:
            'apps/starlight/src/data/forgegate/components/acme-button--for-designers.json',
        },
      );
      expect(invokeMock).toHaveBeenNthCalledWith(3, 'run_workspace_command', {
        workspacePath: 'D:/repos/ForgeGate',
        relativeCwd: '',
        command: 'pnpm',
        args: ['nx', 'run', 'docs:build', '--configuration', 'production'],
        timeoutSeconds: 180,
      });
      expect(service.starlightBuildResult()).toEqual(buildResult);
      expect(service.starlightBuildSkipped()).toBeNull();
      expect(
        service
          .adapterDiagnostics()
          .find((diagnostic) => diagnostic.id === 'starlight-build-command'),
      ).toMatchObject({
        adapter: 'Starlight build validation',
        source: 'pnpm nx run docs:build --configuration production',
        status: 'loaded',
        error: null,
      });
      expect(
        service
          .adapterDiagnostics()
          .find((diagnostic) => diagnostic.id === 'starlight-build-command')
          ?.rawOutput,
      ).toContain('"validationMatrix"');
      expect(
        service
          .adapterDiagnostics()
          .find((diagnostic) => diagnostic.id === 'starlight-build-command')
          ?.rawOutput,
      ).toContain('"nx-command"');
    });

    it('records a configured Starlight build validation failure without undoing the approved page', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.repositoryConfig.set({
        configVersion: '0.1.0',
        projectMappings: [],
        packageMappings: [],
        commandMappings: {
          starlightBuild: 'pnpm nx run docs:build',
        },
        documentationMappings: {},
        adapterConfiguration: {},
        ignorePatterns: [],
        safeWriteLocations: ['apps/starlight/src/content/docs/**'],
      });
      service.stagedStarlightPage.set({
        componentId: manifest.id,
        template: 'designer',
        write: stagedPageWrite,
        writes: [stagedPageWrite],
      });
      const buildResult = {
        exitCode: 1,
        stdout: '',
        stderr: 'broken import',
        timedOut: false,
        cancelled: false,
        durationMs: 800,
        artifactPath: null,
      };
      invokeMock
        .mockResolvedValueOnce(
          'D:/repos/ForgeGate/apps/starlight/src/content/docs/components/acme-button--for-designers.mdx',
        )
        .mockResolvedValueOnce(buildResult);

      await service.approveStagedStarlightPage();

      expect(service.starlightPageResult()).toEqual({
        path: 'D:/repos/ForgeGate/apps/starlight/src/content/docs/components/acme-button--for-designers.mdx',
      });
      expect(service.stagedStarlightPage()).toBeNull();
      expect(service.starlightBuildResult()).toEqual(buildResult);
      expect(
        service
          .adapterDiagnostics()
          .find((diagnostic) => diagnostic.id === 'starlight-build-command'),
      ).toMatchObject({
        status: 'failed',
        error: 'broken import',
      });
    });

    it('reports an invalid configured Starlight build command without invoking it', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.repositoryConfig.set({
        configVersion: '0.1.0',
        projectMappings: [],
        packageMappings: [],
        commandMappings: {
          starlightBuild: 'pnpm nx run "docs:build',
        },
        documentationMappings: {},
        adapterConfiguration: {},
        ignorePatterns: [],
        safeWriteLocations: ['apps/starlight/src/content/docs/**'],
      });
      service.stagedStarlightPage.set({
        componentId: manifest.id,
        template: 'designer',
        write: stagedPageWrite,
        writes: [stagedPageWrite],
      });
      invokeMock.mockResolvedValueOnce(
        'D:/repos/ForgeGate/apps/starlight/src/content/docs/components/acme-button--for-designers.mdx',
      );

      await service.approveStagedStarlightPage();

      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(service.starlightPageResult()).toEqual({
        path: 'D:/repos/ForgeGate/apps/starlight/src/content/docs/components/acme-button--for-designers.mdx',
      });
      expect(service.starlightBuildError()).toBe(
        'Error: Command mapping contains an unterminated quote.',
      );
    });

    it('does nothing to approve when there is no staged page', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');

      await service.approveStagedStarlightPage();

      expect(invokeMock).not.toHaveBeenCalled();
    });

    it('discards a staged page without ever committing it', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.stagedStarlightPage.set({
        componentId: manifest.id,
        template: 'designer',
        write: stagedPageWrite,
        writes: [stagedPageWrite, stagedReportDataWrite],
      });
      invokeMock.mockResolvedValue(undefined);

      await service.discardStagedStarlightPage();

      expect(invokeMock).toHaveBeenNthCalledWith(
        1,
        'discard_staged_evidence_write',
        {
          workspacePath: 'D:/repos/ForgeGate',
          stagingId: 'stg-1',
        },
      );
      expect(invokeMock).toHaveBeenNthCalledWith(
        2,
        'discard_staged_evidence_write',
        {
          workspacePath: 'D:/repos/ForgeGate',
          stagingId: 'stg-2',
        },
      );
      expect(service.stagedStarlightPage()).toBeNull();
    });
  });

  describe('runGate / approveStagedTestExecution / discardStagedTestExecution', () => {
    const manifest = createComponentManifest({
      id: 'acme.design-system.acme-button',
      framework: 'web-components',
      adapter: 'framework.web-components',
      packagePath: 'packages/acme-button',
      componentVersion: '1.0.0',
      lifecycle: 'candidate',
    });

    it('skips honestly when no unitTest command is configured', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.repositoryConfig.set({
        configVersion: '0.1.0',
        projectMappings: [],
        packageMappings: [],
        commandMappings: {},
        documentationMappings: {},
        adapterConfiguration: {},
        ignorePatterns: [],
        safeWriteLocations: [],
      });

      await service.runGate('unit', manifest);

      expect(invokeMock).not.toHaveBeenCalled();
      expect(service.gateSkipped()).toBe(
        'No unitTest command is configured in .forgegate/config.yaml.',
      );
    });

    it('runs the configured unit-test command scoped to the component package and stages a real passing result', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.gitStatus.set({
        branch: 'main',
        commit: 'a'.repeat(40),
        dirty: false,
        changedFiles: [],
      });
      service.repositoryConfig.set({
        configVersion: '0.1.0',
        projectMappings: [],
        packageMappings: [],
        commandMappings: { unitTest: 'npm test' },
        documentationMappings: {},
        adapterConfiguration: {},
        ignorePatterns: [],
        safeWriteLocations: [],
      });
      const runResult = {
        exitCode: 0,
        stdout: 'ok',
        stderr: '',
        timedOut: false,
        cancelled: false,
        durationMs: 500,
        artifactPath: 'C:/Temp/forgegate-artifacts/1.json',
      };
      const stagedWrite = {
        stagingId: 'stg-1',
        subdirectory: 'evidence',
        filename: 'x.json',
        previousContent: null,
        newContent: '{}',
      };
      invokeMock
        .mockResolvedValueOnce(runResult)
        .mockResolvedValueOnce(stagedWrite);

      await service.runGate('unit', manifest);

      expect(invokeMock).toHaveBeenNthCalledWith(1, 'run_workspace_command', {
        workspacePath: 'D:/repos/ForgeGate',
        relativeCwd: 'packages/acme-button',
        command: 'npm',
        args: ['test'],
        timeoutSeconds: 300,
      });
      expect(invokeMock).toHaveBeenNthCalledWith(
        2,
        'stage_test_execution',
        expect.objectContaining({ workspacePath: 'D:/repos/ForgeGate' }),
      );
      expect(service.gateResult()).toEqual(runResult);
      expect(service.gateSkipped()).toBeNull();
      const staged = service.stagedTestExecution();
      expect(staged?.componentId).toBe(manifest.id);
      expect(staged?.execution.gate).toBe('unit');
      expect(staged?.execution.status).toBe('passed');
      expect(staged?.execution.componentVersionId).toBe(
        'acme.design-system.acme-button@1.0.0',
      );
      expect(
        service
          .adapterDiagnostics()
          .find((diagnostic) => diagnostic.id === 'unit-gate-command'),
      ).toMatchObject({ status: 'loaded', error: null });
    });

    it('stages a real failing result honestly rather than hiding it', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.repositoryConfig.set({
        configVersion: '0.1.0',
        projectMappings: [],
        packageMappings: [],
        commandMappings: { unitTest: 'npm test' },
        documentationMappings: {},
        adapterConfiguration: {},
        ignorePatterns: [],
        safeWriteLocations: [],
      });
      const runResult = {
        exitCode: 1,
        stdout: '',
        stderr: '3 tests failed',
        timedOut: false,
        cancelled: false,
        durationMs: 500,
        artifactPath: null,
      };
      invokeMock.mockResolvedValueOnce(runResult).mockResolvedValueOnce({
        stagingId: 'stg-1',
        subdirectory: 'evidence',
        filename: 'x.json',
        previousContent: null,
        newContent: '{}',
      });

      await service.runGate('unit', manifest);

      expect(service.stagedTestExecution()?.execution.status).toBe('failed');
      expect(
        service
          .adapterDiagnostics()
          .find((diagnostic) => diagnostic.id === 'unit-gate-command'),
      ).toMatchObject({ status: 'failed', error: '3 tests failed' });
    });

    it('runs the configured lint command against its own real commandMappings key', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.repositoryConfig.set({
        configVersion: '0.1.0',
        projectMappings: [],
        packageMappings: [],
        commandMappings: { lint: 'npm run lint' },
        documentationMappings: {},
        adapterConfiguration: {},
        ignorePatterns: [],
        safeWriteLocations: [],
      });
      const runResult = {
        exitCode: 0,
        stdout: '',
        stderr: '',
        timedOut: false,
        cancelled: false,
        durationMs: 200,
        artifactPath: null,
      };
      invokeMock.mockResolvedValueOnce(runResult).mockResolvedValueOnce({
        stagingId: 'stg-1',
        subdirectory: 'evidence',
        filename: 'x.json',
        previousContent: null,
        newContent: '{}',
      });

      await service.runGate('lint', manifest);

      expect(invokeMock).toHaveBeenNthCalledWith(1, 'run_workspace_command', {
        workspacePath: 'D:/repos/ForgeGate',
        relativeCwd: 'packages/acme-button',
        command: 'npm',
        args: ['run', 'lint'],
        timeoutSeconds: 180,
      });
      expect(service.stagedTestExecution()?.execution.gate).toBe('lint');
    });

    it('runs the configured build command against its own real commandMappings key', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.repositoryConfig.set({
        configVersion: '0.1.0',
        projectMappings: [],
        packageMappings: [],
        commandMappings: { build: 'npm run build' },
        documentationMappings: {},
        adapterConfiguration: {},
        ignorePatterns: [],
        safeWriteLocations: [],
      });
      const runResult = {
        exitCode: 0,
        stdout: '',
        stderr: '',
        timedOut: false,
        cancelled: false,
        durationMs: 4000,
        artifactPath: null,
      };
      invokeMock.mockResolvedValueOnce(runResult).mockResolvedValueOnce({
        stagingId: 'stg-1',
        subdirectory: 'evidence',
        filename: 'x.json',
        previousContent: null,
        newContent: '{}',
      });

      await service.runGate('build', manifest);

      expect(invokeMock).toHaveBeenNthCalledWith(1, 'run_workspace_command', {
        workspacePath: 'D:/repos/ForgeGate',
        relativeCwd: 'packages/acme-button',
        command: 'npm',
        args: ['run', 'build'],
        timeoutSeconds: 600,
      });
      expect(service.stagedTestExecution()?.execution.gate).toBe('build');
    });

    it('skips lint honestly without being satisfied by an unrelated unitTest mapping', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.repositoryConfig.set({
        configVersion: '0.1.0',
        projectMappings: [],
        packageMappings: [],
        commandMappings: { unitTest: 'npm test' },
        documentationMappings: {},
        adapterConfiguration: {},
        ignorePatterns: [],
        safeWriteLocations: [],
      });

      await service.runGate('lint', manifest);

      expect(invokeMock).not.toHaveBeenCalled();
      expect(service.gateSkipped()).toBe(
        'No lint command is configured in .forgegate/config.yaml.',
      );
    });

    it('approves a staged test execution into the real evidence directory', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      const execution = {
        id: 'acme.design-system.acme-button-unit-test-1',
        componentVersionId: 'acme.design-system.acme-button@1.0.0',
        gate: 'unit',
        tool: 'npm',
        toolVersion: 'unknown',
        adapterVersion: '1.0.0',
        status: 'passed' as const,
        startedAt: '2026-01-01T00:00:00.000Z',
        durationMs: 500,
        commitOrFingerprint: 'a'.repeat(40),
      };
      service.stagedTestExecution.set({
        execution,
        componentId: manifest.id,
        write: {
          stagingId: 'stg-1',
          subdirectory: 'evidence',
          filename: `${execution.id}.json`,
          previousContent: null,
          newContent: JSON.stringify(execution),
        },
      });
      invokeMock.mockResolvedValueOnce(
        `D:/repos/ForgeGate/.forgegate/evidence/${execution.id}.json`,
      );

      await service.approveStagedTestExecution();

      expect(invokeMock).toHaveBeenCalledWith('approve_staged_evidence_write', {
        workspacePath: 'D:/repos/ForgeGate',
        stagingId: 'stg-1',
        subdirectory: 'evidence',
        filename: `${execution.id}.json`,
      });
      expect(service.testExecutions()).toContainEqual(execution);
      expect(service.stagedTestExecution()).toBeNull();
      expect(service.saveTestExecutionResult()).toEqual({
        path: `D:/repos/ForgeGate/.forgegate/evidence/${execution.id}.json`,
      });
    });

    it('discards a staged test execution without writing real evidence', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.stagedTestExecution.set({
        execution: {
          id: 'x',
          componentVersionId: 'acme.design-system.acme-button@1.0.0',
          gate: 'unit',
          tool: 'npm',
          toolVersion: 'unknown',
          adapterVersion: '1.0.0',
          status: 'passed',
          startedAt: '2026-01-01T00:00:00.000Z',
          commitOrFingerprint: 'a'.repeat(40),
        },
        componentId: manifest.id,
        write: {
          stagingId: 'stg-1',
          subdirectory: 'evidence',
          filename: 'x.json',
          previousContent: null,
          newContent: '{}',
        },
      });
      invokeMock.mockResolvedValueOnce(undefined);

      await service.discardStagedTestExecution();

      expect(invokeMock).toHaveBeenCalledWith('discard_staged_evidence_write', {
        workspacePath: 'D:/repos/ForgeGate',
        stagingId: 'stg-1',
      });
      expect(service.stagedTestExecution()).toBeNull();
      expect(service.testExecutions()).toEqual([]);
    });
  });

  describe('queryLiveStorybookIndex', () => {
    it('fetches a real live index via the Rust-mediated command and replaces storybookIndex', async () => {
      const liveIndexJson = JSON.stringify({
        v: 5,
        entries: {
          'components-acmebutton--primary': {
            type: 'story',
            id: 'components-acmebutton--primary',
            name: 'Primary',
            title: 'Components/AcmeButton',
            importPath: './src/acme-button.stories.js',
          },
        },
      });
      invokeMock.mockResolvedValueOnce(liveIndexJson);

      await service.queryLiveStorybookIndex('http://localhost:6006');

      expect(invokeMock).toHaveBeenCalledWith('fetch_live_storybook_index', {
        origin: 'http://localhost:6006',
      });
      expect(
        service.storybookIndex()?.entries['components-acmebutton--primary'],
      ).toBeDefined();
      expect(service.liveStorybookQueryResult()).toEqual({
        origin: 'http://localhost:6006',
        storyCount: 1,
      });
      expect(service.liveStorybookQueryError()).toBeNull();
      expect(service.liveStorybookQueryRunning()).toBe(false);
    });

    it('surfaces a real connection failure without touching the existing storybookIndex', async () => {
      invokeMock.mockRejectedValueOnce(
        'Could not connect to http://localhost:6006: connection refused',
      );

      await service.queryLiveStorybookIndex('http://localhost:6006');

      expect(service.liveStorybookQueryError()).toBe(
        'Could not connect to http://localhost:6006: connection refused',
      );
      expect(service.liveStorybookQueryResult()).toBeNull();
      expect(service.storybookIndex()).toBeNull();
      expect(service.liveStorybookQueryRunning()).toBe(false);
    });

    it('does nothing if a query is already running', async () => {
      service.liveStorybookQueryRunning.set(true);

      await service.queryLiveStorybookIndex('http://localhost:6006');

      expect(invokeMock).not.toHaveBeenCalled();
    });
  });

  describe('loadStaleReviewChangedFiles', () => {
    it('does nothing if no workspace is open', async () => {
      await service.loadStaleReviewChangedFiles('a'.repeat(40));

      expect(invokeMock).not.toHaveBeenCalled();
    });

    it('loads the real changed files for a commit and caches by commit hash', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      invokeMock.mockResolvedValueOnce([
        'button.component.html',
        'button.component.ts',
      ]);

      await service.loadStaleReviewChangedFiles('a'.repeat(40));

      expect(invokeMock).toHaveBeenCalledWith('read_commit_diff_files', {
        path: 'D:/repos/ForgeGate',
        fromCommit: 'a'.repeat(40),
      });
      expect(service.staleReviewChangedFiles()).toEqual({
        [`${'a'.repeat(40)}`]: {
          files: ['button.component.html', 'button.component.ts'],
          error: null,
        },
      });
    });

    it('does not refetch a commit whose diff is already cached', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      invokeMock.mockResolvedValueOnce(['button.component.ts']);

      await service.loadStaleReviewChangedFiles('a'.repeat(40));
      await service.loadStaleReviewChangedFiles('a'.repeat(40));

      expect(invokeMock).toHaveBeenCalledTimes(1);
    });

    it('surfaces a real failure per commit rather than throwing', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      invokeMock.mockRejectedValueOnce('Failed to run git: not a repository');

      await service.loadStaleReviewChangedFiles('a'.repeat(40));

      expect(service.staleReviewChangedFiles()).toEqual({
        [`${'a'.repeat(40)}`]: {
          files: [],
          error: 'Failed to run git: not a repository',
        },
      });
    });
  });
});

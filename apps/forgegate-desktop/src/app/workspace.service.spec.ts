import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createComponentManifest } from '@forgegate/core-manifest';
import { TAURI_INVOKE } from './tauri-invoke';
import { TAURI_LISTEN } from './tauri-listen';
import { WorkspaceService } from './workspace.service';

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

const gitStatusFixture = {
  branch: 'master',
  commit: 'a'.repeat(40),
  dirty: false,
  changedFiles: [],
};

const listenMock = vi.fn();

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

      await service.exportEvidencePackage(
        manifest,
        [],
        [],
        undefined,
        [
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
        ],
      );

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

    it('writes a real exceptions/<id>.json file for an exception approving one of this export\'s findings', async () => {
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

      const watchCall = invokeMock.mock.calls.find(([name]) => name === 'start_workspace_watch');
      expect(watchCall).toBeDefined();
      const [, args] = watchCall as [string, { workspacePath: string; directories: unknown[] }];
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
        .mockResolvedValueOnce({ configured: false, connected: false, snapshots: [], error: null })
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
      let emitChange!: (payload: { changedPaths: string[]; truncated: boolean }) => void;
      listenMock.mockImplementation(async (eventName: string, handler: (event: unknown) => void) => {
        if (eventName === 'workspace-changed') {
          emitChange = (payload) => handler({ payload });
        }
        return vi.fn();
      });

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
      service.filesystemChangesDetected.set({ paths: ['x.ts'], truncated: false });

      invokeMock
        .mockResolvedValueOnce(gitStatusFixture)
        .mockResolvedValueOnce(scanFixture)
        .mockResolvedValueOnce(null);

      await service.rescanWorkspace();

      expect(invokeMock).not.toHaveBeenCalledWith('select_workspace');
      expect(service.workspacePath()).toBe('D:/repos/ForgeGate');
      expect(service.filesystemChangesDetected()).toBeNull();
    });

    it('clears the change notice without rescanning when dismissed', async () => {
      await selectWithScanFixture();
      service.filesystemChangesDetected.set({ paths: ['x.ts'], truncated: false });

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

      expect(invokeMock).toHaveBeenCalledWith('read_component_evidence_events', {
        path: 'D:/repos/ForgeGate',
        componentId: 'acme.design-system.button',
      });
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

  describe('saveManualReview', () => {
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

    it('does nothing if no workspace is open', async () => {
      await service.saveManualReview(review);

      expect(invokeMock).not.toHaveBeenCalled();
    });

    it('writes a real manual review file and appends it to manualReviews without a full rescan', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      invokeMock.mockResolvedValueOnce(
        'D:/repos/ForgeGate/.forgegate/manual-reviews/acme.design-system.acme-button-keyboard-and-screen-reader-review-1.json',
      );

      await service.saveManualReview(review);

      expect(invokeMock).toHaveBeenCalledWith('write_manual_review', {
        workspacePath: 'D:/repos/ForgeGate',
        reviewId: review.id,
        content: JSON.stringify(review, null, 2),
      });
      expect(service.saveManualReviewResult()).toEqual({
        path: 'D:/repos/ForgeGate/.forgegate/manual-reviews/acme.design-system.acme-button-keyboard-and-screen-reader-review-1.json',
      });
      expect(service.manualReviews()).toEqual([review]);
      expect(service.saveManualReviewRunning()).toBe(false);
    });

    it('surfaces a real write failure without losing the running flag', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      invokeMock.mockRejectedValueOnce('Permission denied');

      await service.saveManualReview(review);

      expect(service.saveManualReviewError()).toBe('Permission denied');
      expect(service.saveManualReviewRunning()).toBe(false);
      expect(service.manualReviews()).toEqual([]);
    });

    it('does nothing if a save is already running', async () => {
      service.workspacePath.set('D:/repos/ForgeGate');
      service.saveManualReviewRunning.set(true);

      await service.saveManualReview(review);

      expect(invokeMock).not.toHaveBeenCalled();
    });
  });
});

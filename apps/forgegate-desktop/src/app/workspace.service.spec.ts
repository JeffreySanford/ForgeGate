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

  it('does not attempt to read a Custom Elements Manifest when none was found', async () => {
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixture)
      .mockResolvedValueOnce(null);

    await service.selectWorkspace();

    expect(invokeMock).toHaveBeenCalledTimes(5);
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
});

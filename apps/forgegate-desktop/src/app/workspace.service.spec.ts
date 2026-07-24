import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { WorkspaceService } from './workspace.service';

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}));

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

const gitStatusFixture = {
  branch: 'master',
  commit: 'a'.repeat(40),
  dirty: false,
};

describe('WorkspaceService', () => {
  let service: WorkspaceService;

  beforeEach(() => {
    invokeMock.mockReset();
    TestBed.configureTestingModule({});
    service = TestBed.inject(WorkspaceService);
  });

  it('does nothing when the user cancels the folder picker', async () => {
    invokeMock.mockResolvedValueOnce(null);

    await service.selectWorkspace();

    expect(service.workspacePath()).toBeNull();
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith('select_workspace');
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
    expect(service.error()).toBeNull();
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

  it('does not attempt to read a Custom Elements Manifest when none was found', async () => {
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce(gitStatusFixture)
      .mockResolvedValueOnce(scanFixture)
      .mockResolvedValueOnce(null);

    await service.selectWorkspace();

    expect(invokeMock).toHaveBeenCalledTimes(4);
    expect(service.customElementsManifest()).toBeNull();
    expect(service.customElementsManifestError()).toBeNull();
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

    expect(invokeMock).toHaveBeenLastCalledWith('read_text_file', {
      workspacePath: 'D:/repos/ForgeGate',
      relativePath: 'dist/custom-elements.json',
    });
    expect(service.customElementsManifest()?.modules).toHaveLength(1);
    expect(service.customElementsManifestError()).toBeNull();
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
});

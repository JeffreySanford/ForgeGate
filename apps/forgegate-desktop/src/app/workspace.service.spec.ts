import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { WorkspaceService } from './workspace.service';

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}));

const scanFixture = {
  packageManager: 'pnpm',
  workspaceManager: 'nx',
  storybookProjects: [],
  starlightProjects: [],
  hasZeroheight: false,
  tokenFiles: [],
  testRunners: ['vitest'],
  visualRegressionProviders: [],
  ciProviders: ['github-actions'],
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

    expect(service.repositoryConfig()?.safeWriteLocations).toEqual(['src/content/docs/generated/**']);
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

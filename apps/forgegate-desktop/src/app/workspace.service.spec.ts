import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { WorkspaceService } from './workspace.service';

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}));

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

  it('loads Git status and the workspace scan after a workspace is selected', async () => {
    invokeMock
      .mockResolvedValueOnce('D:/repos/ForgeGate')
      .mockResolvedValueOnce({
        branch: 'master',
        commit: 'a'.repeat(40),
        dirty: false,
      })
      .mockResolvedValueOnce({
        packageManager: 'pnpm',
        workspaceManager: 'nx',
        hasStorybook: false,
        hasStarlight: false,
        hasZeroheight: false,
        tokenFiles: [],
        testRunners: ['vitest'],
        visualRegressionProviders: [],
        ciProviders: ['github-actions'],
      });

    await service.selectWorkspace();

    expect(service.workspacePath()).toBe('D:/repos/ForgeGate');
    expect(service.gitStatus()).toEqual({
      branch: 'master',
      commit: 'a'.repeat(40),
      dirty: false,
    });
    expect(service.workspaceScan()).toEqual({
      packageManager: 'pnpm',
      workspaceManager: 'nx',
      hasStorybook: false,
      hasStarlight: false,
      hasZeroheight: false,
      tokenFiles: [],
      testRunners: ['vitest'],
      visualRegressionProviders: [],
      ciProviders: ['github-actions'],
    });
    expect(service.error()).toBeNull();
  });

  it('surfaces an error and clears Git status and scan when the status read fails', async () => {
    invokeMock
      .mockResolvedValueOnce('D:/not-a-git-repo')
      .mockRejectedValueOnce('Workspace path does not exist')
      .mockResolvedValueOnce({
        packageManager: null,
        workspaceManager: null,
        hasStorybook: false,
        hasStarlight: false,
        hasZeroheight: false,
        tokenFiles: [],
        testRunners: [],
        visualRegressionProviders: [],
        ciProviders: [],
      });

    await service.selectWorkspace();

    expect(service.gitStatus()).toBeNull();
    expect(service.workspaceScan()).toBeNull();
    expect(service.error()).toBe('Workspace path does not exist');
  });
});

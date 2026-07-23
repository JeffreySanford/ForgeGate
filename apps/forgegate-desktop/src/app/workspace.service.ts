import { Injectable, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';

export interface GitStatus {
  branch: string;
  commit: string;
  dirty: boolean;
}

export interface WorkspaceScan {
  packageManager: string | null;
  workspaceManager: string | null;
  storybookProjects: string[];
  starlightProjects: string[];
  hasZeroheight: boolean;
  tokenFiles: string[];
  testRunners: string[];
  visualRegressionProviders: string[];
  ciProviders: string[];
}

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  readonly workspacePath = signal<string | null>(null);
  readonly gitStatus = signal<GitStatus | null>(null);
  readonly workspaceScan = signal<WorkspaceScan | null>(null);
  readonly error = signal<string | null>(null);

  async selectWorkspace(): Promise<void> {
    this.error.set(null);
    const path = await invoke<string | null>('select_workspace');
    if (!path) {
      return;
    }
    this.workspacePath.set(path);
    try {
      const [status, scan] = await Promise.all([
        invoke<GitStatus>('read_git_status', { path }),
        invoke<WorkspaceScan>('read_workspace_scan', { path }),
      ]);
      this.gitStatus.set(status);
      this.workspaceScan.set(scan);
    } catch (error) {
      this.gitStatus.set(null);
      this.workspaceScan.set(null);
      this.error.set(String(error));
    }
  }
}

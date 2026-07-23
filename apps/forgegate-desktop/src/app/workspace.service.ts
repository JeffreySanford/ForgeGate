import { Injectable, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { parseRepositoryConfig, type RepositoryConfig } from '@forgegate/core-config';

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
  readonly repositoryConfig = signal<RepositoryConfig | null>(null);
  readonly repositoryConfigError = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  async selectWorkspace(): Promise<void> {
    this.error.set(null);
    this.repositoryConfigError.set(null);
    const path = await invoke<string | null>('select_workspace');
    if (!path) {
      return;
    }
    this.workspacePath.set(path);
    try {
      const [status, scan, configText] = await Promise.all([
        invoke<GitStatus>('read_git_status', { path }),
        invoke<WorkspaceScan>('read_workspace_scan', { path }),
        invoke<string | null>('read_repository_config_file', { path }),
      ]);
      this.gitStatus.set(status);
      this.workspaceScan.set(scan);
      this.applyConfigText(configText);
    } catch (error) {
      this.gitStatus.set(null);
      this.workspaceScan.set(null);
      this.repositoryConfig.set(null);
      this.error.set(String(error));
    }
  }

  /**
   * A malformed .forgegate/config.yaml must not blank out the Git status
   * and workspace scan the user already sees successfully — it is reported
   * on its own, separate signal, per the "never silently accept an invalid
   * config" rule in documentation/02-system-architecture.md.
   */
  private applyConfigText(configText: string | null): void {
    if (configText === null) {
      this.repositoryConfig.set(null);
      return;
    }
    try {
      this.repositoryConfig.set(parseRepositoryConfig(configText));
    } catch (error) {
      this.repositoryConfig.set(null);
      this.repositoryConfigError.set(String(error));
    }
  }
}

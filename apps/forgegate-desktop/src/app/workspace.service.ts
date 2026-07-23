import { Injectable, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';

export interface GitStatus {
  branch: string;
  commit: string;
  dirty: boolean;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  readonly workspacePath = signal<string | null>(null);
  readonly gitStatus = signal<GitStatus | null>(null);
  readonly error = signal<string | null>(null);

  async selectWorkspace(): Promise<void> {
    this.error.set(null);
    const path = await invoke<string | null>('select_workspace');
    if (!path) {
      return;
    }
    this.workspacePath.set(path);
    try {
      const status = await invoke<GitStatus>('read_git_status', { path });
      this.gitStatus.set(status);
    } catch (error) {
      this.gitStatus.set(null);
      this.error.set(String(error));
    }
  }
}

import { Injectable, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { parseRepositoryConfig, type RepositoryConfig } from '@forgegate/core-config';
import { parseCustomElementsManifest, type CustomElementsManifest } from '@forgegate/adapter-web-components';

export interface GitStatus {
  branch: string;
  commit: string;
  dirty: boolean;
}

export interface WorkspaceScan {
  packageName: string | null;
  packageManager: string | null;
  workspaceManager: string | null;
  storybookProjects: string[];
  starlightProjects: string[];
  hasZeroheight: boolean;
  tokenFiles: string[];
  testRunners: string[];
  visualRegressionProviders: string[];
  ciProviders: string[];
  customElementsManifests: string[];
}

export interface CommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
}

/**
 * The exact command run to generate a Custom Elements Manifest, shown to
 * the user before they approve it — per the "Command execution flow" in
 * documentation/02-system-architecture.md ("ForgeGate displays command...
 * before execution. User approves execution.").
 */
export const GENERATE_CEM_COMMAND = 'npx';
export const GENERATE_CEM_ARGS = ['@custom-elements-manifest/analyze', '--litelement', '--outdir', '.'];
export const GENERATE_CEM_COMMAND_TEXT = `${GENERATE_CEM_COMMAND} ${GENERATE_CEM_ARGS.join(' ')}`;
const GENERATE_CEM_TIMEOUT_SECONDS = 120;

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  readonly workspacePath = signal<string | null>(null);
  readonly gitStatus = signal<GitStatus | null>(null);
  readonly workspaceScan = signal<WorkspaceScan | null>(null);
  readonly repositoryConfig = signal<RepositoryConfig | null>(null);
  readonly repositoryConfigError = signal<string | null>(null);
  readonly customElementsManifest = signal<CustomElementsManifest | null>(null);
  readonly customElementsManifestError = signal<string | null>(null);
  readonly cemGenerationRunning = signal(false);
  readonly cemGenerationResult = signal<CommandResult | null>(null);
  readonly cemGenerationError = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  async selectWorkspace(): Promise<void> {
    this.error.set(null);
    this.repositoryConfigError.set(null);
    this.customElementsManifestError.set(null);
    this.cemGenerationResult.set(null);
    this.cemGenerationError.set(null);
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
      await this.loadCustomElementsManifest(path, scan);
    } catch (error) {
      this.gitStatus.set(null);
      this.workspaceScan.set(null);
      this.repositoryConfig.set(null);
      this.customElementsManifest.set(null);
      this.error.set(String(error));
    }
  }

  /**
   * Runs the CEM analyzer against the workspace root, after the user has
   * already approved it by clicking the button that calls this — the UI
   * shows `GENERATE_CEM_COMMAND_TEXT` first. A failure (analyzer not
   * installed, network unavailable for npx's first download, timeout,
   * non-zero exit) is reported on its own signal; it does not disturb
   * anything else the user already sees. On a successful run (exit code
   * 0), the workspace scan and manifest are refreshed so the newly
   * generated file shows up without a second manual "Open workspace".
   */
  async generateCustomElementsManifest(): Promise<void> {
    const path = this.workspacePath();
    if (!path || this.cemGenerationRunning()) {
      return;
    }
    this.cemGenerationRunning.set(true);
    this.cemGenerationError.set(null);
    this.cemGenerationResult.set(null);
    try {
      const result = await invoke<CommandResult>('run_workspace_command', {
        workspacePath: path,
        relativeCwd: '.',
        command: GENERATE_CEM_COMMAND,
        args: GENERATE_CEM_ARGS,
        timeoutSeconds: GENERATE_CEM_TIMEOUT_SECONDS,
      });
      this.cemGenerationResult.set(result);
      if (result.exitCode === 0) {
        const scan = await invoke<WorkspaceScan>('read_workspace_scan', { path });
        this.workspaceScan.set(scan);
        await this.loadCustomElementsManifest(path, scan);
      }
    } catch (error) {
      this.cemGenerationError.set(String(error));
    } finally {
      this.cemGenerationRunning.set(false);
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

  /**
   * Reads and parses the first Custom Elements Manifest the scan found, if
   * any. A workspace can have zero (nothing published yet — normal, not an
   * error) or several; only the first is loaded automatically for now.
   * Failures here are reported on their own signal, same reasoning as
   * applyConfigText: one broken file must not blank out everything else.
   */
  private async loadCustomElementsManifest(workspacePath: string, scan: WorkspaceScan): Promise<void> {
    this.customElementsManifest.set(null);
    const [relativePath] = scan.customElementsManifests;
    if (!relativePath) {
      return;
    }
    try {
      const text = await invoke<string>('read_text_file', {
        workspacePath,
        relativePath,
      });
      this.customElementsManifest.set(parseCustomElementsManifest(text));
    } catch (error) {
      this.customElementsManifestError.set(String(error));
    }
  }
}

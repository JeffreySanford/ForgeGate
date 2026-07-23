import { Injectable, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { parseRepositoryConfig, type RepositoryConfig } from '@forgegate/core-config';
import { parseCustomElementsManifest, type CustomElementsManifest } from '@forgegate/adapter-web-components';
import { parseStorybookIndex, type StorybookIndex } from './storybook/storybook-index';

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
export const GENERATE_CEM_ARGS = ['@custom-elements-manifest/analyzer', 'analyze', '--litelement', '--outdir', '.'];
export const GENERATE_CEM_COMMAND_TEXT = `${GENERATE_CEM_COMMAND} ${GENERATE_CEM_ARGS.join(' ')}`;
const GENERATE_CEM_TIMEOUT_SECONDS = 120;

/**
 * `storybook build`'s default output directory is `storybook-static`, and
 * `index.json` is the file it writes there describing every story — this
 * is the standard convention, not a ForgeGate-specific one. There is no
 * scan-time confirmation this file exists (the workspace scan only
 * detects the `.storybook` config directory, not a build having happened),
 * so a missing file at this path is a normal, silent "not built yet"
 * state, not an error.
 */
const STORYBOOK_INDEX_CONVENTIONAL_PATH = 'storybook-static/index.json';

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  readonly workspacePath = signal<string | null>(null);
  readonly gitStatus = signal<GitStatus | null>(null);
  readonly workspaceScan = signal<WorkspaceScan | null>(null);
  readonly repositoryConfig = signal<RepositoryConfig | null>(null);
  readonly repositoryConfigError = signal<string | null>(null);
  readonly customElementsManifest = signal<CustomElementsManifest | null>(null);
  readonly customElementsManifestError = signal<string | null>(null);
  readonly storybookIndex = signal<StorybookIndex | null>(null);
  readonly storybookIndexError = signal<string | null>(null);
  readonly cemGenerationRunning = signal(false);
  readonly cemGenerationResult = signal<CommandResult | null>(null);
  readonly cemGenerationError = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  async selectWorkspace(): Promise<void> {
    this.error.set(null);
    this.repositoryConfigError.set(null);
    this.customElementsManifestError.set(null);
    this.storybookIndexError.set(null);
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
      await this.loadStorybookIndex(path, scan);
    } catch (error) {
      this.gitStatus.set(null);
      this.workspaceScan.set(null);
      this.repositoryConfig.set(null);
      this.customElementsManifest.set(null);
      this.storybookIndex.set(null);
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

  /**
   * Probes the conventional `storybook-static/index.json` build output
   * path, only when the scan already found a `.storybook` config
   * directory (no point probing a workspace with no Storybook at all). A
   * missing file here is the normal "configured but not built yet" state,
   * not an error — this genuinely doesn't know in advance whether a build
   * exists, unlike `loadCustomElementsManifest`, which only ever attempts
   * a read the scan already confirmed should succeed. Only a read that
   * *succeeds* but doesn't parse as a valid index is reported as an error.
   */
  private async loadStorybookIndex(workspacePath: string, scan: WorkspaceScan): Promise<void> {
    this.storybookIndex.set(null);
    if (!scan.storybookProjects.length) {
      return;
    }
    let text: string;
    try {
      text = await invoke<string>('read_text_file', {
        workspacePath,
        relativePath: STORYBOOK_INDEX_CONVENTIONAL_PATH,
      });
    } catch {
      return;
    }
    try {
      this.storybookIndex.set(parseStorybookIndex(text));
    } catch (error) {
      this.storybookIndexError.set(String(error));
    }
  }
}

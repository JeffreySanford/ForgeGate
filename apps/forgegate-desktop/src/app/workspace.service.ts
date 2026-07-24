import { Injectable, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import {
  parseRepositoryConfig,
  type RepositoryConfig,
} from '@forgegate/core-config';
import {
  parseCustomElementsManifest,
  type CustomElementsManifest,
} from '@forgegate/adapter-web-components';
import {
  parseComponentManifest,
  type ComponentManifest,
} from '@forgegate/core-manifest';
import {
  parseStorybookIndex,
  type StorybookIndex,
} from './storybook/storybook-index';

export interface GitStatus {
  branch: string;
  commit: string;
  dirty: boolean;
}

export interface ComponentPackageCandidate {
  name: string;
  path: string;
  sourceGlob: string;
  outputDirectory: string;
  manifestPath: string;
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
  componentPackages: ComponentPackageCandidate[];
  componentManifests?: string[];
}

export interface CommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
}

export interface CemGenerationPlan {
  target: ComponentPackageCandidate;
  command: string;
  args: string[];
  commandText: string;
  excludedGlobs: string[];
}

const GENERATE_CEM_COMMAND = 'npx';
const GENERATE_CEM_TIMEOUT_SECONDS = 120;
const CEM_EXCLUDED_GLOBS = [
  'node_modules/**',
  'dist/**',
  'coverage/**',
  '.nx/**',
  'storybook-static/**',
];

export function createCemGenerationPlan(
  target: ComponentPackageCandidate,
): CemGenerationPlan {
  const args = [
    '@custom-elements-manifest/analyzer',
    'analyze',
    '--litelement',
    '--globs',
    target.sourceGlob,
    ...CEM_EXCLUDED_GLOBS.flatMap((glob) => ['--exclude', glob]),
    '--outdir',
    target.outputDirectory,
  ];
  return {
    target,
    command: GENERATE_CEM_COMMAND,
    args,
    commandText: `${GENERATE_CEM_COMMAND} ${args.map((arg) => (arg.includes('*') ? `"${arg}"` : arg)).join(' ')}`,
    excludedGlobs: [...CEM_EXCLUDED_GLOBS],
  };
}

/**
 * `storybook build`'s default output directory is `storybook-static`, and
 * `index.json` is the file it writes there describing every story ? this
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
  readonly componentManifestOverrides = signal<readonly ComponentManifest[]>(
    [],
  );
  readonly componentManifestError = signal<string | null>(null);
  readonly storybookIndex = signal<StorybookIndex | null>(null);
  readonly storybookIndexError = signal<string | null>(null);
  readonly selectedComponentPackagePath = signal<string | null>(null);
  readonly cemGenerationRunning = signal(false);
  readonly cemGenerationResult = signal<CommandResult | null>(null);
  readonly cemGenerationError = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  async selectWorkspace(): Promise<void> {
    this.error.set(null);
    this.repositoryConfigError.set(null);
    this.customElementsManifestError.set(null);
    this.componentManifestError.set(null);
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
      this.selectedComponentPackagePath.set(
        scan.componentPackages.length === 1
          ? (scan.componentPackages[0]?.path ?? null)
          : null,
      );
      this.applyConfigText(configText);
      await this.loadCustomElementsManifest(path, scan);
      await this.loadComponentManifests(path, scan);
      await this.loadStorybookIndex(path, scan);
    } catch (error) {
      this.gitStatus.set(null);
      this.workspaceScan.set(null);
      this.repositoryConfig.set(null);
      this.customElementsManifest.set(null);
      this.componentManifestOverrides.set([]);
      this.storybookIndex.set(null);
      this.error.set(String(error));
    }
  }

  selectComponentPackage(path: string): void {
    this.selectedComponentPackagePath.set(path || null);
    this.cemGenerationResult.set(null);
    this.cemGenerationError.set(null);
  }

  cemGenerationPlan(): CemGenerationPlan | null {
    const selectedPath = this.selectedComponentPackagePath();
    const target = this.workspaceScan()?.componentPackages.find(
      (candidate) => candidate.path === selectedPath,
    );
    return target ? createCemGenerationPlan(target) : null;
  }

  /**
   * Runs the analyzer only inside the explicitly selected package. The
   * source glob, exclusions, output directory, and package.json mutation
   * policy are all shown in the approval preview before this is invoked.
   */
  async generateCustomElementsManifest(): Promise<void> {
    const path = this.workspacePath();
    const plan = this.cemGenerationPlan();
    if (!path || !plan || this.cemGenerationRunning()) {
      return;
    }
    this.cemGenerationRunning.set(true);
    this.cemGenerationError.set(null);
    this.cemGenerationResult.set(null);
    try {
      const result = await invoke<CommandResult>('run_workspace_command', {
        workspacePath: path,
        relativeCwd: plan.target.path,
        command: plan.command,
        args: plan.args,
        timeoutSeconds: GENERATE_CEM_TIMEOUT_SECONDS,
      });
      this.cemGenerationResult.set(result);
      if (result.exitCode === 0) {
        const relativePath = [
          plan.target.path === '.' ? '' : plan.target.path,
          plan.target.manifestPath,
        ]
          .filter(Boolean)
          .join('/');
        const text = await invoke<string>('read_text_file', {
          workspacePath: path,
          relativePath,
        });
        this.customElementsManifest.set(parseCustomElementsManifest(text));
        const scan = this.workspaceScan();
        if (scan && !scan.customElementsManifests.includes(relativePath)) {
          this.workspaceScan.set({
            ...scan,
            customElementsManifests: [
              ...scan.customElementsManifests,
              relativePath,
            ],
          });
        }
      }
    } catch (error) {
      this.cemGenerationError.set(String(error));
    } finally {
      this.cemGenerationRunning.set(false);
    }
  }

  /**
   * A malformed .forgegate/config.yaml must not blank out the Git status
   * and workspace scan the user already sees successfully ? it is reported
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
   * any. A workspace can have zero (nothing published yet ? normal, not an
   * error) or several; only the first is loaded automatically for now.
   * Failures here are reported on their own signal, same reasoning as
   * applyConfigText: one broken file must not blank out everything else.
   */
  private async loadCustomElementsManifest(
    workspacePath: string,
    scan: WorkspaceScan,
  ): Promise<void> {
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

  private async loadComponentManifests(
    workspacePath: string,
    scan: WorkspaceScan,
  ): Promise<void> {
    this.componentManifestOverrides.set([]);
    const manifests: ComponentManifest[] = [];
    for (const relativePath of scan.componentManifests ?? []) {
      try {
        const text = await invoke<string>('read_text_file', {
          workspacePath,
          relativePath,
        });
        manifests.push(parseComponentManifest(text));
      } catch (error) {
        this.componentManifestError.set(`${relativePath}: ${String(error)}`);
      }
    }
    this.componentManifestOverrides.set(manifests);
  }

  /**
   * Probes the conventional `storybook-static/index.json` build output
   * path, only when the scan already found a `.storybook` config
   * directory (no point probing a workspace with no Storybook at all). A
   * missing file here is the normal "configured but not built yet" state,
   * not an error ? this genuinely doesn't know in advance whether a build
   * exists, unlike `loadCustomElementsManifest`, which only ever attempts
   * a read the scan already confirmed should succeed. Only a read that
   * *succeeds* but doesn't parse as a valid index is reported as an error.
   */
  private async loadStorybookIndex(
    workspacePath: string,
    scan: WorkspaceScan,
  ): Promise<void> {
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

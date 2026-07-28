import { inject, Injectable, signal } from '@angular/core';
import {
  parseRepositoryConfig,
  type RepositoryConfig,
} from '@forgegate/core-config';
import {
  parseTestExecution,
  type TestExecution,
} from '@forgegate/core-evidence';
import {
  parseCustomElementsManifest,
  type CustomElementsManifest,
} from '@forgegate/adapter-web-components';
import {
  discoverNativeComponentSignals,
  type NativeComponentSignal,
} from '@forgegate/adapter-native-patterns';
import {
  parseComponentManifest,
  type ComponentManifest,
} from '@forgegate/core-manifest';
import {
  parseStorybookIndex,
  type StorybookIndex,
} from './storybook/storybook-index';
import { buildEvidenceExport } from './evidence-export';
import { TAURI_INVOKE } from './tauri-invoke';
import { TAURI_LISTEN } from './tauri-listen';

export interface GitStatus {
  branch: string;
  commit: string;
  dirty: boolean;
  /**
   * Real, workspace-root-relative paths from `git status --porcelain`
   * (staged and unstaged changes, plus untracked files) — what's different
   * from HEAD right now, not a diff against a specific commit range.
   */
  changedFiles: string[];
}

export interface ComponentPackageCandidate {
  name: string;
  path: string;
  sourceGlob: string;
  outputDirectory: string;
  manifestPath: string;
}

export interface UiTechnologyDetection {
  id: string;
  name: string;
  category:
    | 'component-library'
    | 'css-component-library'
    | 'utility-css'
    | 'css-preprocessor'
    | 'css-in-js';
  version: string;
  projectPath: string;
  detectedPackage: string;
  evidenceSource: string;
  confidence: 'confirmed';
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
  testEvidenceFiles?: string[];
  uiTechnologies: UiTechnologyDetection[];
  uiSourceFiles?: string[];
  uiSourceFilesTruncated?: boolean;
}

export type WorkspaceScanPhase =
  | 'selecting'
  | 'repository'
  | 'contracts'
  | 'governance'
  | 'storybook'
  | 'native-patterns'
  | 'complete'
  | 'failed';

export interface WorkspaceScanProgress {
  readonly phase: WorkspaceScanPhase;
  readonly state: 'running' | 'complete' | 'failed';
  readonly label: string;
  readonly completed: number;
  readonly total: number;
}

export interface CommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  /** True only when the user cancelled the run — distinct from timedOut. */
  cancelled: boolean;
  durationMs: number;
  /**
   * Path to a persisted copy of this result outside the workspace (the OS
   * temp directory today — a known limitation, not yet a durable location).
   * Null if the write failed or this result predates artifact preservation.
   */
  artifactPath: string | null;
}

/** Payload of the `workspace-command-output` event — one per output line. */
export interface CommandOutputLine {
  runId: number;
  stream: 'stdout' | 'stderr';
  line: string;
}

export interface AdapterDiagnostic {
  readonly id: string;
  readonly adapter: string;
  readonly source: string;
  readonly status: 'loaded' | 'partial' | 'failed' | 'unavailable';
  readonly rawOutput: string | null;
  readonly error: string | null;
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
const WORKSPACE_SCAN_STEP_COUNT = 5;

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly invoke = inject(TAURI_INVOKE);
  private readonly listen = inject(TAURI_LISTEN);
  readonly workspacePath = signal<string | null>(null);
  readonly gitStatus = signal<GitStatus | null>(null);
  readonly workspaceScan = signal<WorkspaceScan | null>(null);
  readonly scanProgress = signal<WorkspaceScanProgress | null>(null);
  readonly repositoryConfig = signal<RepositoryConfig | null>(null);
  readonly repositoryConfigError = signal<string | null>(null);
  readonly customElementsManifest = signal<CustomElementsManifest | null>(null);
  readonly customElementsManifestError = signal<string | null>(null);
  readonly componentManifestOverrides = signal<readonly ComponentManifest[]>(
    [],
  );
  readonly componentManifestError = signal<string | null>(null);
  readonly testExecutions = signal<readonly TestExecution[]>([]);
  readonly testExecutionError = signal<string | null>(null);
  readonly storybookIndex = signal<StorybookIndex | null>(null);
  readonly storybookIndexError = signal<string | null>(null);
  readonly nativeComponentSignals = signal<readonly NativeComponentSignal[]>(
    [],
  );
  readonly nativeComponentSignalsError = signal<string | null>(null);
  readonly selectedComponentPackagePath = signal<string | null>(null);
  readonly cemGenerationRunning = signal(false);
  readonly cemGenerationResult = signal<CommandResult | null>(null);
  readonly cemGenerationError = signal<string | null>(null);
  /**
   * Live stdout/stderr lines as CEM generation runs, appended in arrival
   * order. Redacted per-line the same way the final result is, with one
   * disclosed exception: a PEM private key would appear here line-by-line
   * before the final `cemGenerationResult`'s block-aware redaction could
   * catch it — see `command_execution::LineSink`'s doc comment on the Rust
   * side. Reset at the start of each run; not cleared on completion, so
   * the last run's output stays visible until the next one starts.
   */
  readonly cemGenerationLiveOutput = signal('');
  readonly adapterDiagnostics = signal<readonly AdapterDiagnostic[]>([]);
  readonly evidenceExportRunning = signal(false);
  readonly evidenceExportResult = signal<{ readonly directoryPath: string } | null>(null);
  readonly evidenceExportError = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  async selectWorkspace(): Promise<void> {
    if (this.scanProgress()?.state === 'running') {
      return;
    }
    this.error.set(null);
    this.repositoryConfigError.set(null);
    this.customElementsManifestError.set(null);
    this.componentManifestError.set(null);
    this.testExecutionError.set(null);
    this.storybookIndexError.set(null);
    this.nativeComponentSignalsError.set(null);
    this.cemGenerationResult.set(null);
    this.cemGenerationError.set(null);
    this.adapterDiagnostics.set([]);
    this.setScanProgress('selecting', 'Choose a repository folder', 0);
    try {
      const path = await this.invoke<string | null>('select_workspace');
      if (!path) {
        this.scanProgress.set(null);
        return;
      }
      this.workspacePath.set(path);
      this.setScanProgress(
        'repository',
        'Inspecting repository metadata and configuration',
        0,
      );
      const [status, scan, configText] = await Promise.all([
        this.invoke<GitStatus>('read_git_status', { path }),
        this.invoke<WorkspaceScan>('read_workspace_scan', { path }),
        this.invoke<string | null>('read_repository_config_file', { path }),
      ]);
      this.gitStatus.set(status);
      this.workspaceScan.set(scan);
      this.setAdapterDiagnostic({
        id: 'workspace-scan',
        adapter: 'workspace scanner',
        source: 'read_workspace_scan',
        status: 'loaded',
        rawOutput: JSON.stringify(scan, null, 2),
        error: null,
      });
      this.setAdapterDiagnostic({
        id: 'git-status',
        adapter: 'Git workspace adapter',
        source: 'read_git_status',
        status: 'loaded',
        rawOutput: JSON.stringify(status, null, 2),
        error: null,
      });
      this.selectedComponentPackagePath.set(
        scan.componentPackages.length === 1
          ? (scan.componentPackages[0]?.path ?? null)
          : null,
      );
      this.applyConfigText(configText);
      this.setScanProgress('contracts', 'Loading component contracts', 1);
      await this.loadCustomElementsManifest(path, scan);
      this.setScanProgress(
        'governance',
        'Loading ForgeGate component governance',
        2,
      );
      await this.loadComponentManifests(path, scan);
      await this.loadTestExecutions(path, scan);
      this.setScanProgress(
        'storybook',
        'Connecting the Storybook story index',
        3,
      );
      await this.loadStorybookIndex(path, scan);
      this.setScanProgress(
        'native-patterns',
        'Analyzing native and styling-library component patterns',
        4,
      );
      await this.loadNativeComponentSignals(path, scan);
      this.scanProgress.set({
        phase: 'complete',
        state: 'complete',
        label: 'Workspace scan complete',
        completed: WORKSPACE_SCAN_STEP_COUNT,
        total: WORKSPACE_SCAN_STEP_COUNT,
      });
    } catch (error) {
      this.gitStatus.set(null);
      this.workspaceScan.set(null);
      this.repositoryConfig.set(null);
      this.customElementsManifest.set(null);
      this.componentManifestOverrides.set([]);
      this.testExecutions.set([]);
      this.storybookIndex.set(null);
      this.nativeComponentSignals.set([]);
      this.error.set(String(error));
      this.setAdapterDiagnostic({
        id: 'workspace-selection',
        adapter: 'workspace orchestration',
        source: this.workspacePath() ?? 'workspace selection',
        status: 'failed',
        rawOutput: null,
        error: String(error),
      });
      const completed = this.scanProgress()?.completed ?? 0;
      this.scanProgress.set({
        phase: 'failed',
        state: 'failed',
        label: `Workspace scan failed after ${completed} of ${WORKSPACE_SCAN_STEP_COUNT} checks`,
        completed,
        total: WORKSPACE_SCAN_STEP_COUNT,
      });
    }
  }

  private setScanProgress(
    phase: WorkspaceScanPhase,
    label: string,
    completed: number,
  ): void {
    this.scanProgress.set({
      phase,
      state: 'running',
      label,
      completed,
      total: WORKSPACE_SCAN_STEP_COUNT,
    });
  }

  private setAdapterDiagnostic(diagnostic: AdapterDiagnostic): void {
    this.adapterDiagnostics.update((current) => [
      ...current.filter((item) => item.id !== diagnostic.id),
      diagnostic,
    ]);
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
    this.cemGenerationLiveOutput.set('');
    const unlisten = await this.listen<CommandOutputLine>(
      'workspace-command-output',
      (event) => {
        this.cemGenerationLiveOutput.update(
          (current) => current + event.payload.line + '\n',
        );
      },
    );
    try {
      const result = await this.invoke<CommandResult>('run_workspace_command', {
        workspacePath: path,
        relativeCwd: plan.target.path,
        command: plan.command,
        args: plan.args,
        timeoutSeconds: GENERATE_CEM_TIMEOUT_SECONDS,
      });
      this.cemGenerationResult.set(result);
      this.setAdapterDiagnostic({
        id: 'cem-generation-command',
        adapter: 'Custom Elements Manifest analyzer',
        source: `${plan.target.path}: ${plan.commandText}`,
        status: result.exitCode === 0 ? 'loaded' : 'failed',
        rawOutput: JSON.stringify(result, null, 2),
        error: result.exitCode === 0
          ? null
          : result.cancelled
            ? 'Cancelled by user'
            : result.stderr || 'Command failed',
      });
      if (result.exitCode === 0) {
        const relativePath = [
          plan.target.path === '.' ? '' : plan.target.path,
          plan.target.manifestPath,
        ]
          .filter(Boolean)
          .join('/');
        const text = await this.invoke<string>('read_text_file', {
          workspacePath: path,
          relativePath,
        });
        this.customElementsManifest.set(parseCustomElementsManifest(text));
        this.setAdapterDiagnostic({
          id: `custom-elements-manifest:${relativePath}`,
          adapter: 'Web Components adapter',
          source: relativePath,
          status: 'loaded',
          rawOutput: text,
          error: null,
        });
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
      this.setAdapterDiagnostic({
        id: 'cem-generation-command',
        adapter: 'Custom Elements Manifest analyzer',
        source: `${plan.target.path}: ${plan.commandText}`,
        status: 'failed',
        rawOutput: null,
        error: String(error),
      });
    } finally {
      unlisten();
      this.cemGenerationRunning.set(false);
    }
  }

  /**
   * Requests cancellation of the currently running CEM generation command.
   * A no-op if nothing is running. The Rust side signals a cancellation
   * flag `run_workspace_command`'s own wait loop polls — this call itself
   * returns immediately; `generateCustomElementsManifest`'s in-flight
   * `invoke` resolves shortly after with `cemGenerationResult().cancelled`
   * set, same as it would for a timeout.
   */
  async cancelGeneratingCustomElementsManifest(): Promise<void> {
    if (!this.cemGenerationRunning()) {
      return;
    }
    await this.invoke<boolean>('cancel_workspace_command');
  }

  /**
   * Exports one component's real evidence — its own test executions and
   * per-target documentation drift, per `buildEvidenceExport` — as a real
   * directory the user picks via a native folder dialog. A no-op if an
   * export is already running. Cancelling the folder dialog (returning
   * null) is a quiet no-op too, not an error: the user simply changed
   * their mind, same as declining `select_workspace`'s dialog.
   */
  async exportEvidencePackage(
    manifest: ComponentManifest,
    testExecutions: readonly TestExecution[],
  ): Promise<void> {
    if (this.evidenceExportRunning()) {
      return;
    }
    this.evidenceExportRunning.set(true);
    this.evidenceExportError.set(null);
    this.evidenceExportResult.set(null);
    try {
      const parentDirectory = await this.invoke<string | null>(
        'pick_export_directory',
      );
      if (!parentDirectory) {
        return;
      }
      const { directoryName, files } = await buildEvidenceExport(
        crypto.randomUUID(),
        new Date().toISOString(),
        manifest,
        testExecutions,
        this.workspaceScan()?.starlightProjects ?? [],
      );
      const directoryPath = await this.invoke<string>('write_evidence_package', {
        parentDirectory,
        directoryName,
        files,
      });
      this.evidenceExportResult.set({ directoryPath });
    } catch (error) {
      this.evidenceExportError.set(String(error));
    } finally {
      this.evidenceExportRunning.set(false);
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
      this.setAdapterDiagnostic({
        id: 'repository-config',
        adapter: 'repository config adapter',
        source: '.forgegate/config.yaml',
        status: 'unavailable',
        rawOutput: null,
        error: 'File not present',
      });
      return;
    }
    try {
      this.repositoryConfig.set(parseRepositoryConfig(configText));
      this.setAdapterDiagnostic({
        id: 'repository-config',
        adapter: 'repository config adapter',
        source: '.forgegate/config.yaml',
        status: 'loaded',
        rawOutput: configText,
        error: null,
      });
    } catch (error) {
      this.repositoryConfig.set(null);
      this.repositoryConfigError.set(String(error));
      this.setAdapterDiagnostic({
        id: 'repository-config',
        adapter: 'repository config adapter',
        source: '.forgegate/config.yaml',
        status: 'failed',
        rawOutput: configText,
        error: String(error),
      });
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
      this.setAdapterDiagnostic({
        id: 'custom-elements-manifest',
        adapter: 'Web Components adapter',
        source: 'Custom Elements Manifest',
        status: 'unavailable',
        rawOutput: null,
        error: 'No manifest detected',
      });
      return;
    }
    let text: string | null = null;
    try {
      text = await this.invoke<string>('read_text_file', {
        workspacePath,
        relativePath,
      });
      this.customElementsManifest.set(parseCustomElementsManifest(text));
      this.setAdapterDiagnostic({
        id: 'custom-elements-manifest',
        adapter: 'Web Components adapter',
        source: relativePath,
        status: 'loaded',
        rawOutput: text,
        error: null,
      });
    } catch (error) {
      this.customElementsManifestError.set(String(error));
      this.setAdapterDiagnostic({
        id: 'custom-elements-manifest',
        adapter: 'Web Components adapter',
        source: relativePath,
        status: 'failed',
        rawOutput: text,
        error: String(error),
      });
    }
  }

  private async loadComponentManifests(
    workspacePath: string,
    scan: WorkspaceScan,
  ): Promise<void> {
    this.componentManifestOverrides.set([]);
    const manifests: ComponentManifest[] = [];
    for (const relativePath of scan.componentManifests ?? []) {
      let text: string | null = null;
      try {
        text = await this.invoke<string>('read_text_file', {
          workspacePath,
          relativePath,
        });
        manifests.push(parseComponentManifest(text));
        this.setAdapterDiagnostic({
          id: `component-manifest:${relativePath}`,
          adapter: 'component manifest adapter',
          source: relativePath,
          status: 'loaded',
          rawOutput: text,
          error: null,
        });
      } catch (error) {
        this.componentManifestError.set(`${relativePath}: ${String(error)}`);
        this.setAdapterDiagnostic({
          id: `component-manifest:${relativePath}`,
          adapter: 'component manifest adapter',
          source: relativePath,
          status: 'failed',
          rawOutput: text,
          error: String(error),
        });
      }
    }
    this.componentManifestOverrides.set(manifests);
  }

  private async loadTestExecutions(
    workspacePath: string,
    scan: WorkspaceScan,
  ): Promise<void> {
    this.testExecutions.set([]);
    const executions: TestExecution[] = [];
    const errors: string[] = [];
    for (const relativePath of scan.testEvidenceFiles ?? []) {
      let text: string | null = null;
      try {
        text = await this.invoke<string>('read_text_file', {
          workspacePath,
          relativePath,
        });
        executions.push(parseTestExecution(text));
        this.setAdapterDiagnostic({
          id: `test-evidence:${relativePath}`,
          adapter: 'test evidence adapter',
          source: relativePath,
          status: 'loaded',
          rawOutput: text,
          error: null,
        });
      } catch (error) {
        errors.push(`${relativePath}: ${String(error)}`);
        this.setAdapterDiagnostic({
          id: `test-evidence:${relativePath}`,
          adapter: 'test evidence adapter',
          source: relativePath,
          status: 'failed',
          rawOutput: text,
          error: String(error),
        });
      }
    }
    this.testExecutions.set(executions);
    this.testExecutionError.set(errors.length ? errors.join('\n') : null);
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
      this.setAdapterDiagnostic({
        id: 'storybook-index',
        adapter: 'Storybook adapter',
        source: STORYBOOK_INDEX_CONVENTIONAL_PATH,
        status: 'unavailable',
        rawOutput: null,
        error: 'Storybook not detected',
      });
      return;
    }
    let text: string;
    try {
      text = await this.invoke<string>('read_text_file', {
        workspacePath,
        relativePath: STORYBOOK_INDEX_CONVENTIONAL_PATH,
      });
    } catch (error) {
      this.setAdapterDiagnostic({
        id: 'storybook-index',
        adapter: 'Storybook adapter',
        source: STORYBOOK_INDEX_CONVENTIONAL_PATH,
        status: 'unavailable',
        rawOutput: null,
        error: String(error),
      });
      return;
    }
    try {
      this.storybookIndex.set(parseStorybookIndex(text));
      this.setAdapterDiagnostic({
        id: 'storybook-index',
        adapter: 'Storybook adapter',
        source: STORYBOOK_INDEX_CONVENTIONAL_PATH,
        status: 'loaded',
        rawOutput: text,
        error: null,
      });
    } catch (error) {
      this.storybookIndexError.set(String(error));
      this.setAdapterDiagnostic({
        id: 'storybook-index',
        adapter: 'Storybook adapter',
        source: STORYBOOK_INDEX_CONVENTIONAL_PATH,
        status: 'failed',
        rawOutput: text,
        error: String(error),
      });
    }
  }

  private async loadNativeComponentSignals(
    workspacePath: string,
    scan: WorkspaceScan,
  ): Promise<void> {
    this.nativeComponentSignals.set([]);
    const sourcePaths = scan.uiSourceFiles ?? [];
    const settled = await Promise.allSettled(
      sourcePaths.map(async (relativePath) => ({
        path: relativePath,
        content: await this.invoke<string>('read_text_file', {
          workspacePath,
          relativePath,
        }),
      })),
    );
    const files = settled.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    );
    const failedCount = settled.length - files.length;
    const failures = settled.flatMap((result, index) =>
      result.status === 'rejected'
        ? [`${sourcePaths[index]}: ${String(result.reason)}`]
        : [],
    );
    if (failedCount) {
      this.nativeComponentSignalsError.set(
        `${failedCount} UI source file(s) could not be read: ${failures.join('; ')}`,
      );
    }
    const signals = discoverNativeComponentSignals(files, scan.uiTechnologies);
    this.nativeComponentSignals.set(signals);
    this.setAdapterDiagnostic({
      id: 'native-component-signals',
      adapter: 'native pattern adapter',
      source: `${sourcePaths.length} discovered UI source file(s)`,
      status: failures.length
        ? files.length
          ? 'partial'
          : 'failed'
        : 'loaded',
      rawOutput: JSON.stringify(signals, null, 2),
      error: failures.length ? failures.join('\n') : null,
    });
  }
}

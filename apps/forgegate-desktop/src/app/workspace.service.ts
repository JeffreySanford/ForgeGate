import { inject, Injectable, signal } from '@angular/core';
import {
  parseRepositoryConfig,
  type RepositoryConfig,
} from '@forgegate/core-config';
import {
  parseException,
  parseFinding,
  parseManualProcedure,
  parseManualReview,
  parseTestEvidenceFile,
  type AutomatedEvidenceArtifact,
  type Exception,
  type Finding,
  type ManualProcedure,
  type ManualReview,
  type TestExecution,
} from '@forgegate/core-evidence';
import { findingsFromManualReviewStepResults } from './manual-review-findings';
import {
  extractProtectedOverview,
  generateStarlightComponentReportData,
  generateStarlightComponentPage,
  generateStarlightRegistryIndexPage,
  generateStarlightRegistryReportData,
  parseStarlightAudienceOverrideConfig,
  type StarlightPageTemplate,
  STARLIGHT_TEMPLATE_OPTIONS,
  starlightComponentReportDataPath,
  starlightComponentPagePath,
  starlightTemplateForManifest,
  starlightRegistryIndexPath,
  starlightRegistryReportDataPath,
} from './starlight-page';
import { assertValidGeneratedStarlightMdx } from './starlight-page-validation';
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
import { parseDtcgTokens, type DtcgToken } from './dtcg-tokens';
import { computeWorkspaceWatchDirectories } from './workspace-watch-directories';
import {
  discoverAngularComponents,
  type AngularComponentDeclaration,
} from './angular-components';
import type { EvidenceApprover } from './release-decision-export';
import type { ComponentSnapshotReadiness } from './component-readiness';
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

/**
 * One evidence write ForgeGate has staged into a temporary directory but
 * not yet committed into the reviewed workspace, mirroring the Rust
 * `StagedEvidenceWriteDto` returned by `stage_manual_review`/
 * `stage_finding`. `previousContent` is whatever real file this write
 * would replace, if any — enough to render a real diff.
 */
export interface StagedEvidenceWrite {
  readonly stagingId: string;
  readonly subdirectory: string;
  readonly filename: string;
  readonly previousContent: string | null;
  readonly newContent: string;
}

/** A staged manual review plus every finding staged alongside it. */
export interface StagedManualReview {
  readonly review: ManualReview;
  readonly componentId: string;
  readonly reviewWrite: StagedEvidenceWrite;
  readonly findingWrites: readonly {
    readonly finding: Finding;
    readonly write: StagedEvidenceWrite;
  }[];
}

/** A write staged at an arbitrary workspace-relative path, mirroring the
 * Rust `StagedRelativeWriteDto` — used for destinations outside the
 * fixed `.forgegate/<subdirectory>/` convention, e.g. a generated
 * Starlight page. */
export interface StagedRelativeWrite {
  readonly stagingId: string;
  readonly relativePath: string;
  readonly previousContent: string | null;
  readonly newContent: string;
}

/** A generated Starlight page staged but not yet committed, plus the
 * component id it documents (for a human-readable diff header). */
export interface StagedStarlightPage {
  readonly componentId: string | null;
  readonly template: StarlightPageTemplate;
  readonly write: StagedRelativeWrite;
  readonly writes: readonly StagedRelativeWrite[];
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
  manualReviewFiles?: string[];
  exceptionFiles?: string[];
  procedureFiles?: string[];
  findingFiles?: string[];
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

export interface EnrichedScanSnapshot {
  readonly sourceCommit: string | null;
  readonly dirty: boolean | null;
  readonly componentCount: number;
  readonly readinessSummary: {
    readonly total: number;
    readonly readiness: Record<string, number>;
    readonly lifecycle: Record<string, number>;
  };
  readonly adapterSummary: {
    readonly total: number;
    readonly byStatus: Record<AdapterDiagnostic['status'], number>;
    readonly diagnostics: readonly Pick<
      AdapterDiagnostic,
      'id' | 'adapter' | 'source' | 'status' | 'error'
    >[];
  };
  readonly components: readonly EnrichedComponentSnapshot[];
}

export interface EnrichedComponentSnapshot {
  readonly componentId: string;
  readonly componentVersion: string | null;
  readonly framework: string;
  readonly adapter: string;
  readonly lifecycle: string;
  readonly sourceFiles: readonly string[];
  readonly readiness: ComponentSnapshotReadiness;
  readonly findingSummary: {
    readonly status: ComponentSnapshotReadiness;
    readonly findings: readonly Finding[];
    readonly reason: string | null;
  };
}

export interface EvidenceHistorySnapshot {
  readonly id: number;
  readonly scannedAt: string;
  readonly sourceCommit: string | null;
  readonly dirty: boolean | null;
  readonly componentCount: number | null;
  readonly componentSnapshotCount: number;
  readonly readinessSummary: {
    readonly total?: number;
    readonly readiness?: Record<string, number>;
    readonly lifecycle?: Record<string, number>;
  } | null;
  readonly adapterSummary: {
    readonly total?: number;
    readonly byStatus?: Partial<Record<AdapterDiagnostic['status'], number>>;
  };
  readonly seeded: boolean;
  readonly seedLabel: string | null;
}

export interface EvidenceHistoryTrend {
  readonly configured: boolean;
  readonly connected: boolean;
  readonly snapshots: readonly EvidenceHistorySnapshot[];
  readonly error: string | null;
}

/**
 * A real, narrow first slice of "the exact causal event that made evidence
 * stale" (evidence-history follow-up backlog in TODO.md): derived by
 * diffing a component's readiness between two consecutive enriched scans on
 * the Rust side. Only `readiness-changed` exists today — manual-review and
 * release-decision event kinds need those features to exist first.
 */
export interface ComponentEvidenceEvent {
  readonly occurredAt: string;
  readonly eventKind: string;
  readonly previousReadiness: string;
  readonly nextReadiness: string;
  readonly previousCommit: string | null;
  readonly nextCommit: string | null;
}

export interface ComponentEvidenceEvents {
  readonly configured: boolean;
  readonly connected: boolean;
  readonly events: readonly ComponentEvidenceEvent[];
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
const STARLIGHT_BUILD_COMMAND_MAPPING = 'starlightBuild';
const STARLIGHT_BUILD_TIMEOUT_SECONDS = 180;
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

export interface WorkspaceCommandPlan {
  readonly command: string;
  readonly args: readonly string[];
  readonly commandText: string;
}

export function parseWorkspaceCommandMapping(
  commandText: string,
): WorkspaceCommandPlan {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaping = false;

  for (const char of commandText.trim()) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === '\\') {
      escaping = true;
      continue;
    }
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }

  if (escaping) {
    current += '\\';
  }
  if (quote) {
    throw new Error('Command mapping contains an unterminated quote.');
  }
  if (current) {
    tokens.push(current);
  }
  const [command, ...args] = tokens;
  if (!command) {
    throw new Error('Command mapping must not be empty.');
  }
  return { command, args, commandText: commandText.trim() };
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
  readonly automatedEvidenceArtifacts = signal<
    readonly AutomatedEvidenceArtifact[]
  >([]);
  readonly testExecutionError = signal<string | null>(null);
  /** Every real `.forgegate/manual-reviews/*.json` record — a human
   * actually performing a declared procedure, not just the manifest
   * declaring that a procedure exists. */
  readonly manualReviews = signal<readonly ManualReview[]>([]);
  readonly manualReviewError = signal<string | null>(null);
  /** Every real `.forgegate/exceptions/*.json` record — a human's explicit,
   * rationale-bearing approval of a deviation against a specific finding,
   * not something ForgeGate computes on its own. */
  readonly exceptions = signal<readonly Exception[]>([]);
  readonly exceptionError = signal<string | null>(null);
  /** Every real `.forgegate/procedures/*.yaml` record — the ordered steps a
   * human follows during a guided manual review. */
  readonly procedures = signal<readonly ManualProcedure[]>([]);
  readonly procedureError = signal<string | null>(null);
  /** Every real `.forgegate/findings/*.json` record — today always written
   * by ForgeGate itself, one per failed or blocked guided-review step. */
  readonly findings = signal<readonly Finding[]>([]);
  readonly findingError = signal<string | null>(null);
  readonly saveManualReviewRunning = signal(false);
  readonly saveManualReviewError = signal<string | null>(null);
  readonly saveManualReviewResult = signal<{ readonly path: string } | null>(
    null,
  );
  /** A manual review (and its derived findings) staged into a temporary
   * directory but not yet committed into the workspace — populated by
   * `stageManualReview`, cleared by `approveStagedManualReview` or
   * `discardStagedManualReview`. Real writes into the reviewed repository
   * always pass through this staged/approved flow, per P2 entry gate 2. */
  readonly stagedManualReview = signal<StagedManualReview | null>(null);
  readonly approveManualReviewRunning = signal(false);
  readonly approveManualReviewError = signal<string | null>(null);
  /** A generated Starlight documentation page staged but not yet
   * committed — populated by `generateAndStageStarlightPage`, cleared by
   * `approveStagedStarlightPage` or `discardStagedStarlightPage`. Real
   * writes into a detected Starlight project follow the same
   * staged/approved discipline as manual reviews (P2 entry gate 2). */
  readonly stagedStarlightPage = signal<StagedStarlightPage | null>(null);
  readonly starlightPageRunning = signal(false);
  readonly starlightPageError = signal<string | null>(null);
  readonly starlightPageResult = signal<{ readonly path: string } | null>(null);
  readonly starlightBuildResult = signal<CommandResult | null>(null);
  readonly starlightBuildError = signal<string | null>(null);
  readonly starlightBuildSkipped = signal<string | null>(null);
  readonly starlightTemplates = STARLIGHT_TEMPLATE_OPTIONS;

  starlightDefaultTemplateFor(
    manifest: ComponentManifest,
  ): StarlightPageTemplate {
    return starlightTemplateForManifest(
      manifest,
      parseStarlightAudienceOverrideConfig(
        this.repositoryConfig()?.adapterConfiguration,
      ),
    );
  }
  /**
   * Real files changed between a stale review's recorded commit and the
   * workspace's current commit (documentation/09-manual-review-and-evidence.md's
   * "Stale approvals" example), keyed by the reviewed commit hash so
   * several reviews sharing the same commit only ever fetch it once.
   * Lazy and explicit: only fetched when the user asks (never eagerly for
   * every review shown), since it is a real `git diff` shell-out per
   * distinct commit.
   */
  readonly staleReviewChangedFiles = signal<
    Readonly<
      Record<
        string,
        { readonly files: readonly string[]; readonly error: string | null }
      >
    >
  >({});
  /** Every DTCG token parsed from the workspace's detected token files. */
  readonly designTokens = signal<readonly DtcgToken[]>([]);
  readonly designTokenError = signal<string | null>(null);
  /** Angular components discovered by scanning TypeScript source. */
  readonly angularComponents = signal<readonly AngularComponentDeclaration[]>(
    [],
  );
  readonly angularComponentsError = signal<string | null>(null);
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
  readonly evidenceHistoryTrend = signal<EvidenceHistoryTrend | null>(null);
  readonly evidenceHistoryLoading = signal(false);
  readonly persistenceError = signal<string | null>(null);
  readonly componentEvidenceEvents = signal<ComponentEvidenceEvents | null>(
    null,
  );
  readonly evidenceExportRunning = signal(false);
  readonly evidenceExportResult = signal<{
    readonly directoryPath: string;
  } | null>(null);
  readonly evidenceExportError = signal<string | null>(null);
  /**
   * Set when the filesystem watcher reports a real change inside one of
   * the workspace's real, already-scanned directories. Deliberately never
   * auto-triggers a rescan — silently invalidating evidence the user is
   * actively reading would be worse than asking. `rescanWorkspace()` is
   * the explicit action a "Rescan" affordance calls; `dismissFilesystemChanges()`
   * clears the banner without rescanning.
   */
  readonly filesystemChangesDetected = signal<{
    readonly paths: readonly string[];
    readonly truncated: boolean;
  } | null>(null);
  /**
   * P1.8's "rescan-triggered" motion moment: set `true` right after an
   * explicit `rescanWorkspace()` call finishes, so a consuming view (the
   * workspace system map) can play a real entrance signaling "this data
   * just refreshed" — the same visual language P1.8's "discovery" moment
   * already uses for the filesystem-changes banner. Deliberately not set
   * by the initial `selectWorkspace()` open: there is nothing to
   * "refresh" the very first time a workspace is scanned. The consuming
   * view resets this back to `false` on its own animation's `animationend`
   * (event-driven, like the route-leave ghost), not a timer, so it can
   * retrigger on every subsequent rescan.
   */
  readonly justRescanned = signal(false);
  private workspaceChangedListenerReady = false;
  readonly error = signal<string | null>(null);

  async selectWorkspace(): Promise<void> {
    if (this.scanProgress()?.state === 'running') {
      return;
    }
    this.setScanProgress('selecting', 'Choose a repository folder', 0);
    try {
      const path = await this.invoke<string | null>('select_workspace');
      if (!path) {
        this.scanProgress.set(null);
        return;
      }
      await this.scanWorkspace(path);
    } catch (error) {
      this.error.set(String(error));
      this.scanProgress.set({
        phase: 'failed',
        state: 'failed',
        label: 'Could not open the selected folder',
        completed: 0,
        total: WORKSPACE_SCAN_STEP_COUNT,
      });
    }
  }

  /**
   * Re-scans the currently open workspace with no folder dialog — the
   * counterpart `selectWorkspace` needs for the filesystem watcher (and
   * any other future trigger) to request a fresh scan of a workspace the
   * user has already chosen, rather than only ever scanning in response to
   * a human picking a folder. A no-op if no workspace is open or a scan is
   * already running.
   */
  async rescanWorkspace(): Promise<void> {
    const path = this.workspacePath();
    if (!path || this.scanProgress()?.state === 'running') {
      return;
    }
    this.filesystemChangesDetected.set(null);
    await this.scanWorkspace(path);
    if (this.scanProgress()?.state !== 'failed') {
      this.justRescanned.set(true);
    }
  }

  private async scanWorkspace(path: string): Promise<void> {
    this.error.set(null);
    this.repositoryConfigError.set(null);
    this.customElementsManifestError.set(null);
    this.componentManifestError.set(null);
    this.testExecutionError.set(null);
    this.manualReviewError.set(null);
    this.exceptionError.set(null);
    this.procedureError.set(null);
    this.findingError.set(null);
    this.storybookIndexError.set(null);
    this.nativeComponentSignalsError.set(null);
    this.cemGenerationResult.set(null);
    this.cemGenerationError.set(null);
    this.adapterDiagnostics.set([]);
    this.evidenceHistoryTrend.set(null);
    this.evidenceHistoryLoading.set(false);
    this.persistenceError.set(null);
    this.filesystemChangesDetected.set(null);
    try {
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
      await this.loadManualReviews(path, scan);
      await this.loadExceptions(path, scan);
      await this.loadProcedures(path, scan);
      await this.loadFindings(path, scan);
      await this.loadDesignTokens(path, scan);
      await this.loadAngularComponents(path, scan);
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
      await this.loadEvidenceHistoryTrend();
      await this.startWatchingWorkspace(path, scan);
    } catch (error) {
      this.gitStatus.set(null);
      this.workspaceScan.set(null);
      this.repositoryConfig.set(null);
      this.customElementsManifest.set(null);
      this.componentManifestOverrides.set([]);
      this.testExecutions.set([]);
      this.automatedEvidenceArtifacts.set([]);
      this.manualReviews.set([]);
      this.exceptions.set([]);
      this.procedures.set([]);
      this.findings.set([]);
      this.storybookIndex.set(null);
      this.nativeComponentSignals.set([]);
      this.evidenceHistoryTrend.set(null);
      this.evidenceHistoryLoading.set(false);
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

  async recordEnrichedScanSnapshot(
    snapshot: EnrichedScanSnapshot,
  ): Promise<void> {
    const path = this.workspacePath();
    if (!path) {
      return;
    }
    try {
      await this.invoke<number | null>('record_enriched_scan_snapshot', {
        path,
        snapshot,
      });
      this.persistenceError.set(null);
      await this.loadEvidenceHistoryTrend();
    } catch (error) {
      this.persistenceError.set(String(error));
    }
  }

  async loadEvidenceHistoryTrend(): Promise<void> {
    const path = this.workspacePath();
    if (!path || this.evidenceHistoryLoading()) {
      return;
    }
    this.evidenceHistoryLoading.set(true);
    try {
      const trend = await this.invoke<EvidenceHistoryTrend>(
        'read_evidence_history_trend',
        { path },
      );
      this.evidenceHistoryTrend.set(trend);
      this.persistenceError.set(trend.error);
    } catch (error) {
      this.evidenceHistoryTrend.set(null);
      this.persistenceError.set(String(error));
    } finally {
      this.evidenceHistoryLoading.set(false);
    }
  }

  /**
   * Loads a single component's derived readiness-change history. Called
   * per component (from `ComponentDetailPage`, keyed on the route's
   * `componentId`), not as part of the workspace-wide scan, since it is
   * scoped to one component and would be wasted work for every other one.
   */
  async loadComponentEvidenceEvents(componentId: string): Promise<void> {
    const path = this.workspacePath();
    if (!path) {
      this.componentEvidenceEvents.set(null);
      return;
    }
    try {
      const events = await this.invoke<ComponentEvidenceEvents>(
        'read_component_evidence_events',
        { path, componentId },
      );
      this.componentEvidenceEvents.set(events);
    } catch (error) {
      this.componentEvidenceEvents.set({
        configured: true,
        connected: false,
        events: [],
        error: String(error),
      });
    }
  }

  /**
   * Starts (or restarts, replacing any previous watch) a filesystem watch
   * over the real directories this scan found — see
   * `computeWorkspaceWatchDirectories` for why those, not the whole
   * workspace. Best-effort: a workspace with nothing watchable (every
   * real component-package/token/UI-source directory has since vanished)
   * is recorded as an honest `'unavailable'` adapter diagnostic, not a
   * failed scan — the scan itself already succeeded.
   */
  private async startWatchingWorkspace(
    path: string,
    scan: WorkspaceScan,
  ): Promise<void> {
    await this.ensureWorkspaceChangedListener();
    const directories = computeWorkspaceWatchDirectories(scan);
    const source = `${directories.length} watched director${directories.length === 1 ? 'y' : 'ies'}`;
    try {
      await this.invoke<void>('start_workspace_watch', {
        workspacePath: path,
        directories,
      });
      this.setAdapterDiagnostic({
        id: 'workspace-watch',
        adapter: 'filesystem watcher',
        source,
        status: 'loaded',
        rawOutput: JSON.stringify(directories, null, 2),
        error: null,
      });
    } catch (error) {
      this.setAdapterDiagnostic({
        id: 'workspace-watch',
        adapter: 'filesystem watcher',
        source,
        status: 'unavailable',
        rawOutput: null,
        error: String(error),
      });
    }
  }

  /**
   * Registered once for this service's lifetime (it is a singleton), not
   * per scan — the Rust side already guarantees only one watch is ever
   * active at a time (starting a new one replaces the old), so one
   * listener living for the app's lifetime is enough to receive every
   * workspace's events, whichever workspace is currently open.
   */
  private async ensureWorkspaceChangedListener(): Promise<void> {
    if (this.workspaceChangedListenerReady) {
      return;
    }
    this.workspaceChangedListenerReady = true;
    await this.listen<{ changedPaths: string[]; truncated: boolean }>(
      'workspace-changed',
      (event) => {
        this.filesystemChangesDetected.set({
          paths: event.payload.changedPaths,
          truncated: event.payload.truncated,
        });
      },
    );
  }

  /** Clears the "changes detected" banner without rescanning. */
  dismissFilesystemChanges(): void {
    this.filesystemChangesDetected.set(null);
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
        error:
          result.exitCode === 0
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
   * Exports one component's real evidence — its own test executions,
   * manual reviews, any exception approving one of this export's own
   * findings, per-target documentation drift, and blocking-reason
   * findings, per `buildEvidenceExport` — as a real directory the user
   * picks via a native folder dialog. A no-op if an export is already
   * running.
   * Cancelling the folder dialog (returning null) is a quiet no-op too,
   * not an error: the user simply changed their mind, same as declining
   * `select_workspace`'s dialog.
   */
  async exportEvidencePackage(
    manifest: ComponentManifest,
    testExecutions: readonly TestExecution[],
    blockingReasons: readonly string[] = [],
    /**
     * Left undefined by every production call site today — ForgeGate has no
     * human approval flow, so a clean component honestly gets no release
     * decision rather than a fabricated approval. Exposed as a parameter so
     * an e2e test (or a human deliberately exercising the approval path
     * against their own repository) can supply a `'test-harness'` approver;
     * everything produced that way is marked as not a real approval.
     */
    approver?: EvidenceApprover | null,
    manualReviews: readonly ManualReview[] = [],
    exceptions: readonly Exception[] = [],
    persistedFindings: readonly Finding[] = [],
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
      const { directoryName, files } = await buildEvidenceExport({
        id: crypto.randomUUID(),
        exportedAt: new Date().toISOString(),
        manifest,
        testExecutions,
        automatedArtifacts: this.automatedEvidenceArtifacts().filter(
          (artifact) =>
            artifact.componentVersionId === componentVersionId(manifest),
        ),
        manualReviews: manualReviews.filter(
          (review) =>
            review.componentVersionId === componentVersionId(manifest),
        ),
        exceptions,
        persistedFindings,
        starlightProjects: this.workspaceScan()?.starlightProjects ?? [],
        blockingReasons,
        approver,
        repositoryCommit: this.gitStatus()?.commit ?? null,
      });
      const directoryPath = await this.invoke<string>(
        'write_evidence_package',
        {
          parentDirectory,
          directoryName,
          files,
        },
      );
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

  /**
   * Loads and parses every detected DTCG token file. Each file is reported
   * on its own adapter diagnostic, so one malformed token file never blanks
   * out the others — the same rule the component-manifest and test-evidence
   * loaders already follow.
   */
  /**
   * Discovers Angular components by scanning the workspace's TypeScript
   * sources. Runs regardless of whether a CEM exists: a repository can hold
   * both Web Components and Angular components, and only one of those has a
   * build-output manifest to read.
   *
   * Reads every file in one batched IPC call — 225 files in one real
   * repository, which would otherwise be 225 round trips for a single scan
   * step.
   */
  private async loadAngularComponents(
    workspacePath: string,
    scan: WorkspaceScan,
  ): Promise<void> {
    this.angularComponents.set([]);
    const typescriptFiles = (scan.uiSourceFiles ?? []).filter((path) =>
      path.endsWith('.ts'),
    );
    if (typescriptFiles.length === 0) {
      return;
    }
    try {
      const files = await this.invoke<{ path: string; contents: string }[]>(
        'read_workspace_source_files',
        { workspacePath, relativePaths: typescriptFiles },
      );
      const { declarations, scannedFileCount } =
        discoverAngularComponents(files);
      this.angularComponents.set(declarations);
      this.setAdapterDiagnostic({
        id: 'angular-components',
        adapter: 'Angular adapter',
        source: `${scannedFileCount} TypeScript source file(s)`,
        status: scan.uiSourceFilesTruncated ? 'partial' : 'loaded',
        rawOutput: JSON.stringify(declarations, null, 2),
        error: scan.uiSourceFilesTruncated
          ? 'Source discovery reached its file limit, so this scan is partial.'
          : null,
      });
    } catch (error) {
      this.angularComponentsError.set(String(error));
      this.setAdapterDiagnostic({
        id: 'angular-components',
        adapter: 'Angular adapter',
        source: `${typescriptFiles.length} TypeScript source file(s)`,
        status: 'failed',
        rawOutput: null,
        error: String(error),
      });
    }
  }

  private async loadDesignTokens(
    workspacePath: string,
    scan: WorkspaceScan,
  ): Promise<void> {
    this.designTokens.set([]);
    const tokens: DtcgToken[] = [];
    const errors: string[] = [];
    for (const relativePath of scan.tokenFiles ?? []) {
      let text: string | null = null;
      try {
        text = await this.invoke<string>('read_text_file', {
          workspacePath,
          relativePath,
        });
        const parsed = parseDtcgTokens(text);
        tokens.push(...parsed.tokens);
        this.setAdapterDiagnostic({
          id: `design-tokens:${relativePath}`,
          adapter: 'DTCG token adapter',
          source: relativePath,
          status: parsed.failures.length ? 'partial' : 'loaded',
          rawOutput: text,
          error: parsed.failures.length
            ? `${parsed.failures.length} entr(y|ies) could not be read as a token or group: ${parsed.failures.join(', ')}`
            : null,
        });
      } catch (error) {
        errors.push(`${relativePath}: ${String(error)}`);
        this.setAdapterDiagnostic({
          id: `design-tokens:${relativePath}`,
          adapter: 'DTCG token adapter',
          source: relativePath,
          status: 'failed',
          rawOutput: text,
          error: String(error),
        });
      }
    }
    this.designTokens.set(tokens);
    this.designTokenError.set(errors.length ? errors.join('; ') : null);
  }

  private async loadTestExecutions(
    workspacePath: string,
    scan: WorkspaceScan,
  ): Promise<void> {
    this.testExecutions.set([]);
    this.automatedEvidenceArtifacts.set([]);
    const executions: TestExecution[] = [];
    const automatedArtifacts: AutomatedEvidenceArtifact[] = [];
    const errors: string[] = [];
    for (const relativePath of scan.testEvidenceFiles ?? []) {
      let text: string | null = null;
      try {
        text = await this.invoke<string>('read_text_file', {
          workspacePath,
          relativePath,
        });
        const parsed = parseTestEvidenceFile(text);
        executions.push(...parsed.executions);
        automatedArtifacts.push(...parsed.automatedArtifacts);
        this.setAdapterDiagnostic({
          id: `test-evidence:${relativePath}`,
          adapter: testEvidenceAdapterLabel(parsed.adapter),
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
    this.automatedEvidenceArtifacts.set(automatedArtifacts);
    this.testExecutionError.set(errors.length ? errors.join('\n') : null);
  }

  private async loadManualReviews(
    workspacePath: string,
    scan: WorkspaceScan,
  ): Promise<void> {
    this.manualReviews.set([]);
    const reviews: ManualReview[] = [];
    const errors: string[] = [];
    for (const relativePath of scan.manualReviewFiles ?? []) {
      let text: string | null = null;
      try {
        text = await this.invoke<string>('read_text_file', {
          workspacePath,
          relativePath,
        });
        reviews.push(parseManualReview(text));
        this.setAdapterDiagnostic({
          id: `manual-review:${relativePath}`,
          adapter: 'manual review evidence',
          source: relativePath,
          status: 'loaded',
          rawOutput: text,
          error: null,
        });
      } catch (error) {
        errors.push(`${relativePath}: ${String(error)}`);
        this.setAdapterDiagnostic({
          id: `manual-review:${relativePath}`,
          adapter: 'manual review evidence',
          source: relativePath,
          status: 'failed',
          rawOutput: text,
          error: String(error),
        });
      }
    }
    this.manualReviews.set(reviews);
    this.manualReviewError.set(errors.length ? errors.join('\n') : null);
  }

  private async loadExceptions(
    workspacePath: string,
    scan: WorkspaceScan,
  ): Promise<void> {
    this.exceptions.set([]);
    const exceptions: Exception[] = [];
    const errors: string[] = [];
    for (const relativePath of scan.exceptionFiles ?? []) {
      let text: string | null = null;
      try {
        text = await this.invoke<string>('read_text_file', {
          workspacePath,
          relativePath,
        });
        exceptions.push(parseException(text));
        this.setAdapterDiagnostic({
          id: `exception:${relativePath}`,
          adapter: 'exception evidence',
          source: relativePath,
          status: 'loaded',
          rawOutput: text,
          error: null,
        });
      } catch (error) {
        errors.push(`${relativePath}: ${String(error)}`);
        this.setAdapterDiagnostic({
          id: `exception:${relativePath}`,
          adapter: 'exception evidence',
          source: relativePath,
          status: 'failed',
          rawOutput: text,
          error: String(error),
        });
      }
    }
    this.exceptions.set(exceptions);
    this.exceptionError.set(errors.length ? errors.join('\n') : null);
  }

  private async loadProcedures(
    workspacePath: string,
    scan: WorkspaceScan,
  ): Promise<void> {
    this.procedures.set([]);
    const procedures: ManualProcedure[] = [];
    const errors: string[] = [];
    for (const relativePath of scan.procedureFiles ?? []) {
      let text: string | null = null;
      try {
        text = await this.invoke<string>('read_text_file', {
          workspacePath,
          relativePath,
        });
        procedures.push(parseManualProcedure(text));
        this.setAdapterDiagnostic({
          id: `procedure:${relativePath}`,
          adapter: 'manual review procedure',
          source: relativePath,
          status: 'loaded',
          rawOutput: text,
          error: null,
        });
      } catch (error) {
        errors.push(`${relativePath}: ${String(error)}`);
        this.setAdapterDiagnostic({
          id: `procedure:${relativePath}`,
          adapter: 'manual review procedure',
          source: relativePath,
          status: 'failed',
          rawOutput: text,
          error: String(error),
        });
      }
    }
    this.procedures.set(procedures);
    this.procedureError.set(errors.length ? errors.join('\n') : null);
  }

  private async loadFindings(
    workspacePath: string,
    scan: WorkspaceScan,
  ): Promise<void> {
    this.findings.set([]);
    const findings: Finding[] = [];
    const errors: string[] = [];
    for (const relativePath of scan.findingFiles ?? []) {
      let text: string | null = null;
      try {
        text = await this.invoke<string>('read_text_file', {
          workspacePath,
          relativePath,
        });
        findings.push(parseFinding(text));
        this.setAdapterDiagnostic({
          id: `finding:${relativePath}`,
          adapter: 'finding evidence',
          source: relativePath,
          status: 'loaded',
          rawOutput: text,
          error: null,
        });
      } catch (error) {
        errors.push(`${relativePath}: ${String(error)}`);
        this.setAdapterDiagnostic({
          id: `finding:${relativePath}`,
          adapter: 'finding evidence',
          source: relativePath,
          status: 'failed',
          rawOutput: text,
          error: String(error),
        });
      }
    }
    this.findings.set(findings);
    this.findingError.set(errors.length ? errors.join('\n') : null);
  }

  /**
   * Saves a real, already-completed guided manual review as
   * `.forgegate/manual-reviews/<review.id>.json` inside the open
   * workspace — a genuine write into the reviewed repository, so this is
   * only ever called from an explicit "Save manual review" action the
   * user takes after reviewing the constructed record, never
   * automatically. Updates `manualReviews` afterward so readiness reflects
   * it immediately, without requiring a full rescan.
   *
   * `componentId` is the manifest's bare id (not `review.componentVersionId`,
   * which may carry a `@version` suffix) — `Finding.componentId` is
   * always bare, matching `findingsFromBlockingReasons`' own convention,
   * so this takes it directly from the caller rather than parsing it back
   * out of the review.
   *
   * "A failed step should create or link to a finding"
   * (documentation/09-manual-review-and-evidence.md): when
   * `review.stepResults` includes a real failed or blocked step, this also
   * stages one real `Finding` per such step alongside the review.
   *
   * Nothing is written into the reviewed workspace by this call — per P2
   * entry gate 2, real writes go through temporary staging, an explicit
   * diff, and an explicit approval. Call `approveStagedManualReview` to
   * commit what this stages, or `discardStagedManualReview` to drop it.
   */
  async stageManualReview(
    review: ManualReview,
    componentId: string,
  ): Promise<void> {
    const path = this.workspacePath();
    if (!path || this.saveManualReviewRunning()) {
      return;
    }
    this.saveManualReviewRunning.set(true);
    this.saveManualReviewError.set(null);
    this.saveManualReviewResult.set(null);
    this.stagedManualReview.set(null);
    try {
      const reviewWrite = await this.invoke<StagedEvidenceWrite>(
        'stage_manual_review',
        {
          workspacePath: path,
          reviewId: review.id,
          content: JSON.stringify(review, null, 2),
        },
      );

      const newFindings = findingsFromManualReviewStepResults(
        componentId,
        review,
        review.stepResults ?? [],
      );
      const findingWrites: {
        readonly finding: Finding;
        readonly write: StagedEvidenceWrite;
      }[] = [];
      for (const finding of newFindings) {
        const write = await this.invoke<StagedEvidenceWrite>('stage_finding', {
          workspacePath: path,
          findingId: finding.id,
          content: JSON.stringify(finding, null, 2),
        });
        findingWrites.push({ finding, write });
      }

      this.stagedManualReview.set({
        review,
        componentId,
        reviewWrite,
        findingWrites,
      });
    } catch (error) {
      this.saveManualReviewError.set(String(error));
    } finally {
      this.saveManualReviewRunning.set(false);
    }
  }

  /**
   * Commits a staged manual review (and every finding staged alongside
   * it) into the reviewed workspace, then clears the staged state. Only
   * ever called from an explicit "Approve" action the reviewer takes
   * after being shown the staged diff.
   */
  async approveStagedManualReview(): Promise<void> {
    const path = this.workspacePath();
    const staged = this.stagedManualReview();
    if (!path || !staged || this.approveManualReviewRunning()) {
      return;
    }
    this.approveManualReviewRunning.set(true);
    this.approveManualReviewError.set(null);
    try {
      const writtenPath = await this.invoke<string>(
        'approve_staged_evidence_write',
        {
          workspacePath: path,
          stagingId: staged.reviewWrite.stagingId,
          subdirectory: staged.reviewWrite.subdirectory,
          filename: staged.reviewWrite.filename,
        },
      );
      this.saveManualReviewResult.set({ path: writtenPath });
      this.manualReviews.set([...this.manualReviews(), staged.review]);

      const approvedFindings: Finding[] = [];
      for (const { finding, write } of staged.findingWrites) {
        await this.invoke<string>('approve_staged_evidence_write', {
          workspacePath: path,
          stagingId: write.stagingId,
          subdirectory: write.subdirectory,
          filename: write.filename,
        });
        approvedFindings.push(finding);
      }
      if (approvedFindings.length) {
        this.findings.set([...this.findings(), ...approvedFindings]);
      }

      this.stagedManualReview.set(null);
    } catch (error) {
      this.approveManualReviewError.set(String(error));
    } finally {
      this.approveManualReviewRunning.set(false);
    }
  }

  /**
   * Discards a staged manual review (and its staged findings) without
   * ever committing them into the reviewed workspace.
   */
  async discardStagedManualReview(): Promise<void> {
    const path = this.workspacePath();
    const staged = this.stagedManualReview();
    if (!path || !staged) {
      return;
    }
    try {
      await this.invoke<void>('discard_staged_evidence_write', {
        workspacePath: path,
        stagingId: staged.reviewWrite.stagingId,
      });
      for (const { write } of staged.findingWrites) {
        await this.invoke<void>('discard_staged_evidence_write', {
          workspacePath: path,
          stagingId: write.stagingId,
        });
      }
    } finally {
      this.stagedManualReview.set(null);
    }
  }

  /**
   * Generates a real Starlight "designer-heavy" component page
   * (`generateDesignerStarlightComponentPage`) for `manifest` and stages
   * it at its conventional path under the first detected Starlight
   * project — nothing is written into the real project until an explicit
   * `approveStagedStarlightPage` call. If a page already exists at that
   * path, its real `forgegate:user-content:start overview`
   * section is read back and preserved in the regenerated page rather
   * than being overwritten, per documentation/12-starlight-integration.md's
   * "Protected content".
   */
  async generateAndStageStarlightPage(
    manifest: ComponentManifest,
    template: StarlightPageTemplate = 'designer',
    registryManifests: readonly ComponentManifest[] = [manifest],
  ): Promise<void> {
    const path = this.workspacePath();
    if (!path || this.starlightPageRunning()) {
      return;
    }
    const starlightProjects = this.workspaceScan()?.starlightProjects ?? [];
    if (!starlightProjects.length) {
      this.starlightPageError.set(
        'No Starlight project detected in this workspace.',
      );
      return;
    }
    this.starlightPageRunning.set(true);
    this.starlightPageError.set(null);
    this.starlightPageResult.set(null);
    this.starlightBuildResult.set(null);
    this.starlightBuildError.set(null);
    this.starlightBuildSkipped.set(null);
    this.stagedStarlightPage.set(null);
    try {
      const starlightProject = starlightProjects[0] ?? '';
      const relativePath =
        template === 'registry-index'
          ? starlightRegistryIndexPath(starlightProject)
          : starlightComponentPagePath(starlightProject, manifest.id, template);
      const reportDataPath =
        template === 'registry-index'
          ? starlightRegistryReportDataPath(starlightProject)
          : starlightComponentReportDataPath(
              starlightProject,
              manifest.id,
              template,
            );
      let existingOverview: string | null = null;
      const evidenceCommit = this.gitStatus()?.commit ?? 'unknown';
      if (template !== 'registry-index') {
        try {
          const existing = await this.invoke<string>('read_text_file', {
            workspacePath: path,
            relativePath,
          });
          existingOverview = extractProtectedOverview(existing);
        } catch {
          existingOverview = null;
        }
      }
      const componentPageInput =
        template === 'registry-index'
          ? null
          : {
              manifest,
              procedures: this.procedures(),
              testExecutions: this.testExecutions(),
              manualReviews: this.manualReviews(),
              findings: this.findings(),
              evidenceCommit,
              existingOverview,
              template,
            };
      const registryComponentPageInputs =
        template === 'registry-index'
          ? registryManifests.map((registryManifest) => ({
              manifest: registryManifest,
              procedures: this.procedures(),
              testExecutions: this.testExecutions(),
              manualReviews: this.manualReviews(),
              findings: this.findings(),
              evidenceCommit,
              existingOverview: null,
              template: 'designer' as const,
            }))
          : [];
      const content = componentPageInput
        ? generateStarlightComponentPage(componentPageInput)
        : generateStarlightRegistryIndexPage({
            manifests: registryManifests,
            evidenceCommit,
            componentReportTemplate: 'designer',
          });
      assertValidGeneratedStarlightMdx(content);
      const write = await this.invoke<StagedRelativeWrite>(
        'stage_starlight_page',
        { workspacePath: path, relativePath, content },
      );
      const writes: StagedRelativeWrite[] = [write];
      if (reportDataPath) {
        writes.push(
          await this.invoke<StagedRelativeWrite>('stage_starlight_page', {
            workspacePath: path,
            relativePath: reportDataPath,
            content: componentPageInput
              ? generateStarlightComponentReportData(componentPageInput)
              : generateStarlightRegistryReportData({
                  manifests: registryManifests,
                  evidenceCommit,
                }),
          }),
        );
      }
      for (const registryComponentPageInput of registryComponentPageInputs) {
        writes.push(
          await this.invoke<StagedRelativeWrite>('stage_starlight_page', {
            workspacePath: path,
            relativePath: starlightComponentReportDataPath(
              starlightProject,
              registryComponentPageInput.manifest.id,
              'designer',
            ),
            content: generateStarlightComponentReportData(
              registryComponentPageInput,
            ),
          }),
        );
      }
      this.stagedStarlightPage.set({
        componentId: template === 'registry-index' ? null : manifest.id,
        template,
        write,
        writes,
      });
    } catch (error) {
      this.starlightPageError.set(String(error));
    } finally {
      this.starlightPageRunning.set(false);
    }
  }

  /**
   * Commits a staged Starlight page into the real detected project, then
   * clears the staged state. Only ever called from an explicit "Approve"
   * action the reviewer takes after being shown the staged diff.
   */
  async approveStagedStarlightPage(): Promise<void> {
    const path = this.workspacePath();
    const staged = this.stagedStarlightPage();
    if (!path || !staged || this.starlightPageRunning()) {
      return;
    }
    this.starlightPageRunning.set(true);
    this.starlightPageError.set(null);
    this.starlightBuildResult.set(null);
    this.starlightBuildError.set(null);
    this.starlightBuildSkipped.set(null);
    try {
      const writtenPaths: string[] = [];
      for (const write of staged.writes.length ? staged.writes : [staged.write]) {
        writtenPaths.push(
          await this.invoke<string>('approve_staged_relative_write', {
            workspacePath: path,
            stagingId: write.stagingId,
            relativePath: write.relativePath,
          }),
        );
      }
      this.starlightPageResult.set({
        path: writtenPaths[0] ?? staged.write.relativePath,
      });
      this.stagedStarlightPage.set(null);
      await this.validateApprovedStarlightBuild(path);
    } catch (error) {
      this.starlightPageError.set(String(error));
    } finally {
      this.starlightPageRunning.set(false);
    }
  }

  private async validateApprovedStarlightBuild(
    workspacePath: string,
  ): Promise<void> {
    const commandText =
      this.repositoryConfig()?.commandMappings[STARLIGHT_BUILD_COMMAND_MAPPING];
    if (!commandText) {
      this.starlightBuildSkipped.set(
        `No ${STARLIGHT_BUILD_COMMAND_MAPPING} command is configured in .forgegate/config.yaml.`,
      );
      return;
    }

    let plan: WorkspaceCommandPlan;
    try {
      plan = parseWorkspaceCommandMapping(commandText);
    } catch (error) {
      this.starlightBuildError.set(String(error));
      this.setAdapterDiagnostic({
        id: 'starlight-build-command',
        adapter: 'Starlight build validation',
        source: commandText,
        status: 'failed',
        rawOutput: null,
        error: String(error),
      });
      return;
    }

    try {
      const result = await this.invoke<CommandResult>('run_workspace_command', {
        workspacePath,
        relativeCwd: '',
        command: plan.command,
        args: [...plan.args],
        timeoutSeconds: STARLIGHT_BUILD_TIMEOUT_SECONDS,
      });
      this.starlightBuildResult.set(result);
      this.setAdapterDiagnostic({
        id: 'starlight-build-command',
        adapter: 'Starlight build validation',
        source: plan.commandText,
        status: result.exitCode === 0 ? 'loaded' : 'failed',
        rawOutput: JSON.stringify(result, null, 2),
        error:
          result.exitCode === 0
            ? null
            : result.cancelled
              ? 'Cancelled by user'
              : result.stderr || 'Starlight build validation failed',
      });
    } catch (error) {
      this.starlightBuildError.set(String(error));
      this.setAdapterDiagnostic({
        id: 'starlight-build-command',
        adapter: 'Starlight build validation',
        source: plan.commandText,
        status: 'failed',
        rawOutput: null,
        error: String(error),
      });
    }
  }

  /**
   * Discards a staged Starlight page without ever committing it into the
   * real detected project.
   */
  async discardStagedStarlightPage(): Promise<void> {
    const path = this.workspacePath();
    const staged = this.stagedStarlightPage();
    if (!path || !staged) {
      return;
    }
    try {
      for (const write of staged.writes.length ? staged.writes : [staged.write]) {
        await this.invoke<void>('discard_staged_evidence_write', {
          workspacePath: path,
          stagingId: write.stagingId,
        });
      }
    } finally {
      this.stagedStarlightPage.set(null);
    }
  }

  /**
   * Loads the real files changed between `fromCommit` (a stale review's
   * recorded commit) and the workspace's current commit. A no-op if no
   * workspace is open or this commit's diff was already fetched — never
   * called automatically, only from an explicit "Show changed files"
   * action, since it is a real per-commit `git diff` shell-out.
   */
  async loadStaleReviewChangedFiles(fromCommit: string): Promise<void> {
    const path = this.workspacePath();
    if (!path || this.staleReviewChangedFiles()[fromCommit]) {
      return;
    }
    try {
      const files = await this.invoke<string[]>('read_commit_diff_files', {
        path,
        fromCommit,
      });
      this.staleReviewChangedFiles.update((current) => ({
        ...current,
        [fromCommit]: { files, error: null },
      }));
    } catch (error) {
      this.staleReviewChangedFiles.update((current) => ({
        ...current,
        [fromCommit]: { files: [], error: String(error) },
      }));
    }
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

function componentVersionId(manifest: ComponentManifest): string {
  return manifest.componentVersion
    ? `${manifest.id}@${manifest.componentVersion}`
    : manifest.id;
}

function testEvidenceAdapterLabel(
  adapter: ReturnType<typeof parseTestEvidenceFile>['adapter'],
): string {
  if (adapter === 'Playwright JSON') {
    return 'Playwright JSON evidence adapter';
  }
  if (adapter === 'Axe JSON') {
    return 'axe JSON evidence adapter';
  }
  if (adapter === 'Storybook interactions JSON') {
    return 'Storybook interactions JSON evidence adapter';
  }
  if (adapter === 'Jest JSON') {
    return 'Jest JSON evidence adapter';
  }
  if (adapter === 'Vitest JSON') {
    return 'Vitest JSON evidence adapter';
  }
  return 'test evidence adapter';
}

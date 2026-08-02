import type { Severity } from '@forgegate/core-domain';
import {
  createEvidencePackage,
  createFinding,
  type AutomatedEvidenceArtifact,
  type Exception,
  type Finding,
  type ManualReview,
  type TestExecution,
} from '@forgegate/core-evidence';
import type { ComponentManifest } from '@forgegate/core-manifest';
import { computeDocumentationDriftState } from './documentation-drift';
import type { ReleaseDecision } from '@forgegate/core-policy';
import {
  computePolicySnapshot,
  computeReleaseDecision,
  type EvidenceApprover,
  type PolicySnapshotExport,
} from './release-decision-export';
import type { ExternalPolicyDocumentSnapshot } from './policy-document';
import {
  buildAutomatedEvidenceDetails,
  type AutomatedEvidenceDetail,
} from './evidence-detail';

/**
 * Real target for evidence export, per `documentation/09-manual-review-and-evidence.md`'s
 * "Evidence package structure": a `manifest.json`-indexed directory
 * alongside a real `checksums.sha256`. Only the sections ForgeGate
 * actually has real data for today are written — `test-summary.json`
 * (real `TestExecution` records for this component version),
 * `documentation-status.json` (real per-target drift, reusing P1.6's
 * `computeDocumentationDriftState`), `findings/` (real blocking
 * reasons `ComponentDetailPage` already computes, structured as real
 * `Finding` records — see `findingsFromBlockingReasons`), and
 * `report.html` (the documented human-readable report, rendering the
 * sections backed by real data and naming the rest as not connected —
 * see `renderEvidenceReport`). `automated/`, `manual/`, and `exceptions/`
 * are included only when real connected evidence exists — `automated/`
 * and `manual/` are scoped by this component version, `exceptions/` is
 * scoped by whether the exception's `findingId` matches one of _this
 * export's own_ real findings (an exception approves a specific finding,
 * not a component version in general). Everything the documented shape
 * also lists (`policy-snapshot.json`, `release-decision.json`,
 * `attachments/`) is honestly absent unless the real inputs exist. When
 * raw artifact references exist, ForgeGate writes an `attachments/index.json`
 * capture plan that names those real refs and copies readable
 * workspace-relative text artifacts after redaction. Binary, absolute,
 * temporary, and unreadable raw artifacts stay indexed but not copied.
 * `manifest.json`'s `excludes` field says why for each absent section,
 * rather than silently omitting it or fabricating empty placeholders.
 */
const EXCLUDED_SECTIONS: Readonly<Record<string, string>> = {
  'policy-snapshot.json':
    'No policy id/version and repository commit are available for the built-in policy snapshot.',
  'automated/':
    'No imported automated result artifact is connected for this component yet.',
  'manual/': 'No manual review result is connected for this component yet.',
  'exceptions/': "No exception approves any of this export's findings yet.",
  'attachments/': 'No attachments have been captured yet.',
};

export interface EvidenceAttachmentReference {
  readonly id: string;
  readonly sourceEvidenceId: string;
  readonly sourceKind: 'test-execution' | 'automated-artifact';
  readonly sourcePath: string;
  readonly targetPath: string;
  readonly status:
    | 'referenced-not-copied'
    | 'pending-consent'
    | 'blocked-binary-redaction'
    | 'copied-redacted';
  readonly sourceClass:
    | 'workspace-relative'
    | 'absolute-path'
    | 'temporary-path'
    | 'unknown';
  readonly mediaClass: 'text' | 'binary-or-archive' | 'unknown';
  readonly consentStatus: 'granted' | 'not-requested';
  readonly copyBlocker?: string;
  readonly redactionRequired: true;
}

export interface EvidenceAttachmentIndex {
  readonly id: string;
  readonly componentVersionId: string;
  readonly generatedAt: string;
  readonly status: 'capture-plan';
  readonly attachments: readonly EvidenceAttachmentReference[];
  readonly limitations: readonly string[];
}

export interface EvidenceRedactionPlan {
  readonly id: string;
  readonly componentVersionId: string;
  readonly generatedAt: string;
  readonly status: 'planning-only';
  readonly rules: readonly {
    readonly id: string;
    readonly scope: string;
    readonly action: string;
    readonly reason: string;
  }[];
  readonly limitations: readonly string[];
}

/**
 * Converts each real blocking reason `ComponentDetailPage` already
 * computes into a structured `Finding` — the same real readiness gaps,
 * structured rather than left as plain text, so `findings/` isn't
 * fabricated from nothing. `severity` is a real, disclosed editorial
 * classification (there is no policy engine producing one yet): a reason
 * describing a confirmed automated-evidence failure is `'serious'`, one
 * describing staleness is `'moderate'`, and every "no X connected/declared"
 * incompleteness gap is `'minor'` — real, but not itself a confirmed defect.
 */
export function findingsFromBlockingReasons(
  componentId: string,
  blockingReasons: readonly string[],
): readonly Finding[] {
  return blockingReasons.map((description, index) =>
    createFinding({
      id: `${componentId}-blocking-${index}`,
      componentId,
      description,
      severity: classifyBlockingReasonSeverity(description),
    }),
  );
}

function classifyBlockingReasonSeverity(description: string): Severity {
  if (description.includes('failed or blocked')) {
    return 'serious';
  }
  if (description.includes('stale')) {
    return 'moderate';
  }
  return 'minor';
}

export interface EvidenceExportResult {
  /** Directory name this package should be written into, not a full path. */
  readonly directoryName: string;
  /** Filename -> real file content, ready to write as-is. */
  readonly files: Readonly<Record<string, string>>;
}

export function componentVersionId(manifest: ComponentManifest): string {
  return manifest.componentVersion
    ? `${manifest.id}@${manifest.componentVersion}`
    : manifest.id;
}

function buildAttachmentIndex(input: {
  versionId: string;
  exportedAt: string;
  testExecutions: readonly TestExecution[];
  automatedArtifacts: readonly AutomatedEvidenceArtifact[];
  attachmentContents: Readonly<Record<string, string>>;
}): EvidenceAttachmentIndex | null {
  const references: EvidenceAttachmentReference[] = [];
  for (const execution of input.testExecutions) {
    if (!execution.rawArtifactRef) {
      continue;
    }
    references.push(
      attachmentReference({
        sourceEvidenceId: execution.id,
        sourceKind: 'test-execution',
        sourcePath: execution.rawArtifactRef,
        copied: hasAttachmentContent(input.attachmentContents, execution.id),
      }),
    );
  }
  for (const artifact of input.automatedArtifacts) {
    if (!artifact.rawArtifactRef) {
      continue;
    }
    references.push(
      attachmentReference({
        sourceEvidenceId: artifact.id,
        sourceKind: 'automated-artifact',
        sourcePath: artifact.rawArtifactRef,
        copied: hasAttachmentContent(input.attachmentContents, artifact.id),
      }),
    );
  }
  if (!references.length) {
    return null;
  }
  return {
    id: `${input.versionId}-attachments`,
    componentVersionId: input.versionId,
    generatedAt: input.exportedAt,
    status: 'capture-plan',
    attachments: references,
    limitations: [
      'ForgeGate copies only workspace-relative text artifacts it can read through its guarded file API; unreadable, absolute, temporary, or binary artifacts remain referenced but not copied.',
      "Copied attachment text is redacted with ForgeGate's current narrow text redaction rules before it is written into attachments/files/.",
    ],
  };
}

function attachmentReference(input: {
  sourceEvidenceId: string;
  sourceKind: 'test-execution' | 'automated-artifact';
  sourcePath: string;
  copied: boolean;
}): EvidenceAttachmentReference {
  const policy = classifyAttachmentCapturePolicy(input.sourcePath);
  const targetPath = `attachments/files/${sanitizeForFilename(
    input.sourceEvidenceId,
  )}.txt`;
  return {
    id: `${sanitizeForFilename(input.sourceEvidenceId)}-attachment`,
    sourceEvidenceId: input.sourceEvidenceId,
    sourceKind: input.sourceKind,
    sourcePath: input.sourcePath,
    targetPath,
    status: input.copied
      ? 'copied-redacted'
      : attachmentStatusForPolicy(policy),
    sourceClass: policy.sourceClass,
    mediaClass: policy.mediaClass,
    consentStatus: input.copied ? 'granted' : 'not-requested',
    ...(input.copied ? {} : { copyBlocker: copyBlockerForPolicy(policy) }),
    redactionRequired: true,
  };
}

function classifyAttachmentCapturePolicy(sourcePath: string): {
  readonly sourceClass: EvidenceAttachmentReference['sourceClass'];
  readonly mediaClass: EvidenceAttachmentReference['mediaClass'];
} {
  return {
    sourceClass: classifyAttachmentSourcePath(sourcePath),
    mediaClass: classifyAttachmentMedia(sourcePath),
  };
}

function classifyAttachmentSourcePath(
  sourcePath: string,
): EvidenceAttachmentReference['sourceClass'] {
  const normalized = sourcePath.replace(/\\/g, '/');
  if (
    normalized.includes('/tmp/') ||
    normalized.includes('/temp/') ||
    normalized.includes('/AppData/Local/Temp/')
  ) {
    return 'temporary-path';
  }
  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) {
    return 'absolute-path';
  }
  if (normalized && !normalized.includes('..')) {
    return 'workspace-relative';
  }
  return 'unknown';
}

function classifyAttachmentMedia(
  sourcePath: string,
): EvidenceAttachmentReference['mediaClass'] {
  const lower = sourcePath.toLowerCase();
  if (
    /\.(png|jpe?g|gif|webp|avif|pdf|zip|gz|tgz|br|trace|har|mp4|mov|webm)$/i.test(
      lower,
    )
  ) {
    return 'binary-or-archive';
  }
  if (/\.(txt|log|tap|json|jsonl|xml|html?|md|csv|tsv|yaml|yml)$/i.test(lower)) {
    return 'text';
  }
  return 'unknown';
}

function attachmentStatusForPolicy(policy: {
  readonly sourceClass: EvidenceAttachmentReference['sourceClass'];
  readonly mediaClass: EvidenceAttachmentReference['mediaClass'];
}): EvidenceAttachmentReference['status'] {
  if (policy.mediaClass === 'binary-or-archive') {
    return 'blocked-binary-redaction';
  }
  if (
    policy.sourceClass === 'absolute-path' ||
    policy.sourceClass === 'temporary-path'
  ) {
    return 'pending-consent';
  }
  return 'referenced-not-copied';
}

function copyBlockerForPolicy(policy: {
  readonly sourceClass: EvidenceAttachmentReference['sourceClass'];
  readonly mediaClass: EvidenceAttachmentReference['mediaClass'];
}): string {
  if (policy.mediaClass === 'binary-or-archive') {
    return 'Binary/archive attachment redaction and streaming are not implemented yet.';
  }
  if (policy.sourceClass === 'absolute-path') {
    return 'Absolute-path attachment capture requires explicit copy consent and retention rules.';
  }
  if (policy.sourceClass === 'temporary-path') {
    return 'Temporary-path attachment capture requires explicit copy consent, retention rules, and stale-file handling.';
  }
  return 'ForgeGate did not receive readable attachment content for this source.';
}

function hasAttachmentContent(
  contents: Readonly<Record<string, string>>,
  sourceEvidenceId: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(contents, sourceEvidenceId);
}

function buildRedactionPlan(input: {
  versionId: string;
  exportedAt: string;
  attachmentIndex: EvidenceAttachmentIndex | null;
}): EvidenceRedactionPlan {
  return {
    id: `${input.versionId}-redaction-plan`,
    componentVersionId: input.versionId,
    generatedAt: input.exportedAt,
    status: 'planning-only',
    rules: [
      {
        id: 'manifest-and-normalized-json-no-credentials',
        scope:
          'manifest.json, test-summary.json, documentation-status.json, findings/, exceptions/, release-decision.json, policy-snapshot.json',
        action: 'export normalized JSON only',
        reason:
          'ForgeGate domain records are designed to avoid stored credentials and keep package contents reviewable.',
      },
      {
        id: 'raw-attachments-require-redaction-before-copy',
        scope: 'attachments/files/',
        action: input.attachmentIndex
          ? 'copy readable workspace-relative text artifacts after redaction; require explicit consent and richer redaction before copying absolute, temporary, binary, or archive refs'
          : 'no raw attachments were referenced in this export',
        reason:
          'Raw test artifacts can contain screenshots, traces, environment details, URLs, tokens, or user-entered content.',
      },
      {
        id: 'html-report-escape-repository-text',
        scope: 'report.html',
        action: 'escape repository-derived text before rendering',
        reason:
          'Component ids, paths, finding descriptions, and tool output references come from the reviewed repository.',
      },
    ],
    limitations: [
      'This is a disclosure and implementation plan, not a full secret-scanning or image-redaction engine.',
      'ForgeGate classifies binary, absolute-path, temporary, and unreadable raw attachment refs in attachments/index.json, but does not copy them until explicit consent, size limits, binary-safe streaming, and richer redaction are implemented.',
    ],
  };
}

export function redactAttachmentText(text: string): string {
  return text
    .replace(
      /\b([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASS|API_KEY|AUTH)[A-Z0-9_]*=)([^\s"'`]+)/gi,
      '$1[REDACTED]',
    )
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, '$1 [REDACTED]')
    .replace(/\b(ghp|gho|github_pat|npm)_[A-Za-z0-9_]+/g, '[REDACTED]');
}

export interface EvidenceExportInput {
  readonly id: string;
  readonly exportedAt: string;
  readonly manifest: ComponentManifest;
  readonly testExecutions: readonly TestExecution[];
  readonly automatedArtifacts?: readonly AutomatedEvidenceArtifact[];
  readonly manualReviews?: readonly ManualReview[];
  readonly exceptions?: readonly Exception[];
  /**
   * Real findings ForgeGate has already persisted for this component —
   * today always one per failed/blocked guided-review step
   * (`findingsFromManualReviewStepResults`), written to
   * `.forgegate/findings/*.json` when the review was saved. Merged with
   * the ephemeral blocking-reason findings below, not a replacement for
   * them — the two are derived from genuinely different real sources.
   */
  readonly persistedFindings?: readonly Finding[];
  readonly attachmentContents?: Readonly<Record<string, string>>;
  readonly externalPolicyDocument?: ExternalPolicyDocumentSnapshot | null;
  readonly starlightProjects: readonly string[];
  readonly blockingReasons?: readonly string[];
  /**
   * The workspace's real current Git commit. Recorded in `manifest.json`
   * so a package can be tied back to the exact source state it describes —
   * an evidence bundle with no commit reference cannot be verified against
   * anything later. Null when no Git status is available (e.g. the folder
   * is not a repository), reported honestly rather than omitted.
   */
  readonly repositoryCommit?: string | null;
  /**
   * Who approved this component for release, if anyone. Omitted in normal
   * use today — ForgeGate has no approval flow — which means a clean
   * component simply gets no `release-decision.json` rather than a
   * fabricated approval. A `'test-harness'` approver lets tests (and a
   * human deliberately exercising the flow against their own repository)
   * drive the `authorized-candidate` branch; every artifact produced that
   * way is marked `notRealApproval` and banner-flagged in the report.
   */
  readonly approver?: EvidenceApprover | null;
}

export async function buildEvidenceExport(
  input: EvidenceExportInput,
): Promise<EvidenceExportResult> {
  const { id, exportedAt, manifest, testExecutions, starlightProjects } = input;
  const blockingReasons = input.blockingReasons ?? [];
  const repositoryCommit = input.repositoryCommit ?? null;
  const versionId = componentVersionId(manifest);
  const automatedArtifacts = (input.automatedArtifacts ?? []).filter(
    (artifact) => artifact.componentVersionId === versionId,
  );
  const automatedDetails = buildAutomatedEvidenceDetails(automatedArtifacts);
  const manualReviews = (input.manualReviews ?? []).filter(
    (review) => review.componentVersionId === versionId,
  );

  const documentationStatus = manifest.documentationTargets.map((target) => ({
    adapter: target.adapter,
    pathOrPageId: target.pathOrPageId ?? null,
    ...computeDocumentationDriftState(
      target,
      manifest.componentVersion,
      starlightProjects,
    ),
  }));

  const blockingReasonFindings = findingsFromBlockingReasons(
    manifest.id,
    blockingReasons,
  );
  const blockingReasonFindingIds = new Set(
    blockingReasonFindings.map((finding) => finding.id),
  );
  const persistedFindings = (input.persistedFindings ?? []).filter(
    (finding) =>
      finding.componentId === manifest.id &&
      !blockingReasonFindingIds.has(finding.id),
  );
  const findings = [...blockingReasonFindings, ...persistedFindings];
  const findingIds = new Set(findings.map((finding) => finding.id));
  const relevantExceptions = (input.exceptions ?? []).filter((exception) =>
    findingIds.has(exception.findingId),
  );

  const evidenceIds = testExecutions.map((execution) => execution.id);
  const policySnapshot = computePolicySnapshot({
    manifest,
    findings,
    commit: repositoryCommit,
    evaluatedAt: exportedAt,
    evidenceIds,
    approver: input.approver,
    externalPolicyDocument: input.externalPolicyDocument ?? null,
  });
  const releaseDecision = computeReleaseDecision({
    manifest,
    findings,
    commit: repositoryCommit,
    decidedAt: exportedAt,
    evidenceIds,
    approver: input.approver,
  });
  const excludes: Record<string, string> = { ...EXCLUDED_SECTIONS };
  let notRealApproval = false;
  const attachmentIndex = buildAttachmentIndex({
    versionId,
    exportedAt,
    testExecutions,
    automatedArtifacts,
    attachmentContents: input.attachmentContents ?? {},
  });
  const redactionPlan = buildRedactionPlan({
    versionId,
    exportedAt,
    attachmentIndex,
  });

  const contentFiles: Record<string, string> = {
    'test-summary.json': JSON.stringify(testExecutions, null, 2),
    'documentation-status.json': JSON.stringify(documentationStatus, null, 2),
    'redaction-plan.json': JSON.stringify(redactionPlan, null, 2),
  };
  if ('unavailable' in policySnapshot) {
    excludes['policy-snapshot.json'] = policySnapshot.unavailable;
  } else {
    delete excludes['policy-snapshot.json'];
    contentFiles['policy-snapshot.json'] = JSON.stringify(
      policySnapshot,
      null,
      2,
    );
  }
  const playwrightArtifacts = automatedArtifacts.filter(
    (artifact) => artifact.kind === 'playwright-json',
  );
  const axeArtifacts = automatedArtifacts.filter(
    (artifact) => artifact.kind === 'axe-json',
  );
  const interactionArtifacts = automatedArtifacts.filter(
    (artifact) => artifact.kind === 'storybook-interactions-json',
  );
  const jestArtifacts = automatedArtifacts.filter(
    (artifact) => artifact.kind === 'jest-json',
  );
  const vitestArtifacts = automatedArtifacts.filter(
    (artifact) => artifact.kind === 'vitest-json',
  );
  if (
    playwrightArtifacts.length ||
    axeArtifacts.length ||
    interactionArtifacts.length ||
    jestArtifacts.length ||
    vitestArtifacts.length
  ) {
    delete excludes['automated/'];
    contentFiles['automated/details.json'] = JSON.stringify(
      automatedDetails,
      null,
      2,
    );
    if (axeArtifacts.length) {
      contentFiles['automated/axe-results.json'] = JSON.stringify(
        axeArtifacts,
        null,
        2,
      );
    } else {
      excludes['automated/axe-results.json'] =
        'No axe-native result artifact is connected for this component yet.';
    }
    if (playwrightArtifacts.length) {
      contentFiles['automated/playwright-results.json'] = JSON.stringify(
        playwrightArtifacts,
        null,
        2,
      );
    } else {
      excludes['automated/playwright-results.json'] =
        'No Playwright result artifact is connected for this component yet.';
    }
    if (interactionArtifacts.length) {
      contentFiles['automated/interaction-results.json'] = JSON.stringify(
        interactionArtifacts,
        null,
        2,
      );
    } else {
      excludes['automated/interaction-results.json'] =
        'No Storybook interaction result artifact is connected for this component yet.';
    }
    if (jestArtifacts.length) {
      contentFiles['automated/jest-results.json'] = JSON.stringify(
        jestArtifacts,
        null,
        2,
      );
    } else {
      excludes['automated/jest-results.json'] =
        'No Jest result artifact is connected for this component yet.';
    }
    if (vitestArtifacts.length) {
      contentFiles['automated/vitest-results.json'] = JSON.stringify(
        vitestArtifacts,
        null,
        2,
      );
    } else {
      excludes['automated/vitest-results.json'] =
        'No Vitest result artifact is connected for this component yet.';
    }
  }
  if (manualReviews.length) {
    delete excludes['manual/'];
    for (const review of manualReviews) {
      contentFiles[`manual/${sanitizeForFilename(review.id)}.json`] =
        JSON.stringify(review, null, 2);
    }
  }
  for (const finding of findings) {
    contentFiles[`findings/${finding.id}.json`] = JSON.stringify(
      finding,
      null,
      2,
    );
  }
  if (relevantExceptions.length) {
    delete excludes['exceptions/'];
    for (const exception of relevantExceptions) {
      contentFiles[`exceptions/${sanitizeForFilename(exception.id)}.json`] =
        JSON.stringify(exception, null, 2);
    }
  }
  if (attachmentIndex) {
    delete excludes['attachments/'];
    const copiedAttachments = attachmentIndex.attachments.filter(
      (attachment) => attachment.status === 'copied-redacted',
    );
    if (copiedAttachments.length === attachmentIndex.attachments.length) {
      delete excludes['attachments/files/'];
    } else {
      excludes['attachments/files/'] =
        'Some attachment source refs are indexed only because ForgeGate could not read them as workspace-relative text artifacts.';
    }
    contentFiles['attachments/index.json'] = JSON.stringify(
      attachmentIndex,
      null,
      2,
    );
    for (const attachment of copiedAttachments) {
      const content = input.attachmentContents?.[attachment.sourceEvidenceId];
      if (content !== undefined) {
        contentFiles[attachment.targetPath] = redactAttachmentText(content);
      }
    }
  }

  if ('unavailable' in releaseDecision) {
    excludes['release-decision.json'] = releaseDecision.unavailable;
  } else {
    notRealApproval = releaseDecision.notRealApproval;
    contentFiles['release-decision.json'] = JSON.stringify(
      // The marker lives inside the artifact itself, not only alongside it,
      // so a release-decision.json lifted out of the package on its own
      // still carries the warning with it.
      notRealApproval
        ? { ...releaseDecision.decision, notRealApproval: true }
        : releaseDecision.decision,
      null,
      2,
    );
    contentFiles[
      `release-decisions/${sanitizeForFilename(
        releaseDecision.workflowRecord.id,
      )}.json`
    ] = JSON.stringify(releaseDecision.workflowRecord, null, 2);
  }
  contentFiles['report.html'] = renderEvidenceReport({
    versionId,
    manifest,
    exportedAt,
    repositoryCommit,
    testExecutions,
    automatedDetails,
    manualReviews,
    exceptions: relevantExceptions,
    documentationStatus,
    findings,
    attachmentIndex,
    redactionPlan,
    policySnapshot: 'unavailable' in policySnapshot ? null : policySnapshot,
    policySnapshotUnavailable:
      'unavailable' in policySnapshot ? policySnapshot.unavailable : null,
    releaseDecision:
      'unavailable' in releaseDecision ? null : releaseDecision.decision,
    releaseDecisionUnavailable:
      'unavailable' in releaseDecision ? releaseDecision.unavailable : null,
    notRealApproval,
    excludes,
  });

  const checksums: Record<string, string> = {};
  for (const [name, content] of Object.entries(contentFiles)) {
    checksums[name] = await sha256Hex(content);
  }

  const evidencePackage = createEvidencePackage({
    id,
    componentVersionId: versionId,
    exportedAt,
    checksums,
    contents: Object.keys(contentFiles),
  });

  const manifestJson = {
    ...evidencePackage,
    componentId: manifest.id,
    repositoryCommit,
    // Surfaced at the top level of the index, not buried in the decision
    // file, so anyone reading manifest.json alone sees it immediately.
    ...(notRealApproval
      ? {
          notRealApproval: true,
          notRealApprovalWarning:
            'This package contains an authorized-candidate release decision approved by a test harness, not a human. It must not be treated as a real approval.',
        }
      : {}),
    excludes,
  };

  const checksumsFile = `${Object.entries(checksums)
    .map(([name, hash]) => `${hash}  ${name}`)
    .join('\n')}\n`;

  return {
    directoryName: `${sanitizeForFilename(versionId)}-evidence-${id}`,
    files: {
      'manifest.json': JSON.stringify(manifestJson, null, 2),
      ...contentFiles,
      'checksums.sha256': checksumsFile,
    },
  };
}

function sanitizeForFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9.-]+/g, '-');
}

interface DocumentationStatusRow {
  readonly adapter: string;
  readonly pathOrPageId: string | null;
  readonly status: string;
  readonly detail: string;
}

/**
 * Escapes text for HTML *text and attribute* contexts. Every dynamic value
 * in `renderEvidenceReport` goes through this: component ids, file paths,
 * tool names, and finding descriptions all originate from a scanned
 * repository, so they are untrusted input as far as this generated
 * document is concerned — an unescaped `<` in a component's own source
 * path would otherwise corrupt the report or inject markup into it.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * The documented "Evidence report" from
 * `documentation/09-manual-review-and-evidence.md` — a human-readable
 * summary a reviewer can open without any tooling. Renders the sections
 * ForgeGate has real data for (component and version, repository commit,
 * methods/environments as recorded on each real `TestExecution`,
 * automated results, findings, documentation status) and names every
 * other documented section as explicitly not connected rather than
 * omitting it silently or implying it passed. Self-contained: inline CSS
 * only, no external references, so it stays readable from a copied
 * directory or an air-gapped review machine.
 */
function renderEvidenceReport(input: {
  versionId: string;
  manifest: ComponentManifest;
  exportedAt: string;
  repositoryCommit: string | null;
  testExecutions: readonly TestExecution[];
  automatedDetails: readonly AutomatedEvidenceDetail[];
  manualReviews: readonly ManualReview[];
  exceptions: readonly Exception[];
  documentationStatus: readonly DocumentationStatusRow[];
  findings: readonly Finding[];
  attachmentIndex: EvidenceAttachmentIndex | null;
  redactionPlan: EvidenceRedactionPlan;
  policySnapshot: PolicySnapshotExport | null;
  policySnapshotUnavailable: string | null;
  releaseDecision: ReleaseDecision | null;
  releaseDecisionUnavailable: string | null;
  notRealApproval: boolean;
  excludes: Readonly<Record<string, string>>;
}): string {
  const {
    versionId,
    manifest,
    exportedAt,
    repositoryCommit,
    testExecutions,
    automatedDetails,
    manualReviews,
    exceptions,
    documentationStatus,
    findings,
    attachmentIndex,
    redactionPlan,
    policySnapshot,
    policySnapshotUnavailable,
  } = input;
  const {
    releaseDecision,
    releaseDecisionUnavailable,
    notRealApproval,
    excludes,
  } = input;

  const notConnected = (reason: string) =>
    `<p class="not-connected">${escapeHtml(reason)}</p>`;

  const automatedResults = testExecutions.length
    ? `<table>
      <caption>Automated results</caption>
      <thead><tr><th scope="col">Gate</th><th scope="col">Status</th><th scope="col">Tool</th><th scope="col">Started</th><th scope="col">Commit or fingerprint</th></tr></thead>
      <tbody>${testExecutions
        .map(
          (execution) =>
            `<tr><th scope="row">${escapeHtml(execution.gate)}</th><td>${escapeHtml(execution.status)}</td><td>${escapeHtml(`${execution.tool} ${execution.toolVersion}`)}</td><td>${escapeHtml(execution.startedAt)}</td><td><code>${escapeHtml(execution.commitOrFingerprint)}</code></td></tr>`,
        )
        .join('')}</tbody>
    </table>`
    : notConnected(
        'No automated result evidence is connected for this component version.',
      );

  const automatedDetailSection = automatedDetails.length
    ? `<table>
      <caption>Automated evidence detail</caption>
      <thead><tr><th scope="col">Artifact</th><th scope="col">Summary</th><th scope="col">Metrics</th><th scope="col">Observations</th></tr></thead>
      <tbody>${automatedDetails
        .map((detail) => {
          const metrics = detail.metrics
            .map((metric) => `${metric.label}: ${metric.value}`)
            .join('; ');
          const observations = detail.observations.length
            ? detail.observations
                .map((observation) =>
                  [
                    observation.label,
                    observation.severity
                      ? `(${observation.severity})`
                      : '',
                    observation.detail,
                  ]
                    .filter(Boolean)
                    .join(' '),
                )
                .join('; ')
            : 'No detailed issues were parsed from this artifact.';
          return `<tr><th scope="row"><code>${escapeHtml(detail.sourceArtifactId)}</code><br><span class="not-connected">${escapeHtml(detail.kind)}</span></th><td>${escapeHtml(detail.summary)}</td><td>${escapeHtml(metrics || 'No metrics parsed.')}</td><td>${escapeHtml(observations)}</td></tr>`;
        })
        .join('')}</tbody>
    </table>
    <p class="not-connected">Detailed summaries are derived from known automated report fields only. Raw logs, screenshots, traces, DOM snippets, coverage, and attachment contents are not embedded here; see the raw automated artifacts and redaction plan for provenance.</p>`
    : notConnected(
        'No parsed automated report details are connected for this component version.',
      );

  const manualReviewsSection = manualReviews.length
    ? `<table>
      <caption>Manual reviews</caption>
      <thead><tr><th scope="col">Procedure</th><th scope="col">Status</th><th scope="col">Reviewer</th><th scope="col">Date</th><th scope="col">Commit or fingerprint</th></tr></thead>
      <tbody>${manualReviews
        .map(
          (review) =>
            `<tr><th scope="row">${escapeHtml(review.procedureId)}</th><td>${escapeHtml(review.status)}</td><td>${escapeHtml(review.reviewerIdentity)}</td><td>${escapeHtml(review.date)}</td><td><code>${escapeHtml(review.commitOrFingerprint)}</code></td></tr>`,
        )
        .join('')}</tbody>
    </table>`
    : notConnected(
        'No manual review result is connected for this component version.',
      );

  const findingsSection = findings.length
    ? `<table>
      <caption>Findings</caption>
      <thead><tr><th scope="col">Severity</th><th scope="col">Status</th><th scope="col">Description</th></tr></thead>
      <tbody>${findings
        .map(
          (finding) =>
            `<tr><th scope="row">${escapeHtml(finding.severity)}</th><td>${escapeHtml(finding.status)}</td><td>${escapeHtml(finding.description)}</td></tr>`,
        )
        .join('')}</tbody>
    </table>`
    : `<p>No blocking findings were recorded for this component version.</p>`;

  const exceptionsSection = exceptions.length
    ? `<table>
      <caption>Exceptions</caption>
      <thead><tr><th scope="col">Finding</th><th scope="col">Approved by</th><th scope="col">Approved at</th><th scope="col">Rationale</th><th scope="col">Expires</th></tr></thead>
      <tbody>${exceptions
        .map(
          (exception) =>
            `<tr><th scope="row"><code>${escapeHtml(exception.findingId)}</code></th><td>${escapeHtml(exception.approvedBy)}</td><td>${escapeHtml(exception.approvedAt)}</td><td>${escapeHtml(exception.rationale)}</td><td>${exception.expiresAt ? escapeHtml(exception.expiresAt) : '<span class="not-connected">No expiry recorded</span>'}</td></tr>`,
        )
        .join('')}</tbody>
    </table>`
    : notConnected("No exception approves any of this export's findings.");

  const policySnapshotSection = policySnapshot
    ? `<dl>
      <dt>Policy</dt><dd><code>${escapeHtml(`${policySnapshot.policyId} @ ${policySnapshot.policyVersion}`)}</code></dd>
      <dt>Engine</dt><dd><code>${escapeHtml(`${policySnapshot.engine} ${policySnapshot.engineVersion}`)}</code></dd>
      ${
        policySnapshot.externalPolicyDocument
          ? `<dt>External policy document</dt><dd><code>${escapeHtml(policySnapshot.externalPolicyDocument.path)}</code> (${escapeHtml(policySnapshot.externalPolicyDocument.format)}, SHA-256 <code>${escapeHtml(policySnapshot.externalPolicyDocument.checksumSha256)}</code>)</dd>`
          : ''
      }
      <dt>Commit</dt><dd><code>${escapeHtml(policySnapshot.commit)}</code></dd>
      <dt>Finding inputs</dt><dd>${policySnapshot.findingIds.length}</dd>
      <dt>Evidence inputs</dt><dd>${policySnapshot.evidenceIds.length}</dd>
    </dl>
    <table>
      <caption>Policy rules evaluated</caption>
      <thead><tr><th scope="col">Rule</th><th scope="col">Outcome</th><th scope="col">Evidence</th></tr></thead>
      <tbody>${policySnapshot.rules
        .map(
          (rule) =>
            `<tr><th scope="row">${escapeHtml(rule.id)}</th><td>${escapeHtml(rule.outcome)}</td><td>${escapeHtml(rule.evidence.join(', ') || 'None')}</td></tr>`,
        )
        .join('')}</tbody>
    </table>
    <p class="not-connected">${escapeHtml(policySnapshot.limitations.join(' '))}</p>`
    : notConnected(
        policySnapshotUnavailable ?? 'No policy snapshot is available.',
      );

  const attachmentSection = attachmentIndex
    ? `<table>
      <caption>Attachment capture plan</caption>
      <thead><tr><th scope="col">Evidence</th><th scope="col">Source</th><th scope="col">Planned target</th><th scope="col">Status</th></tr></thead>
      <tbody>${attachmentIndex.attachments
        .map(
          (attachment) =>
            `<tr><th scope="row">${escapeHtml(attachment.sourceEvidenceId)}</th><td><code>${escapeHtml(attachment.sourcePath)}</code></td><td><code>${escapeHtml(attachment.targetPath)}</code></td><td>${escapeHtml(attachment.status)}</td></tr>`,
        )
        .join('')}</tbody>
    </table>
    <p class="not-connected">${escapeHtml(attachmentIndex.limitations.join(' '))}</p>`
    : notConnected('No raw artifact refs are connected for attachment capture.');

  const redactionSection = `<table>
      <caption>Redaction posture</caption>
      <thead><tr><th scope="col">Rule</th><th scope="col">Scope</th><th scope="col">Action</th><th scope="col">Reason</th></tr></thead>
      <tbody>${redactionPlan.rules
        .map(
          (rule) =>
            `<tr><th scope="row">${escapeHtml(rule.id)}</th><td>${escapeHtml(rule.scope)}</td><td>${escapeHtml(rule.action)}</td><td>${escapeHtml(rule.reason)}</td></tr>`,
        )
        .join('')}</tbody>
    </table>
    <p class="not-connected">${escapeHtml(redactionPlan.limitations.join(' '))}</p>`;

  const releaseDecisionSection = releaseDecision
    ? `<dl>
      <dt>Outcome</dt><dd><strong>${escapeHtml(releaseDecision.outcome)}</strong></dd>
      <dt>Policy</dt><dd><code>${escapeHtml(`${releaseDecision.policyId} @ ${releaseDecision.policyVersion}`)}</code></dd>
      <dt>Commit</dt><dd><code>${escapeHtml(releaseDecision.commit)}</code></dd>
      <dt>Blocking findings</dt><dd>${releaseDecision.blockingFindingIds.length}</dd>
      <dt>Approver</dt><dd>${
        releaseDecision.approver
          ? escapeHtml(releaseDecision.approver) +
            (notRealApproval
              ? ' <strong>(TEST HARNESS — NOT A REAL APPROVAL)</strong>'
              : '')
          : '<span class="not-connected">None — a blocked outcome requires no approver.</span>'
      }</dd>
      <dt>Decided at</dt><dd>${escapeHtml(releaseDecision.decidedAt)}</dd>
    </dl>`
    : notConnected(
        releaseDecisionUnavailable ?? 'No release decision is available.',
      );

  const documentationSection = documentationStatus.length
    ? `<table>
      <caption>Documentation status</caption>
      <thead><tr><th scope="col">Adapter</th><th scope="col">Page</th><th scope="col">Status</th><th scope="col">Detail</th></tr></thead>
      <tbody>${documentationStatus
        .map(
          (row) =>
            `<tr><th scope="row">${escapeHtml(row.adapter)}</th><td>${escapeHtml(row.pathOrPageId ?? 'Unknown location')}</td><td>${escapeHtml(row.status)}</td><td>${escapeHtml(row.detail)}</td></tr>`,
        )
        .join('')}</tbody>
    </table>`
    : notConnected('No documentation target is connected for this component.');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ForgeGate evidence report — ${escapeHtml(versionId)}</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; line-height: 1.5; margin: 0 auto; max-width: 60rem; padding: 2rem 1rem; color: #172033; background: #fff; }
  h1 { font-size: 1.5rem; } h2 { font-size: 1.15rem; margin-top: 2rem; }
  table { width: 100%; border-collapse: collapse; margin: 0.5rem 0 1rem; }
  caption { text-align: left; font-weight: 600; padding-bottom: 0.35rem; }
  th, td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #d8e0ec; font-size: 0.9rem; vertical-align: top; }
  dt { font-weight: 600; margin-top: 0.5rem; } dd { margin: 0 0 0.25rem; }
  code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
  .not-connected { color: #5e6c84; font-style: italic; }
  .not-real-approval { border: 2px solid #bd2c3b; background: #ffe1e5; color: #7a1521; padding: 0.75rem 1rem; border-radius: 6px; }
  @media (prefers-color-scheme: dark) {
    body { color: #eaf0f8; background: #10151f; }
    th, td { border-bottom-color: #2a3444; }
    .not-connected { color: #a2aec2; }
    .not-real-approval { background: #4d2027; color: #ffd7dc; border-color: #ff8490; }
  }
</style>
</head>
<body>
<h1>ForgeGate evidence report</h1>
${
  notRealApproval
    ? `<p class="not-real-approval"><strong>NOT A REAL APPROVAL.</strong> The release decision in this package was authorized by a test harness, not by a human reviewer. It exists so the approval path can be exercised end to end, and must not be used as evidence that this component was actually approved for release.</p>`
    : ''
}
<p>Generated by ForgeGate. Every section below reflects real captured data; sections without a connected data source say so explicitly rather than implying a pass.</p>

<h2>Component</h2>
<dl>
  <dt>Component version</dt><dd><code>${escapeHtml(versionId)}</code></dd>
  <dt>Component id</dt><dd><code>${escapeHtml(manifest.id)}</code></dd>
  <dt>Framework and adapter</dt><dd>${escapeHtml(`${manifest.framework} (${manifest.adapter})`)}</dd>
  <dt>Lifecycle</dt><dd>${escapeHtml(manifest.lifecycle)}</dd>
  <dt>Repository commit</dt><dd>${repositoryCommit ? `<code>${escapeHtml(repositoryCommit)}</code>` : '<span class="not-connected">Unavailable — no Git status for this workspace.</span>'}</dd>
  <dt>Exported at</dt><dd>${escapeHtml(exportedAt)}</dd>
</dl>

<h2>Automated results</h2>
${automatedResults}
${automatedDetailSection}

<h2>Manual reviews</h2>
${manualReviewsSection}

<h2>Findings</h2>
${findingsSection}

<h2>Exceptions</h2>
${exceptionsSection}

<h2>Policy snapshot</h2>
${policySnapshotSection}

<h2>Attachments and redaction</h2>
${attachmentSection}
${redactionSection}

<h2>Release decision</h2>
${releaseDecisionSection}

<h2>Documentation status</h2>
${documentationSection}

<h2>Not connected</h2>
<p>These sections of the documented evidence-package structure have no real data source in ForgeGate yet, and are deliberately absent rather than reported as empty or passing:</p>
<dl>
${Object.entries(excludes)
  .map(
    ([section, reason]) =>
      `  <dt><code>${escapeHtml(section)}</code></dt><dd>${escapeHtml(reason)}</dd>`,
  )
  .join('\n')}
</dl>
</body>
</html>
`;
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

import type { Severity } from '@forgegate/core-domain';
import {
  createEvidencePackage,
  createFinding,
  type AutomatedEvidenceArtifact,
  type Finding,
  type TestExecution,
} from '@forgegate/core-evidence';
import type { ComponentManifest } from '@forgegate/core-manifest';
import { computeDocumentationDriftState } from './documentation-drift';
import type { ReleaseDecision } from '@forgegate/core-policy';
import {
  computeReleaseDecision,
  type EvidenceApprover,
} from './release-decision-export';

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
 * see `renderEvidenceReport`). Everything the documented shape also lists
 * (`policy-snapshot.json`, `release-decision.json`, `automated/`,
 * `manual/`, `exceptions/`, `attachments/`) is honestly absent —
 * `manifest.json`'s `excludes` field says why for each, rather than
 * silently omitting them or fabricating empty placeholders.
 */
const EXCLUDED_SECTIONS: Readonly<Record<string, string>> = {
  'policy-snapshot.json':
    'No policy evaluation has run for this component yet.',
  'automated/':
    "ForgeGate does not yet orchestrate a target repository's own test/axe/Playwright runs.",
  'manual/': 'No guided manual review flow exists yet.',
  'exceptions/': 'No exceptions have been recorded for this component yet.',
  'attachments/': 'No attachments have been captured yet.',
};

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

export interface EvidenceExportInput {
  readonly id: string;
  readonly exportedAt: string;
  readonly manifest: ComponentManifest;
  readonly testExecutions: readonly TestExecution[];
  readonly automatedArtifacts?: readonly AutomatedEvidenceArtifact[];
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

  const documentationStatus = manifest.documentationTargets.map((target) => ({
    adapter: target.adapter,
    pathOrPageId: target.pathOrPageId ?? null,
    ...computeDocumentationDriftState(
      target,
      manifest.componentVersion,
      starlightProjects,
    ),
  }));

  const findings = findingsFromBlockingReasons(manifest.id, blockingReasons);

  const releaseDecision = computeReleaseDecision({
    manifest,
    findings,
    commit: repositoryCommit,
    decidedAt: exportedAt,
    evidenceIds: testExecutions.map((execution) => execution.id),
    approver: input.approver,
  });
  const excludes: Record<string, string> = { ...EXCLUDED_SECTIONS };
  let notRealApproval = false;

  const contentFiles: Record<string, string> = {
    'test-summary.json': JSON.stringify(testExecutions, null, 2),
    'documentation-status.json': JSON.stringify(documentationStatus, null, 2),
  };
  const playwrightArtifacts = automatedArtifacts.filter(
    (artifact) => artifact.kind === 'playwright-json',
  );
  if (playwrightArtifacts.length) {
    delete excludes['automated/'];
    excludes['automated/axe-results.json'] =
      'No axe-native result artifact is connected for this component yet.';
    excludes['automated/interaction-results.json'] =
      'No Storybook interaction result artifact is connected for this component yet.';
    contentFiles['automated/playwright-results.json'] = JSON.stringify(
      playwrightArtifacts,
      null,
      2,
    );
  }
  for (const finding of findings) {
    contentFiles[`findings/${finding.id}.json`] = JSON.stringify(
      finding,
      null,
      2,
    );
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
  }
  contentFiles['report.html'] = renderEvidenceReport({
    versionId,
    manifest,
    exportedAt,
    repositoryCommit,
    testExecutions,
    documentationStatus,
    findings,
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
  documentationStatus: readonly DocumentationStatusRow[];
  findings: readonly Finding[];
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
    documentationStatus,
    findings,
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

<h2>Findings</h2>
${findingsSection}

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

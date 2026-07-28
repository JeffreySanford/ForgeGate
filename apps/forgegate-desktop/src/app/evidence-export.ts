import { createEvidencePackage, type TestExecution } from '@forgegate/core-evidence';
import type { ComponentManifest } from '@forgegate/core-manifest';
import { computeDocumentationDriftState } from './documentation-drift';

/**
 * Real target for evidence export, per `documentation/09-manual-review-and-evidence.md`'s
 * "Evidence package structure": a `manifest.json`-indexed directory
 * alongside a real `checksums.sha256`. Only the sections ForgeGate
 * actually has real data for today are written — `test-summary.json`
 * (real `TestExecution` records for this component version) and
 * `documentation-status.json` (real per-target drift, reusing P1.6's
 * `computeDocumentationDriftState`). Everything the documented shape also
 * lists (`policy-snapshot.json`, `release-decision.json`, `automated/`,
 * `manual/`, `findings/`, `exceptions/`, `attachments/`, `report.html`) is
 * honestly absent — `manifest.json`'s `excludes` field says why for each,
 * rather than silently omitting them or fabricating empty placeholders.
 */
const EXCLUDED_SECTIONS: Readonly<Record<string, string>> = {
  'policy-snapshot.json': 'No policy evaluation has run for this component yet.',
  'release-decision.json': 'No release decision has been made for this component yet.',
  'automated/': "ForgeGate does not yet orchestrate a target repository's own test/axe/Playwright runs.",
  'manual/': 'No guided manual review flow exists yet.',
  'findings/': 'No findings have been recorded for this component yet.',
  'exceptions/': 'No exceptions have been recorded for this component yet.',
  'attachments/': 'No attachments have been captured yet.',
  'report.html': 'Human-readable report generation is not implemented yet.',
};

export interface EvidenceExportResult {
  /** Directory name this package should be written into, not a full path. */
  readonly directoryName: string;
  /** Filename -> real file content, ready to write as-is. */
  readonly files: Readonly<Record<string, string>>;
}

export function componentVersionId(manifest: ComponentManifest): string {
  return manifest.componentVersion ? `${manifest.id}@${manifest.componentVersion}` : manifest.id;
}

export async function buildEvidenceExport(
  id: string,
  exportedAt: string,
  manifest: ComponentManifest,
  testExecutions: readonly TestExecution[],
  starlightProjects: readonly string[],
): Promise<EvidenceExportResult> {
  const versionId = componentVersionId(manifest);

  const documentationStatus = manifest.documentationTargets.map((target) => ({
    adapter: target.adapter,
    pathOrPageId: target.pathOrPageId ?? null,
    ...computeDocumentationDriftState(target, manifest.componentVersion, starlightProjects),
  }));

  const contentFiles: Record<string, string> = {
    'test-summary.json': JSON.stringify(testExecutions, null, 2),
    'documentation-status.json': JSON.stringify(documentationStatus, null, 2),
  };

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
    excludes: EXCLUDED_SECTIONS,
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

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

import type {
  Exception,
  Finding,
  ManualReview,
  TestExecution,
} from '@forgegate/core-evidence';
import type { AutomatedEvidenceDetail } from './evidence-detail';
import type { ReleaseDecisionWorkflowRecord } from './release-decision-export';

export interface StarlightEvidencePackageRecords {
  readonly testExecutions: readonly TestExecution[];
  readonly automatedDetails: readonly AutomatedEvidenceDetail[];
  readonly manualReviews: readonly ManualReview[];
  readonly findings: readonly Finding[];
  readonly exceptions: readonly Exception[];
  readonly releaseDecisionRecords: readonly ReleaseDecisionWorkflowRecord[];
  readonly copiedAttachmentFiles: readonly EvidencePackageCopiedAttachmentFile[];
  readonly limitations: readonly string[];
}

export interface EvidencePackageCopiedAttachmentFile {
  readonly sourceEvidenceId: string;
  readonly sourcePath: string;
  readonly targetPath: string;
  readonly redactionRequired: boolean;
  readonly reviewStatus: 'requires-review';
}

export interface EvidencePackageIntegrityReport {
  readonly status: 'verified' | 'failed' | 'unavailable';
  readonly verifiedContentPaths: readonly string[];
  readonly limitations: readonly string[];
}

export interface VerifiedStarlightEvidencePackageRecords
  extends StarlightEvidencePackageRecords {
  readonly integrity: EvidencePackageIntegrityReport;
}

/**
 * Loads the Starlight-relevant records from a manifest-indexed evidence
 * package file map. This intentionally accepts already-read files rather than
 * filesystem paths so callers can keep consent, redaction, and path checks at
 * the workspace boundary.
 */
export function loadStarlightEvidencePackageRecords(
  files: Readonly<Record<string, string>>,
): StarlightEvidencePackageRecords {
  const limitations: string[] = [];
  const copiedAttachmentFiles = readCopiedAttachmentFiles(files, limitations);
  return {
    testExecutions: readArrayFile<TestExecution>(
      files,
      'test-summary.json',
      limitations,
    ),
    automatedDetails: readArrayFile<AutomatedEvidenceDetail>(
      files,
      'automated/details.json',
      limitations,
    ),
    manualReviews: readDirectoryRecords<ManualReview>(files, 'manual/', limitations),
    findings: readDirectoryRecords<Finding>(files, 'findings/', limitations),
    exceptions: readDirectoryRecords<Exception>(
      files,
      'exceptions/',
      limitations,
    ),
    releaseDecisionRecords: readDirectoryRecords<ReleaseDecisionWorkflowRecord>(
      files,
      'release-decisions/',
      limitations,
    ),
    copiedAttachmentFiles,
    limitations,
  };
}

/**
 * Verifies a manifest-indexed evidence package before loading the records
 * Starlight can consume. Files absent from the manifest/checksum contract, or
 * files whose hashes do not match, are not passed to the record loader.
 */
export async function loadVerifiedStarlightEvidencePackageRecords(
  files: Readonly<Record<string, string>>,
): Promise<VerifiedStarlightEvidencePackageRecords> {
  const integrity = await verifyEvidencePackageIntegrity(files);
  const verifiedFiles = Object.fromEntries(
    integrity.verifiedContentPaths.flatMap((path) => {
      const content = files[path];
      return content === undefined ? [] : [[path, content]];
    }),
  );
  const records = loadStarlightEvidencePackageRecords(verifiedFiles);
  return {
    ...records,
    limitations: [...integrity.limitations, ...records.limitations],
    integrity,
  };
}

export async function verifyEvidencePackageIntegrity(
  files: Readonly<Record<string, string>>,
): Promise<EvidencePackageIntegrityReport> {
  const limitations: string[] = [];
  const manifestContent = files['manifest.json'];
  const checksumsContent = files['checksums.sha256'];
  if (manifestContent === undefined || checksumsContent === undefined) {
    return {
      status: 'unavailable',
      verifiedContentPaths: [],
      limitations: [
        manifestContent === undefined
          ? 'manifest.json is not present in this evidence package.'
          : '',
        checksumsContent === undefined
          ? 'checksums.sha256 is not present in this evidence package.'
          : '',
      ].filter(Boolean),
    };
  }

  const manifest = parseJson(manifestContent, 'manifest.json', limitations);
  if (!isRecord(manifest) || !isChecksumMap(manifest['checksums'])) {
    limitations.push('manifest.json does not contain a valid checksums map.');
    return { status: 'failed', verifiedContentPaths: [], limitations };
  }

  const manifestChecksums = manifest['checksums'];
  const checksumFileEntries = parseChecksumsFile(checksumsContent, limitations);
  const verifiedContentPaths: string[] = [];

  for (const [path, expectedHash] of Object.entries(manifestChecksums).sort()) {
    const listedHash = checksumFileEntries[path];
    if (listedHash === undefined) {
      limitations.push(`${path} is missing from checksums.sha256.`);
      continue;
    }
    if (listedHash.toLowerCase() !== expectedHash.toLowerCase()) {
      limitations.push(
        `${path} has conflicting hashes between manifest.json and checksums.sha256.`,
      );
      continue;
    }
    const content = files[path];
    if (content === undefined) {
      limitations.push(`${path} is listed in checksums but the file is absent.`);
      continue;
    }
    const actualHash = await sha256Hex(content);
    if (actualHash !== expectedHash.toLowerCase()) {
      limitations.push(`${path} checksum mismatch.`);
      continue;
    }
    verifiedContentPaths.push(path);
  }

  const declaredContentPaths = new Set(Object.keys(manifestChecksums));
  const unverifiedPackageContent = Object.keys(files)
    .filter(
      (path) =>
        path !== 'manifest.json' &&
        path !== 'checksums.sha256' &&
        !declaredContentPaths.has(path),
    )
    .sort();
  if (unverifiedPackageContent.length) {
    limitations.push(
      `Unverified package content was ignored: ${unverifiedPackageContent.join(
        ', ',
      )}.`,
    );
  }

  return {
    status: limitations.length ? 'failed' : 'verified',
    verifiedContentPaths,
    limitations,
  };
}

function readArrayFile<T>(
  files: Readonly<Record<string, string>>,
  path: string,
  limitations: string[],
): readonly T[] {
  const content = files[path];
  if (content === undefined) {
    limitations.push(`${path} is not present in this evidence package.`);
    return [];
  }
  const parsed = parseJson(content, path, limitations);
  if (!Array.isArray(parsed)) {
    limitations.push(`${path} is not a JSON array.`);
    return [];
  }
  return parsed as T[];
}

function readDirectoryRecords<T>(
  files: Readonly<Record<string, string>>,
  directory: string,
  limitations: string[],
): readonly T[] {
  const paths = Object.keys(files)
    .filter((path) => path.startsWith(directory) && path.endsWith('.json'))
    .sort();
  if (!paths.length) {
    limitations.push(`${directory} has no JSON records in this evidence package.`);
    return [];
  }
  return paths.flatMap((path) => {
    const parsed = parseJson(files[path] ?? '', path, limitations);
    return parsed === undefined ? [] : [parsed as T];
  });
}

function readCopiedAttachmentFiles(
  files: Readonly<Record<string, string>>,
  limitations: string[],
): readonly EvidencePackageCopiedAttachmentFile[] {
  const indexContent = files['attachments/index.json'];
  if (indexContent === undefined) {
    return [];
  }
  const parsed = parseJson(indexContent, 'attachments/index.json', limitations);
  if (!isRecord(parsed) || !Array.isArray(parsed['attachments'])) {
    limitations.push('attachments/index.json does not contain an attachments array.');
    return [];
  }
  const copied = parsed['attachments'].flatMap((value) => {
    if (!isRecord(value)) {
      limitations.push('attachments/index.json contains an invalid attachment record.');
      return [];
    }
    const status = value['status'];
    const sourceEvidenceId = value['sourceEvidenceId'];
    const sourcePath = value['sourcePath'];
    const targetPath = value['targetPath'];
    const redactionRequired = value['redactionRequired'];
    if (status !== 'copied-redacted') {
      return [];
    }
    if (
      typeof sourceEvidenceId !== 'string' ||
      typeof sourcePath !== 'string' ||
      typeof targetPath !== 'string' ||
      typeof redactionRequired !== 'boolean'
    ) {
      limitations.push(
        'attachments/index.json contains a copied attachment record with missing fields.',
      );
      return [];
    }
    if (files[targetPath] === undefined) {
      limitations.push(
        `${targetPath} is indexed as a copied attachment but the file is absent.`,
      );
      return [];
    }
    return [
      {
        sourceEvidenceId,
        sourcePath,
        targetPath,
        redactionRequired,
        reviewStatus: 'requires-review' as const,
      },
    ];
  });
  if (copied.length) {
    limitations.push(
      `${copied.length} copied attachment file(s) were verified but not loaded into Starlight report data because ForgeGate has not implemented reviewer redaction approval for imported package attachments yet.`,
    );
  }
  return copied;
}

function parseJson(
  content: string,
  path: string,
  limitations: string[],
): unknown {
  try {
    return JSON.parse(content);
  } catch (error) {
    limitations.push(`${path} could not be parsed as JSON: ${String(error)}`);
    return undefined;
  }
}

function parseChecksumsFile(
  content: string,
  limitations: string[],
): Readonly<Record<string, string>> {
  const checksums: Record<string, string> = {};
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    if (!line.trim()) {
      continue;
    }
    const match = /^([a-fA-F0-9]{64})\s{2}(.+)$/.exec(line);
    if (!match) {
      limitations.push(`checksums.sha256 line ${index + 1} is invalid.`);
      continue;
    }
    const hash = match[1];
    const path = match[2];
    if (!hash || !path) {
      limitations.push(`checksums.sha256 line ${index + 1} is invalid.`);
      continue;
    }
    checksums[path] = hash.toLowerCase();
  }
  return checksums;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isChecksumMap(
  value: unknown,
): value is Readonly<Record<string, string>> {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (hash) => typeof hash === 'string' && /^[a-fA-F0-9]{64}$/.test(hash),
    )
  );
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

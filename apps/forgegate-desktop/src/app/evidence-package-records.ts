import type {
  Exception,
  Finding,
  ManualReview,
  TestExecution,
} from '@forgegate/core-evidence';
import type { AutomatedEvidenceDetail } from './evidence-detail';

export interface StarlightEvidencePackageRecords {
  readonly testExecutions: readonly TestExecution[];
  readonly automatedDetails: readonly AutomatedEvidenceDetail[];
  readonly manualReviews: readonly ManualReview[];
  readonly findings: readonly Finding[];
  readonly exceptions: readonly Exception[];
  readonly limitations: readonly string[];
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

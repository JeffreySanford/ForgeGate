export const FORGEGATE_REPORT_DATA_ROOT = 'src/data/forgegate/components';

export type ForgeGateReportDataKind = 'component' | 'registry' | 'unknown';

export interface ForgeGateReportDataDiscovery {
  readonly reportDataRoot: string;
  readonly registryPath: string;
  readonly componentGlob: string;
  readonly allReportsGlob: string;
  readonly conventions: readonly string[];
}

export interface ForgeGateReportDataClassification {
  readonly kind: ForgeGateReportDataKind;
  readonly path: string;
  readonly slug?: string;
  readonly reason?: string;
}

export function forgeGateComponentReportDataPath(
  slug: string,
  reportDataRoot = FORGEGATE_REPORT_DATA_ROOT,
): string {
  return `${safeReportDataRoot(reportDataRoot)}/${safeReportDataSlug(slug)}.json`;
}

export function forgeGateRegistryReportDataPath(
  reportDataRoot = FORGEGATE_REPORT_DATA_ROOT,
): string {
  return `${safeReportDataRoot(reportDataRoot)}/index.json`;
}

export function forgeGateReportDataDiscovery(
  reportDataRoot = FORGEGATE_REPORT_DATA_ROOT,
): ForgeGateReportDataDiscovery {
  const root = safeReportDataRoot(reportDataRoot);
  return {
    reportDataRoot: root,
    registryPath: forgeGateRegistryReportDataPath(root),
    componentGlob: `${root}/*.json`,
    allReportsGlob: `${root}/**/*.json`,
    conventions: [
      'index.json is the generated component registry report.',
      '<component-slug>.json is a generated component report.',
      'Generated MDX should keep importing JSON directly from this root until the full plugin can discover and register report data automatically.',
    ],
  };
}

export function classifyForgeGateReportDataPath(
  path: string,
  reportDataRoot = FORGEGATE_REPORT_DATA_ROOT,
): ForgeGateReportDataClassification {
  const normalizedPath = normalizePath(path);
  const root = safeReportDataRoot(reportDataRoot);
  const prefix = `${root}/`;
  if (!normalizedPath.startsWith(prefix)) {
    return {
      kind: 'unknown',
      path: normalizedPath,
      reason: `Path is outside ForgeGate report data root ${root}.`,
    };
  }
  const filename = normalizedPath.slice(prefix.length);
  if (filename.includes('/')) {
    return {
      kind: 'unknown',
      path: normalizedPath,
      reason: 'ForgeGate report data files are expected directly under the configured root.',
    };
  }
  if (filename === 'index.json') {
    return { kind: 'registry', path: normalizedPath };
  }
  if (!filename.endsWith('.json')) {
    return {
      kind: 'unknown',
      path: normalizedPath,
      reason: 'ForgeGate report data files must use the .json extension.',
    };
  }
  const slug = filename.slice(0, -'.json'.length);
  try {
    safeReportDataSlug(slug);
  } catch {
    return {
      kind: 'unknown',
      path: normalizedPath,
      reason: `Unsafe ForgeGate report data slug "${slug}".`,
    };
  }
  return { kind: 'component', path: normalizedPath, slug };
}

export function safeReportDataRoot(root: string): string {
  const normalized = normalizePath(root);
  if (
    !normalized ||
    normalized.startsWith('/') ||
    /^[A-Za-z]:\//.test(normalized) ||
    normalized.split('/').includes('..')
  ) {
    throw new Error(`Unsafe ForgeGate report data root "${root}".`);
  }
  return normalized;
}

export function safeReportDataSlug(slug: string): string {
  const trimmed = slug.trim();
  if (
    !trimmed ||
    trimmed.includes('/') ||
    trimmed.includes('\\') ||
    trimmed.includes('..')
  ) {
    throw new Error(`Unsafe ForgeGate report data slug "${slug}".`);
  }
  return trimmed;
}

function normalizePath(path: string): string {
  return path.trim().replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
}

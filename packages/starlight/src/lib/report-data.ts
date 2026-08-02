import { readdir } from 'node:fs/promises';
import path from 'node:path';

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

export interface ForgeGateReportDataFilesystemDiscoveryOptions {
  readonly workspaceRoot: string;
  readonly reportDataRoot?: string;
  readonly maxDepth?: number;
}

export interface ForgeGateDiscoveredComponentReportData {
  readonly path: string;
  readonly slug: string;
}

export interface ForgeGateIgnoredReportDataFile {
  readonly path: string;
  readonly reason: string;
}

export interface ForgeGateReportDataFilesystemDiscovery {
  readonly workspaceRoot: string;
  readonly reportDataRoot: string;
  readonly scannedRoot: string;
  readonly registryPath?: string;
  readonly componentReports: readonly ForgeGateDiscoveredComponentReportData[];
  readonly ignoredReports: readonly ForgeGateIgnoredReportDataFile[];
  readonly limitations: readonly string[];
}

export type ForgeGateReportDataRegistrationKind = 'component' | 'registry';

export interface ForgeGateReportDataRegistrationOptions {
  readonly routeBase?: string;
  readonly registryLabel?: string;
}

export interface ForgeGateReportDataRegistrationEntry {
  readonly kind: ForgeGateReportDataRegistrationKind;
  readonly label: string;
  readonly reportDataPath: string;
  readonly routePath: string;
  readonly href: string;
  readonly slug?: string;
}

export interface ForgeGateReportDataRegistration {
  readonly reportDataRoot: string;
  readonly routeBase: string;
  readonly entries: readonly ForgeGateReportDataRegistrationEntry[];
  readonly limitations: readonly string[];
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

export function forgeGateComponentReportRoutePath(
  slug: string,
  routeBase = 'components',
): string {
  return `${safeReportRouteBase(routeBase)}/${safeReportDataSlug(slug)}`;
}

export function forgeGateRegistryReportRoutePath(routeBase = 'components'): string {
  return safeReportRouteBase(routeBase);
}

export function forgeGateReportDataHref(routePath: string): string {
  return `/${safeReportRoutePath(routePath)}/`;
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

export async function discoverForgeGateReportDataFiles(
  options: ForgeGateReportDataFilesystemDiscoveryOptions,
): Promise<ForgeGateReportDataFilesystemDiscovery> {
  const workspaceRoot = normalizeAbsolutePath(options.workspaceRoot);
  const reportDataRoot = safeReportDataRoot(
    options.reportDataRoot ?? FORGEGATE_REPORT_DATA_ROOT,
  );
  const scannedRoot = resolveWorkspaceRelativePath(workspaceRoot, reportDataRoot);
  const discoveredJsonPaths = await readJsonPaths(scannedRoot, options.maxDepth ?? 4);
  const componentReports: ForgeGateDiscoveredComponentReportData[] = [];
  const ignoredReports: ForgeGateIgnoredReportDataFile[] = [];
  const limitations: string[] = [];
  let registryPath: string | undefined;

  if (discoveredJsonPaths === undefined) {
    return {
      workspaceRoot,
      reportDataRoot,
      scannedRoot,
      componentReports,
      ignoredReports,
      limitations: [
        `ForgeGate report data root ${reportDataRoot} was not found.`,
      ],
    };
  }

  for (const relativeJsonPath of discoveredJsonPaths) {
    const reportPath = `${reportDataRoot}/${relativeJsonPath}`;
    const classification = classifyForgeGateReportDataPath(
      reportPath,
      reportDataRoot,
    );
    if (classification.kind === 'registry') {
      registryPath = classification.path;
      continue;
    }
    if (classification.kind === 'component') {
      if (!classification.slug) {
        ignoredReports.push({
          path: classification.path,
          reason: 'Component report data did not include a slug.',
        });
        continue;
      }
      componentReports.push({
        path: classification.path,
        slug: classification.slug,
      });
      continue;
    }
    ignoredReports.push({
      path: classification.path,
      reason: classification.reason ?? 'File does not match ForgeGate report data conventions.',
    });
  }

  componentReports.sort((left, right) => left.slug.localeCompare(right.slug));
  ignoredReports.sort((left, right) => left.path.localeCompare(right.path));
  if (!registryPath) {
    limitations.push(
      `ForgeGate registry report ${forgeGateRegistryReportDataPath(
        reportDataRoot,
      )} was not found.`,
    );
  }

  return {
    workspaceRoot,
    reportDataRoot,
    scannedRoot,
    registryPath,
    componentReports,
    ignoredReports,
    limitations,
  };
}

export function registerForgeGateReportData(
  discovery: ForgeGateReportDataFilesystemDiscovery,
  options: ForgeGateReportDataRegistrationOptions = {},
): ForgeGateReportDataRegistration {
  const routeBase = safeReportRouteBase(options.routeBase ?? 'components');
  const entries: ForgeGateReportDataRegistrationEntry[] = [];

  if (discovery.registryPath) {
    const routePath = forgeGateRegistryReportRoutePath(routeBase);
    entries.push({
      kind: 'registry',
      label: options.registryLabel ?? 'Component registry',
      reportDataPath: discovery.registryPath,
      routePath,
      href: forgeGateReportDataHref(routePath),
    });
  }

  for (const componentReport of discovery.componentReports) {
    const routePath = forgeGateComponentReportRoutePath(
      componentReport.slug,
      routeBase,
    );
    entries.push({
      kind: 'component',
      label: reportDataSlugLabel(componentReport.slug),
      reportDataPath: componentReport.path,
      routePath,
      href: forgeGateReportDataHref(routePath),
      slug: componentReport.slug,
    });
  }

  const limitations = [...discovery.limitations];
  if (discovery.componentReports.length === 0) {
    limitations.push(
      `No ForgeGate component report data files were discovered under ${discovery.reportDataRoot}.`,
    );
  }

  return {
    reportDataRoot: discovery.reportDataRoot,
    routeBase,
    entries,
    limitations,
  };
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

export function safeReportRouteBase(routeBase: string): string {
  return safeReportRoutePath(routeBase);
}

function normalizePath(path: string): string {
  return path.trim().replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
}

function safeReportRoutePath(routePath: string): string {
  const normalized = normalizePath(routePath);
  if (
    !normalized ||
    normalized.startsWith('/') ||
    /^[A-Za-z]:\//.test(normalized) ||
    normalized.split('/').includes('..')
  ) {
    throw new Error(`Unsafe ForgeGate Starlight route path "${routePath}".`);
  }
  return normalized;
}

function reportDataSlugLabel(slug: string): string {
  return slug
    .replace(/--/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeAbsolutePath(value: string): string {
  const resolved = path.resolve(value);
  return normalizePath(resolved);
}

function resolveWorkspaceRelativePath(
  workspaceRoot: string,
  relativePath: string,
): string {
  const nativeWorkspaceRoot = path.resolve(workspaceRoot);
  const targetPath = path.resolve(nativeWorkspaceRoot, ...relativePath.split('/'));
  const relativeToWorkspace = path.relative(nativeWorkspaceRoot, targetPath);
  if (
    relativeToWorkspace.startsWith('..') ||
    path.isAbsolute(relativeToWorkspace)
  ) {
    throw new Error(
      `ForgeGate report data root ${relativePath} resolves outside ${workspaceRoot}.`,
    );
  }
  return normalizePath(targetPath);
}

async function readJsonPaths(
  directory: string,
  maxDepth: number,
  prefix = '',
): Promise<readonly string[] | undefined> {
  let entries: readonly {
    readonly name: string;
    isDirectory(): boolean;
    isFile(): boolean;
  }[];
  try {
    entries = await readdir(directory, {
      encoding: 'utf8',
      withFileTypes: true,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }

  const jsonPaths: string[] = [];
  for (const entry of entries) {
    const relativeEntryPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory() && maxDepth > 0) {
      const nestedPaths = await readJsonPaths(
        path.join(directory, entry.name),
        maxDepth - 1,
        relativeEntryPath,
      );
      jsonPaths.push(...(nestedPaths ?? []));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.json')) {
      jsonPaths.push(relativeEntryPath);
    }
  }
  return jsonPaths.sort((left, right) => left.localeCompare(right));
}

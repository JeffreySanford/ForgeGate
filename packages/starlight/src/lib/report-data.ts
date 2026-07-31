export const FORGEGATE_REPORT_DATA_ROOT = 'src/data/forgegate/components';

export function forgeGateComponentReportDataPath(slug: string): string {
  return `${FORGEGATE_REPORT_DATA_ROOT}/${safeReportDataSlug(slug)}.json`;
}

export function forgeGateRegistryReportDataPath(): string {
  return `${FORGEGATE_REPORT_DATA_ROOT}/index.json`;
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

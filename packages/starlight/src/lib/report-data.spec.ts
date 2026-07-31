import {
  forgeGateComponentReportDataPath,
  forgeGateRegistryReportDataPath,
  safeReportDataSlug,
} from './report-data';

describe('ForgeGate report data conventions', () => {
  it('names component report data under the generated Starlight data root', () => {
    expect(forgeGateComponentReportDataPath('acme-button--for-designers')).toBe(
      'src/data/forgegate/components/acme-button--for-designers.json',
    );
  });

  it('names registry report data under the same generated data root', () => {
    expect(forgeGateRegistryReportDataPath()).toBe(
      'src/data/forgegate/components/index.json',
    );
  });

  it('rejects slugs that would escape the report data root', () => {
    expect(() => safeReportDataSlug('../escape')).toThrow(
      'Unsafe ForgeGate report data slug',
    );
    expect(() => safeReportDataSlug('nested/path')).toThrow(
      'Unsafe ForgeGate report data slug',
    );
  });
});

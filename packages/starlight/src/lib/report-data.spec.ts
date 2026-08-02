import {
  classifyForgeGateReportDataPath,
  forgeGateComponentReportDataPath,
  forgeGateReportDataDiscovery,
  forgeGateRegistryReportDataPath,
  safeReportDataRoot,
  safeReportDataSlug,
} from './report-data';

describe('ForgeGate report data conventions', () => {
  it('names component report data under the generated Starlight data root', () => {
    expect(forgeGateComponentReportDataPath('acme-button--for-designers')).toBe(
      'src/data/forgegate/components/acme-button--for-designers.json',
    );
    expect(
      forgeGateComponentReportDataPath(
        'acme-button',
        'apps/docs/src/data/forgegate/components',
      ),
    ).toBe('apps/docs/src/data/forgegate/components/acme-button.json');
  });

  it('names registry report data under the same generated data root', () => {
    expect(forgeGateRegistryReportDataPath()).toBe(
      'src/data/forgegate/components/index.json',
    );
  });

  it('publishes generated-data discovery conventions for the plugin lifecycle', () => {
    expect(
      forgeGateReportDataDiscovery('apps/docs/src/data/forgegate/components'),
    ).toEqual({
      reportDataRoot: 'apps/docs/src/data/forgegate/components',
      registryPath: 'apps/docs/src/data/forgegate/components/index.json',
      componentGlob: 'apps/docs/src/data/forgegate/components/*.json',
      allReportsGlob: 'apps/docs/src/data/forgegate/components/**/*.json',
      conventions: [
        'index.json is the generated component registry report.',
        '<component-slug>.json is a generated component report.',
        'Generated MDX should keep importing JSON directly from this root until the full plugin can discover and register report data automatically.',
      ],
    });
  });

  it('classifies registry and component report-data paths', () => {
    expect(
      classifyForgeGateReportDataPath(
        'apps/docs/src/data/forgegate/components/index.json',
        'apps/docs/src/data/forgegate/components',
      ),
    ).toEqual({
      kind: 'registry',
      path: 'apps/docs/src/data/forgegate/components/index.json',
    });
    expect(
      classifyForgeGateReportDataPath(
        'apps/docs/src/data/forgegate/components/acme-button--for-designers.json',
        'apps/docs/src/data/forgegate/components',
      ),
    ).toEqual({
      kind: 'component',
      path: 'apps/docs/src/data/forgegate/components/acme-button--for-designers.json',
      slug: 'acme-button--for-designers',
    });
  });

  it('classifies out-of-contract report-data paths as unknown with a reason', () => {
    expect(
      classifyForgeGateReportDataPath(
        'apps/docs/src/data/forgegate/components/nested/acme-button.json',
        'apps/docs/src/data/forgegate/components',
      ),
    ).toEqual({
      kind: 'unknown',
      path: 'apps/docs/src/data/forgegate/components/nested/acme-button.json',
      reason:
        'ForgeGate report data files are expected directly under the configured root.',
    });
    expect(
      classifyForgeGateReportDataPath(
        'apps/docs/src/data/other/acme-button.json',
        'apps/docs/src/data/forgegate/components',
      ).kind,
    ).toBe('unknown');
  });

  it('rejects report data roots that would escape the Starlight project', () => {
    expect(() => safeReportDataRoot('../data')).toThrow(
      'Unsafe ForgeGate report data root',
    );
    expect(() => safeReportDataRoot('D:/repo/data')).toThrow(
      'Unsafe ForgeGate report data root',
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

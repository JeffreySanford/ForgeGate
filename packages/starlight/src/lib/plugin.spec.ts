import {
  FORGEGATE_STARLIGHT_INTEGRATION_NAME,
  forgeGateStarlightCompatibilityDiagnostics,
  forgeGateStarlightIntegration,
  forgeGateStarlightLifecycleStatus,
} from './plugin';

describe('forgeGateStarlightIntegration', () => {
  it('exposes a real Astro integration entrypoint with a stable name', () => {
    const integration = forgeGateStarlightIntegration();

    expect(integration.name).toBe(FORGEGATE_STARLIGHT_INTEGRATION_NAME);
    expect(integration.hooks['astro:config:setup']).toBeTypeOf('function');
  });

  it('accepts a generated report data root for future plugin discovery', () => {
    const integration = forgeGateStarlightIntegration({
      reportDataRoot: 'apps/docs/src/data/forgegate/components',
      astroVersion: '5.13.0',
      starlightVersion: '0.41.5',
    });
    const debug = vi.fn();
    const warn = vi.fn();

    integration.hooks['astro:config:setup']?.({
      logger: { debug, warn },
    } as never);

    expect(debug).toHaveBeenCalledWith(
      'ForgeGate report data root configured as apps/docs/src/data/forgegate/components.',
    );
    expect(debug).toHaveBeenCalledWith(
      'ForgeGate Starlight lifecycle stage: discovery-contract.',
    );
    expect(debug).toHaveBeenCalledWith(
      'ForgeGate report data discovery glob: apps/docs/src/data/forgegate/components/**/*.json.',
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('publishes the current plugin lifecycle boundary for docs and diagnostics', () => {
    expect(
      forgeGateStarlightLifecycleStatus({
        reportDataRoot: 'src/data/forgegate/components',
      }),
    ).toEqual({
      integrationName: FORGEGATE_STARLIGHT_INTEGRATION_NAME,
      reportDataRoot: 'src/data/forgegate/components',
      reportData: {
        reportDataRoot: 'src/data/forgegate/components',
        registryPath: 'src/data/forgegate/components/index.json',
        componentGlob: 'src/data/forgegate/components/*.json',
        allReportsGlob: 'src/data/forgegate/components/**/*.json',
        conventions: [
          'index.json is the generated component registry report.',
          '<component-slug>.json is a generated component report.',
          'Generated MDX should keep importing JSON directly from this root until the full plugin can discover and register report data automatically.',
        ],
      },
      lifecycle: 'discovery-contract',
      supports: [
        'stable Astro integration name',
        'configurable generated report-data root',
        'generated-data discovery conventions',
        'component and registry report-data classification',
        'version compatibility diagnostics',
        'manual MDX imports of ForgeGate presentation components',
        'manifest-backed component and registry report JSON',
      ],
      planned: [
        'filesystem-backed generated-data auto-discovery',
        'component auto-registration',
        'migration guidance for generated MDX pages',
      ],
    });
  });

  it('reports compatibility diagnostics without requiring filesystem access', () => {
    expect(
      forgeGateStarlightCompatibilityDiagnostics({
        astroVersion: '4.16.0',
        starlightVersion: '0.40.0',
      }),
    ).toEqual([
      {
        level: 'warning',
        code: 'astro-version-unsupported',
        message:
          "Astro 4.16.0 is below ForgeGate's tested minimum 5.0.0.",
      },
      {
        level: 'warning',
        code: 'starlight-version-unsupported',
        message:
          "Starlight 0.40.0 is below ForgeGate's tested minimum 0.41.0.",
      },
    ]);
  });

  it('keeps unknown version diagnostics informational', () => {
    expect(forgeGateStarlightCompatibilityDiagnostics()).toEqual([
      {
        level: 'info',
        code: 'astro-version-unknown',
        message:
          'Astro version was not provided; ForgeGate cannot verify compatibility against 5.0.0.',
      },
      {
        level: 'info',
        code: 'starlight-version-unknown',
        message:
          'Starlight version was not provided; ForgeGate cannot verify compatibility against 0.41.0.',
      },
    ]);
  });
});

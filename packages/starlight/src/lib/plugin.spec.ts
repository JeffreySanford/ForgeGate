import {
  FORGEGATE_STARLIGHT_INTEGRATION_NAME,
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
    });
    const debug = vi.fn();

    integration.hooks['astro:config:setup']?.({
      logger: { debug },
    } as never);

    expect(debug).toHaveBeenCalledWith(
      'ForgeGate report data root configured as apps/docs/src/data/forgegate/components.',
    );
    expect(debug).toHaveBeenCalledWith(
      'ForgeGate Starlight lifecycle stage: presentation-package.',
    );
  });

  it('publishes the current plugin lifecycle boundary for docs and diagnostics', () => {
    expect(
      forgeGateStarlightLifecycleStatus({
        reportDataRoot: 'src/data/forgegate/components',
      }),
    ).toEqual({
      integrationName: FORGEGATE_STARLIGHT_INTEGRATION_NAME,
      reportDataRoot: 'src/data/forgegate/components',
      lifecycle: 'presentation-package',
      supports: [
        'stable Astro integration name',
        'configurable generated report-data root',
        'manual MDX imports of ForgeGate presentation components',
        'manifest-backed component and registry report JSON',
      ],
      planned: [
        'generated-data discovery',
        'component auto-registration conventions',
        'version compatibility diagnostics',
        'migration guidance for generated MDX pages',
      ],
    });
  });
});

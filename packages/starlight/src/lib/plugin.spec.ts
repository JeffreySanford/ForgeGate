import {
  FORGEGATE_STARLIGHT_INTEGRATION_NAME,
  forgeGateStarlightIntegration,
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
  });
});

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  FORGEGATE_STARLIGHT_INTEGRATION_NAME,
  forgeGateStarlightCompatibilityDiagnostics,
  forgeGateStarlightFilesystemDiscovery,
  forgeGateStarlightIntegration,
  forgeGateStarlightLifecycleStatus,
} from './plugin';

describe('forgeGateStarlightIntegration', () => {
  let temporaryRoots: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryRoots.map((temporaryRoot) =>
        rm(temporaryRoot, { recursive: true, force: true }),
      ),
    );
    temporaryRoots = [];
  });

  it('exposes a real Astro integration entrypoint with a stable name', () => {
    const integration = forgeGateStarlightIntegration();

    expect(integration.name).toBe(FORGEGATE_STARLIGHT_INTEGRATION_NAME);
    expect(integration.hooks['astro:config:setup']).toBeTypeOf('function');
  });

  it('accepts a generated report data root for future plugin discovery', async () => {
    const integration = forgeGateStarlightIntegration({
      reportDataRoot: 'apps/docs/src/data/forgegate/components',
      astroVersion: '5.13.0',
      starlightVersion: '0.41.5',
    });
    const debug = vi.fn();
    const warn = vi.fn();

    await integration.hooks['astro:config:setup']?.({
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
      filesystemDiscovery: false,
      lifecycle: 'discovery-contract',
      supports: [
        'stable Astro integration name',
        'configurable generated report-data root',
        'generated-data discovery conventions',
        'component and registry report-data classification',
        'filesystem-backed report-data scanning when enabled',
        'version compatibility diagnostics',
        'manual MDX imports of ForgeGate presentation components',
        'manifest-backed component and registry report JSON',
      ],
      planned: [
        'component auto-registration',
        'generated Starlight route registration',
        'migration guidance for generated MDX pages',
      ],
    });
  });

  it('logs filesystem-backed report discovery when explicitly enabled', async () => {
    const workspaceRoot = await makeTemporaryWorkspace();
    const reportDataRoot = 'docs/src/data/forgegate/components';
    const absoluteReportDataRoot = path.join(
      workspaceRoot,
      ...reportDataRoot.split('/'),
    );
    await mkdir(absoluteReportDataRoot, { recursive: true });
    await writeFile(path.join(absoluteReportDataRoot, 'index.json'), '{}');
    await writeFile(path.join(absoluteReportDataRoot, 'acme-button.json'), '{}');
    const integration = forgeGateStarlightIntegration({
      reportDataRoot,
      filesystemDiscovery: true,
    });
    const debug = vi.fn();
    const warn = vi.fn();

    await integration.hooks['astro:config:setup']?.({
      config: { root: pathToFileURL(`${workspaceRoot}/`) },
      logger: { debug, warn },
    } as never);

    expect(debug).toHaveBeenCalledWith(
      'ForgeGate Starlight lifecycle stage: filesystem-discovery.',
    );
    expect(debug).toHaveBeenCalledWith(
      'ForgeGate discovered 1 component report data file(s).',
    );
    expect(debug).toHaveBeenCalledWith(
      'ForgeGate discovered registry report data at docs/src/data/forgegate/components/index.json.',
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('exposes filesystem discovery for plugin lifecycle tests and docs', async () => {
    const workspaceRoot = await makeTemporaryWorkspace();

    await expect(
      forgeGateStarlightFilesystemDiscovery({
        workspaceRoot,
        reportDataRoot: 'docs/src/data/forgegate/components',
      }),
    ).resolves.toMatchObject({
      reportDataRoot: 'docs/src/data/forgegate/components',
      componentReports: [],
      limitations: [
        'ForgeGate report data root docs/src/data/forgegate/components was not found.',
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

  async function makeTemporaryWorkspace(): Promise<string> {
    const workspaceRoot = await mkdtemp(
      path.join(tmpdir(), 'forgegate-starlight-plugin-'),
    );
    temporaryRoots.push(workspaceRoot);
    return workspaceRoot;
  }
});

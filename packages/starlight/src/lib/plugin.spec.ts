import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  FORGEGATE_STARLIGHT_INTEGRATION_NAME,
  forgeGateStarlightCompatibilityDiagnostics,
  forgeGateStarlightFilesystemDiscovery,
  forgeGateStarlightInjectReportDataRoutes,
  forgeGateStarlightIntegration,
  forgeGateStarlightLifecycleStatus,
  forgeGateStarlightReportDataRegistration,
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
          'Generated MDX can keep importing JSON directly from this root; the Astro integration can also discover the same files and inject generated report routes when routeInjection is enabled.',
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
        'deterministic report route registration plan',
        'version compatibility diagnostics',
        'optional Astro route injection from discovered report data',
        'manual MDX imports of ForgeGate presentation components',
        'manifest-backed component and registry report JSON',
      ],
      planned: ['migration guidance for generated MDX pages'],
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
      routeBase: 'design-system/components',
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
    expect(debug).toHaveBeenCalledWith(
      'ForgeGate prepared 2 report route registration entries under design-system/components.',
    );
    expect(debug).toHaveBeenCalledWith(
      'ForgeGate report registration registry: docs/src/data/forgegate/components/index.json -> /design-system/components/',
    );
    expect(debug).toHaveBeenCalledWith(
      'ForgeGate report registration component: docs/src/data/forgegate/components/acme-button.json -> /design-system/components/acme-button/',
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('injects generated Starlight report routes when route injection is explicitly enabled', async () => {
    const workspaceRoot = await makeTemporaryWorkspace();
    const reportDataRoot = 'docs/src/data/forgegate/components';
    const absoluteReportDataRoot = path.join(
      workspaceRoot,
      ...reportDataRoot.split('/'),
    );
    const codegenRoot = path.join(workspaceRoot, '.astro/forgegate');
    await mkdir(absoluteReportDataRoot, { recursive: true });
    await writeFile(path.join(absoluteReportDataRoot, 'index.json'), '{}');
    await writeFile(path.join(absoluteReportDataRoot, 'acme-button.json'), '{}');
    const integration = forgeGateStarlightIntegration({
      reportDataRoot,
      filesystemDiscovery: true,
      routeInjection: true,
      routeBase: 'forgegate/reports',
    });
    const debug = vi.fn();
    const warn = vi.fn();
    const injectRoute = vi.fn();

    await integration.hooks['astro:config:setup']?.({
      config: { root: pathToFileURL(`${workspaceRoot}/`) },
      createCodegenDir: () => pathToFileURL(`${codegenRoot}/`),
      injectRoute,
      logger: { debug, warn },
    } as never);

    expect(injectRoute).toHaveBeenCalledTimes(2);
    expect(injectRoute).toHaveBeenCalledWith({
      pattern: '/forgegate/reports',
      entrypoint: path.join(codegenRoot, 'forgegate__reports.astro'),
      prerender: true,
    });
    expect(injectRoute).toHaveBeenCalledWith({
      pattern: '/forgegate/reports/acme-button',
      entrypoint: path.join(codegenRoot, 'forgegate__reports__acme-button.astro'),
      prerender: true,
    });
    expect(debug).toHaveBeenCalledWith(
      'ForgeGate injected 2 generated report route(s).',
    );
    expect(debug).toHaveBeenCalledWith(
      'ForgeGate injected component route /forgegate/reports/acme-button from docs/src/data/forgegate/components/acme-button.json.',
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

  it('exposes route registration as a testable plugin lifecycle boundary', async () => {
    const workspaceRoot = await makeTemporaryWorkspace();
    const reportDataRoot = 'docs/src/data/forgegate/components';
    const absoluteReportDataRoot = path.join(
      workspaceRoot,
      ...reportDataRoot.split('/'),
    );
    await mkdir(absoluteReportDataRoot, { recursive: true });
    await writeFile(path.join(absoluteReportDataRoot, 'index.json'), '{}');
    await writeFile(
      path.join(absoluteReportDataRoot, 'acme-button.json'),
      '{}',
    );
    const discovery = await forgeGateStarlightFilesystemDiscovery({
      workspaceRoot,
      reportDataRoot,
    });

    expect(
      forgeGateStarlightReportDataRegistration(discovery, {
        routeBase: 'components',
      }).entries,
    ).toEqual([
      {
        kind: 'registry',
        label: 'Component registry',
        reportDataPath: 'docs/src/data/forgegate/components/index.json',
        routePath: 'components',
        href: '/components/',
      },
      {
        kind: 'component',
        label: 'Acme Button',
        reportDataPath: 'docs/src/data/forgegate/components/acme-button.json',
        routePath: 'components/acme-button',
        href: '/components/acme-button/',
        slug: 'acme-button',
      },
    ]);
  });

  it('writes route entrypoint files from report-data registration entries', async () => {
    const workspaceRoot = await makeTemporaryWorkspace();
    const reportDataRoot = 'docs/src/data/forgegate/components';
    const absoluteReportDataRoot = path.join(
      workspaceRoot,
      ...reportDataRoot.split('/'),
    );
    const codegenRoot = path.join(workspaceRoot, '.astro/forgegate');
    await mkdir(absoluteReportDataRoot, { recursive: true });
    await writeFile(path.join(absoluteReportDataRoot, 'index.json'), '{}');
    await writeFile(
      path.join(absoluteReportDataRoot, 'acme-button.json'),
      '{}',
    );
    const discovery = await forgeGateStarlightFilesystemDiscovery({
      workspaceRoot,
      reportDataRoot,
    });
    const registration = forgeGateStarlightReportDataRegistration(discovery, {
      routeBase: 'forgegate/reports',
    });
    const injectedRoutes = await forgeGateStarlightInjectReportDataRoutes(
      registration,
      {
        workspaceRoot,
        createCodegenDir: () => pathToFileURL(`${codegenRoot}/`),
        injectRoute: vi.fn(),
      },
    );

    expect(injectedRoutes).toEqual([
      {
        kind: 'registry',
        label: 'Component registry',
        reportDataPath: 'docs/src/data/forgegate/components/index.json',
        routePath: 'forgegate/reports',
        pattern: '/forgegate/reports',
        entrypoint: path.join(codegenRoot, 'forgegate__reports.astro'),
      },
      {
        kind: 'component',
        label: 'Acme Button',
        reportDataPath: 'docs/src/data/forgegate/components/acme-button.json',
        routePath: 'forgegate/reports/acme-button',
        pattern: '/forgegate/reports/acme-button',
        entrypoint: path.join(codegenRoot, 'forgegate__reports__acme-button.astro'),
      },
    ]);
    await expect(
      readFile(path.join(codegenRoot, 'forgegate__reports.astro'), 'utf8'),
    ).resolves.toContain('<ComponentRegistry report={forgegateRegistry} />');
    await expect(
      readFile(
        path.join(codegenRoot, 'forgegate__reports__acme-button.astro'),
        'utf8',
      ),
    ).resolves.toContain(
      '<EvidenceSummary component={componentId} tier={tier} report={forgegateReport} />',
    );
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

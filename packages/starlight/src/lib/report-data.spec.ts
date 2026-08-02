import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyForgeGateReportDataPath,
  discoverForgeGateReportDataFiles,
  forgeGateComponentReportDataPath,
  forgeGateComponentReportRoutePath,
  forgeGateReportDataHref,
  forgeGateReportDataDiscovery,
  forgeGateRegistryReportDataPath,
  forgeGateRegistryReportRoutePath,
  registerForgeGateReportData,
  safeReportDataRoot,
  safeReportRouteBase,
  safeReportDataSlug,
} from './report-data';

describe('ForgeGate report data conventions', () => {
  let temporaryRoots: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryRoots.map((temporaryRoot) =>
        rm(temporaryRoot, { recursive: true, force: true }),
      ),
    );
    temporaryRoots = [];
  });

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

  it('maps report data slugs to deterministic Starlight route paths', () => {
    expect(forgeGateRegistryReportRoutePath()).toBe('components');
    expect(forgeGateComponentReportRoutePath('acme-button--for-designers')).toBe(
      'components/acme-button--for-designers',
    );
    expect(
      forgeGateComponentReportRoutePath(
        'acme-button--for-designers',
        'design-system/components',
      ),
    ).toBe('design-system/components/acme-button--for-designers');
    expect(forgeGateReportDataHref('components/acme-button')).toBe(
      '/components/acme-button/',
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

  it('discovers generated registry and component report data from the filesystem', async () => {
    const workspaceRoot = await makeTemporaryWorkspace();
    const reportDataRoot = 'docs/src/data/forgegate/components';
    const absoluteReportDataRoot = path.join(
      workspaceRoot,
      ...reportDataRoot.split('/'),
    );
    await mkdir(path.join(absoluteReportDataRoot, 'nested'), {
      recursive: true,
    });
    await writeFile(path.join(absoluteReportDataRoot, 'index.json'), '{}');
    await writeFile(
      path.join(absoluteReportDataRoot, 'acme-button.json'),
      '{}',
    );
    await writeFile(
      path.join(absoluteReportDataRoot, 'bad..slug.json'),
      '{}',
    );
    await writeFile(
      path.join(absoluteReportDataRoot, 'nested', 'child.json'),
      '{}',
    );

    await expect(
      discoverForgeGateReportDataFiles({ workspaceRoot, reportDataRoot }),
    ).resolves.toMatchObject({
      workspaceRoot: workspaceRoot.replace(/\\/g, '/'),
      reportDataRoot,
      registryPath: 'docs/src/data/forgegate/components/index.json',
      componentReports: [
        {
          path: 'docs/src/data/forgegate/components/acme-button.json',
          slug: 'acme-button',
        },
      ],
      ignoredReports: [
        {
          path: 'docs/src/data/forgegate/components/bad..slug.json',
          reason: 'Unsafe ForgeGate report data slug "bad..slug".',
        },
        {
          path: 'docs/src/data/forgegate/components/nested/child.json',
          reason:
            'ForgeGate report data files are expected directly under the configured root.',
        },
      ],
      limitations: [],
    });
  });

  it('reports missing filesystem report data as an explicit limitation', async () => {
    const workspaceRoot = await makeTemporaryWorkspace();

    await expect(
      discoverForgeGateReportDataFiles({
        workspaceRoot,
        reportDataRoot: 'docs/src/data/forgegate/components',
      }),
    ).resolves.toMatchObject({
      componentReports: [],
      ignoredReports: [],
      limitations: [
        'ForgeGate report data root docs/src/data/forgegate/components was not found.',
      ],
    });
  });

  it('registers discovered report data as stable Starlight route entries', async () => {
    const workspaceRoot = await makeTemporaryWorkspace();
    const reportDataRoot = 'docs/src/data/forgegate/components';
    const absoluteReportDataRoot = path.join(
      workspaceRoot,
      ...reportDataRoot.split('/'),
    );
    await mkdir(absoluteReportDataRoot, { recursive: true });
    await writeFile(path.join(absoluteReportDataRoot, 'index.json'), '{}');
    await writeFile(
      path.join(absoluteReportDataRoot, 'acme-button--for-designers.json'),
      '{}',
    );
    await writeFile(
      path.join(absoluteReportDataRoot, 'acme-card--for-developers.json'),
      '{}',
    );

    const discovery = await discoverForgeGateReportDataFiles({
      workspaceRoot,
      reportDataRoot,
    });

    expect(
      registerForgeGateReportData(discovery, {
        routeBase: 'design-system/components',
      }),
    ).toEqual({
      reportDataRoot,
      routeBase: 'design-system/components',
      entries: [
        {
          kind: 'registry',
          label: 'Component registry',
          reportDataPath: 'docs/src/data/forgegate/components/index.json',
          routePath: 'design-system/components',
          href: '/design-system/components/',
        },
        {
          kind: 'component',
          label: 'Acme Button For Designers',
          reportDataPath:
            'docs/src/data/forgegate/components/acme-button--for-designers.json',
          routePath: 'design-system/components/acme-button--for-designers',
          href: '/design-system/components/acme-button--for-designers/',
          slug: 'acme-button--for-designers',
        },
        {
          kind: 'component',
          label: 'Acme Card For Developers',
          reportDataPath:
            'docs/src/data/forgegate/components/acme-card--for-developers.json',
          routePath: 'design-system/components/acme-card--for-developers',
          href: '/design-system/components/acme-card--for-developers/',
          slug: 'acme-card--for-developers',
        },
      ],
      limitations: [],
    });
  });

  it('discovers and registers the checked-in Acme fixture report data', async () => {
    const workspaceRoot = fileURLToPath(
      new URL('../../../../fixtures/acme-button-library/', import.meta.url),
    );
    const discovery = await discoverForgeGateReportDataFiles({
      workspaceRoot,
      reportDataRoot: 'src/data/forgegate/components',
    });

    expect(discovery.registryPath).toBe(
      'src/data/forgegate/components/index.json',
    );
    expect(discovery.componentReports).toEqual([
      {
        path: 'src/data/forgegate/components/acme-button--for-designers.json',
        slug: 'acme-button--for-designers',
      },
    ]);
    expect(registerForgeGateReportData(discovery).entries).toEqual([
      {
        kind: 'registry',
        label: 'Component registry',
        reportDataPath: 'src/data/forgegate/components/index.json',
        routePath: 'components',
        href: '/components/',
      },
      {
        kind: 'component',
        label: 'Acme Button For Designers',
        reportDataPath:
          'src/data/forgegate/components/acme-button--for-designers.json',
        routePath: 'components/acme-button--for-designers',
        href: '/components/acme-button--for-designers/',
        slug: 'acme-button--for-designers',
      },
    ]);
  });

  it('reports registration limitations when component reports are missing', async () => {
    const workspaceRoot = await makeTemporaryWorkspace();
    const reportDataRoot = 'docs/src/data/forgegate/components';
    const absoluteReportDataRoot = path.join(
      workspaceRoot,
      ...reportDataRoot.split('/'),
    );
    await mkdir(absoluteReportDataRoot, { recursive: true });
    await writeFile(path.join(absoluteReportDataRoot, 'index.json'), '{}');

    const discovery = await discoverForgeGateReportDataFiles({
      workspaceRoot,
      reportDataRoot,
    });

    expect(registerForgeGateReportData(discovery).limitations).toEqual([
      'No ForgeGate component report data files were discovered under docs/src/data/forgegate/components.',
    ]);
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

  it('rejects route paths that would escape Starlight routing', () => {
    expect(() => safeReportRouteBase('../components')).toThrow(
      'Unsafe ForgeGate Starlight route path',
    );
    expect(() => safeReportRouteBase('D:/docs/components')).toThrow(
      'Unsafe ForgeGate Starlight route path',
    );
    expect(() =>
      forgeGateComponentReportRoutePath('../escape'),
    ).toThrow('Unsafe ForgeGate report data slug');
  });

  async function makeTemporaryWorkspace(): Promise<string> {
    const workspaceRoot = await mkdtemp(
      path.join(tmpdir(), 'forgegate-starlight-'),
    );
    temporaryRoots.push(workspaceRoot);
    return workspaceRoot;
  }
});
